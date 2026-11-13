import 'server-only';
import { q, q1 } from './db';

// Заявки за публичната част на сайта.

export type Property = {
  id: number;
  slug: string;
  ref: string;
  title: string;
  deal: 'sale' | 'rent';
  kind: string;
  rooms: number | null;
  area: number;
  yard: number | null;
  floor: number | null;
  floors: number | null;
  district: string;
  address: string | null;
  price: number;
  year_built: number | null;
  construction: string | null;
  heating: string | null;
  furnishing: string | null;
  features: string[];
  teaser: string | null;
  description: string | null;
  photos: string[];
  broker_id: number | null;
  status: string;
  featured: boolean;
  created_at: string;
  b_first?: string;
  b_last?: string;
  b_slug?: string;
  b_photo?: string;
  b_title?: string;
  b_phone?: string;
};

export type Broker = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  slug: string;
  title: string;
  photo: string | null;
  quote: string | null;
  pitch: string | null;
  bio: string | null;
  since_year: number | null;
  deals: number | null;
  areas: string[];
  languages: string[];
  facts: [string, string][];
  listings?: number;
};

const P_COLS = `p.id, p.slug, p.ref, p.title, p.deal, p.kind, p.rooms, p.area, p.yard, p.floor, p.floors, p.district, p.address,
  p.price, p.year_built, p.construction, p.heating, p.furnishing, p.features, p.teaser, p.description, p.photos, p.broker_id,
  p.status, p.featured, p.created_at,
  u.first_name as b_first, u.last_name as b_last, u.phone as b_phone, b.slug as b_slug, b.photo as b_photo, b.title as b_title`;

const P_FROM = `from properties p left join users u on u.id = p.broker_id left join broker_profiles b on b.user_id = p.broker_id`;

function clean<T>(rows: any[]): T[] {
  // Датите стават низове, за да минават спокойно към клиентските компоненти.
  return rows.map((r) => {
    const o: any = { ...r };
    for (const k of Object.keys(o)) if (o[k] instanceof Date) o[k] = o[k].toISOString();
    return o;
  }) as T[];
}

export type PropertyFilters = {
  deal?: string;
  kind?: string;
  rooms?: string;
  district?: string;
  max?: string;
  min?: string;
  area?: string;
  broker?: string;
  sort?: string;
};

export async function listProperties(f: PropertyFilters = {}): Promise<Property[]> {
  const where: string[] = [`p.status in ('active','reserved')`];
  const params: any[] = [];
  const add = (sql: string, v: any) => {
    params.push(v);
    where.push(sql.replace('?', `$${params.length}`));
  };
  if (f.deal === 'sale' || f.deal === 'rent') add('p.deal = ?', f.deal);
  if (f.kind) add('p.kind = ?', f.kind);
  if (f.rooms && Number(f.rooms)) {
    if (Number(f.rooms) >= 4) add('p.rooms >= ?', 4);
    else add('p.rooms = ?', Number(f.rooms));
  }
  if (f.district) add('p.district = ?', f.district);
  if (f.max && Number(f.max)) add('p.price <= ?', Number(f.max));
  if (f.min && Number(f.min)) add('p.price >= ?', Number(f.min));
  if (f.area && Number(f.area)) add('p.area >= ?', Number(f.area));
  if (f.broker) add('b.slug = ?', f.broker);
  const order =
    f.sort === 'cheap' ? 'p.price asc' : f.sort === 'dear' ? 'p.price desc' : f.sort === 'big' ? 'p.area desc' : 'p.created_at desc';
  const rows = await q(`select ${P_COLS} ${P_FROM} where ${where.join(' and ')} order by ${order}`, params);
  return clean<Property>(rows);
}

export async function featuredProperties(limit = 6): Promise<Property[]> {
  const rows = await q(
    `select ${P_COLS} ${P_FROM} where p.status = 'active' order by p.featured desc, p.created_at desc limit $1`,
    [limit]
  );
  return clean<Property>(rows);
}

export async function getProperty(slug: string): Promise<Property | null> {
  const rows = await q(`select ${P_COLS} ${P_FROM} where p.slug = $1 and p.status <> 'draft'`, [slug]);
  return clean<Property>(rows)[0] ?? null;
}

