import { q } from '@/lib/db';
import { bad, bossOrError, ok } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const r = await bossOrError();
  if (r.error) return r.error;
  const body = (await req.json().catch(() => null)) || {};

  if (body.action === 'wipe-demo') {
    if (String(body.confirm || '').trim().toUpperCase() !== 'ИЗТРИЙ') return bad('Напиши ИЗТРИЙ, за да потвърдиш.');
    await q(`delete from chat_events where session_id in (select id from chat_sessions where demo)`);
    await q(`delete from lead_notes where lead_id in (select id from leads where demo)`);
    await q(`delete from notifications where demo or lead_id in (select id from leads where demo)`);
    await q(`delete from leads where demo`);
    await q(`delete from chat_sessions where demo`);
    await q(`delete from page_views where demo`);
    await q(`delete from visitors where demo`);
    return ok();
  }

  return bad('Непознато действие.');
}
