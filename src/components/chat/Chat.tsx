'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { EXIT_REASONS, STEPS, STEP_BY_ID, nextStep, summarize, type Answers, type ChatStep } from '@/lib/chat-tree';

// Чат помощникът: кратки въпроси с готови отговори, накрая име и телефон.
// Състоянието е в доставчика, за да го ползват и плаващият бутон, и вградените
// начала на чата по страниците.

export type ChatCtx = {
  brokerId?: number;
  brokerName?: string;
  brokerPhoto?: string | null;
  propertyId?: number;
  propertyTitle?: string;
};

type ChatUser = { first_name: string; last_name: string; phone: string; role: string } | null;

type Stage = string; // id на стъпка, 'summary', 'form' или 'done'
type Entry = { step: string; value: string | string[] };
type Done = { broker: { name: string; photo: string | null } | null; phone: string; canRegister: boolean; name: string };

type Api = {
  open: boolean;
  ctx: ChatCtx;
  setCtx: (c: ChatCtx) => void;
  openChat: (first?: string) => void;
  closeChat: () => void;
  user: ChatUser;
};

const Ctx = createContext<Api | null>(null);

export function useChat(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error('useChat извън ChatProvider');
  return v;
}

function newSid() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => x.toString(16).padStart(2, '0')).join('');
}

function post(url: string, body: any) {
  try {
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
  } catch {}
}

function toAnswers(history: Entry[]): Answers {
  const a: Answers = {};
  for (const h of history) {
    const s = STEP_BY_ID[h.step];
    if (!s) continue;
    if (h.value === '' || (Array.isArray(h.value) && h.value.length === 0)) continue;
    a[s.key] = h.value;
  }
  return a;
}

function labelOf(step: ChatStep, value: string | string[]): string {
  if (Array.isArray(value)) return value.join(', ');
  if (step.type === 'text') return value || 'Пропускам';
  return step.options?.find((o) => o.v === value)?.label || value;
}

/** Колко стъпки остават приблизително, за лентата на напредъка. */
function remaining(stage: Stage): number {
  if (stage === 'done') return 0;
  if (stage === 'form') return 1;
  if (stage === 'summary') return 2;
  let n = 2;
  let id = stage;
  let guard = 0;
  while (id !== 'summary' && guard++ < 12) {
    const s = STEP_BY_ID[id];
    if (!s) break;
    n++;
    id = s.options?.[0]?.next || s.next || 'summary';
  }
  return n;
}

