import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { listBrokers } from '@/lib/data';
import { phoneText } from '@/lib/format';
import { Arrow, PhoneIcon, Photo, Tri } from '@/components/site/ui';
import Tracker from '@/components/site/Tracker';
import { ChatButton, ChatStarter } from '@/components/chat/Chat';
import '../pages.css';

export const metadata: Metadata = {
  title: 'Брокерите',
  description: `Запознай се с брокерите на ${BRAND.full}: кой за кои райони отговаря и как работи.`,
};

export default async function Page() {
  const brokers = await listBrokers();
  return (
    <main>
      <Tracker kind="page" />
      <div className="wrap">
        <header className="phead">
          <p className="label phead__label">
            <Tri />
            Екипът
          </p>
          <h1 className="title">
            Брокери с <span className="mark">име и лице</span>
          </h1>
          <p className="lead">
            Всеки от нас работи в свои райони и ги познава от години. Прочети кой какъв е и избери на кого да звъннеш. Или ни кажи какво търсиш и
            ще те свържем с точния човек.
          </p>
          <span className="phead__num" aria-hidden="true">
            {brokers.length}
          </span>
        </header>

        {brokers.map((b, i) => (
          <article className="brow" key={b.id} id={b.slug}>
            <div className="brow__ph frame" data-reveal="shade">
              <div className="frame__in" data-plx="-0.03">
                {b.photo && <Photo src={b.photo} alt={`${b.first_name} ${b.last_name}`} sizes="(max-width: 860px) 90vw, 40vw" priority={i === 0} />}
              </div>
              <span className="brow__idx">
                {String(i + 1).padStart(2, '0')} от {String(brokers.length).padStart(2, '0')}
              </span>
            </div>
            <div data-reveal>
              <h2 className="brow__name">
                {b.first_name} {b.last_name}
              </h2>
              <p className="brow__role">{b.title}</p>
              {b.quote && <blockquote className="brow__quote">„{b.quote}“</blockquote>}
              <div className="prose">
                {(b.bio || '').split('\n\n').map((t, k) => (
                  <p key={k}>{t}</p>
                ))}
              </div>
              {b.facts.length > 0 && (
                <div className="brow__facts">
                  {b.facts.slice(0, 3).map(([n, l]) => (
                    <div key={l}>
                      <b>{n}</b>
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="brow__meta">
                {b.areas.map((a) => (
                  <span className="tag" key={a}>
                    {a}
                  </span>
                ))}
              </div>
              <div className="brow__acts">
                <ChatButton ctx={{ brokerId: b.id, brokerName: b.first_name, brokerPhoto: b.photo }}>Пиши на {b.first_name}</ChatButton>
                <a className="btn btn--ghost" href={`tel:${b.phone}`}>
                  <PhoneIcon />
                  {phoneText(b.phone)}
                </a>
                <Link className="link" href={`/brokeri/${b.slug}`} style={{ alignSelf: 'center', marginLeft: 6 }}>
                  {b.listings ? `Имотите на ${b.first_name} (${b.listings})` : `Повече за ${b.first_name}`}
                  <Arrow />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      <section className="cta">
        <div className="wrap cta__in">
          <div data-reveal>
            <p className="label">Не знаеш към кого</p>
            <h2 className="title">
              Кажи какво търсиш и <i>ние ще те насочим</i>
            </h2>
            <p className="lead">Според района и вида имот запитването ти отива при брокера, който работи точно с това.</p>
          </div>
          <ChatStarter />
        </div>
      </section>
    </main>
  );
}
