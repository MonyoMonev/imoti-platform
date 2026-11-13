'use client';

import Link from 'next/link';
import { useState } from 'react';

/** Запазване на имот в профила. Ако човекът не е влязъл, му казваме как. */
export default function FavButton({ propertyId, initial, loggedIn }: { propertyId: number; initial: boolean; loggedIn: boolean }) {
  const [on, setOn] = useState(initial);
  const [ask, setAsk] = useState(false);
  const toggle = async () => {
    if (!loggedIn) return setAsk(true);
    const next = !on;
    setOn(next);
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ propertyId, on: next }),
    });
    if (!res.ok) setOn(!next);
  };
  return (
    <>
      <button type="button" className={`fav${on ? ' is-on' : ''}`} onClick={toggle} aria-pressed={on}>
        <svg viewBox="0 0 22 22" aria-hidden="true">
          <path d="M11 19s-7-4.300-7-9.500A3.900 3.900 0 0 1 11 7a3.900 3.900 0 0 1 7 2.500C18 14.700 11 19 11 19z" fill="none" stroke="currentColor" strokeWidth="1.600" />
        </svg>
        {on ? 'Запазен в профила ти' : 'Запази имота'}
      </button>
      {ask && (
        <p className="fav__hint">
          За да пазиш имоти, <Link href="/vhod">влез</Link> или си <Link href="/registracia">направи профил</Link>. Отнема половин минута.
        </p>
      )}
    </>
  );
}
