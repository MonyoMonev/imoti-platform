'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LEAD_STATUS } from '@/lib/format';

async function act(id: number, body: any) {
  const res = await fetch(`/api/admin/leads/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ ok: false, error: 'Няма връзка със сървъра.' }));
}

export function StatusPicker({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function set(s: string) {
    if (s === status) return;
    setBusy(s);
    setError('');
    const r = await act(id, { action: 'status', status: s });
    setBusy('');
    if (!r.ok) setError(r.error || 'Не стана.');
    else router.refresh();
  }

  return (
    <div>
      <div className="statuspick" role="group" aria-label="Статус на запитването">
        {Object.entries(LEAD_STATUS).map(([v, label]) => (
          <button
            key={v}
            type="button"
            className={`st st-${v}`}
            aria-pressed={status === v}
            disabled={!!busy}
            onClick={() => set(v)}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}

export function NoteForm({ id }: { id: number }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError('Напиши бележката.');
      return;
    }
    setBusy(true);
    setError('');
    const r = await act(id, { action: 'note', body });
    setBusy(false);
    if (!r.ok) setError(r.error || 'Не стана.');
    else {
      setBody('');
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="field">
        <span>Нова бележка</span>
        <textarea
          name="note"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Какво си говорихте, кога е огледът, какво да не забравиш"
        />
      </label>
      <div className="formrow" style={{ marginTop: 10 }}>
        <button className="btn small" type="submit" disabled={busy}>
          {busy ? 'Записвам' : 'Запиши бележката'}
        </button>
        {error ? <span className="err">{error}</span> : null}
      </div>
    </form>
  );
}

export function AssignForm({
  id,
  brokerId,
  staff,
}: {
  id: number;
  brokerId: number | null;
  staff: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [to, setTo] = useState(String(brokerId ?? ''));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to) {
      setError('Избери брокер.');
      return;
    }
    setBusy(true);
    setError('');
    setMsg('');
    const r = await act(id, { action: 'assign', broker_id: Number(to) });
    setBusy(false);
    if (!r.ok) setError(r.error || 'Не стана.');
    else {
      setMsg(
        r.same
          ? 'Запитването вече е при този брокер.'
          : r.notified === 'sent'
            ? 'Прехвърлено. Брокерът получи съобщение.'
            : 'Прехвърлено. Съобщението е записано в Известия.'
      );
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="field">
        <span>Кой поема запитването</span>
        <select name="broker" value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Избери брокер</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="formrow" style={{ marginTop: 10 }}>
        <button className="btn small" type="submit" disabled={busy || String(brokerId ?? '') === to}>
          {busy ? 'Прехвърлям' : 'Разпредели'}
        </button>
        {error ? <span className="err">{error}</span> : null}
        {msg ? <span className="okmsg">{msg}</span> : null}
      </div>
    </form>
  );
}
