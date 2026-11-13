'use client';

import { useState } from 'react';

const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Ориентировъчна месечна вноска при кредит. */
export default function Mortgage({ price }: { price: number }) {
  const [down, setDown] = useState(20);
  const [years, setYears] = useState(25);
  const [rate, setRate] = useState(3.1);
  const loan = price * (1 - down / 100);
  const r = rate / 100 / 12;
  const n = years * 12;
  const pay = r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
  return (
    <div className="calc">
      <h3>Сметка за кредит</h3>
      <label className="calc__row">
        <span>Самоучастие</span>
        <b>
          {down}% ({fmt((price * down) / 100)} €)
        </b>
        <input type="range" min={10} max={60} step={5} value={down} onChange={(e) => setDown(Number(e.target.value))} aria-label="Самоучастие в проценти" />
      </label>
      <label className="calc__row">
        <span>Срок</span>
        <b>{years} години</b>
        <input type="range" min={5} max={30} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} aria-label="Срок в години" />
      </label>
      <label className="calc__row">
        <span>Лихва</span>
        <b>{rate.toFixed(1).replace('.', ',')}%</b>
        <input type="range" min={2} max={6} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Годишна лихва" />
      </label>
      <div className="calc__out">
        <span>Вноска на месец</span>
        <b>{fmt(pay)} €</b>
      </div>
      <small>Ориентировъчна сметка. Точните условия зависят от банката и от доходите ти.</small>
    </div>
  );
}
