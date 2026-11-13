'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function WipeDemo({ total }: { total: number }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (done || total === 0) {
    return <p className="okmsg">{done ? 'Примерните данни са изтрити. Оттук нататък всичко в панела е истинско.' : 'Няма примерни данни. Всичко в панела е истинско.'}</p>;
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'wipe-demo', confirm }),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!data.ok) {
          setError(data.error || 'Не стана.');
          return;
        }
        setDone(true);
        router.refresh();
      }}
    >
      <label className="field" style={{ maxWidth: 320 }}>
        <span>Напиши ИЗТРИЙ, за да потвърдиш</span>
        <input type="text" name="confirm" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <div className="formrow">
        <button className="btn primary" type="submit" disabled={busy || confirm.trim().toUpperCase() !== 'ИЗТРИЙ'}>
          {busy ? 'Трия' : 'Изтрий примерните данни'}
        </button>
        {error ? <span className="err">{error}</span> : null}
      </div>
    </form>
  );
}
