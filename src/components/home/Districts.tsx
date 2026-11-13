'use client';

import Link from 'next/link';
import { useState } from 'react';

type Row = { district: string; n: number; cover: string | null };

/** Списък с райони. При посочване вдясно се сменя снимка от имот в района. */
export default function Districts({ rows }: { rows: Row[] }) {
  const [on, setOn] = useState(0);
  return (
    <div className="areas">
      <div className="areas__list" data-reveal>
        {rows.map((r, i) => (
          <Link
            key={r.district}
            href={`/imoti?district=${encodeURIComponent(r.district)}`}
            className={`area${i === on ? ' is-on' : ''}`}
            onMouseEnter={() => setOn(i)}
            onFocus={() => setOn(i)}
          >
            {r.district}
            <small>{r.n === 1 ? '1 имот' : `${r.n} имота`}</small>
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <path d="M3 9h12M10 4l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.800" />
            </svg>
          </Link>
        ))}
      </div>
      <div className="areas__view" data-reveal="shade" aria-hidden="true">
        {rows.map((r, i) =>
          r.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={r.district} src={r.cover} alt="" loading="lazy" className={i === on ? 'is-on' : ''} />
          ) : null
        )}
        <span className="areas__cap">{rows[on]?.district}</span>
      </div>
    </div>
  );
}
