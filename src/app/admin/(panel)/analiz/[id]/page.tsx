import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBoss } from '@/lib/auth';
import { answerPath, chatSession } from '@/lib/admin-data';
import { exitReasonLabel, stepQuestion, stepShort } from '@/lib/chat-tree';
import { dateText, duration, sourceLabel } from '@/lib/format';
import { PageHead } from '@/components/admin/ui';
import ChatTimeline from '@/components/admin/ChatTimeline';
import { pageName } from '@/components/admin/helpers';

export const metadata = { title: 'Разговор в чата' };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireBoss();
  const { id } = await params;
  const data = await chatSession(String(id).slice(0, 80));
  if (!data) notFound();
  const { s, events } = data;
  const path = answerPath(s.answers);

  return (
    <>
      <PageHead
        kicker={<Link href="/admin/analiz">Анализ на чата</Link>}
        title={s.submitted ? 'Разговор, завършил със запитване' : 'Разговор без запитване'}
        sub={`${dateText(s.started_at, true)}, продължил ${duration(s.sec || 0)}.`}
      >
        {s.lead_id ? (
          <Link className="btn" href={`/admin/zapitvania/${s.lead_id}`}>
            Към запитването
          </Link>
        ) : null}
      </PageHead>

      <div className="cols">
        <section>
          <h2 className="cap">Стъпка по стъпка</h2>
          <div className="panel pad">
            <ChatTimeline events={events} />
          </div>
        </section>
        <div className="stackv">
          <section>
            <h2 className="cap">Накратко</h2>
            <div className="panel pad">
              <dl className="dl">
                <dt>Спря на</dt>
                <dd>{s.submitted ? 'Изпрати запитване' : stepShort(s.last_step || 'start')}</dd>
                {!s.submitted ? (
                  <>
                    <dt>Видя последно</dt>
                    <dd style={{ fontWeight: 400 }}>{stepQuestion(s.last_step || 'start')}</dd>
                    <dt>Причина</dt>
                    <dd>{s.exit_reason ? exitReasonLabel(s.exit_reason) : 'Не каза'}</dd>
                  </>
                ) : null}
                <dt>Дошъл от</dt>
                <dd>{sourceLabel(s.source)}</dd>
                <dt>Устройство</dt>
                <dd>{s.device === 'mobile' ? 'Телефон' : 'Компютър'}</dd>
                <dt>Страница</dt>
                <dd>{pageName(s.page)}</dd>
                <dt>Имот</dt>
                <dd>
                  {s.property_id ? <Link className="link" href={`/admin/imoti/${s.property_id}`}>{s.property_title}</Link> : 'Без конкретен имот'}
                </dd>
                <dt>Брокер</dt>
                <dd>{s.b_first ? `${s.b_first} ${s.b_last}` : 'Без брокер'}</dd>
              </dl>
            </div>
          </section>
          <section>
            <h2 className="cap">Какво успя да каже</h2>
            <div className="panel pad">
              {path.length ? (
                <span className="path">
                  {path.map((p, i) => (
                    <span className="tag" key={i}>
                      {p}
                    </span>
                  ))}
                </span>
              ) : (
                <p className="muted">Затвори чата, преди да отговори на първия въпрос.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
