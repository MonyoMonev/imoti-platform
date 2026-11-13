import 'server-only';
import { q, q1 } from './db';
import type { User } from './auth';
import { STEPS, stepShort, stepQuestion, exitReasonLabel, summarize, INTENTS } from './chat-tree';
import { sourceLabel } from './format';

// Заявките на админ панела. Всяка функция получава влезлия потребител и сама
// стеснява данните до неговите права: шефът вижда всичко, брокерът само своето.

export function scopeId(u: User): number | null {
  return u.role === 'boss' ? null : u.id;
}

const SOFIA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Sofia',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function dayKey(d: Date | string): string {
  return SOFIA_DAY.format(new Date(d));
}

class Where {
  parts: string[] = [];
  params: any[] = [];
  add(sql: string, value?: any) {
    if (value !== undefined) {
      this.params.push(value);
      this.parts.push(sql.replace('?', `$${this.params.length}`));
    } else {
      this.parts.push(sql);
    }
    return this;
  }
  get sql() {
    return this.parts.length ? this.parts.join(' and ') : 'true';
  }
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/* ---------- Странична лента ---------- */

export async function navCounts(u: User) {
  const b = scopeId(u);
  const row = await q1(
    `select (select count(*)::int from leads where status = 'new' ${b ? 'and broker_id = $1' : ''}) as fresh,
            (select count(*)::int from leads where broker_id is null) as unassigned`,
    b ? [b] : []
  );
  return { fresh: row?.fresh || 0, unassigned: u.role === 'boss' ? row?.unassigned || 0 : 0 };
}

/* ---------- Табло ---------- */

export async function dashboard(u: User) {
  const b = scopeId(u);
  const p = b ? [b] : [];
  const bf = (col: string) => (b ? ` and ${col} = $1` : '');
  const cur = "> now() - interval '30 days'";
  const prev = "<= now() - interval '30 days' and %c > now() - interval '60 days'";
  const prevOf = (col: string) => prev.replace('%c', col);

  const k = (await q1(
    `select
      (select count(distinct visitor_id)::int from page_views where created_at ${cur}${bf('broker_id')}) as visitors,
      (select count(distinct visitor_id)::int from page_views where created_at ${prevOf('created_at')}${bf('broker_id')}) as visitors_prev,
      (select count(*)::int from chat_sessions where started_at ${cur}${bf('broker_id')}) as chats,
      (select count(*)::int from chat_sessions where started_at ${prevOf('started_at')}${bf('broker_id')}) as chats_prev,
      (select count(*)::int from chat_sessions where submitted and started_at ${cur}${bf('broker_id')}) as sent,
      (select count(*)::int from chat_sessions where submitted and started_at ${prevOf('started_at')}${bf('broker_id')}) as sent_prev,
      (select count(*)::int from leads where created_at ${cur}${bf('broker_id')}) as leads,
      (select count(*)::int from leads where created_at ${prevOf('created_at')}${bf('broker_id')}) as leads_prev`,
    p
  ))!;

  const leadDates = await q<{ created_at: Date }>(
    `select created_at from leads where created_at ${cur}${bf('broker_id')}`,
    p
  );
  const byDay: Record<string, number> = {};
  for (const r of leadDates) {
    const key = dayKey(r.created_at);
    byDay[key] = (byDay[key] || 0) + 1;
  }
  const days: { day: string; n: number }[] = [];
  // Календарни дни назад от днес. Смята се по дата, а не по 24 часа, заради смяната на часовото време.
  const [ty, tm, td] = dayKey(new Date()).split('-').map(Number);
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.UTC(ty, tm - 1, td - i, 12)).toISOString().slice(0, 10);
    days.push({ day: key, n: byDay[key] || 0 });
  }

  const sources = await q<{ source: string; n: number }>(
    `select coalesce(source, 'direct') as source, count(*)::int as n from leads
      where created_at ${cur}${bf('broker_id')} group by 1 order by n desc`,
    p
  );

  const team =
    u.role === 'boss'
      ? await q(
          `select u.id, u.first_name, u.last_name, u.active, u.role, b.photo,
                  count(l.id)::int as total,
                  (count(l.id) filter (where l.status = 'new'))::int as fresh,
                  (count(l.id) filter (where l.status = 'viewing'))::int as viewing,
                  (count(l.id) filter (where l.status = 'deal'))::int as deals
             from users u
             left join broker_profiles b on b.user_id = u.id
             left join leads l on l.broker_id = u.id and l.created_at > now() - interval '30 days'
            where u.role in ('boss', 'broker')
            group by u.id, b.photo, b.sort
            order by total desc, b.sort`
        )
      : [];

  const newest = await q(
    `select l.id, l.first_name, l.last_name, l.phone, l.intent, l.summary, l.status, l.source, l.created_at, l.broker_id,
            p.title as property_title, u.first_name as b_first, u.last_name as b_last
       from leads l
       left join properties p on p.id = l.property_id
       left join users u on u.id = l.broker_id
      where true${b ? ' and l.broker_id = $1' : ''}
      order by (l.status = 'new') desc, l.created_at desc
      limit 8`,
    p
  );

  const statusRows = await q<{ status: string; n: number }>(
    `select status, count(*)::int as n from leads where true${bf('broker_id')} group by 1`,
    p
  );
  const statuses: Record<string, number> = {};
  for (const r of statusRows) statuses[r.status] = r.n;

  const topProps = await q(
    `select p.id, p.title, p.ref,
            (select count(*)::int from page_views v where v.property_id = p.id and v.created_at > now() - interval '30 days') as views,
            (select count(*)::int from leads l where l.property_id = p.id and l.created_at > now() - interval '30 days') as leads
       from properties p
      where p.status in ('active', 'reserved')${b ? ' and p.broker_id = $1' : ''}
      order by views desc
      limit 5`,
    p
  );

  let leak: Finding | null = null;
  if (u.role === 'boss') {
    const a = await chatAnalysis({ days: 30 });
    leak = a.findings[0] || null;
  }

  return { k, days, sources, team, newest, statuses, topProps, leak };
}

