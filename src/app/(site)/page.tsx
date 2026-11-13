import Link from 'next/link';
import { BRAND, FLOORS } from '@/lib/brand';
import { districtCounts, featuredProperties, listBrokers, siteCounts } from '@/lib/data';
import { phoneText } from '@/lib/format';
import Scene from '@/components/home/Scene';
import Elevator from '@/components/home/Elevator';
import Districts from '@/components/home/Districts';
import { RoofLeft, RoofMid, RoofRight } from '@/components/home/art';
import { Arrow, Photo, PropertyCard, Slab, Tri } from '@/components/site/ui';
import Counter from '@/components/site/Counter';
import Tracker from '@/components/site/Tracker';
import { ChatButton, ChatStarter } from '@/components/chat/Chat';
import './home.css';

const F = Object.fromEntries(FLOORS.map((f) => [f.id, f]));

const STEPS = [
  ['Разказваш', 'Отговаряш на няколко въпроса в чата или направо ни звъниш. Отнема пет минути.'],
  ['Подбираме', 'Брокерът за твоя район ти праща само имоти, които отговарят. Обикновено до ден.'],
  ['Гледаме', 'Ходим на оглед заедно. Казваме ти и какво не ни харесва в имота.'],
  ['Подписваме', 'Проверяваме документите, водим преговорите и сме с теб при нотариуса.'],
];

