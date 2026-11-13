// Рисунките на сцената зад сградата: небе, море, градът и улицата.
// Всичко е вектор, оцветява се с CSS променливи и така следва часа от деня.

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Облаци: няколко плоски капсули една върху друга, както ги рисуват архитектите. */
export function Cloud({ w = 260, seed = 1 }: { w?: number; seed?: number }) {
  const r = rng(seed);
  const rows = 3;
  const h = 18;
  const bars = Array.from({ length: rows }, (_, i) => {
    const bw = w * (0.45 + r() * 0.5);
    const x = (w - bw) * r();
    return { x, y: i * (h - 2), bw };
  });
  return (
    <svg viewBox={`0 0 ${w} ${rows * h}`} width={w} height={rows * h} aria-hidden="true">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.bw} height={h} rx={h / 2} fill="var(--cloud)" />
      ))}
    </svg>
  );
}

type B = { x: number; w: number; h: number; kind: number; cols: number; rows: number; lit: boolean[] };

function makeBuildings(seed: number, x0: number, x1: number, minW: number, maxW: number, minH: number, maxH: number, gap = 0): B[] {
  const r = rng(seed);
  const out: B[] = [];
  let x = x0;
  while (x < x1) {
    const w = Math.round(minW + r() * (maxW - minW));
    const h = Math.round(minH + Math.pow(r(), 1.4) * (maxH - minH));
    const cols = Math.max(2, Math.floor(w / 26));
    const rows = Math.max(2, Math.floor(h / 34));
    const lit = Array.from({ length: cols * rows }, () => r() < 0.34);
    out.push({ x, w, h, kind: Math.floor(r() * 4), cols, rows, lit });
    x += w + gap + Math.round(r() * gap);
  }
  return out;
}

/* Далечният град: пристанищните кранове, Аспаруховият мост, куполите на Катедралата, фарът на Галата. */
export function SkylineFar() {
  const H = 500;
  const base = H;
  const blocks = makeBuildings(7, 0, 2400, 46, 120, 40, 150, 3);
  return (
    <svg className="sky-far" viewBox={`0 0 2400 ${H}`} preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <g fill="var(--far)">
        {/* хълмовете зад града */}
        <path d={`M0 ${base} V${base - 120} C200 ${base - 170} 420 ${base - 190} 640 ${base - 150} S1100 ${base - 96} 1400 ${base - 110} S1900 ${base - 128} 2060 ${base - 176} S2300 ${base - 236} 2400 ${base - 222} V${base} Z`} opacity="0.55" />

        {/* телевизионната кула */}
        <rect x="446" y={base - 290} width="4" height="130" />
        <rect x="440" y={base - 236} width="16" height="8" />
        <path d={`M441 ${base - 160} L448 ${base - 226} L455 ${base - 160} Z`} />

        {/* Аспаруховият мост */}
        <rect x="640" y={base - 132} width="520" height="7" />
        {[660, 760, 860, 960, 1060, 1140].map((x) => (
          <rect key={x} x={x} y={base - 132} width="9" height="132" />
        ))}

        {/* градът */}
        {blocks.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={base - b.h} width={b.w} height={b.h} />
            {b.kind === 1 && <rect x={b.x + b.w * 0.3} y={base - b.h - 12} width={b.w * 0.3} height={12} />}
            {b.kind === 2 && <path d={`M${b.x} ${base - b.h} L${b.x + b.w / 2} ${base - b.h - 18} L${b.x + b.w} ${base - b.h} Z`} />}
            {b.kind === 3 && <rect x={b.x + b.w * 0.5} y={base - b.h - 26} width="2" height="26" />}
          </g>
        ))}

        {/* пристанищните кранове */}
        {[1240, 1318, 1402, 1474].map((x, i) => (
          <g key={x} transform={`translate(${x} ${base - 226}) scale(${i % 2 ? 0.86 : 1})`}>
            <path d="M0 226 L10 70 H18 L28 226 H22 L15 110 L6 226 Z" />
            <rect x="6" y="52" width="16" height="20" />
            <path d="M14 56 L96 6 L98 10 L18 62 Z" />
            <path d="M14 52 L14 0 L17 0 L17 52 Z" />
            <path d="M15 2 L96 7 L96 9 L15 6 Z" opacity="0.8" />
            <path d="M14 58 L-34 78 L-33 82 L16 64 Z" />
            <rect x="-40" y="76" width="14" height="12" />
          </g>
        ))}

        {/* Катедралата */}
        <g transform={`translate(1900 ${base})`}>
          <rect x="0" y="-150" width="170" height="150" />
          <rect x="52" y="-196" width="66" height="50" />
          <path d="M44 -196 C44 -250 126 -250 126 -196 Z" />
          <rect x="83" y="-270" width="4" height="26" />
          <rect x="77" y="-262" width="16" height="3" />
          {[8, 132].map((x) => (
            <g key={x}>
              <rect x={x} y="-176" width="30" height="30" />
              <path d={`M${x - 3} -176 C${x - 3} -204 ${x + 33} -204 ${x + 33} -176 Z`} />
              <rect x={x + 14} y="-214" width="2" height="12" />
            </g>
          ))}
          <rect x="-34" y="-214" width="30" height="214" />
          <path d="M-38 -214 C-38 -246 0 -246 0 -214 Z" />
          <rect x="-20" y="-262" width="2" height="18" />
        </g>

        {/* фарът на нос Галата */}
        <g transform={`translate(2290 ${base - 232})`}>
          <path d="M-9 0 L-6 -70 H6 L9 0 Z" />
          <rect x="-9" y="-80" width="18" height="10" />
          <path d="M-7 -80 C-7 -94 7 -94 7 -80 Z" />
        </g>
      </g>

      {/* светлини в далечния град привечер */}
      <g fill="var(--glow)" style={{ opacity: 'var(--lit)' as any }}>
        {blocks.flatMap((b, i) =>
          b.lit.slice(0, 5).map((on, j) =>
            on ? <rect key={`${i}-${j}`} x={b.x + 6 + ((j * 17) % Math.max(8, b.w - 14))} y={base - b.h + 10 + ((j * 23) % Math.max(10, b.h - 20))} width="4" height="5" /> : null
          )
        )}
        <circle cx="2290" cy={base - 319} r="5" />
      </g>
    </svg>
  );
}

