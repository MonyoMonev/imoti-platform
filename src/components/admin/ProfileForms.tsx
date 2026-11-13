'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PhotoOne } from './PhotoPicker';

async function post(url: string, body: any) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return res.json().catch(() => ({ ok: false, error: 'Няма връзка със сървъра.' }));
}

export function AccountForm({ initial }: { initial: { first_name: string; last_name: string; phone: string; notify_phone: string } }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setV((o) => ({ ...o, [k]: e.target.value }));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg('');
        setError('');
        const r = await post('/api/admin/profile', { section: 'account', ...v });
        setBusy(false);
        if (r.ok) {
          setMsg('Записано.');
          router.refresh();
        } else setError(r.error || 'Не стана.');
      }}
    >
      <div className="grid2">
        <label className="field">
          <span>Име</span>
          <input type="text" name="first_name" value={v.first_name} onChange={set('first_name')} />
        </label>
        <label className="field">
          <span>Фамилия</span>
          <input type="text" name="last_name" value={v.last_name} onChange={set('last_name')} />
        </label>
        <label className="field">
          <span>Телефон за вход</span>
          <input type="tel" name="phone" inputMode="tel" value={v.phone} onChange={set('phone')} />
        </label>
        <label className="field">
          <span>Номер във Viber</span>
          <input type="tel" name="notify_phone" inputMode="tel" value={v.notify_phone} onChange={set('notify_phone')} />
          <em>Номерът, с който си във Viber.</em>
        </label>
      </div>
      <div className="formrow">
        <button className="btn small" type="submit" disabled={busy}>
          {busy ? 'Записвам' : 'Запиши'}
        </button>
        {error ? <span className="err">{error}</span> : null}
        {msg ? <span className="okmsg">{msg}</span> : null}
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
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
        const r = await post('/api/admin/profile', { section: 'password', current, next });
        setBusy(false);
        if (r.ok) {
          setMsg('Паролата е сменена.');
          setCurrent('');
          setNext('');
        } else setError(r.error || 'Не стана.');
      }}
    >
      <div className="grid2">
        <label className="field">
          <span>Сегашна парола</span>
          <input type="password" name="current" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="field">
          <span>Нова парола</span>
          <input type="password" name="next" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
      </div>
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

