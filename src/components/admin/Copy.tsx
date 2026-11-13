'use client';

import { useState } from 'react';

export default function CopyButton({ text, label = 'Копирай', small = true }: { text: string; label?: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }
  return (
    <button type="button" className={`btn${small ? ' small' : ''}`} onClick={copy} data-copy={text}>
      {done ? 'Копирано' : label}
    </button>
  );
}
