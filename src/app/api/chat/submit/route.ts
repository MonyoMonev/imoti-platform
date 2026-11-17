import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ensureVisitor } from '@/lib/visitor';
import { normalizePhone, phoneText, toId } from '@/lib/format';
import { cleanAnswers, summarize } from '@/lib/chat-tree';
import { notifyLead } from '@/lib/notify';

export const dynamic = 'force-dynamic';

// Финалът на чата: имена и телефон. Създава запитване и известява брокера.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) || {};
  const sid = /^[a-z0-9]{12,40}$/i.test(String(body.sid || '')) ? String(body.sid) : null;
  const first = String(body.first_name || '').trim().slice(0, 40);
  const last = String(body.last_name || '').trim().slice(0, 40);
  const phone = normalizePhone(String(body.phone || ''));
  const answers = cleanAnswers(body.answers);
  const ctx = body.ctx || {};

  if (first.length < 2) return NextResponse.json({ ok: false, field: 'first_name', error: 'Напиши името си.' }, { status: 400 });
  if (last.length < 2) return NextResponse.json({ ok: false, field: 'last_name', error: 'Напиши и фамилията си.' }, { status: 400 });
  if (!phone) {
    return NextResponse.json({ ok: false, field: 'phone', error: 'Телефонът не изглежда верен. Пример: 0888 123 456.' }, { status: 400 });
  }
  if (!body.consent) {
    return NextResponse.json({ ok: false, field: 'consent', error: 'Отбележи, че си съгласен да се свържем с теб.' }, { status: 400 });
  }

  const user = await currentUser();
  const v = await ensureVisitor({ userId: user?.role === 'client' ? user.id : null });

  const recent = await q1(
    `select count(*)::int as n from leads where visitor_id = $1 and created_at > now() - interval '1 hour'`,
    [v.vid]
  );
  if (recent && recent.n >= 5) {
    return NextResponse.json({ ok: false, error: 'Получихме няколко запитвания от теб. Ще ти се обадим скоро.' }, { status: 429 });
  }

  const session = sid ? await q1(`select * from chat_sessions where id = $1`, [sid]) : null;
  const propertyId = toId(ctx.propertyId) || session?.property_id || null;
  const property = propertyId ? await q1(`select id, broker_id from properties where id = $1`, [propertyId]) : null;

  // Брокерът: този, който е представил имота, после брокерът на самия имот, иначе шефът разпределя.
  let brokerId: number | null = toId(ctx.brokerId) || session?.broker_id || v.refBrokerId || property?.broker_id || null;
  if (brokerId) {
    const ok = await q1(`select id from users where id = $1 and active and role in ('boss','broker')`, [brokerId]);
    if (!ok) brokerId = property?.broker_id || null;
  }

  let clientId: number | null = user?.role === 'client' ? user.id : null;
  if (!clientId) {
    const known = await q1(`select id from users where phone = $1 and role = 'client'`, [phone]);
    if (known) clientId = known.id;
  }

  const s = summarize(answers);
  const note = typeof answers.note === 'string' && answers.note.trim() ? answers.note.trim().slice(0, 1000) : null;
  const lead = await q1(
    `insert into leads (broker_id, client_id, visitor_id, first_name, last_name, phone, intent, summary, answers, note,
        property_id, source, page, chat_session_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14) returning id`,
    [
      brokerId, clientId, v.vid, first, last, phone,
      typeof answers.intent === 'string' ? answers.intent : null,
      s.text, JSON.stringify(answers), note, property?.id ?? null,
      session?.source || v.source, String(body.path || session?.page || '/').slice(0, 200), sid,
    ]
  );

  if (sid) {
    await q(`insert into chat_events (session_id, type, step) values ($1,'submit','form')`, [sid]);
    await q(
      `update chat_sessions set updated_at = now(), submitted = true, reached_form = true, reached_summary = true,
         lead_id = $2, broker_id = coalesce(broker_id, $3), last_step = 'form' where id = $1`,
      [sid, lead.id, brokerId]
    );
  }

  await notifyLead(lead.id);

  const broker = brokerId
    ? await q1(`select u.first_name, b.photo from users u left join broker_profiles b on b.user_id = u.id where u.id = $1`, [brokerId])
    : null;
  const hasAccount = !!(await q1(`select id from users where phone = $1`, [phone]));
  const jar = await cookies();
  void jar;
  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    broker: broker ? { name: broker.first_name, photo: broker.photo } : null,
    phone: phoneText(phone),
    canRegister: !user && !hasAccount,
  });
}
