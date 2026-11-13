// Дървото с въпроси на чат помощника. Данни, не код: нов въпрос се добавя тук
// и автоматично влиза и в чата, и в анализа на шефа.

export type ChatOption = { v: string; label: string; next?: string };

export type ChatStep = {
  id: string;
  key: string;
  short: string; // кратко име за анализа в админ панела
  q: string;
  type: 'choice' | 'multi' | 'text';
  options?: ChatOption[];
  next?: string;
  optional?: boolean;
  placeholder?: string;
};

const WHERE: ChatOption[] = [
  { v: 'Център', label: 'Център' },
  { v: 'Чайка', label: 'Чайка' },
  { v: 'Бриз', label: 'Бриз' },
  { v: 'Левски', label: 'Левски' },
  { v: 'Младост', label: 'Младост' },
  { v: 'Възраждане', label: 'Възраждане' },
  { v: 'Владиславово', label: 'Владиславово' },
  { v: 'Виница', label: 'Виница' },
  { v: 'Аспарухово', label: 'Аспарухово' },
  { v: 'Галата', label: 'Галата' },
  { v: 'Курортите', label: 'Курортите' },
  { v: 'Около Варна', label: 'Около Варна' },
];

const AREA: ChatOption[] = [
  { v: 'до 60 кв.м', label: 'до 60 кв.м' },
  { v: '60 до 90 кв.м', label: '60 до 90 кв.м' },
  { v: '90 до 120 кв.м', label: '90 до 120 кв.м' },
  { v: 'над 120 кв.м', label: 'над 120 кв.м' },
];

const NOTE_Q =
  'Има ли нещо важно, което да знаем? Например етаж, паркомясто или близост до училище.';

