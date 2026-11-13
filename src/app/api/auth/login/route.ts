import { NextResponse } from 'next/server';
import { q, q1 } from '@/lib/db';
import { createSession, visitorId } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { normalizePhone } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Вход с телефон и парола. Работи и за клиенти, и за брокери, и за шефа.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone || ''));
  const password = String(body.password || '');
  if (!phone || !password) {
    return NextResponse.json({ ok: false, error: 'Въведи телефон и парола.' }, { status: 400 });
  }
  const u = await q1(`select id, role, password_hash, active, first_name from users where phone = $1`, [phone]);
  if (!u || !verifyPassword(password, u.password_hash)) {
    return NextResponse.json({ ok: false, error: 'Грешен телефон или парола.' }, { status: 401 });
  }
  if (!u.active) {
    return NextResponse.json({ ok: false, error: 'Достъпът до този профил е спрян.' }, { status: 403 });
  }
  await createSession(u.id);
  const vid = await visitorId();
  if (vid && u.role === 'client') {
    await q(`update visitors set user_id = $1 where id = $2`, [u.id, vid]);
    await q(`update page_views set user_id = $1 where visitor_id = $2 and user_id is null`, [u.id, vid]);
  }
  return NextResponse.json({ ok: true, role: u.role, name: u.first_name });
}
