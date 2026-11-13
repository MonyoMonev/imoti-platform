import { q1 } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Качените снимки стоят в базата и се подават оттук. Името е случайно и не се променя,
// затова браузърът и мрежата за доставка могат да ги пазят завинаги.
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const name = (parts || []).join('/');
  if (!/^[a-z0-9]{8,64}\.(jpg|jpeg|png|webp)$/.test(name)) return new Response('Not found', { status: 404 });
  const row = await q1<{ mime: string; data: Uint8Array }>(`select mime, data from media where name = $1`, [name]);
  if (!row) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(row.data) as unknown as BodyInit, {
    headers: {
      'content-type': row.mime,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
