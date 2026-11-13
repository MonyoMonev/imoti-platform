'use client';

import { useState } from 'react';

const MON = ['яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'];

function label(day: string) {
  const [, m, d] = day.split('-');
  return `${Number(d)} ${MON[Number(m) - 1]}`;
}

function niceTop(max: number) {
  if (max <= 4) return 4;
  if (max <= 6) return 6;
  if (max <= 10) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  for (const k of [1, 2, 4, 5, 10]) if (max <= k * pow) return k * pow;
  return max;
}

/** Колони по дни с една мярка. Стойността се чете при посочване или с Tab. */
export default function DayBars({ data, one, more }: { data: { day: string; n: number }[]; one: string; more: string }) {
  const [on, setOn] = useState<number | null>(null);
  const W = 760;
  const H = 216;
  const padL = 30;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const top = niceTop(Math.max(1, ...data.map((d) => d.n)));
  const slot = iw / data.length;
  const bw = Math.min(24, Math.max(4, slot - 4));
  const y = (v: number) => padT + ih - (v / top) * ih;
  const ticks = [0, top / 2, top];
  const total = data.reduce((s, d) => s + d.n, 0);

  return (
    <div className="chart" onMouseLeave={() => setOn(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Запитвания по дни за последните ${data.length} дни, общо ${total}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
            <text className="axis" x={padL - 8} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * slot + (slot - bw) / 2;
          const h = d.n > 0 ? Math.max(3, (d.n / top) * ih) : 2;
          const y0 = padT + ih;
          const yt = y0 - h;
          const r = Math.min(4, bw / 2, h);
          const path =
            d.n > 0
              ? `M${x},${y0} L${x},${yt + r} Q${x},${yt} ${x + r},${yt} L${x + bw - r},${yt} Q${x + bw},${yt} ${x + bw},${yt + r} L${x + bw},${y0} Z`
              : `M${x},${y0} L${x},${yt} L${x + bw},${yt} L${x + bw},${y0} Z`;
          const showLabel = i === data.length - 1 || (i % 5 === 0 && i < data.length - 3);
          return (
            <g key={d.day}>
              <path className={`bar${d.n === 0 ? ' zero' : ''}${on === i ? ' on' : ''}`} d={path} />
              <rect
                className="hit"
                x={padL + i * slot}
                y={padT}
                width={slot}
                height={ih + 4}
                tabIndex={0}
                aria-label={`${label(d.day)}: ${d.n} ${d.n === 1 ? one : more}`}
                onMouseEnter={() => setOn(i)}
                onFocus={() => setOn(i)}
                onBlur={() => setOn(null)}
              />
              {showLabel ? (
                <text className="axis" x={x + bw / 2} y={H - 6} textAnchor={i === data.length - 1 ? 'end' : 'middle'}>
                  {i === data.length - 1 ? 'днес' : label(d.day)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {on !== null ? (
        <div
          className="tip"
          style={{
            left: `calc(20px + (100% - 40px) * ${(padL + on * slot + slot / 2) / W})`,
            top: `calc(18px + (100% - 32px) * ${(y(data[on].n) - 8) / H})`,
          }}
        >
          <b>
            {data[on].n} {data[on].n === 1 ? one : more}
          </b>
          {label(data[on].day)}
        </div>
      ) : null}
      <table className="sr-only">
        <caption>Запитвания по дни</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th scope="row">{label(d.day)}</th>
              <td>{d.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
