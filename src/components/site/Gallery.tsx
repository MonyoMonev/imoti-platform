'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

function Pic({ src, alt, sizes, priority }: { src: string; alt: string; sizes: string; priority?: boolean }) {
  if (src.startsWith('/img/')) return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;
}

/** Галерия на имот: мозайка на компютър, плъзгане на телефон и голям изглед при цъкане. */
export default function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [at, setAt] = useState<number | null>(null);
  const n = photos.length;
  const shown = photos.slice(0, 5);
  const step = useCallback((d: number) => setAt((v) => (v == null ? v : (v + d + n) % n)), [n]);

  useEffect(() => {
    if (at == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAt(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    (window as any).__lenis?.stop();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
      (window as any).__lenis?.start();
    };
  }, [at, step]);

  if (n === 0) return null;
  return (
    <>
      <div className={`gal gal--${Math.min(n, 5)}`}>
        {shown.map((src, i) => (
          <button key={src} type="button" className="gal__item" onClick={() => setAt(i)} aria-label={`Снимка ${i + 1} от ${n}`}>
            <Pic src={src} alt={`${title}, снимка ${i + 1}`} sizes={i === 0 ? '(max-width: 760px) 92vw, 60vw' : '(max-width: 760px) 92vw, 30vw'} priority={i === 0} />
            {i === shown.length - 1 && (
              <span className="gal__more">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" fill="none" stroke="currentColor" strokeWidth="1.400" />
                </svg>
                Всички {n} снимки
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="gal__count">Плъзни настрани, {n} снимки</p>

      {at != null && (
        <div className="lbox" role="dialog" aria-label="Снимки на имота" data-lenis-prevent>
          <div className="lbox__top">
            <span>
              {at + 1} от {n}
            </span>
            <button type="button" className="lbox__btn" onClick={() => setAt(null)} aria-label="Затвори">
              <svg viewBox="0 0 14 14">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.800" fill="none" />
              </svg>
            </button>
          </div>
          <div className="lbox__stage">
            <button type="button" className="lbox__btn" onClick={() => step(-1)} aria-label="Предишна">
              <svg viewBox="0 0 18 18">
                <path d="M15 9H3M8 4L3 9l5 5" fill="none" stroke="currentColor" strokeWidth="1.800" />
              </svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[at]} alt={`${title}, снимка ${at + 1}`} />
            <button type="button" className="lbox__btn" onClick={() => step(1)} aria-label="Следваща">
              <svg viewBox="0 0 18 18">
                <path d="M3 9h12M10 4l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.800" />
              </svg>
            </button>
          </div>
          <div className="lbox__thumbs">
            {photos.map((src, i) => (
              <button key={src} type="button" className={i === at ? 'is-on' : ''} onClick={() => setAt(i)} aria-label={`Снимка ${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
