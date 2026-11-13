import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { q1 } from '@/lib/db';
import { propertyById, staffList } from '@/lib/admin-data';
import { DEALS, KINDS, area, floorText, fullName, price } from '@/lib/format';
import { PageHead, PropStatus } from '@/components/admin/ui';
import PropertyForm from '@/components/admin/PropertyForm';

export const metadata = { title: 'Имот' };

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nov?: string }>;
}) {
  const user = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const p = /^\d+$/.test(id) ? await propertyById(Number(id)) : null;
  if (!p) notFound();
  const boss = user.role === 'boss';
  const own = boss || p.broker_id === user.id;
  // Чужд имот брокерът вижда само ако е активен, и то без форма.
  if (!own && p.status !== 'active') notFound();

  const stats = (await q1(
    `select (select count(*)::int from page_views v where v.property_id = $1 and v.created_at > now() - interval '30 days') as views30,
            (select count(*)::int from leads l where l.property_id = $1) as leads,
            (select count(*)::int from favorites f where f.property_id = $1) as favs`,
    [p.id]
  ))!;
  const owner = p.broker_id ? await q1(`select first_name, last_name from users where id = $1`, [p.broker_id]) : null;
  const staff = boss ? await staffList(true) : [];

  return (
    <>
      <PageHead
        kicker={
          <>
            <Link href="/admin/imoti">Имоти</Link> / {p.ref}
          </>
        }
        title={p.title}
      >
        <a className="btn quiet" href={`/imoti/${p.slug}`} target="_blank" rel="noreferrer">
          Виж на сайта
        </a>
        <Link className="btn" href={`/admin/linkove?imot=${p.id}`}>
          Направи линк
        </Link>
      </PageHead>

      <section className="kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 28 }}>
        <div className="kpi">
          <div className="l">Гледания за 30 дни</div>
          <div className="v">{stats.views30}</div>
        </div>
        <div className="kpi" style={{ borderTop: 0 }}>
          <div className="l">Запитвания</div>
          <div className="v">{stats.leads}</div>
        </div>
        <div className="kpi" style={{ borderTop: 0, borderLeft: '1px solid var(--line-2)' }}>
          <div className="l">Запазен в любими</div>
          <div className="v">{stats.favs}</div>
        </div>
      </section>

      {own ? (
        <PropertyForm
          initial={p}
          boss={boss}
          staff={staff.map((s: any) => ({ id: s.id, name: fullName(s) }))}
          justCreated={sp.nov === '1'}
        />
      ) : (
        <div className="panel pad">
          <p className="muted small" style={{ marginBottom: 14 }}>
            Имотът е на {owner ? fullName(owner) : 'друг брокер'}. Виждаш го, за да можеш да го споделиш със свой линк.
          </p>
          <dl className="dl">
            <dt>Сделка</dt>
            <dd>
              {DEALS[p.deal]}, {KINDS[p.kind] || p.kind}
            </dd>
            <dt>Цена</dt>
            <dd>{price(p)}</dd>
            <dt>Площ</dt>
            <dd>{area(p.area)}</dd>
            <dt>Район</dt>
            <dd>{p.district}</dd>
            {p.floor ? (
              <>
                <dt>Етаж</dt>
                <dd>{floorText(p.floor, p.floors)}</dd>
              </>
            ) : null}
            <dt>Статус</dt>
            <dd>
              <PropStatus status={p.status} />
            </dd>
          </dl>
          {p.teaser ? (
            <blockquote className="note" style={{ marginTop: 16 }}>
              {p.teaser}
            </blockquote>
          ) : null}
        </div>
      )}
    </>
  );
}
