import { q, q1 } from '@/lib/db';
import { LEAD_STATUS, fullName } from '@/lib/format';
import { notifyLead } from '@/lib/notify';
import { bad, ok, staffOrError, text } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

// Действия по запитване: смяна на статус, бележка, разпределяне (само шефът).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await staffOrError();
  if (r.error) return r.error;
  const u = r.user;
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id)) return bad('Няма такова запитване.', 404);
  const lead = await q1(`select id, broker_id, status from leads where id = $1`, [id]);
  // Чуждо запитване за брокера изглежда като несъществуващо.
  if (!lead || (u.role !== 'boss' && lead.broker_id !== u.id)) return bad('Няма такова запитване.', 404);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');

  if (action === 'status') {
    const status = String(body.status || '');
    if (!LEAD_STATUS[status]) return bad('Непознат статус.');
    if (status !== lead.status) {
      await q(`update leads set status = $1, updated_at = now() where id = $2`, [status, id]);
      await q(`insert into lead_notes (lead_id, user_id, kind, body) values ($1, $2, 'status', $3)`, [
        id,
        u.id,
        `Статус: ${LEAD_STATUS[status]}`,
      ]);
    }
    return ok({ status });
  }

  if (action === 'note') {
    const note = text(body.body, 1200);
    if (!note) return bad('Напиши бележката.');
    await q(`insert into lead_notes (lead_id, user_id, kind, body) values ($1, $2, 'note', $3)`, [id, u.id, note]);
    await q(`update leads set updated_at = now() where id = $1`, [id]);
    return ok();
  }

  if (action === 'assign') {
    if (u.role !== 'boss') return bad('Разпределя само управителят.', 403);
    const target = await q1(
      `select id, first_name, last_name from users where id = $1 and role in ('boss', 'broker') and active`,
      [Number(body.broker_id)]
    );
    if (!target) return bad('Избраният брокер не е активен.');
    if (target.id === lead.broker_id) return ok({ same: true });
    await q(`update leads set broker_id = $1, updated_at = now() where id = $2`, [target.id, id]);
    await q(`insert into lead_notes (lead_id, user_id, kind, body) values ($1, $2, 'assign', $3)`, [
      id,
      u.id,
      `Разпределено на ${fullName(target)}`,
    ]);
    const sent = await notifyLead(id);
    return ok({ notified: sent.status, channel: sent.channel });
  }

  return bad('Непознато действие.');
}