export function ChatProvider({ user, children }: { user: ChatUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ctx, setCtxState] = useState<ChatCtx>({});
  const [history, setHistory] = useState<Entry[]>([]);
  const [stage, setStage] = useState<Stage>('start');
  const [typing, setTyping] = useState(false);
  const [exitAsk, setExitAsk] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const sid = useRef<string>('');
  const started = useRef(false);
  const exitAsked = useRef(false);
  const ctxRef = useRef<ChatCtx>({});
  ctxRef.current = ctx;

  const setCtx = useCallback((c: ChatCtx) => setCtxState(c), []);

  const send = useCallback((type: string, extra: Record<string, any> = {}) => {
    if (!sid.current) sid.current = newSid();
    post('/api/chat', {
      sid: sid.current,
      type,
      path: window.location.pathname,
      ctx: { brokerId: ctxRef.current.brokerId, propertyId: ctxRef.current.propertyId },
      ...extra,
    });
  }, []);

  const go = useCallback((next: Stage) => {
    setTyping(true);
    setStage(next);
    window.setTimeout(() => setTyping(false), 420);
  }, []);

  const answer = useCallback(
    (stepId: string, value: string | string[], prev?: Entry[]) => {
      const step = STEP_BY_ID[stepId];
      if (!step) return;
      const base = prev ?? history;
      const h = [...base, { step: stepId, value }];
      const next = nextStep(step, value);
      setHistory(h);
      const empty = value === '' || (Array.isArray(value) && value.length === 0);
      send(empty ? 'skip' : 'answer', { step: stepId, value, answers: toAnswers(h), next });
      if (next === 'summary') send('summary', { step: 'summary' });
      go(next);
    },
    [history, send, go]
  );

  const openChat = useCallback(
    (first?: string) => {
      setOpen(true);
      setExitAsk(false);
      if (!started.current) {
        started.current = true;
        send('open', { step: 'start' });
      }
      if (first && stage === 'start' && history.length === 0) answer('start', first, []);
    },
    [send, stage, history.length, answer]
  );

  const reset = useCallback(() => {
    sid.current = '';
    started.current = false;
    exitAsked.current = false;
    setHistory([]);
    setStage('start');
    setDone(null);
    setExitAsk(false);
  }, []);

  const closeChat = useCallback(() => {
    const mid = started.current && history.length > 0 && stage !== 'done';
    if (mid && !exitAsked.current) {
      exitAsked.current = true;
      setExitAsk(true);
      return;
    }
    if (mid) send('close', { step: stage });
    setExitAsk(false);
    setOpen(false);
    if (stage === 'done') reset();
  }, [history.length, stage, send, reset]);

  const back = useCallback(() => {
    if (stage === 'form') {
      go('summary');
      return;
    }
    if (history.length === 0) return;
    const h = history.slice(0, -1);
    const lastStep = history[history.length - 1].step;
    setHistory(h);
    send('back', { step: lastStep, answers: toAnswers(h), next: lastStep });
    go(lastStep);
  }, [history, stage, send, go]);

  const exitWith = useCallback(
    (reason: string | null) => {
      if (reason) send('exit', { step: stage, value: reason });
      else send('close', { step: stage });
      setExitAsk(false);
      setOpen(false);
    },
    [send, stage]
  );

  // Затваряне с Escape и заключване на скрола под чата на телефон.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeChat();
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('chat-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('chat-open');
    };
  }, [open, closeChat]);

  const api = useMemo<Api>(() => ({ open, ctx, setCtx, openChat, closeChat, user }), [open, ctx, setCtx, openChat, closeChat, user]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <Launcher pathname={pathname} />
      {open && (
        <Panel
          history={history}
          stage={stage}
          typing={typing}
          exitAsk={exitAsk}
          done={done}
          onAnswer={(s, v) => answer(s, v)}
          onBack={back}
          onForm={() => {
            send('form', { step: 'form' });
            go('form');
          }}
          onExit={exitWith}
          onStay={() => setExitAsk(false)}
          onDone={(d) => {
            setDone(d);
            setStage('done');
          }}
          onReset={reset}
          sid={() => {
            if (!sid.current) sid.current = newSid();
            return sid.current;
          }}
        />
      )}
    </Ctx.Provider>
  );
}

/** Страницата казва на чата кой брокер и кой имот са на екрана. */
export function ChatContext(props: ChatCtx) {
  const { setCtx } = useChat();
  const key = JSON.stringify(props);
  useEffect(() => {
    setCtx(JSON.parse(key));
    return () => setCtx({});
  }, [key, setCtx]);
  return null;
}

/** Бутон, който отваря чата. За ползване и в сървърни компоненти. */
export function ChatButton({
  className = 'btn btn--lime',
  children,
  first,
  ctx,
}: {
  className?: string;
  children: React.ReactNode;
  first?: string;
  ctx?: ChatCtx;
}) {
  const { openChat, setCtx } = useChat();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (ctx) setCtx(ctx);
        openChat(first);
      }}
    >
      {children}
    </button>
  );
}

function Avatar({ photo, name, size = 40 }: { photo?: string | null; name?: string; size?: number }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="cavatar" src={photo} alt={name || ''} width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span className="cavatar cavatar--mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 28 28">
        <path d="M2 6h24L14 24z" fill="none" stroke="currentColor" strokeWidth="2.200" />
        <path d="M14 24V6H2z" fill="currentColor" />
      </svg>
    </span>
  );
}

function firstQuestion(ctx: ChatCtx): string {
  if (ctx.brokerName) return `Здравей! Аз съм помощникът на ${ctx.brokerName}. Кажи ми с какво да помогна.`;
  return STEPS[0].q;
}

function firstOptions(ctx: ChatCtx) {
  return STEPS[0].options!.filter((o) => (o.v === 'ask' ? !!ctx.propertyId : true));
}

