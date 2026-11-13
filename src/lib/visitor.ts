import 'server-only';
import { cookies, headers } from 'next/headers';
import { q } from './db';
import { randomToken } from './password';

const YEAR = 60 * 60 * 24 * 365;

export async function deviceKind(): Promise<'mobile' | 'desktop'> {
  const h = await headers();
  return /Mobi|Android|iPhone|iPad|iPod/i.test(h.get('user-agent') || '') ? 'mobile' : 'desktop';
}

/** Откъде е дошъл човекът: от ?k= в линка или по препращащия сайт. */
export function inferSource(k?: string | null, referrer?: string | null): string | null {
  const allowed = ['fb', 'ig', 'tt', 'viber', 'google'];
  if (k && allowed.includes(k)) return k;
  if (k) return k.slice(0, 20).replace(/[^a-z0-9_]/gi, '') || null;
  const ref = (referrer || '').toLowerCase();
  if (!ref) return null;
  if (ref.includes('facebook.') || ref.includes('fb.')) return 'fb';
  if (ref.includes('instagram.')) return 'ig';
  if (ref.includes('tiktok.')) return 'tt';
  if (ref.includes('viber.')) return 'viber';
  if (ref.includes('google.')) return 'google';
  return null;
}

/** Връща идентификатора на посетителя и го създава при първо посещение. */
export async function ensureVisitor(opts: { source?: string | null; refBrokerId?: number | null; userId?: number | null }) {
  const jar = await cookies();
  let vid = jar.get('vid')?.value;
  const device = await deviceKind();
  let source = jar.get('src')?.value || null;
  if (opts.source) {
    source = opts.source;
    jar.set('src', source, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
  }
  if (opts.refBrokerId) {
    jar.set('rb', String(opts.refBrokerId), { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
  }
  if (!vid || !/^[a-f0-9]{24,64}$/.test(vid)) {
    vid = randomToken(16);
    jar.set('vid', vid, { path: '/', maxAge: YEAR, sameSite: 'lax', httpOnly: true });
    await q(
      `insert into visitors (id, user_id, source, ref_broker_id, device) values ($1,$2,$3,$4,$5) on conflict (id) do nothing`,
      [vid, opts.userId ?? null, source || 'direct', opts.refBrokerId ?? null, device]
    );
  } else {
    await q(
      `insert into visitors (id, user_id, source, ref_broker_id, device) values ($1,$2,$3,$4,$5)
       on conflict (id) do update set last_seen = now(),
         user_id = coalesce(excluded.user_id, visitors.user_id),
         ref_broker_id = coalesce(excluded.ref_broker_id, visitors.ref_broker_id)`,
      [vid, opts.userId ?? null, source || 'direct', opts.refBrokerId ?? null, device]
    );
  }
  const rb = opts.refBrokerId || Number(jar.get('rb')?.value) || null;
  return { vid, source: source || 'direct', device, refBrokerId: rb };
}