export const STEPS: ChatStep[] = [
  {
    id: 'start',
    key: 'intent',
    short: 'Цел',
    q: 'Здравей! Кажи ми с какво да помогна.',
    type: 'choice',
    options: [
      { v: 'ask', label: 'Питам за този имот', next: 'ask.what' },
      { v: 'buy', label: 'Искам да купя', next: 'buy.kind' },
      { v: 'rent', label: 'Търся под наем', next: 'rent.kind' },
      { v: 'sell', label: 'Искам да продам', next: 'sell.kind' },
      { v: 'let', label: 'Искам да отдам', next: 'let.kind' },
    ],
  },

  // Купувам
  {
    id: 'buy.kind',
    key: 'kind',
    short: 'Вид имот',
    q: 'Какъв имот търсиш?',
    type: 'choice',
    options: [
      { v: 'Апартамент', label: 'Апартамент', next: 'buy.rooms' },
      { v: 'Къща', label: 'Къща', next: 'buy.area' },
      { v: 'Парцел', label: 'Парцел', next: 'buy.where' },
      { v: 'Офис или магазин', label: 'Офис или магазин', next: 'buy.area' },
      { v: 'Гараж', label: 'Гараж', next: 'buy.where' },
    ],
  },
  {
    id: 'buy.rooms',
    key: 'rooms',
    short: 'Стаи',
    q: 'Колко стаи?',
    type: 'choice',
    next: 'buy.area',
    options: [
      { v: 'Едностаен', label: 'Едностаен' },
      { v: 'Двустаен', label: 'Двустаен' },
      { v: 'Тристаен', label: 'Тристаен' },
      { v: 'Четиристаен или повече', label: 'Четиристаен или повече' },
    ],
  },
  { id: 'buy.area', key: 'area', short: 'Площ', q: 'Каква площ ти трябва?', type: 'choice', next: 'buy.where', options: AREA },
  {
    id: 'buy.where',
    key: 'where',
    short: 'Район',
    q: 'В кой район? Може да избереш няколко.',
    type: 'multi',
    next: 'buy.budget',
    options: [...WHERE, { v: 'Няма значение', label: 'Няма значение' }],
  },
  {
    id: 'buy.budget',
    key: 'budget',
    short: 'Бюджет',
    q: 'Какъв е бюджетът ти?',
    type: 'choice',
    next: 'buy.when',
    options: [
      { v: 'до 80 000 €', label: 'до 80 000 €' },
      { v: '80 000 до 130 000 €', label: '80 000 до 130 000 €' },
      { v: '130 000 до 200 000 €', label: '130 000 до 200 000 €' },
      { v: '200 000 до 350 000 €', label: '200 000 до 350 000 €' },
      { v: 'над 350 000 €', label: 'над 350 000 €' },
    ],
  },
  {
    id: 'buy.when',
    key: 'when',
    short: 'Срок',
    q: 'Кога искаш да стане?',
    type: 'choice',
    next: 'buy.pay',
    options: [
      { v: 'Още този месец', label: 'Още този месец' },
      { v: 'До три месеца', label: 'До три месеца' },
      { v: 'До година', label: 'До година' },
      { v: 'Само разглеждам', label: 'Само разглеждам' },
    ],
  },
  {
    id: 'buy.pay',
    key: 'pay',
    short: 'Плащане',
    q: 'Как мислиш да платиш?',
    type: 'choice',
    next: 'note',
    options: [
      { v: 'Със собствени средства', label: 'Със собствени средства' },
      { v: 'С ипотечен кредит', label: 'С ипотечен кредит' },
      { v: 'Още не съм решил', label: 'Още не съм решил' },
    ],
  },

  // Търся под наем
  {
    id: 'rent.kind',
    key: 'kind',
    short: 'Вид имот',
    q: 'Какво търсиш под наем?',
    type: 'choice',
    options: [
      { v: 'Апартамент', label: 'Апартамент', next: 'rent.rooms' },
      { v: 'Къща', label: 'Къща', next: 'rent.where' },
      { v: 'Офис или магазин', label: 'Офис или магазин', next: 'rent.where' },
      { v: 'Гараж или паркомясто', label: 'Гараж или паркомясто', next: 'rent.where' },
    ],
  },
  {
    id: 'rent.rooms',
    key: 'rooms',
    short: 'Стаи',
    q: 'Колко стаи?',
    type: 'choice',
    next: 'rent.where',
    options: [
      { v: 'Едностаен', label: 'Едностаен' },
      { v: 'Двустаен', label: 'Двустаен' },
      { v: 'Тристаен', label: 'Тристаен' },
      { v: 'Четиристаен или повече', label: 'Четиристаен или повече' },
    ],
  },
  {
    id: 'rent.where',
    key: 'where',
    short: 'Район',
    q: 'В кой район? Може да избереш няколко.',
    type: 'multi',
    next: 'rent.budget',
    options: [...WHERE, { v: 'Няма значение', label: 'Няма значение' }],
  },
  {
    id: 'rent.budget',
    key: 'budget',
    short: 'Бюджет',
    q: 'Колко на месец е удобно за теб?',
    type: 'choice',
    next: 'rent.furn',
    options: [
      { v: 'до 400 € на месец', label: 'до 400 €' },
      { v: '400 до 600 € на месец', label: '400 до 600 €' },
      { v: '600 до 900 € на месец', label: '600 до 900 €' },
      { v: 'над 900 € на месец', label: 'над 900 €' },
    ],
  },
  {
    id: 'rent.furn',
    key: 'furn',
    short: 'Обзавеждане',
    q: 'Обзаведен ли да е?',
    type: 'choice',
    next: 'rent.when',
    options: [
      { v: 'Обзаведен', label: 'Обзаведен' },
      { v: 'Необзаведен', label: 'Необзаведен' },
      { v: 'Няма значение', label: 'Няма значение' },
    ],
  },
  {
    id: 'rent.when',
    key: 'when',
    short: 'Срок',
    q: 'От кога ти трябва?',
    type: 'choice',
    next: 'note',
    options: [
      { v: 'Веднага', label: 'Веднага' },
      { v: 'До месец', label: 'До месец' },
      { v: 'След повече от месец', label: 'След повече от месец' },
    ],
  },

  // Продавам
  {
    id: 'sell.kind',
    key: 'kind',
    short: 'Вид имот',
    q: 'Какъв имот продаваш?',
    type: 'choice',
    next: 'sell.where',
    options: [
      { v: 'Апартамент', label: 'Апартамент' },
      { v: 'Къща', label: 'Къща' },
      { v: 'Парцел', label: 'Парцел' },
      { v: 'Офис или магазин', label: 'Офис или магазин' },
      { v: 'Гараж', label: 'Гараж' },
    ],
  },
  {
    id: 'sell.where',
    key: 'where',
    short: 'Район',
    q: 'Къде се намира?',
    type: 'choice',
    next: 'sell.area',
    options: [...WHERE, { v: 'Друг район', label: 'Друг район' }],
  },
  { id: 'sell.area', key: 'area', short: 'Площ', q: 'Колко е голям?', type: 'choice', next: 'sell.price', options: AREA },
  {
    id: 'sell.price',
    key: 'price',
    short: 'Цена',
    q: 'Имаш ли цена наум?',
    type: 'choice',
    next: 'sell.when',
    options: [
      { v: 'Знам колко искам', label: 'Да, знам колко искам' },
      { v: 'Иска оценка от брокер', label: 'Искам оценка от брокер' },
      { v: 'Още проучва', label: 'Още проучвам' },
    ],
  },
  {
    id: 'sell.when',
    key: 'when',
    short: 'Срок',
    q: 'Кога искаш да продадеш?',
    type: 'choice',
    next: 'note',
    options: [
      { v: 'Бърза', label: 'Бързам' },
      { v: 'До половин година', label: 'До половин година' },
      { v: 'Не бърза', label: 'Не бързам' },
    ],
  },

  // Отдавам
  {
    id: 'let.kind',
    key: 'kind',
    short: 'Вид имот',
    q: 'Какво отдаваш под наем?',
    type: 'choice',
    next: 'let.where',
    options: [
      { v: 'Апартамент', label: 'Апартамент' },
      { v: 'Къща', label: 'Къща' },
      { v: 'Офис или магазин', label: 'Офис или магазин' },
      { v: 'Гараж', label: 'Гараж' },
    ],
  },
  {
    id: 'let.where',
    key: 'where',
    short: 'Район',
    q: 'Къде се намира?',
    type: 'choice',
    next: 'let.furn',
    options: [...WHERE, { v: 'Друг район', label: 'Друг район' }],
  },
  {
    id: 'let.furn',
    key: 'furn',
    short: 'Обзавеждане',
    q: 'Обзаведен ли е?',
    type: 'choice',
    next: 'let.price',
    options: [
      { v: 'Обзаведен', label: 'Обзаведен' },
      { v: 'Частично обзаведен', label: 'Частично' },
      { v: 'Необзаведен', label: 'Необзаведен' },
    ],
  },
  {
    id: 'let.price',
    key: 'budget',
    short: 'Наем',
    q: 'Какъв наем очакваш?',
    type: 'choice',
    next: 'note',
    options: [
      { v: 'до 400 € на месец', label: 'до 400 €' },
      { v: '400 до 600 € на месец', label: '400 до 600 €' },
      { v: '600 до 900 € на месец', label: '600 до 900 €' },
      { v: 'над 900 € на месец', label: 'над 900 €' },
      { v: 'Иска съвет за наема', label: 'Искам съвет' },
    ],
  },

  // Питам за конкретен имот
  {
    id: 'ask.what',
    key: 'what',
    short: 'Въпрос за имота',
    q: 'Какво те интересува за този имот?',
    type: 'choice',
    options: [
      { v: 'Иска оглед', label: 'Искам оглед', next: 'ask.when' },
      { v: 'Има въпрос за цената', label: 'Имам въпрос за цената', next: 'note' },
      { v: 'Иска още снимки и информация', label: 'Искам още снимки и информация', next: 'note' },
      { v: 'Интересува се от кредит', label: 'Интересува ме кредит', next: 'note' },
    ],
  },
  {
    id: 'ask.when',
    key: 'when',
    short: 'Кога оглед',
    q: 'Кога ти е удобно за оглед?',
    type: 'choice',
    next: 'note',
    options: [
      { v: 'Днес или утре', label: 'Днес или утре' },
      { v: 'Тази седмица', label: 'Тази седмица' },
      { v: 'През уикенда', label: 'През уикенда' },
      { v: 'Ще се разберем по телефона', label: 'Ще се разберем по телефона' },
    ],
  },

  {
    id: 'note',
    key: 'note',
    short: 'Свободен текст',
    q: NOTE_Q,
    type: 'text',
    optional: true,
    next: 'summary',
    placeholder: 'Напиши го с твои думи',
  },
];

