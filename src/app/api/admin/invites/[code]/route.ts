import { q } from '@/lib/db';
import { bad, bossOrError, ok } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const r = await bossOrError();
  if (r.error) return r.error;
  const { code } = await ctx.params;
  const rows = await q(`update invites set revoked = true where code = $1 and used_at is null returning code`, [
    String(code).toUpperCase(),
  ]);
  if (!rows.length) return bad('Поканата вече е използвана или не съществува.', 404);
  return ok();
}
