// Общи помощни функции за текст. Работят и на сървъра, и в браузъра.

export const KINDS: Record<string, string> = {
  apartment: 'Апартамент',
  house: 'Къща',
  plot: 'Парцел',
  office: 'Офис',
  shop: 'Магазин',
  garage: 'Гараж',
};

export const DEALS: Record<string, string> = { sale: 'Продажба', rent: 'Наем' };

export const ROOMS: Record<number, string> = {
  1: 'Едностаен',
  2: 'Двустаен',
  3: 'Тристаен',
  4: 'Четиристаен',
  5: 'Многостаен',
};

export const DISTRICTS = [
  'Център',
  'Гръцка махала',
  'Чайка',
  'Бриз',
  'Левски',
  'Младост',
  'Възраждане',
  'Владиславово',
  'Кайсиева градина',
  'Изгрев',
  'Трошево',
  'Виница',
  'Траката',
  'Галата',
  'Аспарухово',
  'Св. Св. Константин и Елена',
  'Златни пясъци',
  'Около Варна',
];

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Чернова',
  active: 'Активен',
  reserved: 'Капариран',
  sold: 'Продаден',
};

export const LEAD_STATUS: Record<string, string> = {
  new: 'Ново',
  contacted: 'Проведен разговор',
  viewing: 'Оглед',
  deal: 'Сделка',
  lost: 'Отпаднало',
};

export const SOURCES: Record<string, string> = {
  fb: 'Facebook',
  ig: 'Instagram',
  tt: 'TikTok',
  viber: 'Viber',
  google: 'Google',
  direct: 'Директно',
};

export function sourceLabel(s?: string | null) {
  if (!s) return 'Директно';
  return SOURCES[s] || s;
}

/** 245000 става "245 000 €" */
export function money(n: number | null | undefined): string {
  if (n == null) return '';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
}

export function price(p: { price: number; deal: string }): string {
  return p.deal === 'rent' ? `${money(p.price)} на месец` : money(p.price);
}

export function num(n: number | null | undefined): string {
  if (n == null) return '';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function area(n: number | null | undefined): string {
  return n == null ? '' : `${num(n)} кв.м`;
}

export function floorText(floor?: number | null, floors?: number | null): string {
  if (floor == null) return '';
  if (floors) return `${floor} от ${floors}`;
  return String(floor);
}

export function roomsText(p: { kind: string; rooms?: number | null }): string {
  if (!p.rooms) return KINDS[p.kind] || p.kind;
  if (p.kind === 'apartment') return ROOMS[Math.min(p.rooms, 5)] || `${p.rooms} стаи`;
  return `${p.rooms} стаи`;
}

/** Телефон във вид +359888555011 или null, ако не прилича на номер. */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (d.startsWith('+')) {
    d = '+' + d.slice(1).replace(/\D/g, '');
  } else if (d.startsWith('359')) {
    d = '+' + d;
  } else if (d.startsWith('0')) {
    d = '+359' + d.slice(1);
  } else if (d.length === 9) {
    d = '+359' + d;
  } else {
    d = '+' + d;
  }
  const digits = d.slice(1);
  if (digits.length < 10 || digits.length > 14) return null;
  if (d.startsWith('+359') && digits.length !== 12 && digits.length !== 11) return null;
  return d;
}

/** Номер на запис от базата: цяло положително число, което се побира в integer, или null. */
export function toId(v: unknown): number | null {
  if (v === null || v === undefined || typeof v === 'object' || typeof v === 'boolean') return null;
  const s = String(v).trim();
  if (!/^\d{1,10}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= 2147483647 ? n : null;
}

/** +359888555011 става "0888 555 011" */
export function phoneText(p?: string | null): string {
  if (!p) return '';
  if (p.startsWith('+359')) {
    const r = p.slice(4);
    if (r.length === 9) return `0${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6)}`;
    return '0' + r;
  }
  return p;
}

const MONTHS = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
];

// Всички дати и часове се показват по българско време, независимо къде работи сървърът
// (в облака той е на UTC и без това часовете излизат с два или три часа назад).
const SOFIA = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Sofia',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function sofia(d: string | Date) {
  const parts: Record<string, string> = {};
  for (const p of SOFIA.formatToParts(new Date(d))) parts[p.type] = p.value;
  return {
    day: Number(parts.day),
    month: Number(parts.month) - 1,
    year: Number(parts.year),
    hh: parts.hour,
    mm: parts.minute,
    ss: parts.second,
  };
}

export function dateText(d: string | Date | null | undefined, withTime = false): string {
  if (!d) return '';
  const x = sofia(d);
  const base = `${x.day} ${MONTHS[x.month]} ${x.year}`;
  if (!withTime) return base;
  return `${base}, ${x.hh}:${x.mm}`;
}

export function shortDate(d: string | Date): string {
  const x = sofia(d);
  return `${x.day} ${MONTHS[x.month].slice(0, 3)}`;
}

/** Час с секунди, например 14:18:07. */
export function timeText(d: string | Date): string {
  const x = sofia(d);
  return `${x.hh}:${x.mm}:${x.ss}`;
}

export function ago(d: string | Date | null | undefined): string {
  if (!d) return '';
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'преди малко';
  const m = Math.floor(s / 60);
  if (m < 60) return `преди ${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `преди ${h} ч`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'вчера';
  if (days < 30) return `преди ${days} дни`;
  return dateText(d);
}

export function duration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} сек`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s ? `${m} мин ${s} сек` : `${m} мин`;
}

const TR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

/** "Тристаен с гледка" става "tristaen-s-gledka" (само за адреси в браузъра). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .split('')
    .map((ch) => (TR[ch] !== undefined ? TR[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

export function fullName(u: { first_name: string; last_name: string }): string {
  return `${u.first_name} ${u.last_name}`.trim();
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? `${n} ${one}` : `${n} ${many}`;
}
