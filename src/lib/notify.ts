import 'server-only';
import { q, q1 } from './db';
import { BRAND } from './brand';
import { phoneText, sourceLabel } from './format';
import { summarize } from './chat-tree';
import { postToChannel } from './viber-channel';

// Известие до брокера при ново запитване.
// Основният път е личният Viber канал на брокера (свързва го сам от профила си).
// Има и резервни: Viber бот и Telegram бот с ключове в средата. Ако брокерът няма нищо
// свързано, съобщението само се записва в дневника („симулация“) и не излиза навън.

export function leadMessage(lead: any, property: any | null): string {
  const s = summarize(lead.answers || {});
  const rows: string[] = [];
  rows.push('Ново запитване от сайта');
  rows.push('');
  rows.push(`Клиент: ${lead.first_name} ${lead.last_name}`);
  rows.push(`Телефон: ${phoneText(lead.phone)}`);
  rows.push('');
  rows.push(s.title);
  for (const [label, value] of s.lines) {
    if (label === 'Бележка') continue;
    rows.push(`${label}: ${value}`);
  }
  if (lead.note) rows.push(`Бележка: ${lead.note}`);
  if (property) {
    rows.push('');
    rows.push(`Имот: ${property.title} (${property.ref})`);
  }
  rows.push(`Дошъл от: ${sourceLabel(lead.source)}`);
  rows.push('');
  rows.push(`Отвори: ${BRAND.siteUrl}/admin/zapitvania/${lead.id}`);
  return rows.join('\n');
}

async function sendViberBot(viberUserId: string, text: string) {
  const res = await fetch('https://chatapi.viber.com/pa/send_message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Viber-Auth-Token': process.env.VIBER_BOT_TOKEN! },
    body: JSON.stringify({ receiver: viberUserId, type: 'text', text, sender: { name: BRAND.full } }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.status !== 0) throw new Error(data.status_message || `Viber HTTP ${res.status}`);
}

async function sendTelegram(chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.description || `Telegram HTTP ${res.status}`);
}

/** Праща известие за запитването на брокера, на когото е разпределено. */
export async function notifyLead(leadId: number): Promise<{ status: string; channel: string }> {
  const lead = await q1(`select * from leads where id = $1`, [leadId]);
  if (!lead) return { status: 'skipped', channel: 'none' };
  const property = lead.property_id ? await q1(`select title, ref from properties where id = $1`, [lead.property_id]) : null;

  // Без брокер запитването отива при шефа, той го разпределя.
  let target = lead.broker_id
    ? await q1(
        `select u.id, u.phone, u.first_name, b.notify_channel, b.notify_phone, b.viber_user_id, b.telegram_chat_id,
                b.viber_channel_token, b.viber_channel_from, b.viber_channel_name
           from users u left join broker_profiles b on b.user_id = u.id where u.id = $1`,
        [lead.broker_id]
      )
    : null;
  if (!target) {
    target = await q1(
      `select u.id, u.phone, u.first_name, b.notify_channel, b.notify_phone, b.viber_user_id, b.telegram_chat_id,
              b.viber_channel_token, b.viber_channel_from, b.viber_channel_name
         from users u left join broker_profiles b on b.user_id = u.id where u.role = 'boss' order by u.id limit 1`
    );
  }
  if (!target) return { status: 'skipped', channel: 'none' };

  const body = leadMessage(lead, property);
  let recipient = target.notify_phone || target.phone;
  let channel = 'viber';
  let status = 'simulated';
  let error: string | null = null;

  try {
    if (target.viber_channel_token && target.viber_channel_from) {
      recipient = `канал „${target.viber_channel_name || 'Viber'}“`;
      await postToChannel(target.viber_channel_token, target.viber_channel_from, body);
      status = 'sent';
    } else if (process.env.VIBER_BOT_TOKEN && target.viber_user_id) {
      await sendViberBot(target.viber_user_id, body);
      status = 'sent';
    } else if (process.env.TELEGRAM_BOT_TOKEN && target.telegram_chat_id) {
      channel = 'telegram';
      await sendTelegram(target.telegram_chat_id, body);
      status = 'sent';
    }
  } catch (e: any) {
    status = 'failed';
    error = String(e?.message || e);
  }

  await q(
    `insert into notifications (lead_id, broker_id, channel, recipient, body, status, error) values ($1,$2,$3,$4,$5,$6,$7)`,
    [leadId, target.id, channel, recipient, body, status, error]
  );
  return { status, channel };
}