/* ---------- Анализ на чата ---------- */

export type AnalysisFilters = {
  days: number;
  brokerId?: number | null;
  source?: string | null;
  device?: string | null;
};

export type Finding = { title: string; text: string; tip: string };

const FLOW_NAMES: Record<string, string> = {
  buy: 'Купува',
  rent: 'Търси наем',
  sell: 'Продава',
  let: 'Отдава',
  ask: 'Пита за имот',
};

function flowOf(stepId: string): string {
  const i = stepId.indexOf('.');
  if (i < 0) return 'Всички';
  return FLOW_NAMES[stepId.slice(0, i)] || 'Всички';
}

export const STEP_ORDER: string[] = [
  'start',
  ...STEPS.filter((s) => s.id !== 'start' && s.id !== 'note').map((s) => s.id),
  'note',
  'summary',
  'form',
];

/** Пътят от отговори на една сесия, като кратки думи. */
export function answerPath(answers: any): string[] {
  if (!answers || typeof answers !== 'object') return [];
  const s = summarize(answers);
  const out: string[] = [];
  if (answers.intent) out.push(INTENTS[String(answers.intent)] || String(answers.intent));
  for (const [label, value] of s.lines) {
    if (label === 'Бележка') continue;
    out.push(value);
  }
  return out;
}

