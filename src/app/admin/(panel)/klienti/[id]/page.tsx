import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { clientDetail } from '@/lib/admin-data';
import { INTENTS } from '@/lib/chat-tree';
import { ago, dateText, fullName, money, phoneText, price, sourceLabel, toId } from '@/lib/format';
import { Empty, LeadStatus, PageHead } from '@/components/admin/ui';
import { leadWants, many, pageName } from '@/components/admin/helpers';

export const metadata = { title: 'Клиент' };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  const data = toId(id) ? await clientDetail(user, toId(id)!) : null;
  if (!data) notFound();
  const { c, views, favs, leads } = data;

  // Кратък портрет на интереса: кои райони и каква цена гледа.
  const seen = new Map<number, any>();
  for (const v of views) if (v.property_id && !seen.has(v.property_id)) seen.set(v.property_id, v);
  const props = [...seen.values()];
  const districts: Record<string, number> = {};
  for (const v of views) if (v.district) districts[v.district] = (districts[v.district] || 0) + 1;
  const topDistricts = Object.entries(districts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);
  const sale = props.filter((p) => p.deal === 'sale').map((p) => p.price);
  const rent = props.filter((p) => p.deal === 'rent').map((p) => p.price);
  const range = (arr: number[], suffix = '') =>
    arr.length === 0
      ? ''
      : Math.min(...arr) === Math.max(...arr)
        ? `${money(arr[0])}${suffix}`
        : `от ${money(Math.min(...arr))} до ${money(Math.max(...arr))}${suffix}`;
  const viber = `viber://chat?number=${encodeURIComponent(c.phone)}`;

  return (
    <>
      <PageHead
        kicker={
          <>
            <Link href="/admin/klienti">Клиенти</Link> / регистриран на {dateText(c.created_at)}
          </>
        }
        title={fullName(c)}
      >
        <a className="btn primary" href={`tel:${c.phone}`}>
          Обади се
        </a>
        <a className="btn viber" href={viber}>
          Пиши във Viber
        </a>
      </PageHead>

      <section className="panel pad" style={{ marginBottom: 28 }}>
        <div className="bigphone">
          <a href={`tel:${c.phone}`}>{phoneText(c.phone)}</a>
        </div>
        <p style={{ marginTop: 10, maxWidth: '80ch' }}>
          {props.length ? (
            <>
              Разгледал е {many(props.length, 'имот', 'имота')}
              {topDistricts.length ? `, предимно в ${topDistricts.join(', ')}` : ''}.
              {sale.length ? ` За покупка гледа ${range(sale)}.` : ''}
              {rent.length ? ` За наем гледа ${range(rent, ' на месец')}.` : ''}
            </>
          ) : (
            'Още не е разглеждал имоти, откакто има профил.'
          )}{' '}
          {c.last_login_at ? `Последно е влизал ${ago(c.last_login_at)}.` : ''}
        </p>
      </section>

      <div className="cols">
        <div className="stackv">
          <section>
            <h2 className="cap">Какво разглежда</h2>
            <div className="panel">
              {views.length ? (
                <table className="tbl stack">
                  <thead>
                    <tr>
                      <th>Страница</th>
                      <th>Дошъл от</th>
                      <th className="num">Кога</th>
                    </tr>
                  </thead>
                  <tbody>
                    {views.map((v: any, i: number) => (
                      <tr key={i}>
                        <td className="main">
                          {v.property_id ? (
                            <>
                              <Link href={`/admin/imoti/${v.property_id}`}>{v.title}</Link>
                              <span className="sub">
                                {v.ref}, {v.district}, {price(v)}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontWeight: 400 }}>{pageName(v.path)}</span>
                          )}
                        </td>
                        <td data-l="Дошъл от">{sourceLabel(v.source)}</td>
                        <td className="num muted" data-l="Кога">
                          {dateText(v.created_at, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty title="Няма записани гледания" text="Гледанията се записват, докато клиентът е влязъл в профила си." />
              )}
            </div>
          </section>
        </div>

        <div className="stackv">
          <section>
            <h2 className="cap">Запазени имоти</h2>
            <div className="panel">
              {favs.length ? (
                <table className="tbl">
                  <tbody>
                    {favs.map((f: any) => (
                      <tr key={f.id}>
                        <td className="main">
                          <span className="who">
                            {Array.isArray(f.photos) && f.photos[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img className="thumb" src={f.photos[0]} alt="" loading="lazy" />
                            ) : (
                              <span className="thumb" />
                            )}
                            <span>
                              <Link href={`/admin/imoti/${f.id}`}>{f.title}</Link>
                              <span className="sub">
                                {f.district}, {price(f)}
                              </span>
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty title="Нищо запазено" />
              )}
            </div>
          </section>

          <section>
            <h2 className="cap">Запитвания</h2>
            <div className="panel">
              {leads.length ? (
                <table className="tbl">
                  <tbody>
                    {leads.map((l: any) => {
                      const w = leadWants(l);
                      return (
                        <tr key={l.id}>
                          <td className="main">
                            <Link href={`/admin/zapitvania/${l.id}`}>{INTENTS[l.intent] || w.title}</Link>
                            <span className="sub">{l.property_title || w.rest}</span>
                            <span className="sub">
                              {dateText(l.created_at)}
                              {l.b_first ? `, ${l.b_first} ${l.b_last}` : ''}
                            </span>
                          </td>
                          <td className="num">
                            <LeadStatus status={l.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <Empty title="Още не е питал за нищо" />
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
