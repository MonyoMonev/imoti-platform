'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';

type HeaderUser = { first_name: string; role: string } | null;

const NAV = [
  { href: '/imoti', label: 'Имоти' },
  { href: '/brokeri', label: 'Брокери' },
  { href: '/za-nas', label: 'За агенцията' },
  { href: '/kontakti', label: 'Контакти' },
];

export function Logo({ small = false }: { small?: boolean }) {
  const [first, ...rest] = BRAND.name.split(' ');
  return (
    <span className={`logo${small ? ' logo--small' : ''}`}>
      <svg className="logo__mark" viewBox="0 0 28 28" aria-hidden="true">
        <path d="M2 6h24L14 24z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
        <path d="M14 24V6H2z" fill="currentColor" />
      </svg>
      <span className="logo__word">
        <b>{first}</b>
        {rest.length ? ` ${rest.join(' ')}` : ''}
      </span>
      <span className="logo__sub">{BRAND.sub}</span>
    </span>
  );
}

export default function Header({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
    return () => document.documentElement.classList.remove('menu-open');
  }, [open]);

  const account = user
    ? user.role === 'client'
      ? { href: '/profil', label: user.first_name }
      : { href: '/admin', label: 'Админ панел' }
    : { href: '/vhod', label: 'Вход' };

  return (
    <header className={`hdr${pathname === '/' ? ' hdr--home' : ''}`}>
      <div className="hdr__in">
        <Link href="/" className="hdr__logo" aria-label={`${BRAND.full}, начало`}>
          <Logo />
        </Link>
        <nav className="hdr__nav" aria-label="Основна навигация">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={pathname.startsWith(n.href) ? 'is-active' : ''}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hdr__right">
          <a className="hdr__phone" href={`tel:${BRAND.phoneHref}`}>
            {BRAND.phone}
          </a>
          <Link className="hdr__account" href={account.href}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="7" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3.5 17.5c.8-3.3 3.3-5 6.5-5s5.700 1.700 6.500 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span>{account.label}</span>
          </Link>
          <button className="hdr__burger" aria-label={open ? 'Затвори менюто' : 'Отвори менюто'} aria-expanded={open} onClick={() => setOpen(!open)}>
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={`menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <nav className="menu__nav">
          {[{ href: '/', label: 'Начало' }, ...NAV].map((n, i) => (
            <Link key={n.href} href={n.href} style={{ ['--i' as any]: i }} tabIndex={open ? 0 : -1}>
              <small>{String(i + 1).padStart(2, '0')}</small>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="menu__foot">
          <Link href={account.href} tabIndex={open ? 0 : -1}>
            {account.label}
          </Link>
          <a href={`tel:${BRAND.phoneHref}`} tabIndex={open ? 0 : -1}>
            {BRAND.phone}
          </a>
          <span>{BRAND.address}</span>
        </div>
      </div>
    </header>
  );
}
