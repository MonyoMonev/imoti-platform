import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BRAND } from '@/lib/brand';
import { DISTRICTS } from '@/lib/format';
import { listProperties, type PropertyFilters } from '@/lib/data';
import { PropertyCard, Tri } from '@/components/site/ui';
import Filters from '@/components/site/Filters';
import Tracker from '@/components/site/Tracker';
import { ChatButton, ChatStarter } from '@/components/chat/Chat';
import '../pages.css';

export const metadata: Metadata = {
  title: 'Имоти за продажба и под наем',
  description: `Апартаменти, къщи, парцели и офиси във ${BRAND.city} и района. Актуални оферти с брокер за всеки имот.`,
};

export default async function Page({ searchParams }: { searchParams: Promise<PropertyFilters> }) {
  const f = await searchParams;
  const items = await listProperties(f);
  // Районът идва от адреса: в заглавието влиза само ако е познат или по него има намерени имоти.
  const district =
    typeof f.district === 'string' && ((DISTRICTS as readonly string[]).includes(f.district) || items.length > 0) ? f.district.slice(0, 60) : '';
  const title = f.deal === 'rent' ? 'Имоти под наем' : f.deal === 'sale' ? 'Имоти за продажба' : 'Всички имоти';
  return (
    <main>
      <Tracker kind="page" />
      <div className="wrap">
        <header className="phead">
          <p className="label phead__label">
            <Tri />
            {BRAND.city} и района
          </p>
          <h1 className="title">
            {title}
            {district ? (
              <>
                {' '}
                в <span className="mark">{district}</span>
              </>
            ) : null}
          </h1>
          <span className="phead__num" aria-hidden="true">
            {items.length}
          </span>
        </header>
        <Suspense>
          <Filters total={items.length} />
        </Suspense>
        {items.length > 0 ? (
          <div className="grid">
            {items.map((p, i) => (
              <div key={p.id} data-reveal style={{ ['--d' as any]: i % 3 }}>
                <PropertyCard p={p} sizes="(max-width: 560px) 100vw, (max-width: 960px) 50vw, 33vw" />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>Точно такъв имот в момента нямаме.</h2>
            <p>Не всичко стига до сайта. Кажи ни какво търсиш и брокерът за района ще провери и офертите, които още не са качени.</p>
            <ChatButton>Кажи какво търсиш</ChatButton>
          </div>
        )}
      </div>
      <section className="cta">
        <div className="wrap cta__in">
          <div data-reveal>
            <p className="label">Не намираш своя</p>
            <h2 className="title">
              Кажи ни го с <i>няколко цъкания</i>
            </h2>
            <p className="lead">Не всяка оферта стига до сайта. Опиши какво търсиш и брокерът за района ще ти се обади с подбор.</p>
          </div>
          <ChatStarter />
        </div>
      </section>
    </main>
  );
}
