import { q, q1 } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { normalizePhone, slugify } from '@/lib/format';
import { bad, ok, text } from '@/lib/admin-api';
import { uniqueSlug } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

// Приемане на покана: кодът прави човека брокер. Без имейл и без потвърждение.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) || {};
  const code = text(body.code, 12).toUpperCase();
  const first = text(body.first_name, 40);
  const last = text(body.last_name, 40);
  const phone = normalizePhone(String(body.phone || ''));
  const password = String(body.password || '');

  if (!code) return bad('Въведи кода за покана.');
  const inv = await q1(`select code, used_at, revoked, (expires_at < now()) as expired from invites where code = $1`, [code]);
  if (!inv) return bad('Не намираме такъв код. Провери дали е изписан точно.', 404);
  if (inv.used_at) return bad('Този код вече е използван.', 409);
  if (inv.revoked) return bad('Тази покана е отменена. Поискай нова от управителя.', 410);
  if (inv.expired) return bad('Срокът на тази покана е изтекъл. Поискай нова от управителя.', 410);

  if (first.length < 2 || last.length < 2) return bad('Напиши име и фамилия.');
  if (!phone) return bad('Телефонът не изглежда верен. Пример: 0888 123 456.');
  if (password.length < 6) return bad('Паролата трябва да е поне 6 знака.');
  const taken = await q1(`select id from users where phone = $1`, [phone]);
  if (taken) return bad('Вече има профил с този телефон. Влез с него или ползвай друг номер.', 409);

  // Кодът се заема първи, за да не може да се използва два пъти едновременно.
  const claimed = await q(
    `update invites set used_at = now() where code = $1 and used_at is null and not revoked and expires_at > now() returning code`,
    [code]
  );
  if (claimed.length === 0) return bad('Този код вече е използван.', 409);

  let u: { id: number };
  try {
    u = (await q1(
      `insert into users (role, first_name, last_name, phone, password_hash) values ('broker', $1, $2, $3, $4) returning id`,
      [first, last, phone, hashPassword(password)]
    ))!;
  } catch {
    // Профилът не се създаде (например същият телефон е записан в същия миг): кодът се освобождава.
    await q(`update invites set used_at = null where code = $1 and used_by is null`, [code]);
    return bad('Не успяхме да създадем профила. Опитай пак.', 409);
  }
  const slug = await uniqueSlug('broker_profiles', slugify(`${first} ${last}`));
  const sort = (await q1(`select coalesce(max(sort), 0)::int + 10 as n from broker_profiles where sort < 90`))!.n;
  await q(
    `insert into broker_profiles (user_id, slug, title, notify_phone, visible, sort) values ($1, $2, 'Брокер', $3, false, $4)`,
    [u.id, slug, phone, sort]
  );
  await q(`update invites set used_by = $1 where code = $2`, [u.id, code]);
  await createSession(u.id);
  return ok({ role: 'broker' });
}
