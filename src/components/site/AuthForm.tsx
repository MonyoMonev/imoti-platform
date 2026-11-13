'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Вход или регистрация на клиент: телефон и парола, без имейли и потвърждения. */
export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const out = await res.json();
      if (!res.ok || !out.ok) {
        setErr(out.error || 'Не се получи. Опитай пак.');
        setBusy(false);
        return;
      }
      router.push(out.role === 'client' ? '/profil' : '/admin');
      router.refresh();
    } catch {
      setErr('Няма връзка. Опитай пак.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      {mode === 'register' && (
        <div className="auth__two">
          <label className="field">
            <span>Име</span>
            <input className="input" name="first_name" autoComplete="given-name" required />
          </label>
          <label className="field">
            <span>Фамилия</span>
            <input className="input" name="last_name" autoComplete="family-name" required />
          </label>
        </div>
      )}
      <label className="field">
        <span>Телефон</span>
        <input className="input" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0888 123 456" required />
      </label>
      <label className="field">
        <span>Парола</span>
        <input
          className="input"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder={mode === 'register' ? 'Поне 6 знака' : ''}
          required
        />
      </label>
      {err && <p className="form-error">{err}</p>}
      <button className="btn" disabled={busy} style={{ marginTop: 6 }}>
        {busy ? 'Момент' : mode === 'login' ? 'Влез' : 'Направи профил'}
      </button>
    </form>
  );
}

export function LogoutButton({ className = 'btn btn--ghost btn--s' }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
        router.refresh();
      }}
    >
      Изход
    </button>
  );
}