export async function similarProperties(p: Property, limit = 3): Promise<Property[]> {
  const rows = await q(
    `select ${P_COLS} ${P_FROM}
      where p.status = 'active' and p.id <> $1 and p.deal = $2
      order by (p.district = $3) desc, (p.kind = $4) desc, abs(p.price - $5) asc limit $6`,
    [p.id, p.deal, p.district, p.kind, p.price, limit]
  );
  return clean<Property>(rows);
}

const B_COLS = `u.id, u.first_name, u.last_name, u.phone, u.role, b.slug, b.title, b.photo, b.quote, b.pitch, b.bio,
  b.since_year, b.deals, b.areas, b.languages, b.facts`;

export async function listBrokers(): Promise<Broker[]> {
  const rows = await q(
    `select ${B_COLS},
       (select count(*)::int from properties p where p.broker_id = u.id and p.status in ('active','reserved')) as listings
       from users u join broker_profiles b on b.user_id = u.id
      where u.active and b.visible and u.role in ('boss','broker')
      order by b.sort asc, u.id asc`
  );
  return clean<Broker>(rows);
}

/**
 * Брокер по адрес. Страницата „Брокери“ показва само видимите на сайта,
 * а линковете за оферти работят за всеки активен брокер (onlyVisible = false).
 */
export async function getBroker(slug: string, onlyVisible = true): Promise<Broker | null> {
  const rows = await q(
    `select ${B_COLS},
       (select count(*)::int from properties p where p.broker_id = u.id and p.status in ('active','reserved')) as listings
       from users u join broker_profiles b on b.user_id = u.id
      where b.slug = $1 and u.active and u.role in ('boss','broker') and (b.visible or not $2::boolean)`,
    [slug, onlyVisible]
  );
  return clean<Broker>(rows)[0] ?? null;
}

export async function getBrokerById(id: number): Promise<Broker | null> {
  const rows = await q(
    `select ${B_COLS} from users u join broker_profiles b on b.user_id = u.id where u.id = $1 and u.active`,
    [id]
  );
  return clean<Broker>(rows)[0] ?? null;
}

export async function districtCounts(): Promise<{ district: string; n: number; cover: string | null }[]> {
  const rows = await q(
    `select district, count(*)::int as n, (array_agg(photos->>0 order by featured desc, created_at desc))[1] as cover
       from properties where status in ('active','reserved') group by district order by n desc, district asc`
  );
  return rows as any;
}

export async function siteCounts(): Promise<{ properties: number; sale: number; rent: number; brokers: number }> {
  const r = await q1(
    `select (select count(*)::int from properties where status in ('active','reserved')) as properties,
            (select count(*)::int from properties where status in ('active','reserved') and deal = 'sale') as sale,
            (select count(*)::int from properties where status in ('active','reserved') and deal = 'rent') as rent,
            (select count(*)::int from users u join broker_profiles b on b.user_id = u.id where u.active and b.visible) as brokers`
  );
  return r as any;
}

export async function favoriteIds(userId: number): Promise<number[]> {
  const rows = await q<{ property_id: number }>(`select property_id from favorites where user_id = $1`, [userId]);
  return rows.map((r) => r.property_id);
}

export async function clientArea(userId: number) {
  const favorites = clean<Property>(
    await q(
      `select ${P_COLS} ${P_FROM} join favorites f on f.property_id = p.id where f.user_id = $1 order by f.created_at desc`,
      [userId]
    )
  );
  const leads = clean<any>(
    await q(
      `select l.id, l.intent, l.summary, l.status, l.created_at, l.note, p.title as p_title, p.slug as p_slug,
              u.first_name as b_first, u.last_name as b_last, u.phone as b_phone, b.photo as b_photo, b.slug as b_slug
         from leads l left join properties p on p.id = l.property_id
         left join users u on u.id = l.broker_id left join broker_profiles b on b.user_id = l.broker_id
        where l.client_id = $1 order by l.created_at desc`,
      [userId]
    )
  );
  const viewed = clean<Property & { seen_at: string }>(
    await q(
      `select ${P_COLS}, v.seen_at ${P_FROM}
         join (select property_id, max(created_at) as seen_at from page_views
                where user_id = $1 and property_id is not null group by property_id) v on v.property_id = p.id
        where p.status <> 'draft' order by v.seen_at desc limit 12`,
      [userId]
    )
  );
  return { favorites, leads, viewed };
}
