import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getBroker, getProperty, listProperties } from '@/lib/data';
import { DEALS, KINDS, area, floorText, money, phoneText, roomsText } from '@/lib/format';
import { Band, PhoneIcon, Photo, PropertyCard, Tri, ViberIcon, viberLink } from '@/components/site/ui';
import Gallery from '@/components/site/Gallery';
import StickBar from '@/components/site/StickBar';
import Tracker from '@/components/site/Tracker';
import { ChatContext, ChatStarter } from '@/components/chat/Chat';
import '../../../pages.css';

// Страницата, към която водят линковете от социалните мрежи:
// отгоре брокерът, който представя имота, до него чатът, отдолу самият имот.

type Params = { params: Promise<{ broker: string; property: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { broker, property } = await params;
  const [b, p] = await Promise.all([getBroker(broker, false), getProperty(property)]);
  if (!b || !p) return { title: 'Офертата не е намерена' };
  const title = `${p.title}, ${p.district}. ${money(p.price)}${p.deal === 'rent' ? ' на месец' : ''}`;
  const description = `${p.teaser || ''} Представя ${b.first_name} ${b.last_name}.`.trim();
  return { title, description, openGraph: { title, description, images: p.photos[0] ? [p.photos[0]] : [] } };
}

export default async function Page({ params }: Params) {
  const { broker, property } = await params;
  const [b, p] = await Promise.all([getBroker(broker, false), getProperty(property)]);
  if (!b || !p) notFound();
  // Първо собствените имоти на брокера, после други активни оферти, които също може да представи.
  const own = (await listProperties({ broker: b.slug })).filter((x) => x.id !== p.id);
  const rest = (await listProperties({ deal: p.deal })).filter((x) => x.id !== p.id && !own.some((o) => o.id === x.id));
  const others = [...own, ...rest].slice(0, 3);
  const ctx = { brokerId: b.id, brokerName: b.first_name, brokerPhoto: b.photo, propertyId: p.id, propertyTitle: p.title };
  const perM = p.deal === 'sale' && p.kind !== 'plot' ? Math.round(p.price / p.area) : null;
  const specs: [string, string | null][] = [
    ['Вид', `${KINDS[p.kind] || p.kind}, ${DEALS[p.deal].toLowerCase()}`],
    ['Площ', area(p.area)],
    ['Стаи', p.rooms ? roomsText(p) : null],
    ['Етаж', p.floor ? floorText(p.floor, p.floors) : null],
    ['Двор', p.yard ? area(p.yard) : null],
    ['Година', p.year_built ? String(p.year_built) : null],
    ['Строителство', p.construction],
    ['Отопление', p.heating],
    ['Обзавеждане', p.furnishing],
    ['Номер на офертата', p.ref],
  ];

  return (
    <main className="offer prop">
      <Tracker kind="offer" propertyId={p.id} brokerId={b.id} />
      <ChatContext {...ctx} />

      <section className="offer__hero">
        <div className="wrap offer__grid">
          <div className="offer__ph">{b.photo && <Photo src={b.photo} alt={`${b.first_name} ${b.last_name}`} sizes="(max-width: 700px) 104px, 28vw" priority />}</div>
          <div className="offer__who">
            <div className="offer__id">
              <p className="label">
                <Tri /> Този имот ти го представя
              </p>
              <h2 className="offer__name">
                {b.first_name} {b.last_name}
              </h2>
              <p className="offer__role">{b.title}</p>
            </div>
            <p className="offer__pitch">{b.pitch || `Брокер в ${BRAND.full}. Пиши ми или се обади и ще ти разкажа всичко за този имот.`}</p>
            {b.facts.length > 0 && (
              <div className="offer__facts">
                {b.facts.slice(0, 3).map(([n, l]) => (
                  <div key={l}>
                    <b>{n}</b>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="offer__acts">
              <a className="btn btn--ghost btn--s" href={`tel:${b.phone}`}>
                <PhoneIcon />
                {phoneText(b.phone)}
              </a>
              <a className="btn btn--ghost btn--s" href={viberLink(b.phone)}>
                <ViberIcon />
                Пиши във Viber
              </a>
            </div>
          </div>
          <div className="offer__chat">
            <div className="offer__for">
              <div>{p.photos[0] && <Photo src={p.photos[0]} alt="" sizes="64px" />}</div>
              <div>
                <small>Питаш за</small>
                <b>{p.title}</b>, {money(p.price)}
                {p.deal === 'rent' ? ' на месец' : ''}
              </div>
            </div>
            <ChatStarter note={`Отговорите ти отиват направо при ${b.first_name}. Телефон оставяш чак накрая.`} />
          </div>
        </div>
      </section>

      <div className="wrap offer__body">
        <div className="prop__ref">
          <span className="tag tag--ink">{DEALS[p.deal]}</span>
          {p.status === 'reserved' && <span className="tag tag--lime">Капариран</span>}
          <span className="tag">{p.district}</span>
          <span className="tag">№ {p.ref}</span>
        </div>
        <div className="offer__title">
          <div>
            <h1>{p.title}</h1>
            {p.address && <p className="prop__addr">{p.address}</p>}
          </div>
          <div className="prop__price">
            <b>{money(p.price)}</b>
            <span>{p.deal === 'rent' ? 'на месец' : perM ? `${money(perM)} на кв.м` : ''}</span>
          </div>
        </div>
        <Gallery photos={p.photos} title={p.title} />
        <div className="offer__cols">
          <div>
            <h2 className="prop__h">За имота</h2>
            <div className="prose">
              {(p.description || '').split('\n\n').map((t, i) => (
                <p key={i}>{t}</p>
              ))}
            </div>
            {p.features.length > 0 && (
              <>
                <h2 className="prop__h">Какво включва</h2>
                <ul className="feats">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div>
            <dl className="specs" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginTop: 0 }}>
              {specs
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div className="spec" key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            <div style={{ marginTop: 26 }}>
              <ChatStarter title={`Питай ${b.first_name} за имота`} />
            </div>
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <>
          <Band left="Още оферти" right={`Представя ${b.first_name}`} />
          <div className="wrap">
            <div className="grid">
              {others.map((s, i) => (
                <div key={s.id} data-reveal style={{ ['--d' as any]: i }}>
                  <PropertyCard p={s} href={`/oferta/${b.slug}/${s.slug}`} sizes="(max-width: 560px) 100vw, 33vw" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <StickBar ctx={ctx} label={`Попитай ${b.first_name} за имота`} phone={b.phone} photo={b.photo} />
    </main>
  );
}
