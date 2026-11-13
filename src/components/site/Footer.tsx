import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { Logo } from './Header';

// Долният край на сайта е „под кота нула“: земята и основите на сградата.
export default function Footer() {
  return (
    <footer className="ftr">
      <div className="ftr__ground" aria-hidden="true">
        <span className="ftr__mark">
          <svg viewBox="0 0 16 14">
            <path d="M1 1h14L8 13z" fill="currentColor" />
          </svg>
          ±0.00
        </span>
      </div>
      <div className="ftr__in">
        <div className="ftr__brand">
          <Logo />
          <p>
            Агенция за недвижими имоти във {BRAND.city}. Работим {BRAND.years} и познаваме кварталите вход по вход.
          </p>
        </div>
        <nav className="ftr__col" aria-label="Страници">
          <h3>Сайтът</h3>
          <Link href="/imoti">Имоти</Link>
          <Link href="/imoti?deal=sale">Продажби</Link>
          <Link href="/imoti?deal=rent">Наеми</Link>
          <Link href="/brokeri">Брокери</Link>
          <Link href="/za-nas">За агенцията</Link>
        </nav>
        <div className="ftr__col">
          <h3>Контакти</h3>
          <a href={`tel:${BRAND.phoneHref}`}>{BRAND.phone}</a>
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          <span>{BRAND.address}</span>
          <Link href="/kontakti">Как да ни намериш</Link>
        </div>
        <div className="ftr__col">
          <h3>Профил</h3>
          <Link href="/vhod">Вход за клиенти</Link>
          <Link href="/registracia">Регистрация</Link>
          <Link href="/admin/vhod">Вход за брокери</Link>
          <Link href="/poveritelnost">Поверителност</Link>
        </div>
      </div>
      <div className="ftr__base">
        <span>
          © {new Date().getFullYear()} {BRAND.full}
        </span>
        <span>Основи, сутерен и всичко, което държи сградата</span>
      </div>
    </footer>
  );
}
