import { NextResponse } from 'next/server';
import { q1 } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const row = await q1(
    `select (select count(*)::int from users) as users,
            (select count(*)::int from properties) as properties,
            (select count(*)::int from chat_sessions) as chats,
            (select count(*)::int from leads) as leads,
            (select count(*)::int from page_views) as views`
  );
  return NextResponse.json({ ok: true, ...row });
}
