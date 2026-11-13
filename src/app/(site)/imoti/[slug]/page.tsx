import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { favoriteIds, getProperty, similarProperties } from '@/lib/data';
import { DEALS, KINDS, area, floorText, money, phoneText, roomsText } from '@/lib/format';
import { Arrow, Band, PhoneIcon, Photo, PropertyCard, ViberIcon, viberLink } from '@/components/site/ui';
import Gallery from '@/components/site/Gallery';
import Mortgage from '@/components/site/Mortgage';
import FavButton from '@/components/site/FavButton';
import StickBar from '@/components/site/StickBar';
import Tracker from '@/components/site/Tracker';
import { ChatButton, ChatContext } from '@/components/chat/Chat';
import '../../pages.css';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProperty(slug);
  if (!p) return { title: 'Имотът не е намерен' };
  const title = `${p.title}, ${p.district}`;
  const description = `${money(p.price)}${p.deal === 'rent' ? ' на месец' : ''}. ${p.teaser || ''}`;
  return { title, description, openGraph: { title, description, images: p.photos[0] ? [p.photos[0]] : [] } };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const p = await getProperty(slug);
  if (!p) notFound();
  const user = await currentUser();
  const favs = user?.role === 'client' ? await favoriteIds(user.id) : [];
  const similar = await similarProperties(p, 3);
  const ctx = { brokerId: p.broker_id ?? undefined, brokerName: p.b_first, brokerPhoto: p.b_photo, propertyId: p.id, propertyTitle: p.title };
  const perM = p.deal === 'sale' && p.kind !== 'plot' ? Math.round(p.price / p.area) : null;

  const specs: [string, string | null][] = [
    ['Вид', `${KINDS[p.kind] || p.kind}, ${DEALS[p.deal].toLowerCase()}`],
    ['Площ', area(p.area)],
    ['Стаи', p.rooms ? roomsText(p) : null],
    ['Етаж', p.floor ? floorText(p.floor, p.floors) : p.floors ? `${p.floors} етажа` : null],
    ['Двор', p.yard ? area(p.yard) : null],
    ['Година', p.year_built ? String(p.year_built) : null],
    ['Строителство', p.construction],
    ['Отопление', p.heating],
    ['Обзавеждане', p.furnishing],
    ['Цена на кв.м', perM ? money(perM) : null],
    ['Номер на офертата', p.ref],
  ];

  return (
    <main className="prop">
      <Tracker kind="property" propertyId={p.id} brokerId={p.broker_id ?? undefined} />
      <ChatContext {...ctx} />
      <div className="wrap">
        <nav className="crumbs" aria-label="Път">
          <Link href="/imoti">Имоти</Link>
          <i />
          <Link href={`/imoti?deal=${p.deal}`}>{p.deal === 'rent' ? 'Наеми' : 'Продажби'}</Link>
          <i />
          <Link href={`/imoti?district=${encodeURIComponent(p.district)}`}>{p.district}</Link>
        </nav>
        <Gallery photos={p.photos} title={p.title} />

        <div className="prop__cols">
          <article>
            <div className="prop__ref">
              <span className="tag tag--ink">{DEALS[p.deal]}</span>
              {p.status === 'reserved' && <span className="tag tag--lime">Капариран</span>}
              <span className="tag">{p.district}</span>
              <span className="tag">№ {p.ref}</span>
            </div>
            <h1>{p.title}</h1>
            {p.address && <p className="prop__addr">{p.address}</p>}
            <div className="prop__price">
              <b>{money(p.price)}</b>
              <span>{p.deal === 'rent' ? 'на месец' : perM ? `${money(perM)} на кв.м` : ''}</span>
            </div>
            <dl className="specs">
              {specs
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div className="spec" key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>

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
          </article>

          <aside className="side">
            {p.b_slug && (
              <div className="bcard">
                <div className="bcard__top">
                  <div className="bcard__ph">{p.b_photo && <Photo src={p.b_photo} alt={`${p.b_first} ${p.b_last}`} sizes="112px" />}</div>
                  <div>
                    <div className="bcard__name">
                      {p.b_first} {p.b_last}
                    </div>
                    <div className="bcard__role">{p.b_title}</div>
                    <Link className="bcard__more" href={`/brokeri/${p.b_slug}`}>
                      Кой е {p.b_first}
                    </Link>
                  </div>
                </div>
                <div className="bcard__acts">
                  <a href={`tel:${p.b_phone}`}>
                    <PhoneIcon />
                    {phoneText(p.b_phone)}
                  </a>
                  <a href={viberLink(p.b_phone || '')}>
                    <ViberIcon />
                    Viber
                  </a>
                </div>
              </div>
            )}
            <ChatButton className="btn btn--lime" first="ask">
              Попитай за този имот
              <Arrow />
            </ChatButton>
            <FavButton propertyId={p.id} initial={favs.includes(p.id)} loggedIn={user?.role === 'client'} />
            {p.deal === 'sale' && <Mortgage price={p.price} />}
          </aside>
        </div>
      </div>

      {similar.length > 0 && (
        <>
          <Band left="Подобни имоти" right={p.district} />
          <div className="wrap">
            <div className="grid">
              {similar.map((s, i) => (
                <div key={s.id} data-reveal style={{ ['--d' as any]: i }}>
                  <PropertyCard p={s} sizes="(max-width: 560px) 100vw, 33vw" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <StickBar ctx={ctx} label={p.b_first ? `Попитай ${p.b_first}` : 'Попитай за имота'} phone={p.b_phone || ''} photo={p.b_photo} />
    </main>
  );
}
