import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBroker, listProperties } from '@/lib/data';
import { phoneText } from '@/lib/format';
import { Band, PhoneIcon, Photo, PropertyCard, ViberIcon, viberLink } from '@/components/site/ui';
import StickBar from '@/components/site/StickBar';
import Tracker from '@/components/site/Tracker';
import { ChatContext, ChatStarter } from '@/components/chat/Chat';
import '../../pages.css';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBroker(slug);
  if (!b) return { title: 'Брокерът не е намерен' };
  const title = `${b.first_name} ${b.last_name}, ${b.title.toLowerCase()}`;
  return { title, description: b.pitch || undefined, openGraph: { title, description: b.pitch || undefined, images: b.photo ? [b.photo] : [] } };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const b = await getBroker(slug);
  if (!b) notFound();
  const items = await listProperties({ broker: b.slug });
  const ctx = { brokerId: b.id, brokerName: b.first_name, brokerPhoto: b.photo };
  return (
    <main className="prop">
      <Tracker kind="broker" brokerId={b.id} />
      <ChatContext {...ctx} />
      <div className="wrap">
        <nav className="crumbs" aria-label="Път">
          <Link href="/brokeri">Брокери</Link>
          <i />
          <span>
            {b.first_name} {b.last_name}
          </span>
        </nav>
        <article className="brow" style={{ borderTop: 0, paddingTop: 10 }}>
          <div className="brow__ph frame" data-reveal="shade">
            <div className="frame__in" data-plx="-0.03">
              {b.photo && <Photo src={b.photo} alt={`${b.first_name} ${b.last_name}`} sizes="(max-width: 860px) 90vw, 40vw" priority />}
            </div>
          </div>
          <div>
            <h1 className="brow__name">
              {b.first_name} {b.last_name}
            </h1>
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
              {b.languages.map((a) => (
                <span className="tag tag--ink" key={a}>
                  {a}
                </span>
              ))}
            </div>
            <div className="brow__acts">
              <a className="btn" href={`tel:${b.phone}`}>
                <PhoneIcon />
                {phoneText(b.phone)}
              </a>
              <a className="btn btn--ghost" href={viberLink(b.phone)}>
                <ViberIcon />
                Пиши във Viber
              </a>
            </div>
          </div>
        </article>
      </div>

      <section className="cta">
        <div className="wrap cta__in">
          <div data-reveal>
            <p className="label">Пиши направо</p>
            <h2 className="title">
              Кажи на {b.first_name} <i>какво търсиш</i>
            </h2>
            <p className="lead">Отговорите ти отиват при {b.first_name} заедно с името и телефона ти. Обаждането идва от човек, не от кол център.</p>
          </div>
          <ChatStarter />
        </div>
      </section>

      {items.length > 0 && (
        <>
          <Band left={`Имотите на ${b.first_name}`} right={items.length === 1 ? '1 оферта' : `${items.length} оферти`} />
          <div className="wrap">
            <div className="grid">
              {items.map((p, i) => (
                <div key={p.id} data-reveal style={{ ['--d' as any]: i % 3 }}>
                  <PropertyCard p={p} sizes="(max-width: 560px) 100vw, 33vw" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <StickBar ctx={ctx} label={`Пиши на ${b.first_name}`} phone={b.phone} photo={b.photo} />
    </main>
  );
}
