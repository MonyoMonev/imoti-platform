import { q1 } from '@/lib/db';
import { BRAND } from '@/lib/brand';
import { bad, ok, staffOrError } from '@/lib/admin-api';
import { ViberError, postToChannel } from '@/lib/viber-channel';

export const dynamic = 'force-dynamic';

// Пробно съобщение в свързания канал, за да се види как изглежда истинското.
export async function POST() {
  const r = await staffOrError();
  if (r.error) return r.error;
  const b = await q1(`select viber_channel_token as token, viber_channel_from as from_id from broker_profiles where user_id = $1`, [r.user.id]);
  if (!b?.token || !b?.from_id) return bad('Първо свържи канал.');
  const text = [
    'Пробно съобщение',
    '',
    'Клиент: Иван Петров',
    'Телефон: 0888 123 456',
    '',
    'Купува',
    'Имот: Апартамент',
    'Стаи: Тристаен',
    'Район: Чайка, Бриз',
    'Бюджет: 130 000 до 200 000 €',
    '',
    `Така ще изглежда всяко ново запитване от сайта на ${BRAND.full}.`,
  ].join('\n');
  try {
    await postToChannel(b.token, b.from_id, text);
    return ok();
  } catch (e: any) {
    if (e instanceof ViberError) return bad(e.message, 422);
    return bad('Изпращането не стана. Опитай пак.', 500);
  }
}
