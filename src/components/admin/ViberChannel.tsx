'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

async function send(url: string, method: string, body?: any) {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'Няма връзка със сървъра.' };
  }
}

/** Свързване на личния Viber канал на брокера: там излизат новите запитвания. */
export function ViberChannel({ connected, name }: { connected: boolean; name: string | null }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const run = async (what: string, fn: () => Promise<any>, done: string) => {
    setBusy(what);
    setMsg('');
    setError('');
    const r = await fn();
    setBusy('');
    if (r.ok) {
      setMsg(done);
      setToken('');
      router.refresh();
    } else setError(r.error || 'Не стана.');
  };

  if (connected) {
    return (
      <div className="viber">
        <p className="viber__state">
          <span className="st st-deal">Свързан</span>
          <b>Канал „{name || 'Viber'}“</b>
        </p>
        <p className="muted">
          При всяко ново запитване към теб сайтът публикува съобщение в този канал: кой е клиентът, телефонът му и какво търси. Провери във
          Viber, че известията на канала са включени.
        </p>
        <div className="formrow">
          <button className="btn small" type="button" disabled={!!busy} onClick={() => run('test', () => send('/api/admin/viber/test', 'POST'), 'Изпратено. Погледни във Viber.')}>
            {busy === 'test' ? 'Изпращам' : 'Прати пробно съобщение'}
          </button>
          <button className="btn small quiet" type="button" disabled={!!busy} onClick={() => run('off', () => send('/api/admin/viber', 'DELETE'), 'Каналът е изключен.')}>
            Изключи канала
          </button>
          {error ? <span className="err">{error}</span> : null}
          {msg ? <span className="okmsg">{msg}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <form
      className="viber"
      onSubmit={(e) => {
        e.preventDefault();
        run('connect', () => send('/api/admin/viber', 'POST', { token: token.trim() }), 'Свързано. Провери във Viber.');
      }}
    >
      <ol className="viber__steps">
        <li>Във Viber направи нов канал само за теб, например „Запитвания“. Остави го частен и не кани никого.</li>
        <li>Отвори информацията за канала и слез най долу до „Developer Tools“.</li>
        <li>Копирай токена оттам и го постави тук. Удобно е да го направиш направо от телефона.</li>
      </ol>
      <label className="field">
        <span>Токен на канала</span>
        <input
          type="text"
          name="viber_token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Постави токена от Viber"
        />
        <em>Пазим го само за да публикуваме в твоя канал. Никой друг не го вижда.</em>
      </label>
      <div className="formrow">
        <button className="btn small" type="submit" disabled={!!busy || token.trim().length < 10}>
          {busy === 'connect' ? 'Свързвам' : 'Свържи канала'}
        </button>
        {error ? <span className="err">{error}</span> : null}
        {msg ? <span className="okmsg">{msg}</span> : null}
      </div>
    </form>
  );
}
