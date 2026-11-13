'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CopyButton from './Copy';

async function post(url: string, body: any) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return res.json().catch(() => ({ ok: false, error: 'Няма връзка със сървъра.' }));
}

export function InviteMaker({ agency }: { agency: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [made, setMade] = useState<{ code: string; link: string } | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const r = await post('/api/admin/invites', { note });
    setBusy(false);
    if (!r.ok || !r.code) {
      setError(r.error || 'Не стана. Опитай пак.');
      return;
    }
    setMade({ code: r.code, link: r.link });
    setNote('');
    router.refresh();
  }

  const message = made
    ? `Здравей! Каня те в панела на ${agency}. Отвори линка, напиши име, телефон и парола и си вътре:\n${made.link}\n\nАко поиска код, той е ${made.code}. Поканата важи 7 дни.`
    : '';

  return (
    <div>
      <form onSubmit={create} className="filters" style={{ marginBottom: 0 }}>
        <label className="field wide">
          <span>За кого е поканата (само за теб, не е задължително)</span>
          <input type="text" name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: новият колега от декември" maxLength={120} />
        </label>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Създавам' : 'Покани брокер'}
        </button>
      </form>
      {error ? <p className="err">{error}</p> : null}
      {made ? (
        <div className="codebox" style={{ marginTop: 16 }} data-invite={made.code}>
          <div>
            <div className="adm-kicker" style={{ marginBottom: 4 }}>
              Код за покана
            </div>
            <div className="code">{made.code}</div>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="copyrow">
              <code>{made.link}</code>
              <CopyButton text={made.link} label="Копирай линка" />
            </div>
            <div className="copyrow" style={{ marginTop: 8 }}>
              <div className="copytext">{message}</div>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <CopyButton text={message} label="Копирай текста" />
                <a className="btn small viber" href={`viber://forward?text=${encodeURIComponent(message)}`}>
                  Прати във Viber
                </a>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RevokeInvite({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn small quiet"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await post(`/api/admin/invites/${code}`, {});
        setBusy(false);
        router.refresh();
      }}
    >
      Отмени
    </button>
  );
}

export function AccessControl({
  id,
  name,
  active,
  props,
  others,
}: {
  id: number;
  name: string;
  active: boolean;
  props: number;
  others: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(body: any) {
    setBusy(true);
    setError('');
    const r = await post(`/api/admin/brokers/${id}`, body);
    setBusy(false);
    if (!r.ok) {
      setError(r.error || 'Не стана.');
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!active) {
    return (
      <span>
        <button type="button" className="btn small" disabled={busy} onClick={() => run({ action: 'activate' })}>
          Върни достъпа
        </button>
        {error ? <span className="err"> {error}</span> : null}
      </span>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn small quiet" onClick={() => setOpen(true)}>
        Спри достъпа
      </button>
    );
  }

  return (
    <div className="stopbox">
      <p>
        <b>{name} няма да може да влиза в панела.</b>
        {props > 0 ? ` Има ${props} ${props === 1 ? 'активен имот' : 'активни имота'} и отворени запитвания.` : ''}
      </p>
      <label className="field">
        <span>Кой поема имотите и отворените запитвания</span>
        <select name="move_to" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
          <option value="">Остават на негово име</option>
          {others.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <div className="formrow" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="btn small primary"
          disabled={busy}
          onClick={() => run({ action: 'deactivate', move_to: moveTo ? Number(moveTo) : undefined })}
        >
          {busy ? 'Спирам' : 'Спри достъпа'}
        </button>
        <button type="button" className="btn small quiet" onClick={() => setOpen(false)}>
          Отказ
        </button>
        {error ? <span className="err">{error}</span> : null}
      </div>
    </div>
  );
}

export function VisibilityForm({ id, visible, sort }: { id: number; visible: boolean; sort: number }) {
  const router = useRouter();
  const [v, setV] = useState(visible);
  const [s, setS] = useState(String(sort ?? 100));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg('');
        const r = await post(`/api/admin/brokers/${id}`, { action: 'visibility', visible: v, sort: s });
        setBusy(false);
        setMsg(r.ok ? 'Записано.' : r.error || 'Не стана.');
        if (r.ok) router.refresh();
      }}
    >
      <label className="check">
        <input type="checkbox" name="visible" checked={v} onChange={(e) => setV(e.target.checked)} />
        Показвай го на страницата „Брокери“ в сайта
      </label>
      <label className="field" style={{ marginTop: 14, maxWidth: 220 }}>
        <span>Подредба в списъка</span>
        <input type="text" inputMode="numeric" name="sort" value={s} onChange={(e) => setS(e.target.value)} />
        <em>Малкото число е отпред.</em>
      </label>
      <div className="formrow">
        <button className="btn small" type="submit" disabled={busy}>
          Запиши
        </button>
        {msg ? <span className="okmsg">{msg}</span> : null}
      </div>
    </form>
  );
}

export function ResetPassword({ id, name }: { id: number; name: string }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg('');
        setError('');
        const r = await post(`/api/admin/brokers/${id}`, { action: 'password', password: pw });
        setBusy(false);
        if (r.ok) {
          setMsg(`Готово. Кажи новата парола на ${name}.`);
          setPw('');
        } else setError(r.error || 'Не стана.');
      }}
    >
      <label className="field" style={{ maxWidth: 320 }}>
        <span>Нова парола</span>
        <input type="text" name="password" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
        <em>За случаите, когато някой си е забравил паролата. Няма имейли, казваш му я лично.</em>
      </label>
      <div className="formrow">
        <button className="btn small" type="submit" disabled={busy}>
          Смени паролата
        </button>
        {error ? <span className="err">{error}</span> : null}
        {msg ? <span className="okmsg">{msg}</span> : null}
      </div>
    </form>
  );
}
