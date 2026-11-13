'use client';

import { useState } from 'react';

async function post(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export function LoginForm({ demo }: { demo: { label: string; phone: string; password: string }[] }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { data } = await post('/api/auth/login', { phone, password });
    if (!data.ok) {
      setError(data.error || 'Не стана. Опитай пак.');
      setBusy(false);
      return;
    }
    if (data.role === 'client') {
      await fetch('/api/auth/logout', { method: 'POST' });
      setError('Това е клиентски профил. Входът за клиенти е на самия сайт.');
      setBusy(false);
      return;
    }
    window.location.href = '/admin';
  }

  return (
    <>
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Телефон</span>
          <input
            type="tel"
            name="phone"
            autoComplete="username"
            inputMode="tel"
            placeholder="0888 123 456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Парола</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? (
          <p className="err" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Влизам' : 'Влез'}
        </button>
      </form>
      {demo.length ? (
        <div className="demo">
          Демо профили, с един клик се попълват:
          {demo.map((d) => (
            <button
              key={d.phone}
              type="button"
              onClick={() => {
                setPhone(d.phone);
                setPassword(d.password);
                setError('');
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function InviteForm({ code: initial }: { code: string }) {
  const [code, setCode] = useState(initial);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { data } = await post('/api/auth/invite', {
      code,
      first_name: first,
      last_name: last,
      phone,
      password,
    });
    if (!data.ok) {
      setError(data.error || 'Не стана. Опитай пак.');
      setBusy(false);
      return;
    }
    window.location.href = '/admin/profil?nov=1';
  }

  return (
    <form onSubmit={submit} noValidate>
      <label className="field">
        <span>Код за покана</span>
        <input
          type="text"
          name="code"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          style={{ letterSpacing: '0.2em', fontWeight: 700 }}
        />
      </label>
      <div className="grid2 keep">
        <label className="field">
          <span>Име</span>
          <input type="text" name="first_name" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <label className="field">
          <span>Фамилия</span>
          <input type="text" name="last_name" autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Телефон</span>
        <input
          type="tel"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0888 123 456"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <em>С него ще влизаш. На същия номер ще идват и запитванията.</em>
      </label>
      <label className="field">
        <span>Парола</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <em>Поне 6 знака.</em>
      </label>
      {error ? (
        <p className="err" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? 'Създавам профила' : 'Създай профила ми'}
      </button>
    </form>
  );
}
