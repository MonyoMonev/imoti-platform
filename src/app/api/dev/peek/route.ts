import { NextResponse } from 'next/server';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Само за тестовете при разработка: последните записи в базата. В продукция не съществува.
export async function GET() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_PEEK) return new NextResponse('Not found', { status: 404 });
  const [leads, sessions, notifications, views, users] = await Promise.all([
    q(`select l.*, u.first_name as broker_first from leads l left join users u on u.id = l.broker_id where not l.demo order by l.id desc limit 5`),
    q(`select * from chat_sessions where not demo order by started_at desc limit 5`),
    q(`select * from notifications where not demo order by id desc limit 5`),
    q(`select * from page_views where not demo order by id desc limit 8`),
    q(`select id, role, first_name, last_name, phone from users order by id desc limit 5`),
  ]);
  const events = sessions[0] ? await q(`select type, step, value from chat_events where session_id = $1 order by id`, [sessions[0].id]) : [];
  return NextResponse.json({ leads, sessions, events, notifications, views, users });
}
