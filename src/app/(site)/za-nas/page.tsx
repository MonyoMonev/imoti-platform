import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { listBrokers, siteCounts } from '@/lib/data';
import { Arrow, Photo, Tri } from '@/components/site/ui';
import Counter from '@/components/site/Counter';
import Tracker from '@/components/site/Tracker';
import { ChatStarter } from '@/components/chat/Chat';
import '../pages.css';
import '../home.css';

export const metadata: Metadata = {
  title: 'За агенцията',
  description: `${BRAND.full}: ${BRAND.years} опит с продажби и наеми във ${BRAND.city} и района.`,
};

const VALUES = [
  ['Първо документите', 'Не показваме имот, преди да сме видели документите му. Така на огледа говорим за жилището, а не за изненади.'],
  ['Един брокер, един район', 'Всеки от нас работи в кварталите, които познава. Ако търсиш другаде, те прехвърляме на колегата, който е там всеки ден.'],
  ['Казваме и лошото', 'Шумна улица, стар покрив, спорен съсед. Ще го чуеш от нас преди капарото, а не след нотариуса.'],
];

export default async function Page() {
  const [brokers, counts] = await Promise.all([listBrokers(), siteCounts()]);
  const yearsNum = Number((BRAND.years.match(/\d+/) || ['12'])[0]);
  const dealsNum = Number((BRAND.deals.match(/\d+/) || ['500'])[0]);
  return (
    <main>
      <Tracker kind="page" />
      <div className="wrap">
        <header className="phead">
          <p className="label phead__label">
            <Tri />
            За агенцията
          </p>
          <h1 className="title">
            Работим във {BRAND.city} и я познаваме <span className="mark">вход по вход</span>
          </h1>
          <p className="lead">
            {BRAND.full} е агенция за продажби и наеми във {BRAND.city} и района: апартаменти, къщи, парцели, офиси и имоти в курортите.
          </p>
        </header>

        <section className="two" style={{ paddingBottom: 'clamp(50px, 7vw, 100px)' }}>
          <div className="two__ph frame" data-reveal="shade">
            <div className="frame__in" data-plx="-0.06">
              <Photo src="/img/site/varna-coast.jpg" alt="Варна отвисоко" sizes="(max-width: 860px) 100vw, 50vw" priority />
            </div>
          </div>
          <div data-reveal>
            <div className="prose" style={{ fontSize: '1.14rem' }}>
              <p>
                Купуването на дом е сделката, за която човек мисли с години и която подписва за един следобед. Нашата работа е този следобед да
                мине спокойно.
              </p>
              <p>
                Затова започваме с разговор: какво търсиш, с какъв бюджет и за кога. После идват подборът, огледите и проверката на документите.
                Работим с банки, оценители, нотариуси и адвокати, така че не ти се налага да ги търсиш сам.
              </p>
            </div>
            <div className="stats" style={{ marginTop: 30 }}>
              <div className="stat">
                <b>
                  <Counter to={yearsNum} suffix="+" />
                </b>
                <span>години на пазара</span>
              </div>
              <div className="stat">
                <b>
                  <Counter to={dealsNum} suffix="+" />
                </b>
                <span>продадени имота</span>
              </div>
              <div className="stat">
                <b>
                  <Counter to={counts.brokers} />
                </b>
                <span>брокери със свои райони</span>
              </div>
              <div className="stat">
                <b>
                  <Counter to={counts.properties} />
                </b>
                <span>активни оферти днес</span>
              </div>
            </div>
          </div>
        </section>

        <section style={{ paddingBottom: 'clamp(56px, 8vw, 110px)' }}>
          <h2 className="title title--s" style={{ marginBottom: 28 }} data-reveal>
            Три неща, които няма да променим
          </h2>
          <div className="vals">
            {VALUES.map(([t, d], i) => (
              <div className="val" key={t} data-reveal style={{ ['--d' as any]: i }}>
                <small>0{i + 1}</small>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ paddingBottom: 'clamp(56px, 8vw, 110px)' }}>
          <header className="floor__head" data-reveal>
            <h2 className="title title--s">Хората</h2>
            <Link className="link" href="/brokeri">
              Запознай се с всички
              <Arrow />
            </Link>
          </header>
          <div className="team" data-reveal>
            {brokers.map((b) => (
              <Link key={b.id} href={`/brokeri/${b.slug}`} className="tcard">
                {b.photo && <Photo src={b.photo} alt={`${b.first_name} ${b.last_name}`} sizes="(max-width: 860px) 72vw, 26vw" />}
                <div className="tcard__txt">
                  <div className="tcard__name">
                    {b.first_name} {b.last_name}
                  </div>
                  <div className="tcard__role">{b.title}</div>
                  {b.quote && <p className="tcard__quote">„{b.quote}“</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className="cta">
        <div className="wrap cta__in">
          <div data-reveal>
            <p className="label">Следващата стъпка</p>
            <h2 className="title">
              Започни с <i>един въпрос</i>
            </h2>
            <p className="lead">Кажи какво търсиш или какво продаваш. Ще ти се обади брокерът, който работи точно с това.</p>
          </div>
          <ChatStarter />
        </div>
      </section>
    </main>
  );
}
