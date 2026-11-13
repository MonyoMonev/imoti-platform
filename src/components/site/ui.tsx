import Image from 'next/image';
import Link from 'next/link';
import { levelText } from '@/lib/brand';
import type { Property } from '@/lib/data';
import { area, floorText, money, roomsText } from '@/lib/format';

export function Arrow() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 9h12M10 4l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.800" />
    </svg>
  );
}

export function Tri() {
  return (
    <svg viewBox="0 0 16 14" aria-hidden="true">
      <path d="M1 1h14L8 13z" fill="currentColor" />
    </svg>
  );
}

/** Снимка: готовите минават през оптимизатора, качените от админ панела се подават както са. */
export function Photo({ src, alt, sizes, priority = false }: { src: string; alt: string; sizes: string; priority?: boolean }) {
  if (src.startsWith('/img/')) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;
}

/** Плоча между етажите с кота, както се надписва в разрез. */
export function Slab({ level, floor, name }: { level: number; floor: string; name: string }) {
  return (
    <div className="slab" data-level={level}>
      <span className="slab__level">
        <Tri />
        {levelText(level)}
      </span>
      <span className="slab__floor">{floor}</span>
      <span className="slab__rule" />
      <span className="slab__name">{name}</span>
    </div>
  );
}

/** Тъмна лента разделител за вътрешните страници. */
export function Band({ left, right }: { left: string; right: string }) {
  return (
    <div className="slab">
      <span className="slab__level">
        <Tri />
        {left}
      </span>
      <span className="slab__rule" />
      <span className="slab__name">{right}</span>
    </div>
  );
}

export function PropertyCard({
  p,
  wide = false,
  sizes = '(max-width: 860px) 78vw, 30vw',
  href,
}: {
  p: Property;
  wide?: boolean;
  sizes?: string;
  href?: string;
}) {
  const fresh = Date.now() - new Date(p.created_at).getTime() < 7 * 86400000;
  return (
    <Link href={href || `/imoti/${p.slug}`} className={`pcard${wide ? ' pcard--wide' : ''}`}>
      <div className="pcard__win">
        <span className={`pcard__tag${p.deal === 'rent' ? ' pcard__tag--rent' : ''}`}>{p.deal === 'rent' ? 'Наем' : 'Продажба'}</span>
        {p.status === 'reserved' ? <span className="pcard__tag pcard__tag--new">Капариран</span> : fresh && <span className="pcard__tag pcard__tag--new">Нов</span>}
        {p.photos[0] && <Photo src={p.photos[0]} alt={p.title} sizes={sizes} />}
        <span className="pcard__go">
          <Arrow />
        </span>
      </div>
      <div className="pcard__sill">
        <div className="pcard__price">
          {money(p.price)}
          {p.deal === 'rent' && <small>на месец</small>}
        </div>
        <h3 className="pcard__title">{p.title}</h3>
        <div className="pcard__facts">
          <span>{p.district}</span>
          <span>{area(p.area)}</span>
          {p.rooms ? <span>{roomsText(p)}</span> : null}
          {p.floor ? <span>ет. {floorText(p.floor, p.floors)}</span> : null}
        </div>
      </div>
    </Link>
  );
}

export function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 3h3l1.500 4-2 1.500a10 10 0 0 0 5 5l1.500-2 4 1.500v3a1.500 1.500 0 0 1-1.500 1.500A13.500 13.500 0 0 1 2.500 4.500 1.500 1.500 0 0 1 4 3z" fill="none" stroke="currentColor" strokeWidth="1.500" strokeLinejoin="round" />
    </svg>
  );
}

export function ViberIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.500c4.400 0 7.500 2.800 7.500 6.800s-3.100 6.800-7.500 6.800c-.700 0-1.400-.100-2-.200L5 18v-3.200c-1.600-1.200-2.500-3.200-2.500-5.500 0-4 3.100-6.800 7.500-6.800z" fill="none" stroke="currentColor" strokeWidth="1.500" strokeLinejoin="round" />
      <path d="M7.500 7c.200 2.800 2.400 5 5.200 5.300" fill="none" stroke="currentColor" strokeWidth="1.500" strokeLinecap="round" />
    </svg>
  );
}

/** Линк, който отваря разговор във Viber с даден номер. */
export function viberLink(phone: string): string {
  return `viber://chat?number=${encodeURIComponent(phone)}`;
}
