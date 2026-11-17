import { q } from '@/lib/db';
import { inviteCode } from '@/lib/password';
import { BRAND } from '@/lib/brand';
import { bossOrError, ok, text } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

// Нова покана за брокер: код за еднократна употреба, валиден 7 дни.
export async function POST(req: Request) {
  const r = await bossOrError();
  if (r.error) return r.error;
  const body = (await req.json().catch(() => null)) || {};
  const note = text(body.note, 120) || null;
  let code = '';
  for (let i = 0; i < 6; i++) {
    code = inviteCode();
    const rows = await q(
      `insert into invites (code, created_by, note, expires_at) values ($1, $2, $3, now() + interval '7 days')
       on conflict (code) do nothing returning code`,
      [code, r.user.id, note]
    );
    if (rows.length) break;
    code = '';
  }
  if (!code) return ok({ code: null });
  return ok({ code, link: `${BRAND.siteUrl}/admin/pokana?kod=${code}` });
}
