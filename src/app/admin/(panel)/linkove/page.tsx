import { requireStaff } from '@/lib/auth';
import { linkOptions, linkStats, pct } from '@/lib/admin-data';
import { BRAND } from '@/lib/brand';
import { fullName, sourceLabel, toId } from '@/lib/format';
import { Empty, PageHead } from '@/components/admin/ui';
import LinkBuilder from '@/components/admin/LinkBuilder';

export const metadata = { title: 'Линкове за споделяне' };

export default async function LinksPage({ searchParams }: { searchParams: Promise<{ imot?: string }> }) {
  const user = await requireStaff();
  const boss = user.role === 'boss';
  const sp = await searchParams;
  const { properties, brokers } = await linkOptions(user);
  const stats = await linkStats(user);
  // Шефът по подразбиране представя сам; брокерът винаги е себе си.
  const ordered = boss ? [...brokers].sort((a: any, b: any) => (a.id === user.id ? -1 : b.id === user.id ? 1 : 0)) : brokers;

  return (
    <>
      <PageHead
        kicker="За постове в социалните мрежи"
        title="Линкове за споделяне"
        sub="Избираш имот и получаваш линк, който води към страница с твоята снимка, твоите думи, имота и чата. Слагаш го в пост и запитванията идват при теб."
      />

      <section>
        <h2 className="cap">Направи линк</h2>
        <div className="panel pad">
          {properties.length ? (
            <LinkBuilder
              properties={properties.map((p: any) => ({ ...p, photos: Array.isArray(p.photos) ? p.photos : [] }))}
              brokers={ordered.map((b: any) => ({ id: b.id, name: fullName(b), slug: b.slug }))}
              siteUrl={BRAND.siteUrl}
              initialProperty={toId(sp.imot) ?? undefined}
              fixedBroker={!boss}
            />
          ) : (
            <Empty title="Няма активни имоти" text="Линк се прави към активен имот. Добави имот или смени статуса на някоя чернова." href="/admin/imoti/nov" action="Добави имот" />
          )}
        </div>
      </section>

      <section className="adm-sec">
        <h2>Какво са донесли линковете досега</h2>
        <p className="muted small" style={{ marginBottom: 10 }}>
          Посещенията са отваряния на страницата с оферта. Чатовете са хората, които са започнали разговор, а запитванията са тези, които са оставили телефон. Делът показва каква част от посещенията са стигнали до запитване.
        </p>
        <div className="panel">
          {stats.length ? (
            <table className="tbl" data-linkstats>
              <thead>
                <tr>
                  <th>Имот и канал</th>
                  <th className="num">Посещения</th>
                  <th className="num hide-m">Чатове</th>
                  <th className="num">Запитвания</th>
                  <th className="num">Дял</th>
                </tr>
              </thead>
              {stats.map((g: any) => (
                <tbody key={`${g.property.id}-${g.broker?.id || 0}`}>
                  <tr className="grp">
                    <td>
                      <b>{g.property.title}</b>
                      <span className="sub">
                        {g.property.ref}
                        {g.broker ? `, представя ${fullName(g.broker)}` : ''}
                      </span>
                    </td>
                    <td className="num">
                      <b>{g.visits}</b>
                    </td>
                    <td className="num hide-m">
                      <b>{g.chats}</b>
                    </td>
                    <td className="num">
                      <b>{g.sent}</b>
                    </td>
                    <td className="num">
                      <b>{pct(g.sent, g.visits)}%</b>
                    </td>
                  </tr>
                  {g.rows.map((r: any) => (
                    <tr key={r.source} className="chan">
                      <td>{sourceLabel(r.source)}</td>
                      <td className="num">{r.visits}</td>
                      <td className="num hide-m">{r.chats}</td>
                      <td className="num">{r.sent}</td>
                      <td className="num">{pct(r.sent, r.visits)}%</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          ) : (
            <Empty
              title="Още никой не е отварял твой линк"
              text="Направи линк горе, сложи го в пост и се върни тук след ден или два. Ще видиш от кой канал идват хората."
            />
          )}
        </div>
      </section>
    </>
  );
}
