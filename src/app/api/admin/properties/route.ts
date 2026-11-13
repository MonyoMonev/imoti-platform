import { q1 } from '@/lib/db';
import { slugify } from '@/lib/format';
import { bad, ok, staffOrError } from '@/lib/admin-api';
import { nextRef, uniqueSlug } from '@/lib/admin-data';
import { propertyInput } from '@/lib/admin-write';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const r = await staffOrError();
  if (r.error) return r.error;
  const body = await req.json().catch(() => ({}));
  const parsed = await propertyInput(body, r.user, null);
  if (parsed.error || !parsed.data) return bad(parsed.error || 'Провери полетата.');
  const d = parsed.data;
  const slug = await uniqueSlug('properties', slugify(`${d.title} ${d.district}`));
  const ref = await nextRef();
  const row = await q1(
    `insert into properties (slug, ref, title, deal, kind, rooms, area, yard, floor, floors, district, address, price, year_built,
        construction, heating, furnishing, features, teaser, description, photos, broker_id, status, featured)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$20,$21::jsonb,$22,$23,$24)
     returning id, slug, ref`,
    [
      slug, ref, d.title, d.deal, d.kind, d.rooms, d.area, d.yard, d.floor, d.floors, d.district, d.address, d.price, d.year_built,
      d.construction, d.heating, d.furnishing, JSON.stringify(d.features), d.teaser, d.description, JSON.stringify(d.photos),
      d.broker_id, d.status, d.featured,
    ]
  );
  return ok({ id: row!.id, slug: row!.slug, ref: row!.ref });
}