export async function chatAnalysis(f: AnalysisFilters) {
  const w = new Where();
  w.add(`s.started_at > now() - (? || ' days')::interval`, String(f.days));
  if (f.brokerId) w.add(`s.broker_id = ?`, f.brokerId);
  if (f.source) w.add(`coalesce(s.source, 'direct') = ?`, f.source);
  if (f.device) w.add(`coalesce(s.device, 'desktop') = ?`, f.device);
  const W = w.sql;
  const P = w.params;

  const tot = (await q1(
    `select count(*)::int as opened,
            (count(*) filter (where s.answered > 0))::int as first,
            (count(*) filter (where s.reached_summary))::int as summary,
            (count(*) filter (where s.reached_form))::int as form,
            (count(*) filter (where s.submitted))::int as sent
       from chat_sessions s where ${W}`,
    P
  ))!;

  const seenRows = await q<{ step: string; n: number }>(
    `with f as (select s.id, coalesce(s.last_step, 'start') as last_step from chat_sessions s where ${W}),
          x as (
            select e.step, e.session_id from chat_events e join f on f.id = e.session_id
             where e.type in ('answer', 'skip') and e.step is not null
            union
            select f.last_step, f.id from f
          )
     select step, count(*)::int as n from x group by step`,
    P
  );
  const stoppedRows = await q<{ step: string; n: number }>(
    `select coalesce(s.last_step, 'start') as step, count(*)::int as n
       from chat_sessions s where ${W} and not s.submitted group by 1`,
    P
  );
  const seen: Record<string, number> = {};
  for (const r of seenRows) seen[r.step] = r.n;
  seen.start = tot.opened;
  seen.summary = Math.max(tot.summary, seen.summary || 0);
  seen.form = Math.max(tot.form, seen.form || 0);
  const stopped: Record<string, number> = {};
  for (const r of stoppedRows) stopped[r.step] = r.n;

  const known = new Set(STEP_ORDER);
  const ids = [...STEP_ORDER, ...Object.keys(stopped).filter((id) => !known.has(id))];
  const steps = ids
    .map((id) => ({
      id,
      flow: flowOf(id),
      short: stepShort(id),
      question: stepQuestion(id),
      seen: seen[id] || 0,
      stopped: stopped[id] || 0,
      rate: pct(stopped[id] || 0, seen[id] || 0),
    }))
    .filter((s) => s.seen > 0 || s.stopped > 0);

  const abandoned = tot.opened - tot.sent;

  const reasonRows = await q<{ exit_reason: string; n: number }>(
    `select s.exit_reason, count(*)::int as n from chat_sessions s
      where ${W} and not s.submitted and s.exit_reason is not null group by 1 order by n desc`,
    P
  );
  const reasonsTotal = reasonRows.reduce((s, r) => s + r.n, 0);
  const reasons = reasonRows.map((r) => ({ code: r.exit_reason, label: exitReasonLabel(r.exit_reason), n: r.n }));

  const formReasons = await q<{ exit_reason: string; n: number }>(
    `select s.exit_reason, count(*)::int as n from chat_sessions s
      where ${W} and not s.submitted and s.reached_form and s.exit_reason is not null group by 1 order by n desc`,
    P
  );

  const devices = await q<{ k: string; opened: number; sent: number }>(
    `select coalesce(s.device, 'desktop') as k, count(*)::int as opened, (count(*) filter (where s.submitted))::int as sent
       from chat_sessions s where ${W} group by 1 order by opened desc`,
    P
  );
  const sources = await q<{ k: string; opened: number; sent: number }>(
    `select coalesce(s.source, 'direct') as k, count(*)::int as opened, (count(*) filter (where s.submitted))::int as sent
       from chat_sessions s where ${W} group by 1 order by opened desc`,
    P
  );

  const durations = await q<{ sec: number }>(
    `select extract(epoch from (s.updated_at - s.started_at))::int as sec
       from chat_sessions s where ${W} and not s.submitted`,
    P
  );
  const sorted = durations.map((d) => d.sec).sort((a, b) => a - b);
  const medianStay = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  const sessions = await q(
    `select s.id, s.started_at, s.updated_at, s.source, s.device, s.intent, s.last_step, s.answered, s.answers,
            s.exit_reason, s.reached_form, s.reached_summary, s.page, s.property_id,
            extract(epoch from (s.updated_at - s.started_at))::int as sec,
            p.title as property_title, u.first_name as b_first, u.last_name as b_last
       from chat_sessions s
       left join properties p on p.id = s.property_id
       left join users u on u.id = s.broker_id
      where ${W} and not s.submitted
      order by s.started_at desc
      limit 40`,
    P
  );

  /* Изводи на обикновен език, подредени по това колко хора засягат. */
  const findings: (Finding & { weight: number })[] = [];
  const stopStart = stopped.start || 0;
  if (tot.opened >= 10 && stopStart > 0) {
    findings.push({
      weight: stopStart,
      title: `${stopStart} от ${tot.opened} души затварят чата, без да отговорят на нищо`,
      text: `Това са ${pct(stopStart, tot.opened)}% от всички, които са го отворили. Виждат поздрава и петте бутона и си тръгват.`,
      tip: 'Нека първият въпрос се вижда направо в страницата на имота, без да се отваря чатът. Съкрати поздрава до едно изречение.',
    });
  }
  const questions = steps
    .filter((s) => s.id !== 'start' && s.id !== 'summary' && s.id !== 'form' && s.seen >= 12)
    .sort((a, b) => b.stopped - a.stopped || b.rate - a.rate);
  if (questions[0] && questions[0].stopped > 0) {
    const s = questions[0];
    const name = s.flow === 'Всички' ? `„${s.short}“` : `„${s.short}“ (${s.flow.toLowerCase()})`;
    findings.push({
      weight: s.stopped,
      title: `Въпросът ${name} спира ${s.stopped} души`,
      text: `Видели са го ${s.seen} и ${s.rate}% от тях са спрели точно там. Никой друг въпрос в разговора не губи толкова хора.`,
      tip:
        s.short === 'Бюджет' || s.short === 'Цена' || s.short === 'Наем'
          ? 'Парите са чувствителна тема. Добави отговор „Още не съм решил“ или премести въпроса след района, когато човекът вече е вложил малко усилие.'
          : 'Провери дали отговорите покриват всички случаи и дали въпросът не може да се пропуска.',
    });
  }
  const stopForm = stopped.form || 0;
  if (tot.form >= 8 && stopForm > 0) {
    const top = formReasons[0];
    findings.push({
      weight: stopForm,
      title: `${pct(stopForm, tot.form)}% от стигналите до формата не оставят телефон`,
      text:
        `${stopForm} души са минали през всички въпроси, натиснали са „Отправи запитване“ и са се отказали пред полетата за име и телефон.` +
        (top ? ` Причината, която посочват, е „${exitReasonLabel(top.exit_reason)}“ (${top.n} пъти).` : ''),
      tip: 'Напиши над формата кой точно ще се обади и кога, и обещай, че номерът няма да се ползва за друго. Може да се добави и избор „Пиши ми във Viber вместо обаждане“.',
    });
  }
  const stopSummary = stopped.summary || 0;
  if (tot.summary >= 8 && stopSummary > 0) {
    findings.push({
      weight: stopSummary,
      title: `${stopSummary} души видяха обобщението, но не натиснаха бутона`,
      text: `Това са ${pct(stopSummary, tot.summary)}% от стигналите до края на въпросите. Отговорили са на всичко и са спрели на последната крачка.`,
      tip: 'Бутонът трябва да казва какво следва. Вместо „Отправи запитване“ пробвай „Нека брокер ми се обади“.',
    });
  }
  const mob = devices.find((d) => d.k === 'mobile');
  const desk = devices.find((d) => d.k === 'desktop');
  if (mob && desk && mob.opened >= 15 && desk.opened >= 15) {
    const m = pct(mob.sent, mob.opened);
    const d = pct(desk.sent, desk.opened);
    if (Math.abs(m - d) >= 5) {
      findings.push({
        weight: Math.round((Math.abs(m - d) / 100) * Math.min(mob.opened, desk.opened)),
        title: `На телефон завършват ${m}%, на компютър ${d}%`,
        text:
          m < d
            ? `От телефон идват ${mob.opened} разговора срещу ${desk.opened} от компютър, но на малкия екран хората се отказват преди края.`
            : `Хората на телефон стигат до запитване почти винаги, когато започнат. На компютър разглеждат, без да пишат.`,
        tip:
          m < d
            ? 'Провери формата на телефон: клавиатурата не бива да скрива бутона, а полето за номер трябва да отваря цифрова клавиатура.'
            : 'На компютър покажи чата отворен до имота, вместо само бутон в ъгъла.',
      });
    }
  }
  const ranked = sources.filter((s) => s.opened >= 15).map((s) => ({ ...s, rate: pct(s.sent, s.opened) }));
  if (ranked.length >= 2) {
    const best = [...ranked].sort((a, b) => b.rate - a.rate)[0];
    const worst = [...ranked].sort((a, b) => a.rate - b.rate)[0];
    if (best.k !== worst.k && best.rate - worst.rate >= 6) {
      findings.push({
        weight: Math.round(((best.rate - worst.rate) / 100) * worst.opened),
        title: `${sourceLabel(best.k)} носи ${best.rate}% запитвания, ${sourceLabel(worst.k)} само ${worst.rate}%`,
        text: `Става дума за хората, които са отворили чата: ${best.opened} от ${sourceLabel(best.k)} и ${worst.opened} от ${sourceLabel(worst.k)}.`,
        tip: `Виж какво е различното в постовете за ${sourceLabel(best.k)} и го повтори в ${sourceLabel(worst.k)}: снимка, текст, час на публикуване.`,
      });
    }
  }
  findings.sort((a, b) => b.weight - a.weight);

  return {
    tot,
    abandoned,
    steps,
    reasons,
    reasonsTotal,
    noReason: Math.max(0, abandoned - reasonsTotal),
    devices,
    sources,
    medianStay,
    sessions,
    findings: findings.slice(0, 5).map(({ weight, ...rest }) => rest) as Finding[],
  };
}