/** Публичният профил на брокера. В режим boss управителят редактира чужд профил и името. */
export function PublicProfileForm({ initial, bossEditsId }: { initial: any; bossEditsId?: number }) {
  const router = useRouter();
  const facts0: [string, string][] = Array.isArray(initial.facts) ? initial.facts : [];
  const [v, setV] = useState<any>({
    first_name: initial.first_name || '',
    last_name: initial.last_name || '',
    title: initial.title || '',
    photo: initial.photo || null,
    quote: initial.quote || '',
    pitch: initial.pitch || '',
    bio: initial.bio || '',
    since_year: initial.since_year ?? '',
    deals: initial.deals ?? '',
    areas: Array.isArray(initial.areas) ? initial.areas.join(', ') : '',
    languages: Array.isArray(initial.languages) ? initial.languages.join(', ') : '',
    facts: [0, 1, 2].map((i) => ({ n: facts0[i]?.[0] || '', l: facts0[i]?.[1] || '' })),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setV((o: any) => ({ ...o, [k]: e.target.value }));
    setMsg('');
  };
  const setFact = (i: number, k: 'n' | 'l') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((o: any) => ({ ...o, facts: o.facts.map((f: any, j: number) => (j === i ? { ...f, [k]: e.target.value } : f)) }));
    setMsg('');
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setError('');
    const r = bossEditsId
      ? await post(`/api/admin/brokers/${bossEditsId}`, { action: 'profile', ...v })
      : await post('/api/admin/profile', { section: 'public', ...v });
    setBusy(false);
    if (r.ok) {
      setMsg('Профилът е записан.');
      router.refresh();
    } else setError(r.error || 'Не стана.');
  }

  return (
    <form onSubmit={submit} className="panel">
      <fieldset className="formsec">
        <h3>Снимка и длъжност</h3>
        <div className="stackf">
          <PhotoOne value={v.photo} onChange={(photo) => setV((o: any) => ({ ...o, photo }))} />
          {bossEditsId ? (
            <div className="grid2">
              <label className="field">
                <span>Име</span>
                <input type="text" name="first_name" value={v.first_name} onChange={set('first_name')} />
              </label>
              <label className="field">
                <span>Фамилия</span>
                <input type="text" name="last_name" value={v.last_name} onChange={set('last_name')} />
              </label>
            </div>
          ) : null}
          <label className="field">
            <span>Длъжност</span>
            <input type="text" name="title" value={v.title} onChange={set('title')} placeholder="Брокер, продажби" />
          </label>
        </div>
      </fieldset>

      <fieldset className="formsec">
        <h3>Какво да знаят хората за теб</h3>
        <div className="stackf">
          <label className="field">
            <span>Едно твое изречение</span>
            <input type="text" name="quote" maxLength={160} value={v.quote} onChange={set('quote')} placeholder="Първо говорим за парите, после за квадратите." />
            <em>Стои с големи букви до снимката ти. Нещо, което наистина казваш на клиентите.</em>
          </label>
          <label className="field">
            <span>Кратко представяне за линковете</span>
            <textarea name="pitch" rows={3} maxLength={420} value={v.pitch} onChange={set('pitch')} />
            <em>Две или три изречения. Вижда ги всеки, който отвори твой линк от Facebook или Instagram.</em>
          </label>
          <label className="field">
            <span>За мен</span>
            <textarea name="bio" rows={8} value={v.bio} onChange={set('bio')} />
            <em>Откъде идваш, с какво се занимаваш, как работиш. В първо лице и с конкретни неща.</em>
          </label>
        </div>
      </fieldset>

      <fieldset className="formsec">
        <h3>Опит</h3>
        <div className="stackf">
          <div className="grid4">
            <label className="field">
              <span>В имотите от година</span>
              <input type="text" inputMode="numeric" name="since_year" value={v.since_year} onChange={set('since_year')} placeholder="2016" />
            </label>
            <label className="field">
              <span>Сделки досега</span>
              <input type="text" inputMode="numeric" name="deals" value={v.deals} onChange={set('deals')} />
            </label>
          </div>
          <div className="grid2">
            <label className="field">
              <span>Райони и специалност</span>
              <input type="text" name="areas" value={v.areas} onChange={set('areas')} placeholder="Чайка, Бриз, Наеми" />
              <em>Разделени със запетая.</em>
            </label>
            <label className="field">
              <span>Езици</span>
              <input type="text" name="languages" value={v.languages} onChange={set('languages')} placeholder="Български, Английски" />
            </label>
          </div>
          <div>
            <span className="small" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>
              Три числа, с които се гордееш
            </span>
            <div className="factrows">
              {v.facts.map((f: any, i: number) => (
                <div className="factrow" key={i}>
                  <input type="text" name={`fact_n_${i}`} aria-label={`Число ${i + 1}`} value={f.n} onChange={setFact(i, 'n')} placeholder={['214', '8 г.', '3'][i]} maxLength={12} />
                  <input
                    type="text"
                    name={`fact_l_${i}`}
                    aria-label={`Пояснение ${i + 1}`}
                    value={f.l}
                    onChange={setFact(i, 'l')}
                    placeholder={['сделки от 2011 г. насам', 'в банковото кредитиране', 'района, които познавам вход по вход'][i]}
                    maxLength={60}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      <div className="savebar">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Записвам' : 'Запиши профила'}
        </button>
        {error ? <span className="err">{error}</span> : null}
        {msg ? <span className="okmsg">{msg}</span> : null}
      </div>
    </form>
  );
}
