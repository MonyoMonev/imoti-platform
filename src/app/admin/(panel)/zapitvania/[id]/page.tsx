import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { leadDetail, staffList } from '@/lib/admin-data';
import { INTENTS, summarize } from '@/lib/chat-tree';
import { dateText, fullName, phoneText, price, sourceLabel } from '@/lib/format';
import { PageHead } from '@/components/admin/ui';
import { AssignForm, NoteForm, StatusPicker } from '@/components/admin/LeadActions';
import { pageName } from '@/components/admin/helpers';
import ChatTimeline from '@/components/admin/ChatTimeline';

export const metadata = { title: 'Запитване' };

const NOTIFY_STATUS: Record<string, string> = {
  sent: 'Изпратено',
  simulated: 'Симулация, не е излязло навън',
  failed: 'Грешка при изпращане',
};

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const data = /^\d+$/.test(id) ? await leadDetail(user, Number(id)) : null;
  if (!data) notFound();
  const { lead, notes, events, notifications } = data;
  const boss = user.role === 'boss';
  const s = summarize(lead.answers || {});
  const staff = boss ? await staffList(true) : [];
  const viber = `viber://chat?number=${encodeURIComponent(lead.phone)}`;
  const cover = Array.isArray(lead.property_photos) ? lead.property_photos[0] : null;

  return (
    <>
      <PageHead
        kicker={
          <>
            <Link href="/admin/zapitvania">Запитвания</Link> / № {lead.id} / {dateText(lead.created_at, true)}
          </>
        }
        title={fullName(lead)}
      >
        <a className="btn primary" href={`tel:${lead.phone}`}>
          Обади се
        </a>
        <a className="btn viber" href={viber}>
          Пиши във Viber
        </a>
      </PageHead>

      <div className="cols">
        <div className="stackv">
          <section>
            <h2 className="cap">Какво търси</h2>
            <div className="panel pad">
              <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{s.title || INTENTS[lead.intent] || 'Запитване'}</p>
              {s.lines.filter(([l]) => l !== 'Бележка').length ? (
                <dl className="dl">
                  {s.lines
                    .filter(([l]) => l !== 'Бележка')
                    .map(([l, v]) => (
                      <div key={l} style={{ display: 'contents' }}>
                        <dt>{l}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                </dl>
              ) : null}
              {lead.note ? (
                <blockquote className="note" style={{ marginTop: 16 }}>
                  {lead.note}
                </blockquote>
              ) : null}
            </div>
          </section>

          {lead.property_id ? (
            <section>
              <h2 className="cap">Имотът, за който пита</h2>
              <div className="panel pad propcard">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" />
                ) : (
                  <span />
                )}
                <div>
                  <b>{lead.property_title}</b>
                  <span className="muted small">
                    {lead.property_ref}, {lead.property_district},{' '}
                    {price({ price: lead.property_price, deal: lead.property_deal })}
                  </span>
                  <div className="formrow" style={{ marginTop: 8 }}>
                    <Link className="link small" href={`/admin/imoti/${lead.property_id}`}>
                      Отвори в панела
                    </Link>
                    <a className="link small" href={`/imoti/${lead.property_slug}`} target="_blank" rel="noreferrer">
                      Виж на сайта
                    </a>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="cap">Пътят му в чата</h2>
            <div className="panel pad">
              {events.length ? (
                <ChatTimeline events={events} />
              ) : (
                <p className="muted">За това запитване няма записан разговор в чата.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="cap">Съобщението до брокера</h2>
            {notifications.length ? (
              <div className="stackv" style={{ gap: 16 }}>
                {notifications.map((n: any) => (
                  <div key={n.id}>
                    <div className="vb">
                      <div className="vb-meta">
                        <b>{n.channel === 'telegram' ? 'Telegram' : 'Viber'}</b>
                        <span>
                          до {n.first_name ? `${n.first_name} ${n.last_name}` : 'брокера'}
                          {n.recipient ? `, ${phoneText(n.recipient)}` : ''}
                        </span>
                      </div>
                      <div className="vb-msg">{n.body}</div>
                    </div>
                    <p className="small" style={{ marginTop: 6 }}>
                      <span className={`st st-${n.status}`}>{NOTIFY_STATUS[n.status] || n.status}</span>
                      <span className="muted">, {dateText(n.created_at, true)}</span>
                      {n.error ? <span className="err"> {n.error}</span> : null}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel pad">
                <p className="muted">За това запитване още не е генерирано съобщение.</p>
              </div>
            )}
          </section>
        </div>

        <div className="stackv">
          <section>
            <h2 className="cap">Клиент</h2>
            <div className="panel pad">
              <div className="bigphone">
                <a href={`tel:${lead.phone}`}>{phoneText(lead.phone)}</a>
              </div>
              <dl className="dl" style={{ marginTop: 14 }}>
                <dt>Дошъл от</dt>
                <dd>{sourceLabel(lead.source)}</dd>
                <dt>Страница</dt>
                <dd>
                  {lead.page ? (
                    <a className="link" href={lead.page} target="_blank" rel="noreferrer">
                      {pageName(lead.page)}
                    </a>
                  ) : (
                    'Начална страница'
                  )}
                </dd>
                <dt>Брокер</dt>
                <dd>{lead.b_first ? `${lead.b_first} ${lead.b_last}` : 'Без брокер'}</dd>
                <dt>Профил</dt>
                <dd>
                  {lead.client_id ? (
                    <Link className="link" href={`/admin/klienti/${lead.client_id}`}>
                      Регистриран клиент
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 400 }}>Няма регистрация</span>
                  )}
                </dd>
              </dl>
            </div>
          </section>

          <section>
            <h2 className="cap">Докъде е стигнало</h2>
            <div className="panel pad">
              <StatusPicker id={lead.id} status={lead.status} />
            </div>
          </section>

          {boss ? (
            <section>
              <h2 className="cap">Разпределяне</h2>
              <div className="panel pad">
                <AssignForm
                  id={lead.id}
                  brokerId={lead.broker_id}
                  staff={staff.map((x: any) => ({ id: x.id, name: fullName(x) }))}
                />
                <p className="muted small" style={{ marginTop: 10 }}>
                  Новият брокер получава същото съобщение с името, телефона и какво търси клиентът.
                </p>
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="cap">Бележки</h2>
            <div className="panel pad">
              <NoteForm id={lead.id} />
              {notes.length ? (
                <ol className="tl" style={{ marginTop: 20 }}>
                  {notes.map((n: any) => (
                    <li key={n.id} className={n.kind === 'note' ? 'strong' : undefined}>
                      <span className="t">
                        {dateText(n.created_at, true)}
                        {n.first_name ? `, ${n.first_name} ${n.last_name}` : ''}
                      </span>
                      {n.body}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted small" style={{ marginTop: 16 }}>
                  Още няма бележки. Те се виждат само в панела, клиентът не ги вижда.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