/** Началото на чата, вградено в страницата: въпросът и отговорите се цъкат направо. */
export function ChatStarter({ title, note }: { title?: string; note?: string }) {
  const { ctx, openChat } = useChat();
  return (
    <div className="cstart" data-reveal>
      <div className="cstart__head">
        <Avatar photo={ctx.brokerPhoto} name={ctx.brokerName} size={46} />
        <div>
          <b>{title || (ctx.brokerName ? `Помощникът на ${ctx.brokerName}` : `Помощникът на ${BRAND.name}`)}</b>
          <span>
            <i /> на линия
          </span>
        </div>
      </div>
      <p className="cstart__q">{firstQuestion(ctx)}</p>
      <div className="cstart__opts">
        {firstOptions(ctx).map((o) => (
          <button key={o.v} type="button" className="chip" onClick={() => openChat(o.v)}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="cstart__note">{note || 'Отнема около минута. Телефон оставяш чак накрая, ако решиш.'}</p>
    </div>
  );
}

function Launcher({ pathname }: { pathname: string }) {
  const { open, ctx, openChat } = useChat();
  const [teaser, setTeaser] = useState(false);

  useEffect(() => {
    setTeaser(false);
    let seen = false;
    try {
      seen = sessionStorage.getItem('chat-teaser') === '1';
    } catch {}
    if (seen) return;
    const t = window.setTimeout(() => setTeaser(true), 4200);
    const t2 = window.setTimeout(() => setTeaser(false), window.innerWidth < 600 ? 11000 : 19000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [pathname]);

  const hideTeaser = () => {
    setTeaser(false);
    try {
      sessionStorage.setItem('chat-teaser', '1');
    } catch {}
  };

  if (open) return null;
  const label = ctx.brokerName ? `Питай ${ctx.brokerName}` : 'Кажи какво търсиш';
  const tease = ctx.propertyId
    ? `Имаш въпрос за този имот? ${ctx.brokerName ? `${ctx.brokerName} отговаря тук.` : 'Питай тук.'}`
    : `Търсиш имот във ${BRAND.city}? Отговори на няколко бързи въпроса и брокер ще ти се обади.`;

  return (
    <div className={`claunch${pathname === '/' ? ' claunch--home' : ''}`}>
      {teaser && (
        <div className="claunch__tease" role="status">
          <button type="button" className="claunch__x" aria-label="Скрий" onClick={hideTeaser}>
            <svg viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.600" fill="none" />
            </svg>
          </button>
          <button
            type="button"
            className="claunch__msg"
            onClick={() => {
              hideTeaser();
              openChat();
            }}
          >
            {tease}
          </button>
        </div>
      )}
      <button
        type="button"
        className="claunch__btn"
        onClick={() => {
          hideTeaser();
          openChat();
        }}
        aria-label="Отвори чата"
      >
        <span className="claunch__ava">
          <Avatar photo={ctx.brokerPhoto} name={ctx.brokerName} size={44} />
          <i />
        </span>
        <span className="claunch__label">{label}</span>
        <svg className="claunch__ico" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 4h14v10H9l-4 3v-3H3z" fill="none" stroke="currentColor" strokeWidth="1.700" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

type PanelProps = {
  history: Entry[];
  stage: Stage;
  typing: boolean;
  exitAsk: boolean;
  done: Done | null;
  onAnswer: (step: string, value: string | string[]) => void;
  onBack: () => void;
  onForm: () => void;
  onExit: (reason: string | null) => void;
  onStay: () => void;
  onDone: (d: Done) => void;
  onReset: () => void;
  sid: () => string;
};

function Panel(p: PanelProps) {
  const { ctx, closeChat, user } = useChat();
  const body = useRef<HTMLDivElement>(null);
  const [multi, setMulti] = useState<string[]>([]);
  const [text, setText] = useState('');
  const answers = useMemo(() => toAnswers(p.history), [p.history]);
  const step = STEP_BY_ID[p.stage];
  const total = p.history.length + remaining(p.stage);
  const progress = p.stage === 'done' ? 1 : Math.min(0.97, (p.history.length + (p.stage === 'form' ? 1.5 : p.stage === 'summary' ? 0.6 : 0)) / Math.max(1, total));

  useEffect(() => {
    setMulti([]);
    setText('');
  }, [p.stage]);

  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const t = window.setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 30);
    return () => window.clearTimeout(t);
  }, [p.history.length, p.stage, p.typing, p.exitAsk]);

  const who = ctx.brokerName ? `Помощникът на ${ctx.brokerName}` : `Помощникът на ${BRAND.name}`;

  return (
    <div className="cpanel" role="dialog" aria-label="Чат с агенцията" data-lenis-prevent>
      <header className="cpanel__head">
        <Avatar photo={ctx.brokerPhoto} name={ctx.brokerName} size={42} />
        <div className="cpanel__who">
          <b>{who}</b>
          <span>{ctx.propertyTitle ? ctx.propertyTitle : `${BRAND.full}`}</span>
        </div>
        <button type="button" className="cpanel__close" onClick={closeChat} aria-label="Затвори чата">
          <svg viewBox="0 0 14 14">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.800" fill="none" />
          </svg>
        </button>
        <div className="cpanel__bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${progress})` }} />
        </div>
      </header>

      <div className="cpanel__body" ref={body} data-lenis-prevent>
        {p.history.map((h, i) => {
          const s = STEP_BY_ID[h.step];
          if (!s) return null;
          return (
            <div key={i} className="cturn">
              <p className="cmsg cmsg--bot">{i === 0 ? firstQuestion(ctx) : s.q}</p>
              <p className="cmsg cmsg--me">{labelOf(s, h.value)}</p>
            </div>
          );
        })}

        {p.typing && (
          <p className="cmsg cmsg--bot cmsg--typing" aria-label="Пише">
            <i />
            <i />
            <i />
          </p>
        )}

        {!p.typing && step && <p className="cmsg cmsg--bot cmsg--in">{p.history.length === 0 ? firstQuestion(ctx) : step.q}</p>}

        {!p.typing && p.stage === 'summary' && <Summary answers={answers} />}

        {!p.typing && p.stage === 'form' && (
          <p className="cmsg cmsg--bot cmsg--in">
            Остави име и телефон и {ctx.brokerName || 'брокер от агенцията'} ще ти се обади. Нищо друго не ни трябва.
          </p>
        )}

        {p.stage === 'done' && p.done && <DoneView done={p.done} onReset={p.onReset} />}
      </div>

      {p.exitAsk ? (
        <footer className="cpanel__foot cpanel__foot--exit">
          <p>Преди да затвориш: какво те спря? Така ще знаем какво да поправим.</p>
          <div className="copts">
            {EXIT_REASONS.map((r) => (
              <button key={r.v} type="button" className="chip chip--s" onClick={() => p.onExit(r.v)}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="cpanel__row">
            <button type="button" className="clink" onClick={p.onStay}>
              Продължавам с въпросите
            </button>
            <button type="button" className="clink clink--mute" onClick={() => p.onExit(null)}>
              Затвори
            </button>
          </div>
        </footer>
      ) : p.typing ? (
        <footer className="cpanel__foot cpanel__foot--idle" />
      ) : step ? (
        <footer className="cpanel__foot">
          {step.type === 'choice' && (
            <div className="copts">
              {(step.id === 'start' ? firstOptions(ctx) : step.options!).map((o) => (
                <button key={o.v} type="button" className="chip" onClick={() => p.onAnswer(step.id, o.v)}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {step.type === 'multi' && (
            <>
              <div className="copts">
                {step.options!.map((o) => {
                  const on = multi.includes(o.v);
                  return (
                    <button
                      key={o.v}
                      type="button"
                      className={`chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        if (o.v === 'Няма значение') return p.onAnswer(step.id, [o.v]);
                        setMulti(on ? multi.filter((x) => x !== o.v) : [...multi, o.v]);
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="btn btn--s cnext" disabled={multi.length === 0} onClick={() => p.onAnswer(step.id, multi)}>
                Продължи{multi.length ? ` с ${multi.length}` : ''}
              </button>
            </>
          )}
          {step.type === 'text' && (
            <form
              className="ctext"
              onSubmit={(e) => {
                e.preventDefault();
                p.onAnswer(step.id, text.trim().slice(0, 800));
              }}
            >
              <textarea
                rows={2}
                value={text}
                placeholder={step.placeholder}
                onChange={(e) => setText(e.target.value)}
                maxLength={800}
                aria-label={step.q}
              />
              <div className="cpanel__row">
                {step.optional && (
                  <button type="button" className="clink clink--mute" onClick={() => p.onAnswer(step.id, '')}>
                    Пропусни
                  </button>
                )}
                <button type="submit" className="btn btn--s" disabled={!text.trim()}>
                  Продължи
                </button>
              </div>
            </form>
          )}
          {p.history.length > 0 && (
            <button type="button" className="cback" onClick={p.onBack}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M9 3L4 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.600" />
              </svg>
              Назад
            </button>
          )}
        </footer>
      ) : p.stage === 'summary' ? (
        <footer className="cpanel__foot">
          <button type="button" className="btn btn--lime csend" onClick={p.onForm}>
            Отправи запитване
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <path d="M3 9h12M10 4l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.800" />
            </svg>
          </button>
          <button type="button" className="cback" onClick={p.onBack}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M9 3L4 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.600" />
            </svg>
            Промени нещо
          </button>
        </footer>
      ) : p.stage === 'form' ? (
        <LeadForm answers={answers} sid={p.sid} user={user} onBack={p.onBack} onDone={p.onDone} />
      ) : null}
    </div>
  );
}

function Summary({ answers }: { answers: Answers }) {
  const s = summarize(answers);
  return (
    <div className="csum cmsg--in">
      <span className="csum__tag">Това записах</span>
      <b>{s.title}</b>
      <dl>
        {s.lines.map(([l, v]) => (
          <div key={l}>
            <dt>{l}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function LeadForm({
  answers,
  sid,
  user,
  onBack,
  onDone,
}: {
  answers: Answers;
  sid: () => string;
  user: ChatUser;
  onBack: () => void;
  onDone: (d: Done) => void;
}) {
  const { ctx } = useChat();
  const isClient = user?.role === 'client';
  const [first, setFirst] = useState(isClient ? user!.first_name : '');
  const [last, setLast] = useState(isClient ? user!.last_name : '');
  const [phone, setPhone] = useState(isClient ? user!.phone.replace('+359', '0') : '');
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<{ field?: string; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/chat/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sid: sid(),
          answers,
          first_name: first,
          last_name: last,
          phone,
          consent,
          path: window.location.pathname,
          ctx: { brokerId: ctx.brokerId, propertyId: ctx.propertyId },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr({ field: data.field, msg: data.error || 'Не се получи. Опитай пак.' });
        setBusy(false);
        return;
      }
      onDone({ broker: data.broker, phone: data.phone, canRegister: data.canRegister, name: first.trim() });
    } catch {
      setErr({ msg: 'Няма връзка. Провери интернета и опитай пак.' });
      setBusy(false);
    }
  };

  return (
    <form className="cpanel__foot cform" onSubmit={submit} noValidate>
      <div className="cform__two">
        <label className="field">
          <span>Име</span>
          <input className={`input${err?.field === 'first_name' ? ' is-bad' : ''}`} name="first_name" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <label className="field">
          <span>Фамилия</span>
          <input className={`input${err?.field === 'last_name' ? ' is-bad' : ''}`} name="last_name" autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Телефон</span>
        <input
          className={`input${err?.field === 'phone' ? ' is-bad' : ''}`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0888 123 456"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className={`ccheck${err?.field === 'consent' ? ' is-bad' : ''}`}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Съгласен съм {BRAND.name} да се свърже с мен по това запитване.{' '}
          <Link href="/poveritelnost" target="_blank">
            Как пазим данните
          </Link>
        </span>
      </label>
      {err && <p className="form-error">{err.msg}</p>}
      <button type="submit" className="btn btn--lime csend" disabled={busy}>
        {busy ? 'Изпращам' : 'Изпрати запитването'}
      </button>
      <button type="button" className="cback" onClick={onBack}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M9 3L4 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.600" />
        </svg>
        Назад
      </button>
    </form>
  );
}

function DoneView({ done, onReset }: { done: Done; onReset: () => void }) {
  const { closeChat } = useChat();
  const [pw, setPw] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'ok'>('idle');
  const [err, setErr] = useState('');
  const who = done.broker?.name || 'Брокер от агенцията';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setState('busy');
    // Имената и телефонът вече са при нас от запитването, трябва само парола.
    const res = await fetch('/api/auth/register-from-lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setErr(data.error || 'Не се получи. Опитай пак.');
      setState('idle');
      return;
    }
    setState('ok');
  };

  return (
    <div className="cdone cmsg--in">
      <span className="cdone__ok" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M5 12.500l4.500 4.500L19 7" fill="none" stroke="currentColor" strokeWidth="2.400" />
        </svg>
      </span>
      <b>Готово, {done.name}.</b>
      <p>
        {who} получи запитването ти и ще се обади на {done.phone}.
      </p>
      {done.canRegister && state !== 'ok' && (
        <form className="cdone__save" onSubmit={save}>
          <span>Искаш ли да следиш запитването и да пазиш любими имоти? Измисли си парола и профилът ти е готов.</span>
          <div>
            <input
              className="input"
              type="password"
              placeholder="Парола, поне 6 знака"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
              aria-label="Парола"
            />
            <button className="btn btn--s" disabled={state === 'busy' || pw.length < 6}>
              Запази
            </button>
          </div>
          {err && <p className="form-error">{err}</p>}
        </form>
      )}
      {state === 'ok' && (
        <p className="form-ok">
          Профилът ти е готов. <Link href="/profil">Към профила</Link>
        </p>
      )}
      <div className="cpanel__row">
        <button type="button" className="clink" onClick={closeChat}>
          Затвори
        </button>
        <button type="button" className="clink clink--mute" onClick={onReset}>
          Ново запитване
        </button>
      </div>
    </div>
  );
}