// Двете последни стъпки не са въпроси, но участват във фунията.
export const SUMMARY_STEP = { id: 'summary', short: 'Обобщение' };
export const FORM_STEP = { id: 'form', short: 'Име и телефон' };

export const STEP_BY_ID: Record<string, ChatStep> = Object.fromEntries(STEPS.map((s) => [s.id, s]));

export function stepShort(id?: string | null): string {
  if (!id) return '';
  if (id === 'summary') return SUMMARY_STEP.short;
  if (id === 'form') return FORM_STEP.short;
  if (id === 'opened') return 'Отворен чат';
  return STEP_BY_ID[id]?.short || id;
}

export function stepQuestion(id?: string | null): string {
  if (!id) return '';
  if (id === 'summary') return 'Обобщение и бутон „Отправи запитване“';
  if (id === 'form') return 'Форма за име и телефон';
  return STEP_BY_ID[id]?.q || id;
}

export const INTENTS: Record<string, string> = {
  buy: 'Купува',
  rent: 'Търси под наем',
  sell: 'Продава',
  let: 'Отдава под наем',
  ask: 'Пита за имот',
};

export const EXIT_REASONS: { v: string; label: string }[] = [
  { v: 'browsing', label: 'Само разглеждам' },
  { v: 'phone', label: 'Не искам да оставям телефон' },
  { v: 'long', label: 'Въпросите са много' },
  { v: 'later', label: 'Ще се върна после' },
];