export async function chatSession(id: string) {
  const s = await q1(
    `select s.*, extract(epoch from (s.updated_at - s.started_at))::int as sec,
            p.title as property_title, p.slug as property_slug,
            u.first_name as b_first, u.last_name as b_last
       from chat_sessions s
       left join properties p on p.id = s.property_id
       left join users u on u.id = s.broker_id
      where s.id = $1`,
    [id]
  );
  if (!s) return null;
  const events = await q(`select type, step, value, created_at from chat_events where session_id = $1 order by created_at, id`, [id]);
  return { s, events };
}

/* ---------- Запитвания ---------- */

export type LeadFilters = { status?: string; broker?: string; source?: string; text?: string };

export async function leadsList(u: User, f: LeadFilters) {
  const w = new Where();
  const b = scopeId(u);
  if (b) w.add(`l.broker_id = ?`, b);
  if (f.status) w.add(`l.status = ?`, f.status);
  if (!b && f.broker === 'none') w.add(`l.broker_id is null`);
  else if (!b && f.broker && /^\d+$/.test(f.broker)) w.add(`l.broker_id = ?`, Number(f.broker));
  if (f.source) w.add(`coalesce(l.source, 'direct') = ?`, f.source);
  if (f.text && f.text.trim()) {
    const t = `%${f.text.trim().toLowerCase()}%`;
    w.params.push(t);
    const n = w.params.length;
    w.parts.push(
      `(lower(l.first_name || ' ' || l.last_name) like $${n} or replace(l.phone, ' ', '') like $${n} or lower(coalesce(l.summary, '')) like $${n} or lower(coalesce(l.note, '')) like $${n})`
    );
  }
  const rows = await q(
    `select l.id, l.first_name, l.last_name, l.phone, l.intent, l.summary, l.note, l.status, l.source, l.created_at,
            l.broker_id, l.client_id, p.title as property_title, p.ref as property_ref,
            u.first_name as b_first, u.last_name as b_last
       from leads l
       left join properties p on p.id = l.property_id
       left join users u on u.id = l.broker_id
      where ${w.sql}
      order by l.created_at desc
      limit 300`,
    w.params
  );
  const total = (await q1(`select count(*)::int as n from leads l where ${w.sql}`, w.params))!.n as number;
  return { rows, total };
}

