'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

// Движението на сайта: плавен скрол (само с мишка), паралакс и появяване при скрол.
// data-plx="0.1"  елементът се мести спрямо скрола (отрицателно число = наобратно)
// data-reveal     елементът се появява, когато влезе в екрана
export default function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;

    let lenis: Lenis | null = null;
    if (!reduce && fine) {
      lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
      (window as any).__lenis = lenis;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -7% 0px', threshold: 0.06 }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

    type Item = { el: HTMLElement; speed: number; mid: number; h: number };
    let items: Item[] = [];
    const measure = () => {
      const y = window.scrollY;
      items = Array.from(document.querySelectorAll<HTMLElement>('[data-plx]')).map((el) => {
        const prev = el.style.transform;
        el.style.transform = 'none';
        const r = el.getBoundingClientRect();
        el.style.transform = prev;
        return { el, speed: parseFloat(el.dataset.plx || '0'), mid: r.top + y + r.height / 2, h: r.height };
      });
      last = -1;
    };

    let last = -1;
    let raf = 0;
    const mobile = window.innerWidth < 760;
    const tick = (time: number) => {
      lenis?.raf(time);
      const y = window.scrollY;
      if (y !== last && !reduce) {
        last = y;
        const vh = window.innerHeight;
        for (const it of items) {
          const d = y + vh / 2 - it.mid;
          if (Math.abs(d) > vh + it.h) continue;
          const k = mobile ? 0.6 : 1;
          it.el.style.transform = `translate3d(0, ${(d * it.speed * k).toFixed(1)}px, 0)`;
        }
        document.documentElement.classList.toggle('is-scrolled', y > 24);
      }
      raf = requestAnimationFrame(tick);
    };

    measure();
    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(() => measure());
    ro.observe(document.body);
    window.addEventListener('resize', measure);

    // Плавно придвижване към котва, например от асансьора към етаж.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"], a[href^="/#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const hash = a.getAttribute('href')!.replace(/^\//, '');
      if (hash.length < 2) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 64;
      if (lenis) lenis.scrollTo(top, { duration: 1.4 });
      else window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    };
    document.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('click', onClick);
      lenis?.destroy();
      (window as any).__lenis = null;
    };
  }, [pathname]);

  return null;
}
