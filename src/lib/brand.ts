// Всичко за марката е на едно място. Сменя се тук и се отразява по целия сайт.
// Има два готови варианта: агенцията, на която показваме демото, и неутрален.
// Избира се с променливата BRAND (по подразбиране newage).

type Brand = {
  key: string;
  name: string; // голямата дума в логото
  sub: string; // малкият текст до нея
  full: string; // пълното име в текстове и заглавия
  city: string;
  years: string; // „над 12 години“
  deals: string; // „над 500“
  tagline: string;
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  hours: [string, string][];
  social: { facebook?: string; instagram?: string; tiktok?: string };
};

const PRESETS: Record<string, Brand> = {
  newage: {
    key: 'newage',
    name: 'NEW AGE',
    sub: 'недвижими имоти',
    full: 'New Age Недвижими имоти',
    city: 'Варна',
    years: 'над 12 години',
    deals: 'над 500',
    tagline: 'От гледката до ключа',
    phone: '0877 363 450',
    phoneHref: '+359877363450',
    email: 'newage.varna@gmail.com',
    address: 'бул. Ян Хунияди 59, офис 14, Варна',
    hours: [
      ['Понеделник до петък', '9:00 до 18:00'],
      ['Събота и неделя', 'по уговорка'],
    ],
    social: {
      facebook: 'https://facebook.com/newagevarna',
      instagram: 'https://instagram.com/newage.realestates/',
      tiktok: 'https://tiktok.com/@newage.realestate',
    },
  },
  kota: {
    key: 'kota',
    name: 'КОТА',
    sub: 'имоти',
    full: 'КОТА Имоти',
    city: 'Варна',
    years: 'над 12 години',
    deals: 'над 500',
    tagline: 'От гледката до ключа',
    phone: '052 555 010',
    phoneHref: '+35952555010',
    email: 'office@kotaimoti.bg',
    address: 'бул. Княз Борис I 54, ет. 3, Варна',
    hours: [
      ['Понеделник до петък', '9:00 до 18:30'],
      ['Събота', '10:00 до 14:00'],
      ['Неделя', 'по уговорка'],
    ],
    social: {},
  },
};

const preset = PRESETS[process.env.NEXT_PUBLIC_BRAND || process.env.BRAND || 'newage'] || PRESETS.newage;

// Адресът на сайта: изрично зададен, после този от Vercel, накрая локалният.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';

export const BRAND = {
  ...preset,
  siteUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || 'http://localhost:3210',
};

// Етажите на сградата от началната страница, отгоре надолу.
// slab е котата на плочата над етажа (в метри), както се пише в архитектурен разрез.
export const FLOORS = [
  { id: 'imoti', slab: 21, label: 'Етаж 6', name: 'Имоти' },
  { id: 'brokeri', slab: 18, label: 'Етаж 5', name: 'Брокери' },
  { id: 'terasa', slab: 15, label: 'Етаж 4', name: 'Какво търсиш' },
  { id: 'agencia', slab: 12, label: 'Етаж 3', name: 'Агенцията' },
  { id: 'rayoni', slab: 9, label: 'Етаж 2', name: 'Райони' },
  { id: 'kak', slab: 6, label: 'Етаж 1', name: 'Как работим' },
  { id: 'parter', slab: 3, label: 'Партер', name: 'Контакти' },
];

export function levelText(m: number): string {
  const v = Math.abs(m).toFixed(2);
  if (Math.abs(m) < 0.005) return '±0.00';
  return (m > 0 ? '+' : '') + v;
}
