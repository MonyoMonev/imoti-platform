'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export type NavItem = { href: string; label: string; short?: string; count?: number };

function isOn(path: string, href: string) {
  if (href === '/admin') return path === '/admin';
  return path === href || path.startsWith(href + '/');
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/vhod';
}

export default function Nav({
  brand,
  main,
  more,
  name,
  role,
  children,
}: {
  brand: string;
  main: NavItem[];
  more: NavItem[];
  name: string;
  role: string;
  children: React.ReactNode;
}) {
  const path = usePathname() || '/admin';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  const link = (it: NavItem, label = it.label) => (
    <Link key={it.href} href={it.href} aria-current={isOn(path, it.href) ? 'page' : undefined}>
      <span>{label}</span>
      {it.count ? <span className="adm-count">{it.count}</span> : null}
    </Link>
  );

  const moreOn = more.some((m) => isOn(path, m.href));

  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <Link href="/admin" className="adm-brand">
          <b>{brand}</b>
          <span>админ</span>
        </Link>
        <nav className="adm-nav" aria-label="Меню">
          {main.map((it) => link(it))}
          <hr />
          {more.map((it) => link(it))}
        </nav>
        <div className="adm-me">
          <b>{name}</b>
          <span>{role}</span>
          <nav className="adm-nav" style={{ margin: '10px -12px 0' }}>
            <a href="/" target="_blank" rel="noreferrer">
              <span>Към сайта</span>
            </a>
            <button type="button" onClick={logout}>
              <span>Изход</span>
            </button>
          </nav>
        </div>
      </aside>

      <header className="adm-top">
        <Link href="/admin" className="adm-brand">
          <b>{brand}</b>
          <span>админ</span>
        </Link>
        <span className="who3">{name}</span>
      </header>

      <main className="adm-main">{children}</main>

      {open ? (
        <div className="adm-sheet">
          <nav className="adm-nav" aria-label="Още">
            {more.map((it) => link(it))}
            <hr />
            <a href="/" target="_blank" rel="noreferrer">
              <span>Към сайта</span>
            </a>
            <button type="button" onClick={logout}>
              <span>Изход</span>
            </button>
          </nav>
        </div>
      ) : null}

      <nav className="adm-tabs" aria-label="Бързо меню">
        {main.map((it) => (
          <Link key={it.href} href={it.href} aria-current={!open && isOn(path, it.href) ? 'page' : undefined}>
            {it.short || it.label}
            {it.count ? <span className="adm-count">{it.count}</span> : null}
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={open || moreOn}
          onClick={() => setOpen((v) => !v)}
        >
          Още
        </button>
      </nav>
    </div>
  );
}
