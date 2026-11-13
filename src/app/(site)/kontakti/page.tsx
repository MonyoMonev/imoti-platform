import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { Arrow, Tri } from '@/components/site/ui';
import Tracker from '@/components/site/Tracker';
import { ChatStarter } from '@/components/chat/Chat';
import '../pages.css';
import '../home.css';

export const metadata: Metadata = {
  title: 'Контакти',
  description: `${BRAND.full}, ${BRAND.address}. Телефон ${BRAND.phone}.`,
};

export default function Page() {
  const q = encodeURIComponent(BRAND.address);
  return (
    <main>
      <Tracker kind="page" />
      <div className="wrap">
        <header className="phead">
          <p className="label phead__label">
            <Tri />
            Контакти
          </p>
          <h1 className="title">
            Вратата е отворена. <i>Ела на кафе.</i>
          </h1>
        </header>
        <section className="lobby" style={{ paddingBottom: 'clamp(56px, 8vw, 110px)' }}>
          <div>
            <dl className="lobby__info" style={{ marginTop: 0 }}>
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
            <div className="lobby__cta">
              <a className="btn" href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer">
                Отвори в картите
                <Arrow />
              </a>
              <a className="btn btn--ghost" href={`tel:${BRAND.phoneHref}`}>
                Обади се
              </a>
            </div>
            <div style={{ marginTop: 40 }}>
              <ChatStarter note="Ако ти е удобно да пишеш, започни оттук. Телефон оставяш чак накрая." />
            </div>
          </div>
          <div className="map">
            <iframe title="Карта с офиса" loading="lazy" src={`https://www.google.com/maps?q=${q}&z=16&output=embed`} referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </section>
      </div>
    </main>
  );
}
