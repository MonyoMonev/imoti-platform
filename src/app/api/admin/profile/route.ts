import { q, q1 } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { normalizePhone } from '@/lib/format';
import { bad, ok, staffOrError, text } from '@/lib/admin-api';
import { profileInput, saveProfile } from '@/lib/admin-write';

export const dynamic = 'force-dynamic';

// Собственият профил на влезлия брокер или управител.
export async function POST(req: Request) {
  const r = await staffOrError();
  if (r.error) return r.error;
  const u = r.user;
  const body = await req.json().catch(() => ({}));
  const section = String(body.section || '');

  if (section === 'account') {
    const first = text(body.first_name, 40);
    const last = text(body.last_name, 40);
    const phone = normalizePhone(String(body.phone || ''));
    const notify = body.notify_phone ? normalizePhone(String(body.notify_phone)) : phone;
    if (first.length < 2 || last.length < 2) return bad('Напиши име и фамилия.');
    if (!phone) return bad('Телефонът не изглежда верен. Пример: 0888 123 456.');
    if (!notify) return bad('Номерът за известия не изглежда верен.');
    const taken = await q1(`select id from users where phone = $1 and id <> $2`, [phone, u.id]);
    if (taken) return bad('Този телефон вече се ползва от друг профил.', 409);
    await q(`update users set first_name = $2, last_name = $3, phone = $4 where id = $1`, [u.id, first, last, phone]);
    await q(`update broker_profiles set notify_phone = $2 where user_id = $1`, [u.id, notify]);
    return ok();
  }

  if (section === 'password') {
    const current = String(body.current || '');
    const next = String(body.next || '');
    const row = await q1(`select password_hash from users where id = $1`, [u.id]);
    if (!row || !verifyPassword(current, row.password_hash)) return bad('Сегашната парола не е вярна.', 403);
    if (next.length < 6) return bad('Новата парола трябва да е поне 6 знака.');
    await q(`update users set password_hash = $2 where id = $1`, [u.id, hashPassword(next)]);
    return ok();
  }

  if (section === 'public') {
    await saveProfile(u.id, profileInput(body));
    return ok();
  }

  return bad('Непознато действие.');
}
