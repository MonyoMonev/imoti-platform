import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ensureVisitor, inferSource } from '@/lib/visitor';

export const dynamic = 'force-dynamic';

// Записва разглеждане на страница. Хората от екипа не се броят.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = await currentUser();
  if (user && user.role !== 'client') return NextResponse.json({ ok: true, skipped: true });

  const kind = ['home', 'page', 'property', 'offer', 'broker'].includes(body.kind) ? body.kind : 'page';
  const path = String(body.path || '/').slice(0, 200);
  const propertyId = Number(body.propertyId) || null;
  const brokerId = Number(body.brokerId) || null;
  const source = inferSource(body.k, body.ref);

  const v = await ensureVisitor({
    source,
    refBrokerId: kind === 'offer' ? brokerId : null,
    userId: user?.id ?? null,
  });
  await q(
    `insert into page_views (visitor_id, user_id, path, kind, property_id, broker_id, source) values ($1,$2,$3,$4,$5,$6,$7)`,
    [v.vid, user?.id ?? null, path, kind, propertyId, brokerId, v.source]
  );
  return NextResponse.json({ ok: true });
}