export default async function Home() {
  const [featured, brokers, districts, counts] = await Promise.all([featuredProperties(6), listBrokers(), districtCounts(), siteCounts()]);
  const cols = [0, 1, 2].map((c) => featured.filter((_, i) => i % 3 === c));
  const yearsNum = Number((BRAND.years.match(/\d+/) || ['12'])[0]);
  const dealsNum = Number((BRAND.deals.match(/\d+/) || ['500'])[0]);

  return (
    <main className="home">
      <Tracker kind="home" />
      <Scene />

      {/* Покривът */}
      <section className="roof" id="pokriv">
        <div className="roof__in">
          <p className="label roof__label">
            <Tri />
            Недвижими имоти във {BRAND.city}
          </p>
          <h1 className="display lines">
            <span>
              <span>От гледката</span>
            </span>
            <span>
              <span>
                <i>до ключа.</i>
              </span>
            </span>
          </h1>
          <p className="lead">
            Започваме от покрива и слизаме етаж по етаж. По пътя ще видиш имотите, ще се запознаеш с брокерите и ще ни кажеш какво търсиш.
          </p>
          <div className="roof__cta">
            <Link className="btn" href="/imoti">
              Към имотите
              <Arrow />
            </Link>
            <ChatButton className="btn btn--lime">Кажи какво търсиш</ChatButton>
          </div>
        </div>
        <div className="roof__deck" aria-hidden="true">
          <RoofMid />
          <RoofLeft />
          <RoofRight />
          <div className="roof__rail" />
        </div>
        <a className="roof__hint" href="#imoti">
          Слез надолу
        </a>
      </section>

      <div className="building">
        <Elevator />

        {/* Етаж 6: имоти */}
        <Slab level={F.imoti.slab} floor={F.imoti.label} name={F.imoti.name} />
        <section className="floor floor--imoti" id="imoti">
          <span className="floor__num" data-plx="-0.14" aria-hidden="true">
            6
          </span>
          <div className="wrap">
            <header className="floor__head" data-reveal="lines">
              <p className="label">Избрани имоти</p>
              <h2 className="title lines">
                <span>
                  <span>Прозорци, зад които</span>
                </span>
                <span>
                  <span>
                    може да <span className="mark">живееш</span>
                  </span>
                </span>
              </h2>
              <Link className="link" href="/imoti">
                Всички {counts.properties} имота
                <Arrow />
              </Link>
            </header>
            <div className="facade">
              {cols.map((col, c) => (
                <div className="facade__col" key={c} data-plx={[0, 0.07, -0.05][c]}>
                  {col.map((p, i) => (
                    <div key={p.id} data-reveal style={{ ['--d' as any]: c + i }}>
                      <PropertyCard p={p} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="swipe-hint">Плъзни настрани за още</p>
          </div>
        </section>

        {/* Етаж 5: брокери */}
        <Slab level={F.brokeri.slab} floor={F.brokeri.label} name={F.brokeri.name} />
        <section className="floor floor--brokeri" id="brokeri">
          <span className="floor__num" data-plx="-0.14" aria-hidden="true">
            5
          </span>
          <div className="wrap">
            <header className="floor__head" data-reveal="lines">
              <p className="label">Брокерите</p>
              <h2 className="title lines">
                <span>
                  <span>Хората, които ще ти</span>
                </span>
                <span>
                  <span>
                    <span className="mark">вдигнат телефона</span>
                  </span>
                </span>
              </h2>
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
            <p className="swipe-hint">Плъзни настрани за още</p>
          </div>
        </section>

        {/* Етаж 4: откритата тераса с чата */}
        <Slab level={F.terasa.slab} floor={F.terasa.label} name={F.terasa.name} />
        <section className="floor floor--terasa" id="terasa">
          <div className="terasa">
            <div className="terasa__deck">
              <div data-reveal="lines">
                <p className="label" style={{ marginBottom: 18 }}>
                  Тераса с гледка
                </p>
                <h2 className="title lines">
                  <span>
                    <span>Кажи какво търсиш.</span>
                  </span>
                  <span>
                    <span>
                      <i>Останалото е наша работа.</i>
                    </span>
                  </span>
                </h2>
                <p className="lead">
                  Няколко кратки въпроса с готови отговори. Накрая оставяш име и телефон и брокерът за твоя район ти се обажда.
                </p>
              </div>
              <ChatStarter />
            </div>
            <div className="terasa__view" aria-hidden="true">
              <span className="terasa__note">гледка към залива</span>
              <div className="terasa__rail" />
            </div>
          </div>
        </section>

        {/* Етаж 3: агенцията */}
        <Slab level={F.agencia.slab} floor={F.agencia.label} name={F.agencia.name} />
        <section className="floor floor--agencia" id="agencia">
          <span className="floor__num" data-plx="-0.14" aria-hidden="true">
            3
          </span>
          <div className="wrap about">
            <div className="about__ph frame" data-reveal="shade">
              <div className="frame__in" data-plx="-0.07">
                <Photo src="/img/site/varna-city.jpg" alt="Улица във Варна" sizes="(max-width: 860px) 100vw, 40vw" />
              </div>
            </div>
            <div>
              <div data-reveal="lines">
                <p className="label" style={{ marginBottom: 18 }}>
                  Агенцията
                </p>
                <h2 className="title lines">
                  <span>
                    <span>{BRAND.city},</span>
                  </span>
                  <span>
                    <span>
                      <span className="mark">вход по вход</span>
                    </span>
                  </span>
                </h2>
              </div>
              <div className="prose" data-reveal>
                <p>
                  Работим във {BRAND.city} и около нея: от Центъра и Чайка до Виница, Галата и курортите. Продаваме, отдаваме под наем и
                  оценяваме.
                </p>
                <p>Не обещаваме срокове, които не зависят от нас, и не показваме имот, преди да сме проверили документите му.</p>
              </div>
              <div className="stats" data-reveal>
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
              <Link className="link" href="/za-nas">
                Повече за агенцията
                <Arrow />
              </Link>
            </div>
          </div>
        </section>

        {/* Етаж 2: райони */}
        <Slab level={F.rayoni.slab} floor={F.rayoni.label} name={F.rayoni.name} />
        <section className="floor floor--rayoni" id="rayoni">
          <span className="floor__num" data-plx="-0.14" aria-hidden="true">
            2
          </span>
          <div className="wrap">
            <header className="floor__head" data-reveal="lines">
              <p className="label">Райони</p>
              <h2 className="title lines">
                <span>
                  <span>Избери си квартал</span>
                </span>
              </h2>
            </header>
            <Districts rows={districts} />
          </div>
        </section>

        {/* Етаж 1: как работим */}
        <Slab level={F.kak.slab} floor={F.kak.label} name={F.kak.name} />
        <section className="floor floor--kak" id="kak">
          <span className="floor__num" data-plx="-0.14" aria-hidden="true">
            1
          </span>
          <div className="wrap">
            <header className="floor__head" data-reveal="lines">
              <p className="label">Как работим</p>
              <h2 className="title lines">
                <span>
                  <span>Четири стъпки</span>
                </span>
                <span>
                  <span>
                    <i>до нотариуса</i>
                  </span>
                </span>
              </h2>
            </header>
            <div className="steps">
              {STEPS.map(([t, d], i) => (
                <div className="step" key={t} data-reveal style={{ ['--d' as any]: i }}>
                  <span className="step__n">0{i + 1}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Партер: контакти */}
        <Slab level={F.parter.slab} floor={F.parter.label} name={F.parter.name} />
        <section className="floor floor--parter" id="parter">
          <div className="wrap lobby">
            <div>
              <div data-reveal="lines">
                <p className="label" style={{ marginBottom: 18 }}>
                  Партер
                </p>
                <h2 className="title lines">
                  <span>
                    <span>Вратата е отворена.</span>
                  </span>
                  <span>
                    <span>
                      <i>Ела на кафе.</i>
                    </span>
                  </span>
                </h2>
              </div>
              <dl className="lobby__info" data-reveal>
                <div className="lobby__row">
                  <dt>Адрес</dt>
                  <dd>{BRAND.address}</dd>
                </div>
                <div className="lobby__row">
                  <dt>Телефон</dt>
                  <dd>
                    <a href={`tel:${BRAND.phoneHref}`}>{BRAND.phone}</a>
                  </dd>
                </div>
                <div className="lobby__row">
                  <dt>Имейл</dt>
                  <dd>
                    <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
                  </dd>
                </div>
                {BRAND.hours.map(([d, h]) => (
                  <div className="lobby__row" key={d}>
                    <dt>{d}</dt>
                    <dd>{h}</dd>
                  </div>
                ))}
              </dl>
              <div className="lobby__cta" data-reveal>
                <ChatButton className="btn btn--lime">Пиши ни сега</ChatButton>
                <Link className="btn btn--ghost" href="/kontakti">
                  Как да стигнеш
                  <Arrow />
                </Link>
              </div>
            </div>
            <div className="lobby__ph frame" data-reveal="shade">
              <div className="frame__in" data-plx="-0.07">
                <Photo src="/img/site/keys.jpg" alt="Ключове от нов дом" sizes="(max-width: 860px) 100vw, 40vw" />
              </div>
            </div>
          </div>
        </section>
        <div data-zero />
      </div>

      {/* Улицата пред входа */}
      <div className="streetband" aria-hidden="true" />
      <div className="ground" data-ground />
    </main>
  );
}