export async function leadDetail(u: User, id: number) {
  const lead = await q1(
    `select l.*, p.title as property_title, p.ref as property_ref, p.slug as property_slug, p.photos as property_photos,
            p.price as property_price, p.deal as property_deal, p.district as property_district,
            u.first_name as b_first, u.last_name as b_last
       from leads l
       left join properties p on p.id = l.property_id
       left join users u on u.id = l.broker_id
      where l.id = $1`,
    [id]
  );
  if (!lead) return null;
  if (u.role !== 'boss' && lead.broker_id !== u.id) return null;
  const notes = await q(
    `select n.id, n.kind, n.body, n.created_at, u.first_name, u.last_name
       from lead_notes n left join users u on u.id = n.user_id
      where n.lead_id = $1 order by n.created_at desc, n.id desc`,
    [id]
  );
  const events = lead.chat_session_id
    ? await q(`select type, step, value, created_at from chat_events where session_id = $1 order by created_at, id`, [
        lead.chat_session_id,
      ])
    : [];
  const notifications = await q(
    `select n.id, n.channel, n.recipient, n.body, n.status, n.error, n.created_at, u.first_name, u.last_name
       from notifications n left join users u on u.id = n.broker_id
      where n.lead_id = $1 order by n.created_at desc, n.id desc`,
    [id]
  );
  return { lead, notes, events, notifications };
}

