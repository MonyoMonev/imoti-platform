import 'server-only';
import { q, q1 } from './db';
import type { User } from './auth';
import { KINDS, toId } from './format';
import { intOrNull, list, text } from './admin-api';

// Проверка и подготовка на данните, които идват от формите на панела.

const STATUSES = ['draft', 'active', 'reserved', 'sold'];

function cleanPhotos(v: any): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = String(x || '');
    if (/^\/(img|media)\/[A-Za-z0-9_\-./]+\.(jpg|jpeg|png|webp)$/.test(s) && !s.includes('..') && !out.includes(s)) out.push(s);
    if (out.length >= 30) break;
  }
  return out;
}

export async function propertyInput(body: any, user: User, existing: any | null) {
  const title = text(body.title, 120);
  const deal = String(body.deal || '');
  const kind = String(body.kind || '');
  const area = intOrNull(body.area);
  const price = intOrNull(body.price);
  const district = text(body.district, 60);
  const status = STATUSES.includes(String(body.status)) ? String(body.status) : existing?.status || 'active';

  if (title.length < 4) return { error: 'Напиши заглавие на имота, поне няколко думи.' };
  if (deal !== 'sale' && deal !== 'rent') return { error: 'Избери продажба или наем.' };
  if (!KINDS[kind]) return { error: 'Избери вид на имота.' };
  if (!area || area <= 0) return { error: 'Въведи площта в квадратни метри.' };
  if (!price || price <= 0) return { error: 'Въведи цената в евро.' };
  if (!district) return { error: 'Избери или напиши района.' };

  // Границите са широки, но пазят базата от невъзможни числа.
  const rooms = intOrNull(body.rooms);
  const yard = intOrNull(body.yard);
  const floor = intOrNull(body.floor);
  const floors = intOrNull(body.floors);
  const yearBuilt = intOrNull(body.year_built);
  // Попълнено поле, което не е число в разумни граници, се връща с ясно съобщение, вместо да се изтрие тихо.
  const off = (raw: unknown, v: number | null, min: number, max: number) =>
    v === null ? raw !== null && raw !== undefined && String(raw).trim() !== '' : v < min || v > max;
  if (area > 1000000) return { error: 'Площта изглежда твърде голяма. Провери числото.' };
  if (price > 2000000000) return { error: 'Цената изглежда твърде голяма. Провери числото.' };
  if (off(body.rooms, rooms, 0, 50)) return { error: 'Броят стаи не изглежда верен.' };
  if (off(body.yard, yard, 0, 10000000)) return { error: 'Площта на двора не изглежда вярна.' };
  if (off(body.floor, floor, -5, 200) || off(body.floors, floors, 1, 200)) return { error: 'Етажът не изглежда верен.' };
  if (off(body.year_built, yearBuilt, 1800, 2100)) return { error: 'Годината на строеж не изглежда вярна.' };

  let brokerId: number = existing?.broker_id ?? user.id;
  let featured: boolean = existing?.featured ?? false;
  if (user.role === 'boss') {
    if (body.broker_id !== undefined && body.broker_id !== null && body.broker_id !== '') {
      const wanted = toId(body.broker_id);
      const b = wanted ? await q1(`select id from users where id = $1 and role in ('boss', 'broker') and active`, [wanted]) : null;
      if (!b) return { error: 'Избраният брокер не е активен.' };
      brokerId = b.id;
    }
    if (body.featured !== undefined) featured = !!body.featured;
  }

  return {
    data: {
      title,
      deal,
      kind,
      rooms,
      area,
      yard,
      floor,
      floors,
      district,
      address: text(body.address, 160) || null,
      price,
      year_built: yearBuilt,
      construction: text(body.construction, 60) || null,
      heating: text(body.heating, 80) || null,
      furnishing: text(body.furnishing, 60) || null,
      features: list(body.features, 16, 60),
      teaser: text(body.teaser, 160) || null,
      description: text(body.description, 6000) || null,
      photos: cleanPhotos(body.photos),
      status,
      featured,
      broker_id: brokerId,
    },
  };
}

export function profileInput(body: any) {
  const facts: [string, string][] = [];
  if (Array.isArray(body.facts)) {
    for (const f of body.facts) {
      const n = text(Array.isArray(f) ? f[0] : f?.n, 12);
      const l = text(Array.isArray(f) ? f[1] : f?.l, 60);
      if (n && l) facts.push([n, l]);
      if (facts.length >= 3) break;
    }
  }
  const photo = String(body.photo || '');
  return {
    title: text(body.title, 80) || 'Брокер',
    quote: text(body.quote, 160) || null,
    pitch: text(body.pitch, 420) || null,
    bio: text(body.bio, 3000) || null,
    since_year: intOrNull(body.since_year),
    deals: intOrNull(body.deals),
    areas: list(body.areas, 8, 40),
    languages: list(body.languages, 6, 30),
    facts,
    photo: /^\/(img|media)\/[A-Za-z0-9_\-./]+\.(jpg|jpeg|png|webp)$/.test(photo) && !photo.includes('..') ? photo : null,
  };
}

export async function saveProfile(userId: number, p: ReturnType<typeof profileInput>) {
  await q(
    `update broker_profiles set title = $2, quote = $3, pitch = $4, bio = $5, since_year = $6, deals = $7,
            areas = $8::jsonb, languages = $9::jsonb, facts = $10::jsonb, photo = $11
      where user_id = $1`,
    [
      userId,
      p.title,
      p.quote,
      p.pitch,
      p.bio,
      p.since_year,
      p.deals,
      JSON.stringify(p.areas),
      JSON.stringify(p.languages),
      JSON.stringify(p.facts),
      p.photo,
    ]
  );
}
