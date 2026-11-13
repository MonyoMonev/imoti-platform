'use client';

import { useMemo, useState } from 'react';
import { area, price, roomsText } from '@/lib/format';
import CopyButton from './Copy';

type Prop = {
  id: number;
  slug: string;
  ref: string;
  title: string;
  district: string;
  price: number;
  deal: string;
  area: number;
  kind: string;
  rooms: number | null;
  teaser: string | null;
  photos: string[];
};
type Broker = { id: number; name: string; slug: string };

const CHANNELS: [string, string][] = [
  ['fb', 'Facebook'],
  ['ig', 'Instagram'],
  ['tt', 'TikTok'],
  ['viber', 'Viber'],
  ['', 'Друго'],
];

export default function LinkBuilder({
  properties,
  brokers,
  siteUrl,
  initialProperty,
  fixedBroker,
}: {
  properties: Prop[];
  brokers: Broker[];
  siteUrl: string;
  initialProperty?: number;
  fixedBroker: boolean;
}) {
  const [pid, setPid] = useState<number>(
    properties.find((p) => p.id === initialProperty)?.id ?? properties[0]?.id ?? 0
  );
  const [bid, setBid] = useState<number>(brokers[0]?.id ?? 0);
  const [channel, setChannel] = useState('fb');

  const prop = properties.find((p) => p.id === pid);
  const broker = brokers.find((b) => b.id === bid);

  const link = useMemo(() => {
    if (!prop || !broker) return '';
    return `${siteUrl}/oferta/${broker.slug}/${prop.slug}${channel ? `?k=${channel}` : ''}`;
  }, [prop, broker, channel, siteUrl]);

  const post = useMemo(() => {
    if (!prop) return '';
    const facts = [roomsText(prop), area(prop.area), prop.district].filter(Boolean).join(', ');
    return [prop.title, prop.teaser || '', `${facts}. ${price(prop)}.`, '', `Снимки, подробности и въпроси към мен: ${link}`]
      .filter((x, i) => x !== '' || i === 3)
      .join('\n');
  }, [prop, link]);

  if (!properties.length) return null;
  if (!brokers.length) {
    return <p className="muted">Първо попълни профила си, за да имаш собствена страница за линковете.</p>;
  }

  return (
    <div className="linkbuilder">
      <div className="grid2">
        <label className="field">
          <span>Имот</span>
          <select name="property" value={pid} onChange={(e) => setPid(Number(e.target.value))}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.ref})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Кой го представя</span>
          <select name="broker" value={bid} disabled={fixedBroker} onChange={(e) => setBid(Number(e.target.value))}>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <em>Запитванията от този линк отиват при него.</em>
        </label>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <span>Къде ще го публикуваш</span>
        <div className="statuspick" role="group" aria-label="Канал">
          {CHANNELS.map(([v, l]) => (
            <button key={l} type="button" aria-pressed={channel === v} onClick={() => setChannel(v)}>
              {l}
            </button>
          ))}
        </div>
        <em>Каналът се записва в линка. Така после виждаш кой пост е довел хора и кой не.</em>
      </div>

      {prop && broker ? (
        <div className={`linkout${prop.photos?.[0] ? '' : ' nophoto'}`}>
          {prop.photos?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={prop.photos[0]} alt="" />
          ) : null}
          <div style={{ minWidth: 0 }}>
            <div className="adm-kicker" style={{ marginBottom: 6 }}>
              Твоят линк
            </div>
            <div className="copyrow">
              <code data-link>{link}</code>
              <CopyButton text={link} label="Копирай линка" />
              <a className="btn small quiet" href={link.replace(siteUrl, '')} target="_blank" rel="noreferrer">
                Отвори
              </a>
            </div>
            <div className="adm-kicker" style={{ margin: '16px 0 6px' }}>
              Готов текст за поста
            </div>
            <div className="copyrow">
              <div className="copytext" data-post>
                {post}
              </div>
              <CopyButton text={post} label="Копирай текста" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
