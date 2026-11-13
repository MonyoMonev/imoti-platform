'use client';

import { useEffect, useRef } from 'react';
import { FLOORS, levelText } from '@/lib/brand';

// Асансьорът отвън на сградата. Кабината стои в средата на екрана, докато
// етажите минават покрай нея, и показва на каква кота се намираш в момента.
export default function Elevator() {
  const cabin = useRef<HTMLDivElement>(null);
  const level = useRef<HTMLSpanElement>(null);
  const floor = useRef<HTMLSpanElement>(null);
  const pillLevel = useRef<HTMLSpanElement>(null);
  const pillFloor = useRef<HTMLSpanElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const dir = useRef<HTMLElement>(null);

  useEffect(() => {
    let marks: { y: number; level: number }[] = [];
    let groundY = 0;
    let last = -1;
    let raf = 0;
    let lastIdx = -2;

    const measure = () => {
      const y = window.scrollY;
      marks = Array.from(document.querySelectorAll<HTMLElement>('[data-level]'))
        .map((el) => ({ y: el.getBoundingClientRect().top + y, level: Number(el.dataset.level) }))
        .sort((a, b) => a.y - b.y);
      // Кота нула е долният край на сградата, там където свършва и шахтата.
      const g = document.querySelector<HTMLElement>('[data-zero]') || document.querySelector<HTMLElement>('[data-ground]');
      groundY = g ? g.getBoundingClientRect().top + y : document.documentElement.scrollHeight;
      marks.push({ y: groundY, level: 0 });
      last = -1;
    };

    const tick = () => {
      const y = window.scrollY;
      if (y !== last && marks.length > 1) {
        last = y;
        const vh = window.innerHeight;
        const c = cabin.current;
        const visible = c && c.offsetParent !== null;
        const r = visible ? c!.getBoundingClientRect() : null;
        // Гледаме пода на кабината, а на телефон средата на екрана.
        const at = Math.min(r ? r.bottom + y : y + vh * 0.5, groundY);

        let m = 0;
        let idx = -1;
        if (at <= marks[0].y) {
          const per = (marks[1].y - marks[0].y) / (marks[0].level - marks[1].level);
          m = marks[0].level + (marks[0].y - at) / per;
        } else {
          for (let i = 0; i < marks.length - 1; i++) {
            if (at >= marks[i].y && at <= marks[i + 1].y) {
              const k = (at - marks[i].y) / (marks[i + 1].y - marks[i].y);
              m = marks[i].level + (marks[i + 1].level - marks[i].level) * k;
              idx = i;
              break;
            }
          }
          if (idx === -1) idx = marks.length - 2;
        }
        const text = levelText(Math.max(0, m));
        const name = idx < 0 ? 'Покрив' : FLOORS[Math.min(idx, FLOORS.length - 1)].label;
        if (level.current) level.current.textContent = text;
        if (pillLevel.current) pillLevel.current.textContent = text;
        if (idx !== lastIdx) {
          lastIdx = idx;
          if (floor.current) floor.current.textContent = name;
          if (pillFloor.current) pillFloor.current.textContent = name;
          dir.current?.querySelectorAll('a').forEach((a, i) => a.classList.toggle('is-on', i === idx + 1));
          c?.classList.toggle('is-ground', idx >= FLOORS.length - 1 && at >= groundY - 4);
        }
        c?.classList.toggle('is-ground', at >= groundY - 6);
        pill.current?.classList.toggle('is-on', y > vh * 0.35 && y + vh < groundY + vh * 0.5);
        dir.current?.classList.toggle('is-off', y + vh * 0.62 > groundY);
      }
      raf = requestAnimationFrame(tick);
    };

    measure();
    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <>
      <div className="shaft" aria-hidden="true">
        <div className="shaft__top">
          <span />
        </div>
        <div className="cabin" ref={cabin}>
          <div className="cabin__box">
            <span className="cabin__door cabin__door--l" />
            <span className="cabin__door cabin__door--r" />
            <svg className="cabin__you" viewBox="0 0 20 46">
              <circle cx="10" cy="6" r="5" />
              <path d="M2 22c0-6 3-9 8-9s8 3 8 9v8h-3v16H5V30H2z" />
            </svg>
          </div>
          <div className="cabin__read">
            <small>кота</small>
            <span className="cabin__level" ref={level}>
              {levelText(FLOORS[0].slab)}
            </span>
            <span className="cabin__floor" ref={floor}>
              Покрив
            </span>
          </div>
        </div>
      </div>

      <nav className="floors" ref={dir} aria-label="Етажи">
        <a href="#pokriv" className="is-on">
          <i>Покрив</i>
          <b>7</b>
        </a>
        {FLOORS.map((f, i) => (
          <a key={f.id} href={`#${f.id}`}>
            <i>{f.name}</i>
            <b>{i === FLOORS.length - 1 ? 'П' : FLOORS.length - 1 - i}</b>
          </a>
        ))}
      </nav>

      <div className="lvl" ref={pill} aria-hidden="true">
        <svg viewBox="0 0 16 14">
          <path d="M1 1h14L8 13z" fill="currentColor" />
        </svg>
        <span className="lvl__n" ref={pillLevel}>
          {levelText(FLOORS[0].slab)}
        </span>
        <span className="lvl__f" ref={pillFloor}>
          Покрив
        </span>
      </div>
    </>
  );
}
