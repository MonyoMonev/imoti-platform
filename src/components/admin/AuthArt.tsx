import Image from 'next/image';
import { BRAND } from '@/lib/brand';

/** Лявата част на страниците за вход и покана: снимка на града, логото и едно ясно изречение. */
export function AuthArt({ title, text }: { title: string; text: string }) {
  const [first, ...rest] = BRAND.name.split(' ');
  return (
    <aside className="art">
      <Image src="/img/site/varna-coast.jpg" alt="" fill priority sizes="(max-width: 1100px) 100vw, 60vw" style={{ objectFit: 'cover' }} />
      <div className="mark">
        <span>
          <b>{first}</b>
          {rest.length ? ` ${rest.join(' ')}` : ''}
        </span>
        <small>{BRAND.sub}</small>
      </div>
      <div className="say">
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </aside>
  );
}