/* Близките сгради: съседите, които се издигат, докато слизаме. */
export function SkylineNear() {
  const H = 900;
  const base = H;
  const blocks = makeBuildings(31, -40, 2400, 170, 330, 320, 840, 14);
  return (
    <svg className="sky-near" viewBox={`0 0 2400 ${H}`} preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      {blocks.map((b, i) => {
        const top = base - b.h;
        const padX = 18;
        const cw = (b.w - padX * 2) / b.cols;
        const rh = 46;
        const rows = Math.floor((b.h - 40) / rh);
        return (
          <g key={i}>
            <rect x={b.x} y={top} width={b.w} height={b.h} fill="var(--near)" />
            {/* покривни надстройки */}
            {b.kind === 0 && <rect x={b.x + b.w * 0.58} y={top - 30} width={b.w * 0.26} height={30} fill="var(--near)" />}
            {b.kind === 1 && (
              <g fill="var(--near)">
                <rect x={b.x + 24} y={top - 44} width="3" height="44" />
                <rect x={b.x + 12} y={top - 34} width="27" height="2.500" />
                <rect x={b.x + b.w - 70} y={top - 22} width="44" height="22" />
              </g>
            )}
            {b.kind === 2 && <path d={`M${b.x - 8} ${top} L${b.x + b.w / 2} ${top - 54} L${b.x + b.w + 8} ${top} Z`} fill="var(--near)" />}
            {b.kind === 3 && (
              <g fill="var(--near)">
                <rect x={b.x + b.w * 0.2} y={top - 18} width={b.w * 0.2} height="18" />
                <circle cx={b.x + b.w * 0.74} cy={top - 12} r="12" />
              </g>
            )}
            {/* етажни плочи */}
            {Array.from({ length: rows }, (_, rIdx) => (
              <rect key={`s${rIdx}`} x={b.x} y={top + 30 + rIdx * rh + 34} width={b.w} height="2.500" fill="var(--near-2)" />
            ))}
            {/* прозорци */}
            {Array.from({ length: rows }, (_, rIdx) =>
              Array.from({ length: b.cols }, (_, c) => {
                const on = b.lit[(rIdx * b.cols + c) % b.lit.length];
                const wx = b.x + padX + c * cw + cw * 0.18;
                const wy = top + 30 + rIdx * rh;
                return (
                  <g key={`${rIdx}-${c}`}>
                    <rect x={wx} y={wy} width={cw * 0.64} height="26" fill="var(--near-2)" />
                    {on && <rect x={wx} y={wy} width={cw * 0.64} height="26" fill="var(--glow)" style={{ opacity: 'var(--lit)' as any }} />}
                  </g>
                );
              })
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* Улицата пред входа: дървета, лампи, пейка, колело. Идва чак накрая. */
export function Street() {
  const H = 560;
  const base = H;
  const trees = [90, 330, 610, 870, 1180, 1490, 1730, 1990, 2250];
  const lamps = [210, 760, 1340, 1880, 2330];
  return (
    <svg className="sky-street" viewBox={`0 0 2400 ${H}`} preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      {lamps.map((x) => (
        <g key={x}>
          <circle cx={x + 34} cy={base - 392} r="90" fill="var(--glow)" style={{ opacity: 'calc(var(--lit) * 0.22)' as any }} />
          <rect x={x} y={base - 400} width="6" height="400" fill="var(--street)" />
          <path d={`M${x} ${base - 400} C${x} ${base - 420} ${x + 34} ${base - 420} ${x + 40} ${base - 404} L${x + 36} ${base - 400} C${x + 30} ${base - 410} ${x + 8} ${base - 410} ${x + 6} ${base - 396} Z`} fill="var(--street)" />
          <ellipse cx={x + 36} cy={base - 397} rx="13" ry="6" fill="var(--street)" />
          <ellipse cx={x + 36} cy={base - 393} rx="10" ry="4" fill="var(--glow)" style={{ opacity: 'var(--lit)' as any }} />
        </g>
      ))}
      {trees.map((x, i) => {
        const s = 0.84 + ((i * 37) % 30) / 100;
        return (
          <g key={x} transform={`translate(${x} ${base}) scale(${s})`} fill="var(--street)">
            <rect x="-6" y="-210" width="12" height="210" />
            <path d="M-4 -150 L-46 -214 L-40 -218 L0 -166 Z" />
            <path d="M4 -130 L44 -200 L50 -196 L6 -116 Z" />
            <circle cx="0" cy="-300" r="96" />
            <circle cx="-74" cy="-248" r="62" />
            <circle cx="76" cy="-242" r="66" />
            <circle cx="-30" cy="-372" r="58" />
            <circle cx="46" cy="-360" r="54" />
          </g>
        );
      })}
      {/* пейка и колело */}
      <g fill="none" stroke="var(--street)" strokeWidth="5" strokeLinecap="round">
        <path d={`M1560 ${base - 44} H1680 M1568 ${base - 44} V${base} M1672 ${base - 44} V${base} M1560 ${base - 78} H1680 M1566 ${base - 78} V${base - 44} M1674 ${base - 78} V${base - 44}`} />
        <g transform={`translate(2090 ${base - 34})`}>
          <circle cx="0" cy="0" r="32" />
          <circle cx="92" cy="0" r="32" />
          <path d="M0 0 L30 -50 H76 L92 0 M30 -50 L52 0 H0 M52 0 L76 -50 M24 -62 H40 M70 -66 L78 -50 M66 -66 H82" />
        </g>
      </g>
      <rect x="0" y={base - 4} width="2400" height="4" fill="var(--street)" />
    </svg>
  );
}

/* Кораби на рейд пред залива. */
export function Ships() {
  return (
    <svg className="sky-ships" viewBox="0 0 600 30" aria-hidden="true">
      <g fill="var(--far)">
        <path d="M20 22 H110 L104 30 H28 Z" />
        <rect x="84" y="10" width="14" height="12" />
        <rect x="90" y="4" width="3" height="6" />
        <path d="M330 24 H396 L392 30 H336 Z" />
        <rect x="376" y="16" width="10" height="8" />
        <path d="M520 30 L534 6 L536 30 Z" />
        <path d="M538 30 L537 12 L550 30 Z" />
      </g>
    </svg>
  );
}

/* Птиците над покрива. */
export function Birds() {
  return (
    <svg className="sky-birds" viewBox="0 0 220 80" aria-hidden="true">
      <g fill="none" stroke="var(--ink)" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round">
        <path className="bird" d="M10 40 q10 -12 20 0 q10 -12 20 0" />
        <path className="bird bird--2" d="M84 18 q8 -10 16 0 q8 -10 16 0" />
        <path className="bird bird--3" d="M140 54 q7 -9 14 0 q7 -9 14 0" />
      </g>
    </svg>
  );
}

/* Покривът: стълбищната клетка, антената, климатиците, шезлонгите. Чертеж с туш. */
export function RoofLeft() {
  return (
    <svg className="roof-art roof-art--left" viewBox="0 0 430 190" aria-hidden="true">
      <g fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.200" strokeLinejoin="round" strokeLinecap="round">
        {/* чадър */}
        <path d="M150 188 V58" fill="none" />
        <path d="M70 70 C96 30 204 30 230 70 Z" />
        <path d="M110 70 C124 44 176 44 190 70" fill="none" />
        {/* шезлонги */}
        <path d="M20 168 L86 150 L112 122 L118 126 L94 158 L112 172 M34 188 L42 164 M92 188 L96 160" fill="none" />
        <path d="M196 168 L262 150 L288 122 L294 126 L270 158 L288 172 M210 188 L218 164 M268 188 L272 160" fill="none" />
        {/* маслина в саксия */}
        <path d="M346 188 L340 150 H384 L378 188 Z" />
        <path d="M362 150 V104" fill="none" />
        <ellipse cx="362" cy="84" rx="34" ry="30" />
        <path d="M344 86 q10 -12 20 0 M362 74 q9 -10 18 0 M350 98 q10 -8 22 0" fill="none" strokeWidth="1.600" />
      </g>
    </svg>
  );
}

export function RoofMid() {
  return (
    <svg className="roof-art roof-art--mid" viewBox="0 0 520 230" aria-hidden="true">
      <g fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.200" strokeLinejoin="round" strokeLinecap="round">
        {/* стълбищна клетка */}
        <path d="M30 228 V96 H190 V228" />
        <path d="M18 96 H202 V84 H18 Z" />
        <path d="M84 228 V140 H136 V228" />
        <path d="M110 140 V228 M126 186 h4" fill="none" />
        <rect x="146" y="118" width="26" height="26" />
        <path d="M159 118 V144 M146 131 H172" fill="none" strokeWidth="1.500" />
        {/* слънчеви панели */}
        <path d="M236 228 L262 176 H330 L304 228 Z" />
        <path d="M250 202 H318 M283 176 L257 228 M306 176 L280 228" fill="none" strokeWidth="1.500" />
        <path d="M330 228 L356 176 H424 L398 228 Z" />
        <path d="M344 202 H412 M377 176 L351 228 M400 176 L374 228" fill="none" strokeWidth="1.500" />
        {/* котката на парапета */}
        <g transform="translate(462 196)" fill="var(--ink)" stroke="none">
          <path d="M0 32 C-2 12 8 2 18 4 L16 -6 L24 2 L32 -6 L32 6 C40 12 40 24 34 32 Z" />
          <path d="M2 30 C-12 30 -14 14 -6 10" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

export function RoofRight() {
  return (
    <svg className="roof-art roof-art--right" viewBox="0 0 330 330" aria-hidden="true">
      <g fill="var(--paper)" stroke="var(--ink)" strokeWidth="2.200" strokeLinejoin="round" strokeLinecap="round">
        {/* антена с обтяжки */}
        <path d="M120 328 V20" fill="none" strokeWidth="3" />
        <path d="M120 60 L40 328 M120 60 L200 328 M120 140 L72 328 M120 140 L168 328" fill="none" strokeWidth="1.200" />
        <path d="M96 52 H144 M102 76 H138 M106 100 H134" fill="none" />
        <circle className="roof-beacon" cx="120" cy="16" r="6" fill="var(--red)" stroke="none" />
        {/* сателитна чиния */}
        <path d="M196 282 C196 250 236 240 252 262 Z" />
        <path d="M224 262 L246 240 M224 280 V328" fill="none" />
        {/* климатици */}
        <rect x="262" y="284" width="60" height="44" />
        <circle cx="282" cy="306" r="13" />
        <path d="M304 294 H314 M304 304 H314 M304 314 H314" fill="none" strokeWidth="1.500" />
      </g>
    </svg>
  );
}