export async function staffList(onlyActive = true) {
  return q(
    `select u.id, u.first_name, u.last_name, u.role, u.active, b.slug
       from users u left join broker_profiles b on b.user_id = u.id
      where u.role in ('boss', 'broker')${onlyActive ? ' and u.active' : ''}
      order by b.sort, u.id`
  );
}

/* ---------- Имоти ---------- */

export async function propertiesList(u: User) {
  const b = scopeId(u);
  return q(
    `select p.id, p.slug, p.ref, p.title, p.deal, p.kind, p.rooms, p.area, p.district, p.price, p.status, p.featured,
            p.photos, p.broker_id, p.updated_at, u.first_name as b_first, u.last_name as b_last,
            (select count(*)::int from page_views v where v.property_id = p.id and v.created_at > now() - interval '30 days') as views30,
            (select count(*)::int from leads l where l.property_id = p.id) as leads
       from properties p left join users u on u.id = p.broker_id
      where ${b ? `(p.broker_id = $1 or p.status = 'active')` : 'true'}
      order by ${b ? '(p.broker_id = $1) desc,' : ''} p.updated_at desc`,
    b ? [b] : []
  );
}

export async function propertyById(id: number) {
  return q1(`select * from properties where id = $1`, [id]);
}

/* ---------- Брокери и покани ---------- */

export async function brokersList() {
  return q(
    `select u.id, u.role, u.first_name, u.last_name, u.phone, u.active, u.last_login_at, u.created_at,
            b.slug, b.title, b.photo, b.visible, b.sort,
            (select count(*)::int from properties p where p.broker_id = u.id and p.status in ('active', 'reserved')) as props,
            (select count(*)::int from leads l where l.broker_id = u.id and l.created_at > now() - interval '30 days') as leads30,
            (select count(*)::int from leads l where l.broker_id = u.id and l.status = 'new') as fresh
       from users u left join broker_profiles b on b.user_id = u.id
      where u.role in ('boss', 'broker')
      order by u.active desc, b.sort, u.id`
  );
}

export async function brokerProfile(userId: number) {
  return q1(
    `select u.id, u.role, u.first_name, u.last_name, u.phone, u.active,
            b.slug, b.title, b.photo, b.quote, b.pitch, b.bio, b.since_year, b.deals, b.areas, b.languages, b.facts,
            b.notify_channel, b.notify_phone, b.viber_user_id, b.telegram_chat_id, b.visible, b.sort,
            (b.viber_channel_token is not null) as viber_channel_on, b.viber_channel_name
       from users u left join broker_profiles b on b.user_id = u.id
      where u.id = $1 and u.role in ('boss', 'broker')`,
    [userId]
  );
}

export async function invitesList() {
  return q(
    `select i.code, i.note, i.created_at, i.expires_at, i.used_at, i.revoked,
            (i.expires_at < now()) as expired,
            c.first_name as by_first, c.last_name as by_last,
            x.first_name as used_first, x.last_name as used_last
       from invites i
       left join users c on c.id = i.created_by
       left join users x on x.id = i.used_by
      order by i.created_at desc
      limit 40`
  );
}

/* ---------- Клиенти ---------- */

