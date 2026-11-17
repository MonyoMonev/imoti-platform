import { NextResponse } from 'next/server';
import { q, q1 } from '@/lib/db';
import { createSession, visitorId } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { normalizePhone } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Регистрация на клиент: две имена, телефон и парола. Без имейл и без потвърждения.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) || {};
  const first = String(body.first_name || '').trim().slice(0, 40);
  const last = String(body.last_name || '').trim().slice(0, 40);
  const phone = normalizePhone(String(body.phone || ''));
  const password = String(body.password || '');
  if (first.length < 2 || last.length < 2) {
    return NextResponse.json({ ok: false, error: 'Напиши име и фамилия.' }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ ok: false, error: 'Телефонът не изглежда верен. Пример: 0888 123 456.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: 'Паролата трябва да е поне 6 знака.' }, { status: 400 });
  }
  const exists = await q1(`select id from users where phone = $1`, [phone]);
  if (exists) {
    return NextResponse.json({ ok: false, error: 'Вече има профил с този телефон. Влез с паролата си.' }, { status: 409 });
  }
  const u = await q1(
    `insert into users (role, first_name, last_name, phone, password_hash) values ('client',$1,$2,$3,$4) returning id`,
    [first, last, phone, hashPassword(password)]
  );
  await createSession(u.id);
  // Всичко, което човекът е правил преди регистрацията, се връзва към профила му.
  const vid = await visitorId();
  if (vid) {
    await q(`update visitors set user_id = $1 where id = $2`, [u.id, vid]);
    await q(`update page_views set user_id = $1 where visitor_id = $2 and user_id is null`, [u.id, vid]);
    await q(`update chat_sessions set user_id = $1 where visitor_id = $2 and user_id is null`, [u.id, vid]);
  }
  await q(`update leads set client_id = $1 where client_id is null and (phone = $2 or ($3::text is not null and visitor_id = $3))`, [
    u.id,
    phone,
    vid,
  ]);
  return NextResponse.json({ ok: true, role: 'client', name: first });
}
