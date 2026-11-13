'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DISTRICTS, KINDS } from '@/lib/format';

const PRICES_SALE = [80000, 130000, 200000, 350000, 500000];
const PRICES_RENT = [400, 600, 900, 1500];

/** Филтрите на списъка с имоти. Всичко е в адреса, за да може линкът да се праща. */
export default function Filters({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const get = (k: string) => sp.get(k) || '';
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    if (k === 'deal') next.delete('max');
    router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };
  const deal = get('deal');
  const prices = deal === 'rent' ? PRICES_RENT : PRICES_SALE;
  const active = ['deal', 'kind', 'district', 'rooms', 'max', 'sort'].some((k) => sp.get(k));
  const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return (
    <>
      <div className="filters">
        <div className="seg" role="group" aria-label="Вид сделка">
          {[
            ['', 'Всички'],
            ['sale', 'Продажба'],
            ['rent', 'Наем'],
          ].map(([v, l]) => (
            <button key={v} type="button" className={deal === v ? 'is-on' : ''} aria-pressed={deal === v} onClick={() => set('deal', v)}>
              {l}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Вид имот</span>
          <select className="select" value={get('kind')} onChange={(e) => set('kind', e.target.value)}>
            <option value="">Всички</option>
            {Object.entries(KINDS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Район</span>
          <select className="select" value={get('district')} onChange={(e) => set('district', e.target.value)}>
            <option value="">Цяла Варна</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Стаи</span>
          <select className="select" value={get('rooms')} onChange={(e) => set('rooms', e.target.value)}>
            <option value="">Без значение</option>
            <option value="1">Едностаен</option>
            <option value="2">Двустаен</option>
            <option value="3">Тристаен</option>
            <option value="4">Четири и повече</option>
          </select>
        </label>
        <label className="field">
          <span>Цена до</span>
          <select className="select" value={get('max')} onChange={(e) => set('max', e.target.value)}>
            <option value="">Без таван</option>
            {prices.map((p) => (
              <option key={p} value={p}>
                {fmt(p)} €
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Подреди по</span>
          <select className="select" value={get('sort')} onChange={(e) => set('sort', e.target.value)}>
            <option value="">Нови отгоре</option>
            <option value="cheap">Цена, от ниска</option>
            <option value="dear">Цена, от висока</option>
            <option value="big">Площ</option>
          </select>
        </label>
      </div>
      <div className="filters__meta">
        <span>{total === 0 ? 'Няма имоти с тези условия' : total === 1 ? 'Един имот' : `${total} имота`}</span>
        {active && (
          <button type="button" onClick={() => router.replace(pathname, { scroll: false })}>
            Изчисти филтрите
          </button>
        )}
      </div>
    </>
  );
}