export async function clientsList(u: User) {
  const b = scopeId(u);
  const registered = await q(
    `select u.id, u.first_name, u.last_name, u.phone, u.created_at, u.last_login_at,
            (select count(*)::int from page_views v where v.user_id = u.id and v.property_id is not null) as views,
            (select max(v.created_at) from page_views v where v.user_id = u.id) as last_view,
            (select count(*)::int from favorites f where f.user_id = u.id) as favs,
            (select count(*)::int from leads l where l.client_id = u.id${b ? ' and l.broker_id = $1' : ''}) as leads
       from users u
      where u.role = 'client'
        ${b ? 'and exists (select 1 from leads l where l.broker_id = $1 and (l.client_id = u.id or l.phone = u.phone))' : ''}
      order by coalesce((select max(v.created_at) from page_views v where v.user_id = u.id), u.created_at) desc
      limit 300`,
    b ? [b] : []
  );
  const contacts = await q(
    `select l.phone, max(l.first_name) as first_name, max(l.last_name) as last_name, count(*)::int as leads,
            max(l.created_at) as last_at, max(l.id)::int as last_lead_id
       from leads l
      where l.client_id is null
        and not exists (select 1 from users u where u.phone = l.phone and u.role = 'client')
        ${b ? 'and l.broker_id = $1' : ''}
      group by l.phone
      order by last_at desc
      limit 300`,
    b ? [b] : []
  );
  return { registered, contacts };
}

export async function clientDetail(u: User, id: number) {
  const c = await q1(
    `select id, first_name, last_name, phone, email, created_at, last_login_at, active from users where id = $1 and role = 'client'`,
    [id]
  );
  if (!c) return null;
  const b = scopeId(u);
  if (b) {
    const mine = await q1(`select 1 as ok from leads where broker_id = $1 and (client_id = $2 or phone = $3) limit 1`, [
      b,
      id,
      c.phone,
    ]);
    if (!mine) return null;
  }
  const views = await q(
    `select v.created_at, v.path, v.kind, v.source, p.id as property_id, p.title, p.ref, p.district, p.price, p.deal
       from page_views v left join properties p on p.id = v.property_id
      where v.user_id = $1 order by v.created_at desc limit 120`,
    [id]
  );
  const favs = await q(
    `select p.id, p.title, p.ref, p.district, p.price, p.deal, p.photos, f.created_at
       from favorites f join properties p on p.id = f.property_id
      where f.user_id = $1 order by f.created_at desc`,
    [id]
  );
  const leads = await q(
    `select l.id, l.intent, l.summary, l.status, l.created_at, l.broker_id, p.title as property_title,
            u.first_name as b_first, u.last_name as b_last
       from leads l left join properties p on p.id = l.property_id left join users u on u.id = l.broker_id
      where (l.client_id = $1 or l.phone = $2)${b ? ' and l.broker_id = $3' : ''}
      order by l.created_at desc`,
    b ? [id, c.phone, b] : [id, c.phone]
  );
  return { c, views, favs, leads };
}

/* ---------- Линкове ---------- */

export async function linkStats(u: User) {
  const b = scopeId(u);
  const p = b ? [b] : [];
  const visits = await q(
    `select v.property_id, v.broker_id, coalesce(v.source, 'direct') as source,
            count(*)::int as visits, count(distinct v.visitor_id)::int as people
       from page_views v
      where v.kind = 'offer' and v.property_id is not null${b ? ' and v.broker_id = $1' : ''}
      group by 1, 2, 3`,
    p
  );
  const chats = await q(
    `select s.property_id, s.broker_id, coalesce(s.source, 'direct') as source,
            count(*)::int as chats, (count(*) filter (where s.submitted))::int as sent
       from chat_sessions s
      where s.page like '/oferta/%' and s.property_id is not null${b ? ' and s.broker_id = $1' : ''}
      group by 1, 2, 3`,
    p
  );
  const props = await q(`select id, title, ref, slug, photos, district, price, deal from properties`);
  const staff = await q(`select u.id, u.first_name, u.last_name from users u where u.role in ('boss', 'broker')`);
  const propBy: Record<number, any> = Object.fromEntries(props.map((x: any) => [x.id, x]));
  const staffBy: Record<number, any> = Object.fromEntries(staff.map((x: any) => [x.id, x]));

  type Row = { source: string; visits: number; people: number; chats: number; sent: number };
  const groups: Record<string, { property: any; broker: any; rows: Record<string, Row>; visits: number; chats: number; sent: number }> = {};
  const cell = (pid: number, bid: number | null, source: string) => {
    const key = `${pid}|${bid ?? 0}`;
    if (!groups[key]) groups[key] = { property: propBy[pid], broker: bid ? staffBy[bid] : null, rows: {}, visits: 0, chats: 0, sent: 0 };
    if (!groups[key].rows[source]) groups[key].rows[source] = { source, visits: 0, people: 0, chats: 0, sent: 0 };
    return groups[key];
  };
  for (const v of visits) {
    const g = cell(v.property_id, v.broker_id, v.source);
    g.rows[v.source].visits += v.visits;
    g.rows[v.source].people += v.people;
    g.visits += v.visits;
  }
  for (const c of chats) {
    const g = cell(c.property_id, c.broker_id, c.source);
    g.rows[c.source].chats += c.chats;
    g.rows[c.source].sent += c.sent;
    g.chats += c.chats;
    g.sent += c.sent;
  }
  return Object.values(groups)
    .filter((g) => g.property)
    .map((g) => ({ ...g, rows: Object.values(g.rows).sort((a, b) => b.visits - a.visits) }))
    .sort((a, b) => b.visits - a.visits);
}

