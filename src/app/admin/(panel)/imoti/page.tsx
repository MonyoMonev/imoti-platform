import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { propertiesList } from '@/lib/admin-data';
import { DEALS, KINDS, area, price } from '@/lib/format';
import { Empty, PageHead, PropStatus } from '@/components/admin/ui';
import { many } from '@/components/admin/helpers';

export const metadata = { title: 'Имоти' };

function Table({ rows, boss, mine }: { rows: any[]; boss: boolean; mine: boolean }) {
  return (
    <table className="tbl stack">
      <thead>
        <tr>
          <th>Имот</th>
          <th>Вид</th>
          <th className="num">Цена</th>
          {boss || !mine ? <th>Брокер</th> : null}
          <th>Статус</th>
          <th className="num">Гледания за 30 дни</th>
          <th className="num">Запитвания</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((p: any) => {
          const cover = Array.isArray(p.photos) ? p.photos[0] : null;
          return (
            <tr key={p.id}>
              <td className="main">
                <span className="who">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="thumb" src={cover} alt="" loading="lazy" />
                  ) : (
                    <span className="thumb" />
                  )}
                  <span>
                    <Link href={`/admin/imoti/${p.id}`}>{p.title}</Link>
                    <span className="sub">
                      {p.ref}, {p.district}
                      {p.featured ? ', избран' : ''}
                    </span>
                  </span>
                </span>
              </td>
              <td data-l="Вид">
                {DEALS[p.deal]}
                <span className="sub">
                  {KINDS[p.kind] || p.kind}, {area(p.area)}
                </span>
              </td>
              <td className="num" data-l="Цена">
                {price(p)}
              </td>
              {boss || !mine ? (
                <td data-l="Брокер" className="nowrap">
                  {p.b_first ? `${p.b_first} ${p.b_last}` : <span className="muted">Няма</span>}
                </td>
              ) : null}
              <td data-l="Статус">
                <PropStatus status={p.status} />
              </td>
              <td className="num" data-l="Гледания за 30 дни">
                {p.views30}
              </td>
              <td className="num" data-l="Запитвания">
                {p.leads}
              </td>
              <td className="num" data-l="">
                <Link className="link small" href={`/admin/linkove?imot=${p.id}`}>
                  Направи линк
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default async function PropertiesPage() {
  const user = await requireStaff();
  const boss = user.role === 'boss';
  const rows = await propertiesList(user);
  const mine = boss ? rows : rows.filter((p: any) => p.broker_id === user.id);
  const others = boss ? [] : rows.filter((p: any) => p.broker_id !== user.id);

  return (
    <>
      <PageHead
        kicker={boss ? 'Всички имоти на агенцията' : 'Моите имоти'}
        title="Имоти"
        sub={
          boss
            ? `${many(rows.length, 'имот', 'имота')} общо. Отваряш някой, за да го редактираш, да смениш снимките или брокера му.`
            : 'Тук добавяш и редактираш своите имоти. Имотите на колегите виждаш само за да направиш линк с твоето име.'
        }
      >
        <Link className="btn primary" href="/admin/imoti/nov">
          Добави имот
        </Link>
      </PageHead>

      <div className="panel">
        {mine.length ? (
          <Table rows={mine} boss={boss} mine />
        ) : (
          <Empty
            title="Още нямаш свои имоти"
            text="Добави първия. Трябват заглавие, цена, площ, район и няколко снимки, останалото може и после."
            href="/admin/imoti/nov"
            action="Добави имот"
          />
        )}
      </div>

      {others.length ? (
        <section className="adm-sec">
          <h2>Имоти на колегите</h2>
          <p className="muted small" style={{ marginBottom: 10 }}>
            Не можеш да ги променяш, но можеш да споделиш всеки от тях като свой линк. Запитванията от него идват при теб.
          </p>
          <div className="panel">
            <Table rows={others} boss={false} mine={false} />
          </div>
        </section>
      ) : null}
    </>
  );
}