export function exitReasonLabel(v?: string | null): string {
  if (!v) return '';
  return EXIT_REASONS.find((r) => r.v === v)?.label || v;
}

export type Answers = Record<string, string | string[]>;

/** Коя е следващата стъпка след даден отговор. */
export function nextStep(step: ChatStep, value: string | string[]): string {
  if (step.type === 'choice' && typeof value === 'string') {
    const opt = step.options?.find((o) => o.v === value);
    if (opt?.next) return opt.next;
  }
  return step.next || 'summary';
}

const LINE_LABELS: Record<string, string> = {
  kind: 'Имот',
  rooms: 'Стаи',
  area: 'Площ',
  where: 'Район',
  budget: 'Бюджет',
  price: 'Цена',
  furn: 'Обзавеждане',
  when: 'Срок',
  pay: 'Плащане',
  what: 'Въпрос',
  note: 'Бележка',
};

const ORDER = ['kind', 'rooms', 'area', 'where', 'budget', 'price', 'furn', 'what', 'when', 'pay', 'note'];

/** Превръща отговорите в четимо обобщение за клиента, брокера и Viber. */
export function summarize(answers: Answers): { title: string; lines: [string, string][]; text: string } {
  const intent = String(answers.intent || '');
  const title = INTENTS[intent] || 'Запитване';
  const lines: [string, string][] = [];
  for (const k of ORDER) {
    const v = answers[k];
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    const val = Array.isArray(v) ? v.join(', ') : String(v);
    let label = LINE_LABELS[k] || k;
    if (k === 'budget' && intent === 'let') label = 'Очакван наем';
    if (k === 'when' && intent === 'ask') label = 'Оглед';
    lines.push([label, val]);
  }
  const text = [title, ...lines.filter(([l]) => l !== 'Бележка').map(([l, v]) => `${l}: ${v}`)].join('. ');
  return { title, lines, text };
}
