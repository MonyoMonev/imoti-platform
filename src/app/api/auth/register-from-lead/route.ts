import { NextResponse } from 'next/server';
import { q, q1 } from '@/lib/db';
import { createSession, visitorId } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

// След изпратено запитване човекът може да си направи профил само с парола:
// имената и телефонът идват от запитването, което току що е оставил.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: 'Паролата трябва да е поне 6 знака.' }, { status: 400 });
  }
  const vid = await visitorId();
  if (!vid) return NextResponse.json({ ok: false, error: 'Не намерихме запитването ти. Регистрирай се от страницата за вход.' }, { status: 400 });
  const lead = await q1(
    `select id, first_name, last_name, phone from leads
      where visitor_id = $1 and created_at > now() - interval '2 hours' order by created_at desc limit 1`,
    [vid]
  );
  if (!lead) {
    return NextResponse.json({ ok: false, error: 'Не намерихме запитването ти. Регистрирай се от страницата за вход.' }, { status: 400 });
  }
  const exists = await q1(`select id from users where phone = $1`, [lead.phone]);
  if (exists) {
    return NextResponse.json({ ok: false, error: 'Вече има профил с този телефон. Влез с паролата си.' }, { status: 409 });
  }
  const u = await q1(
    `insert into users (role, first_name, last_name, phone, password_hash) values ('client',$1,$2,$3,$4) returning id`,
    [lead.first_name, lead.last_name, lead.phone, hashPassword(password)]
  );
  await createSession(u.id);
  await q(`update visitors set user_id = $1 where id = $2`, [u.id, vid]);
  await q(`update page_views set user_id = $1 where visitor_id = $2 and user_id is null`, [u.id, vid]);
  await q(`update chat_sessions set user_id = $1 where visitor_id = $2 and user_id is null`, [u.id, vid]);
  await q(`update leads set client_id = $1 where client_id is null and (phone = $2 or visitor_id = $3)`, [u.id, lead.phone, vid]);
  return NextResponse.json({ ok: true });
}
