import { q, q1 } from '@/lib/db';
import { BRAND } from '@/lib/brand';
import { bad, ok, staffOrError } from '@/lib/admin-api';
import { ViberError, connectChannel, postToChannel } from '@/lib/viber-channel';

export const dynamic = 'force-dynamic';

// Свързване на личния Viber канал на влезлия брокер.
export async function POST(req: Request) {
  const r = await staffOrError();
  if (r.error) return r.error;
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || '').trim();
  if (token.length < 20 || token.length > 200 || /\s/.test(token)) {
    return bad('Това не прилича на токен от Viber. Копирай го целия от „Developer Tools“ в канала.');
  }
  try {
    const ch = await connectChannel(token);
    await postToChannel(
      token,
      ch.from,
      `Каналът е свързан с ${BRAND.full}.\n\nТук ще идва съобщение при всяко ново запитване към ${r.user.first_name} ${r.user.last_name}: кой е клиентът, телефонът му и какво търси.`
    );
    await q(
      `update broker_profiles set viber_channel_token = $2, viber_channel_from = $3, viber_channel_name = $4, notify_channel = 'viber'
        where user_id = $1`,
      [r.user.id, token, ch.from, ch.name]
    );
    return ok({ name: ch.name });
  } catch (e: any) {
    if (e instanceof ViberError) return bad(e.message, 422);
    return bad('Свързването не стана. Опитай пак.', 500);
  }
}

export async function DELETE() {
  const r = await staffOrError();
  if (r.error) return r.error;
  await q(
    `update broker_profiles set viber_channel_token = null, viber_channel_from = null, viber_channel_name = null where user_id = $1`,
    [r.user.id]
  );
  return ok();
}

export async function GET() {
  const r = await staffOrError();
  if (r.error) return r.error;
  const row = await q1(`select viber_channel_name as name, (viber_channel_token is not null) as on from broker_profiles where user_id = $1`, [r.user.id]);
  return ok({ connected: !!row?.on, name: row?.name || null });
}
