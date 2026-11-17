import { NextResponse } from 'next/server';
import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ensureVisitor } from '@/lib/visitor';
import { EXIT_REASONS, cleanAnswers } from '@/lib/chat-tree';
import { toId } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TYPES = ['open', 'answer', 'skip', 'back', 'summary', 'form', 'exit', 'close'];

// Всяка стъпка от чата се записва, за да вижда шефът докъде стигат хората.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) || {};
  const sid = String(body.sid || '');
  const type = String(body.type || '');
  if (!/^[a-z0-9]{12,40}$/i.test(sid) || !TYPES.includes(type)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const step = body.step ? String(body.step).slice(0, 40) : null;
  const value = body.value == null ? null : String(Array.isArray(body.value) ? body.value.join(', ') : body.value).slice(0, 600);
  const answers = body.answers && typeof body.answers === 'object' ? cleanAnswers(body.answers) : null;

  let s = await q1(`select id from chat_sessions where id = $1`, [sid]);
  if (!s) {
    const user = await currentUser();
    const ctx = body.ctx || {};
    const v = await ensureVisitor({ userId: user?.role === 'client' ? user.id : null });
    const brokerId = toId(ctx.brokerId) || v.refBrokerId || null;
    await q(
      `insert into chat_sessions (id, visitor_id, user_id, broker_id, property_id, source, page, device, last_step)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'start') on conflict (id) do nothing`,
      [
        sid,
        v.vid,
        user?.role === 'client' ? user.id : null,
        brokerId,
        toId(ctx.propertyId),
        v.source,
        String(body.path || '/').slice(0, 200),
        v.device,
      ]
    );
    if (type !== 'open') await q(`insert into chat_events (session_id, type, step) values ($1,'open','start')`, [sid]);
  }

  await q(`insert into chat_events (session_id, type, step, value) values ($1,$2,$3,$4)`, [sid, type, step, value]);

  if (type === 'answer' || type === 'skip' || type === 'back') {
    const next = body.next ? String(body.next).slice(0, 40) : step;
    const a = answers || {};
    const count = Object.keys(a).filter((k) => a[k] !== '' && a[k] != null).length;
    await q(
      `update chat_sessions set updated_at = now(), last_step = $2, answers = $3::jsonb, answered = $4,
         intent = coalesce($5, intent) where id = $1`,
      [sid, next, JSON.stringify(a), count, typeof a.intent === 'string' ? a.intent : null]
    );
  } else if (type === 'summary') {
    await q(`update chat_sessions set updated_at = now(), reached_summary = true, last_step = 'summary' where id = $1`, [sid]);
  } else if (type === 'form') {
    await q(`update chat_sessions set updated_at = now(), reached_form = true, last_step = 'form' where id = $1`, [sid]);
  } else if (type === 'exit') {
    const reason = EXIT_REASONS.find((r) => r.v === value)?.v || null;
    await q(`update chat_sessions set updated_at = now(), exit_reason = coalesce($2, exit_reason) where id = $1`, [sid, reason]);
  } else {
    await q(`update chat_sessions set updated_at = now() where id = $1`, [sid]);
  }
  return NextResponse.json({ ok: true });
}
