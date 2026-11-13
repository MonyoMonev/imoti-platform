import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Запазване на имот. Само за влезли клиенти.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'client') {
    return NextResponse.json({ ok: false, error: 'Влез в профила си, за да запазваш имоти.' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const propertyId = Number(body.propertyId);
  if (!propertyId) return NextResponse.json({ ok: false }, { status: 400 });
  if (body.on) {
    await q(`insert into favorites (user_id, property_id) values ($1,$2) on conflict do nothing`, [user.id, propertyId]);
  } else {
    await q(`delete from favorites where user_id = $1 and property_id = $2`, [user.id, propertyId]);
  }
  return NextResponse.json({ ok: true, on: !!body.on });
}
