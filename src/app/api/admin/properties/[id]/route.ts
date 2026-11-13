import { q, q1 } from '@/lib/db';
import { bad, ok, staffOrError } from '@/lib/admin-api';
import { propertyInput } from '@/lib/admin-write';

export const dynamic = 'force-dynamic';

async function load(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id)) return null;
  return q1(`select * from properties where id = $1`, [id]);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await staffOrError();
  if (r.error) return r.error;
  const { id } = await ctx.params;
  const p = await load(id);
  if (!p) return bad('Няма такъв имот.', 404);
  if (r.user.role !== 'boss' && p.broker_id !== r.user.id) return bad('Този имот е на друг брокер.', 403);
  const body = await req.json().catch(() => ({}));
  const parsed = await propertyInput(body, r.user, p);
  if (parsed.error || !parsed.data) return bad(parsed.error || 'Провери полетата.');
  const d = parsed.data;
  await q(
    `update properties set title=$2, deal=$3, kind=$4, rooms=$5, area=$6, yard=$7, floor=$8, floors=$9, district=$10, address=$11,
        price=$12, year_built=$13, construction=$14, heating=$15, furnishing=$16, features=$17::jsonb, teaser=$18, description=$19,
        photos=$20::jsonb, broker_id=$21, status=$22, featured=$23, updated_at=now()
      where id = $1`,
    [
      p.id, d.title, d.deal, d.kind, d.rooms, d.area, d.yard, d.floor, d.floors, d.district, d.address, d.price, d.year_built,
      d.construction, d.heating, d.furnishing, JSON.stringify(d.features), d.teaser, d.description, JSON.stringify(d.photos),
      d.broker_id, d.status, d.featured,
    ]
  );
  return ok({ id: p.id, slug: p.slug });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await staffOrError();
  if (r.error) return r.error;
  const { id } = await ctx.params;
  const p = await load(id);
  if (!p) return bad('Няма такъв имот.', 404);
  if (r.user.role !== 'boss' && p.broker_id !== r.user.id) return bad('Този имот е на друг брокер.', 403);
  await q(`delete from favorites where property_id = $1`, [p.id]);
  await q(`update leads set property_id = null where property_id = $1`, [p.id]);
  await q(`update chat_sessions set property_id = null where property_id = $1`, [p.id]);
  await q(`delete from properties where id = $1`, [p.id]);
  return ok();
}
