import { INTENTS } from '@/lib/chat-tree';

export function many(n: number, one: string, more: string): string {
  return `${n} ${n === 1 ? one : more}`;
}

/** Какво иска човекът, на един ред: „Апартамент · Тристаен · Чайка“. */
export function leadWants(l: { summary?: string | null; intent?: string | null }): { title: string; rest: string } {
  const title = INTENTS[String(l.intent || '')] || 'Запитване';
  const parts = String(l.summary || '')
    .split('. ')
    .slice(1)
    .map((x) => {
      const i = x.indexOf(': ');
      return i >= 0 ? x.slice(i + 2) : x;
    })
    .filter(Boolean);
  return { title, rest: parts.join(' · ') };
}

export const EVENT_LABELS: Record<string, string> = {
  open: 'Отвори чата',
  answer: 'Отговори',
  skip: 'Пропусна',
  back: 'Върна се назад',
  summary: 'Видя обобщението',
  form: 'Натисна „Отправи запитване“ и видя формата',
  submit: 'Изпрати запитването',
  exit: 'Затвори чата',
  close: 'Затвори чата',
};

/** Човешко име на страница от сайта, за да не се показва суров адрес. */
export function pageName(path?: string | null): string {
  const p = String(path || '/');
  if (p === '/') return 'Начална страница';
  if (p.startsWith('/oferta/')) return 'Оферта от брокер';
  if (p.startsWith('/imoti/')) return 'Страница на имот';
  if (p === '/imoti') return 'Списък с имоти';
  if (p.startsWith('/brokeri/')) return 'Страница на брокер';
  if (p === '/brokeri') return 'Брокери';
  if (p.startsWith('/kontakti')) return 'Контакти';
  return 'Друга страница';
}
