import { q, q1 } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { fullName, toId } from '@/lib/format';
import { bad, bossOrError, intOrNull, ok, text } from '@/lib/admin-api';
import { profileInput, saveProfile } from '@/lib/admin-write';

export const dynamic = 'force-dynamic';

// Управление на екипа. Всичко тук е само за управителя.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await bossOrError();
  if (r.error) return r.error;
  const { id: raw } = await ctx.params;
  const id = toId(raw);
  const target = id
    ? await q1(`select id, role, active, first_name, last_name from users where id = $1 and role in ('boss', 'broker')`, [id])
    : null;
  if (!target) return bad('Няма такъв човек в екипа.', 404);
  const body = (await req.json().catch(() => null)) || {};
  const action = String(body.action || '');

  if (action === 'deactivate') {
    if (target.id === r.user.id || target.role === 'boss') return bad('Профилът на управителя не може да се спира.');
    let moved = 0;
    if (body.move_to) {
      const moveTo = toId(body.move_to);
      const to = moveTo
        ? await q1(`select id, first_name, last_name from users where id = $1 and role in ('boss', 'broker') and active`, [moveTo])
        : null;
      if (!to || to.id === target.id) return bad('Избери активен колега, който да поеме имотите.');
      const props = await q(`update properties set broker_id = $1, updated_at = now() where broker_id = $2 returning id`, [to.id, target.id]);
      const leads = await q(
        `update leads set broker_id = $1, updated_at = now() where broker_id = $2 and status in ('new', 'contacted', 'viewing') returning id`,
        [to.id, target.id]
      );
      for (const l of leads) {
        await q(`insert into lead_notes (lead_id, user_id, kind, body) values ($1, $2, 'assign', $3)`, [
          l.id,
          r.user.id,
          `Прехвърлено от ${fullName(target)} на ${fullName(to)}`,
        ]);
      }
      moved = props.length;
    }
    await q(`update users set active = false where id = $1`, [target.id]);
    await q(`delete from sessions where user_id = $1`, [target.id]);
    await q(`update broker_profiles set visible = false where user_id = $1`, [target.id]);
    return ok({ moved });
  }

  if (action === 'activate') {
    await q(`update users set active = true where id = $1`, [target.id]);
    return ok();
  }

  if (action === 'visibility') {
    const sort = intOrNull(body.sort);
    await q(`update broker_profiles set visible = $2, sort = coalesce($3, sort) where user_id = $1`, [target.id, !!body.visible, sort]);
    return ok();
  }

  if (action === 'password') {
    const pw = String(body.password || '');
    if (pw.length < 6) return bad('Паролата трябва да е поне 6 знака.');
    await q(`update users set password_hash = $2 where id = $1`, [target.id, hashPassword(pw)]);
    if (target.id !== r.user.id) await q(`delete from sessions where user_id = $1`, [target.id]);
    return ok();
  }

  if (action === 'profile') {
    const first = text(body.first_name, 40);
    const last = text(body.last_name, 40);
    if (first.length < 2 || last.length < 2) return bad('Напиши име и фамилия.');
    await q(`update users set first_name = $2, last_name = $3 where id = $1`, [target.id, first, last]);
    await saveProfile(target.id, profileInput(body));
    return ok();
  }

  return bad('Непознато действие.');
}
