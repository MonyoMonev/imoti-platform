import 'server-only';
import { BRAND } from './brand';

// Известия през Viber канал (Channels Post API).
// Брокерът си прави частен канал, взима токена му от „Developer Tools“ и го слага
// в профила си. Сайтът публикува в канала и съобщението му излиза във Viber.
// Документация: https://developers.viber.com/docs/tools/channels-post-api/

const API = (process.env.VIBER_API_BASE || 'https://chatapi.viber.com').replace(/\/$/, '');

const ERRORS: Record<number, string> = {
  1: 'Viber не прие адреса на сайта за обратна връзка.',
  2: 'Токенът не е верен. Копирай го пак от канала, целия.',
  3: 'Viber отказа заявката като невалидна.',
  4: 'Viber отказа заявката: липсват данни.',
  7: 'Каналът е блокиран от Viber.',
  8: 'Viber не намира канал с този токен.',
  9: 'Каналът е спрян от Viber.',
  10: 'Каналът още не е свързан със сайта. Свържи го наново.',
  12: 'Viber временно ограничи изпращането. Опитай след малко.',
};

export class ViberError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

async function call(path: string, token: string, body: Record<string, any> = {}): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API}/pa/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Viber-Auth-Token': token },
      body: JSON.stringify({ auth_token: token, ...body }),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ViberError(-1, 'Няма връзка с Viber. Опитай пак след малко.');
  }
  const data: any = await res.json().catch(() => null);
  if (!data || typeof data.status !== 'number') throw new ViberError(-2, `Viber върна неочакван отговор (${res.status}).`);
  if (data.status !== 0) {
    throw new ViberError(data.status, ERRORS[data.status] || `Viber върна грешка ${data.status}: ${data.status_message || 'без описание'}.`);
  }
  return data;
}

export function webhookUrl(): string | null {
  const url = process.env.VIBER_WEBHOOK_URL || `${BRAND.siteUrl}/api/viber/webhook`;
  return url.startsWith('https://') ? url : null;
}

/** Свързва канала със сайта и връща от чие име се публикува и как се казва каналът. */
export async function connectChannel(token: string): Promise<{ from: string; name: string }> {
  const hook = webhookUrl();
  if (!hook) throw new ViberError(-3, 'Свързването става от качения сайт, не от локалното копие.');
  await call('set_webhook', token, { url: hook });
  const info = await call('get_account_info', token);
  const members: any[] = Array.isArray(info.members) ? info.members : [];
  const admin = members.find((m) => m.role === 'superadmin') || members.find((m) => m.role === 'admin');
  if (!admin?.id) throw new ViberError(-4, 'Viber не върна собственика на канала. Провери дали ти си го създал.');
  return { from: String(admin.id), name: String(info.name || info.uri || 'Viber канал').slice(0, 80) };
}

export async function postToChannel(token: string, from: string, text: string): Promise<void> {
  await call('post', token, { from, type: 'text', text: text.slice(0, 6900) });
}