export async function linkOptions(u: User) {
  const properties = await q(
    `select p.id, p.slug, p.ref, p.title, p.district, p.price, p.deal, p.area, p.kind, p.rooms, p.teaser, p.photos, p.broker_id
       from properties p where p.status = 'active' order by p.updated_at desc`
  );
  const brokers =
    u.role === 'boss'
      ? await q(
          `select u.id, u.first_name, u.last_name, b.slug from users u join broker_profiles b on b.user_id = u.id
            where u.active and u.role in ('boss', 'broker') order by b.sort, u.id`
        )
      : await q(
          `select u.id, u.first_name, u.last_name, b.slug from users u join broker_profiles b on b.user_id = u.id where u.id = $1`,
          [u.id]
        );
  return { properties, brokers };
}

/* ---------- Известия ---------- */

export async function notificationsList(u: User) {
  const b = scopeId(u);
  return q(
    `select n.id, n.lead_id, n.channel, n.recipient, n.body, n.status, n.error, n.created_at,
            u.first_name as b_first, u.last_name as b_last
       from notifications n left join users u on u.id = n.broker_id
      where true${b ? ' and n.broker_id = $1' : ''}
      order by n.created_at desc, n.id desc
      limit 30`,
    b ? [b] : []
  );
}

/** Какви канали за известия има: личните Viber канали на брокерите и ключовете в средата. */
export async function channelStatus(userId?: number) {
  const r = await q1(
    `select count(*) filter (where b.viber_channel_token is not null)::int as channels,
            count(*)::int as staff,
            coalesce(bool_or(b.viber_channel_token is not null and u.id = $1), false) as mine
       from users u join broker_profiles b on b.user_id = u.id
      where u.active and u.role in ('boss','broker')`,
    [userId ?? 0]
  );
  const viberBot = !!process.env.VIBER_BOT_TOKEN;
  const telegram = !!process.env.TELEGRAM_BOT_TOKEN;
  return {
    channels: r?.channels ?? 0,
    staff: r?.staff ?? 0,
    mine: !!r?.mine,
    viber: viberBot,
    telegram,
    any: (r?.channels ?? 0) > 0 || viberBot || telegram,
  };
}

export async function demoCounts() {
  return (await q1(
    `select (select count(*)::int from visitors where demo) as visitors,
            (select count(*)::int from page_views where demo) as views,
            (select count(*)::int from chat_sessions where demo) as chats,
            (select count(*)::int from leads where demo) as leads,
            (select count(*)::int from notifications where demo) as notifications`
  ))!;
}

/* ---------- Общи помощници за запис ---------- */

export async function uniqueSlug(table: 'properties' | 'broker_profiles', base: string, exceptId?: number): Promise<string> {
  const root = base || 'bez-ime';
  const idCol = table === 'properties' ? 'id' : 'user_id';
  for (let i = 1; i < 200; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const hit = await q1(`select ${idCol} as id from ${table} where slug = $1`, [candidate]);
    if (!hit || (exceptId && hit.id === exceptId)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export async function nextRef(): Promise<string> {
  const row = await q1(`select coalesce(max(substring(ref from 2)::int), 5000) as n from properties where ref ~ '^K[0-9]+$'`);
  return `K${Number(row?.n || 5000) + 1}`;
}
