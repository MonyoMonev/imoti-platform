'use client';

import { useEffect, useRef } from 'react';
import { Birds, Cloud, Ships, SkylineFar, SkylineNear, Street } from './art';

// Сцената зад сградата. Стои неподвижно зад страницата и се променя със скрола:
// колкото надолу слизаме, толкова градът се издига, а денят преминава във вечер.

type Key = {
  t: number;
  sky1: string;
  sky2: string;
  sea1: string;
  sea2: string;
  far: string;
  near: string;
  near2: string;
  street: string;
  cloud: string;
  lit: number;
  stars: number;
};

const KEYS: Key[] = [
  { t: 0, sky1: '#a3c9df', sky2: '#e8efe9', sea1: '#8dbbcc', sea2: '#3d7f98', far: '#a9bcc7', near: '#8798a2', near2: '#75868f', street: '#44524a', cloud: '#ffffff', lit: 0, stars: 0 },
  { t: 0.46, sky1: '#9dc1dd', sky2: '#f4e6cd', sea1: '#a9c3c9', sea2: '#467f96', far: '#a7adb3', near: '#7f868d', near2: '#6c737a', street: '#3d4741', cloud: '#fff7ec', lit: 0, stars: 0 },
  { t: 0.76, sky1: '#6c84b6', sky2: '#f6c79c', sea1: '#c9ab9b', sea2: '#49708c', far: '#857f98', near: '#5a586c', near2: '#494759', street: '#2a2c36', cloud: '#f9dcc6', lit: 0.45, stars: 0.1 },
  { t: 1, sky1: '#222a48', sky2: '#e0906d', sea1: '#8d7c90', sea2: '#25334e', far: '#474b67', near: '#272b41', near2: '#1c2032', street: '#11141d', cloud: '#b58c92', lit: 1, stars: 0.9 },
];

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const CLOUDS = [
  { x: 49, y: 9, w: 300, seed: 3, speed: 16, drift: 90 },
  { x: 67, y: 28, w: 230, seed: 8, speed: 10, drift: 130 },
  { x: 84, y: 12, w: 200, seed: 12, speed: 22, drift: 110 },
  { x: 90, y: 38, w: 250, seed: 21, speed: 13, drift: 150 },
  { x: 56, y: 47, w: 180, seed: 5, speed: 26, drift: 100 },
  { x: 28, y: 3, w: 170, seed: 17, speed: 8, drift: 170 },
];

export default function Scene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = -1;
    let raf = 0;
    let end = 1;

    const measure = () => {
      const ground = document.querySelector<HTMLElement>('[data-ground]');
      const groundY = ground ? ground.getBoundingClientRect().top + window.scrollY : document.documentElement.scrollHeight;
      end = Math.max(1, groundY - window.innerHeight * 0.55);
      last = -1;
    };

    const apply = () => {
      const y = window.scrollY;
      if (y !== last) {
        last = y;
        const p = clamp(y / end);
        const t = Math.pow(p, 1.1);
        let i = 0;
        while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
        const a = KEYS[i];
        const b = KEYS[i + 1];
        const k = clamp((t - a.t) / (b.t - a.t));
        const s = el.style;
        s.setProperty('--sky1', mix(a.sky1, b.sky1, k));
        s.setProperty('--sky2', mix(a.sky2, b.sky2, k));
        s.setProperty('--sea1', mix(a.sea1, b.sea1, k));
        s.setProperty('--sea2', mix(a.sea2, b.sea2, k));
        s.setProperty('--far', mix(a.far, b.far, k));
        s.setProperty('--near', mix(a.near, b.near, k));
        s.setProperty('--near-2', mix(a.near2, b.near2, k));
        s.setProperty('--street', mix(a.street, b.street, k));
        s.setProperty('--cloud', mix(a.cloud, b.cloud, k));
        s.setProperty('--lit', lerp(a.lit, b.lit, k).toFixed(3));
        s.setProperty('--stars', lerp(a.stars, b.stars, k).toFixed(3));
        document.documentElement.style.setProperty('--lit', lerp(a.lit, b.lit, k).toFixed(3));

        if (!reduce) {
          s.setProperty('--p', p.toFixed(4));
          s.setProperty('--far-y', `${lerp(-9, -42, p).toFixed(2)}vh`);
          s.setProperty('--near-y', `${lerp(90, 2, Math.pow(p, 0.86)).toFixed(2)}vh`);
          s.setProperty('--street-y', `${lerp(72, 0, smooth(0.78, 1, p)).toFixed(2)}vh`);
          s.setProperty('--sea-y', `${lerp(0, -7, p).toFixed(2)}vh`);
          s.setProperty('--sun-y', `${lerp(0, -70, p).toFixed(2)}vh`);
          s.setProperty('--sun-o', (1 - smooth(0.22, 0.5, p)).toFixed(3));
          s.setProperty('--moon-o', smooth(0.7, 0.9, p).toFixed(3));
          s.setProperty('--moon-y', `${lerp(16, 0, smooth(0.7, 1, p)).toFixed(2)}vh`);
          s.setProperty('--birds-o', (1 - smooth(0.02, 0.16, p)).toFixed(3));
        } else {
          s.setProperty('--far-y', '-30vh');
          s.setProperty('--near-y', '40vh');
        }
      }
      raf = requestAnimationFrame(apply);
    };

    measure();
    raf = requestAnimationFrame(apply);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      document.documentElement.style.removeProperty('--lit');
    };
  }, []);

  return (
    <div className="scene" ref={ref} aria-hidden="true">
      <div className="scene__sky" />
      <div className="scene__stars" />
      <div className="scene__sun" />
      <div className="scene__moon" />
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="scene__cloud"
          style={{ left: `${c.x}%`, top: `${c.y}vh`, ['--speed' as any]: c.speed, ['--drift' as any]: `${c.drift}s` }}
        >
          <Cloud w={c.w} seed={c.seed} />
        </div>
      ))}
      <div className="scene__sea">
        <div className="scene__glitter" />
        <Ships />
      </div>
      <div className="scene__layer scene__layer--far">
        <SkylineFar />
      </div>
      <div className="scene__layer scene__layer--near">
        <SkylineNear />
      </div>
      <div className="scene__layer scene__layer--street">
        <Street />
      </div>
      <div className="scene__birds">
        <Birds />
      </div>
    </div>
  );
}
