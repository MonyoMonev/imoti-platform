'use client';

import { useEffect } from 'react';

let lastKey = '';
let lastAt = 0;

/** Записва разглеждането на страницата и откъде е дошъл човекът. */
export default function Tracker({ kind, propertyId, brokerId }: { kind: string; propertyId?: number; brokerId?: number }) {
  useEffect(() => {
    const key = `${window.location.pathname}|${kind}`;
    const now = Date.now();
    if (key === lastKey && now - lastAt < 1500) return;
    lastKey = key;
    lastAt = now;
    const k = new URLSearchParams(window.location.search).get('k');
    fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname, kind, propertyId, brokerId, k, ref: document.referrer }),
      keepalive: true,
    }).catch(() => {});
  }, [kind, propertyId, brokerId]);
  return null;
}
