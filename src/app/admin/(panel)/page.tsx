import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { dashboard, navCounts, pct } from '@/lib/admin-data';
import { ago, fullName, num, sourceLabel } from '@/lib/format';
import { Avatar, Delta, Empty, HBars, LeadStatus, PageHead } from '@/components/admin/ui';
import DayBars from '@/components/admin/DayBars';
import { leadWants, many } from '@/components/admin/helpers';

export const metadata = { title: 'Табло' };

export default async function Dashboard() {
  const user = await requireStaff();
  const boss = user.role === 'boss';
  const d = await dashboard(user);
  const counts = await navCounts(user);
  const k = d.k;
  const conv = pct(k.sent, k.chats);
  const convPrev = pct(k.sent_prev, k.chats_prev);
  const fresh = counts.fresh;

  return (
    <>
      <PageHead
        kicker="Последните 30 дни"
        title={boss ? 'Табло' : `Здравей, ${user.first_name}`}
        sub={
          fresh > 0
            ? `${many(fresh, 'ново запитване чака', 'нови запитвания чакат')} обаждане${boss ? ' в целия екип' : ''}.`
            : 'Няма запитвания, които чакат първо обаждане.'
        }
      >
        <Link className="btn quiet" href="/admin/linkove">
          Направи линк
        </Link>
        <Link className="btn" href="/admin/imoti/nov">
          Добави имот
        </Link>
      </PageHead>

      {counts.unassigned > 0 ? (
        <div className="notice" style={{ marginBottom: 20 }}>
          <b>{many(counts.unassigned, 'запитване е без брокер', 'запитвания са без брокер')}</b>
          Дошли са от страници без представящ брокер.{' '}
          <Link className="link" href="/admin/zapitvania?broker=none">
            Разпредели ги
          </Link>
        </div>
      ) : null}

      <section className="kpis" aria-label="Основни числа">
        <div className="kpi">
          <div className="l">{boss ? 'Посетители на сайта' : 'Хора, гледали мои имоти'}</div>
          <div className="v">{num(k.visitors)}</div>
          <Delta now={k.visitors} prev={k.visitors_prev} />
        </div>
        <div className="kpi">
          <div className="l">Отворени чатове</div>
          <div className="v">{num(k.chats)}</div>
          <Delta now={k.chats} prev={k.chats_prev} />
        </div>
        <div className="kpi">
          <div className="l">Запитвания</div>
          <div className="v">{num(k.leads)}</div>
          <Delta now={k.leads} prev={k.leads_prev} />
        </div>
        <div className="kpi">
          <div className="l">От чат до запитване</div>
          <div className="v">{conv}%</div>
          {k.chats_prev ? (
            <div className="d">{convPrev}% през предишните 30 дни</div>
          ) : (
            <div className="d">
              {k.sent} от {k.chats} чата
            </div>
          )}
        </div>
      </section>

      {d.leak ? (
        <section className="adm-sec" style={{ marginTop: 20 }}>
          <div className="leak">
            <div>
              <div className="k">Къде губим хора в чата</div>
              <p>{d.leak.title}</p>
            </div>
            <Link className="btn small" href="/admin/analiz">
              Виж анализа
            </Link>
          </div>
        </section>
      ) : null}

      <div className="cols adm-sec">
        <section>
          <h2 className="cap">Запитвания по дни</h2>
          <div className="panel">
            {k.leads > 0 ? (
              <DayBars data={d.days} one="запитване" more="запитвания" />
            ) : (
              <Empty title="Още няма запитвания" text="Щом някой изпрати запитване от чата, дните ще се запълнят тук." />
            )}
          </div>
        </section>
        <section>
          <h2 className="cap">Откъде идват</h2>
          <div className="panel">
            {d.sources.length ? (
              <HBars
                unit="запитвания"
                rows={d.sources.map((s: any) => ({
                  label: sourceLabel(s.source),
                  value: s.n,
                  note: `${pct(s.n, k.leads)}%`,
                }))}
              />
            ) : (
              <Empty title="Няма данни" text="Каналът се записва от линка, по който е дошъл човекът." />
            )}
          </div>
        </section>
      </div>

      <section className="adm-sec">
        <h2>
          {boss ? 'Последни запитвания' : 'Моите запитвания'}
          <Link href="/admin/zapitvania">Всички запитвания</Link>
        </h2>
        <div className="panel">
          {d.newest.length ? (
            <table className="tbl stack">
              <thead>
                <tr>
                  <th>Клиент</th>
                  <th>Какво търси</th>
                  {boss ? <th>Брокер</th> : null}
                  <th>Статус</th>
                  <th className="num">Кога</th>
                </tr>
              </thead>
              <tbody>
                {d.newest.map((l: any) => {
                  const w = leadWants(l);
                  return (
                    <tr key={l.id} className={l.status === 'new' ? 'fresh' : undefined}>
                      <td className="main">
                        <Link href={`/admin/zapitvania/${l.id}`}>{fullName(l)}</Link>
                      </td>
                      <td className="wide">
                        {w.title}
                        <span className="sub clamp2">{l.property_title || w.rest}</span>
                      </td>
                      {boss ? (
                        <td data-l="Брокер">{l.b_first ? `${l.b_first} ${l.b_last}` : <span className="muted">Без брокер</span>}</td>
                      ) : null}
                      <td data-l="Статус">
                        <LeadStatus status={l.status} />
                      </td>
                      <td className="num muted" data-l="Кога">
                        {ago(l.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Empty
              title="Тук ще се появи първото запитване"
              text="Сподели линк към имот в социалните мрежи. Когато някой мине през чата и остави телефон, ще го видиш веднага."
              href="/admin/linkove"
              action="Направи линк за споделяне"
            />
          )}
        </div>
      </section>

      <div className={`cols adm-sec${boss ? '' : ' even'}`}>
        {boss ? (
          <section>
            <h2 className="cap">
              Екипът за 30 дни
              <Link href="/admin/brokeri">Брокери</Link>
            </h2>
            <div className="panel">
              <table className="tbl stack">
                <thead>
                  <tr>
                    <th>Брокер</th>
                    <th className="num">Запитвания</th>
                    <th className="num">Чакат обаждане</th>
                    <th className="num">Огледи</th>
                    <th className="num">Сделки</th>
                  </tr>
                </thead>
                <tbody>
                  {d.team.map((t: any) => (
                    <tr key={t.id}>
                      <td className="main">
                        <span className="who">
                          <Avatar photo={t.photo} name={fullName(t)} />
                          <Link href={`/admin/zapitvania?broker=${t.id}`}>{fullName(t)}</Link>
                        </span>
                      </td>
                      <td className="num" data-l="Запитвания">
                        {t.total}
                      </td>
                      <td className="num" data-l="Чакат обаждане">
                        {t.fresh > 0 ? <b style={{ color: 'var(--red-ink)' }}>{t.fresh}</b> : 0}
                      </td>
                      <td className="num" data-l="Огледи">
                        {t.viewing}
                      </td>
                      <td className="num" data-l="Сделки">
                        {t.deals}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        <section>
          <h2 className="cap">
            Гледани имоти
            <Link href="/admin/imoti">Всички имоти</Link>
          </h2>
          <div className="panel">
            {d.topProps.length ? (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Имот</th>
                    <th className="num">Гледания</th>
                    <th className="num">Запитвания</th>
                  </tr>
                </thead>
                <tbody>
                  {d.topProps.map((p: any) => (
                    <tr key={p.id}>
                      <td className="main">
                        <Link href={`/admin/imoti/${p.id}`}>{p.title}</Link>
                        <span className="sub">{p.ref}</span>
                      </td>
                      <td className="num">{p.views}</td>
                      <td className="num">{p.leads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty title="Още нямаш имоти" text="Добави първия си имот и той ще се появи на сайта веднага." href="/admin/imoti/nov" action="Добави имот" />
            )}
          </div>
        </section>
        {!boss ? (
          <section>
            <h2 className="cap">Моите запитвания по статус</h2>
            <div className="panel">
              <HBars
                rows={[
                  { label: 'Нови', value: d.statuses.new || 0 },
                  { label: 'Проведен разговор', value: d.statuses.contacted || 0 },
                  { label: 'Оглед', value: d.statuses.viewing || 0 },
                  { label: 'Сделка', value: d.statuses.deal || 0 },
                  { label: 'Отпаднали', value: d.statuses.lost || 0 },
                ]}
              />
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
