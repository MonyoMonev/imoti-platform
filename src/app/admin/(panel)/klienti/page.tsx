import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { clientsList } from '@/lib/admin-data';
import { ago, dateText, fullName, phoneText } from '@/lib/format';
import { Empty, PageHead } from '@/components/admin/ui';
import { many } from '@/components/admin/helpers';

export const metadata = { title: 'Клиенти' };

export default async function ClientsPage() {
  const user = await requireStaff();
  const boss = user.role === 'boss';
  const { registered, contacts } = await clientsList(user);

  return (
    <>
      <PageHead
        kicker={boss ? 'Всички хора, които сме записали' : 'Хората зад моите запитвания'}
        title="Клиенти"
        sub="Регистрираните клиенти оставят следа: кои имоти гледат, кои си запазват и какво са питали. Останалите са оставили само име и телефон през чата."
      />

      <section>
        <h2 className="cap">Регистрирани на сайта</h2>
        <div className="panel">
          {registered.length ? (
            <table className="tbl stack">
              <thead>
                <tr>
                  <th>Клиент</th>
                  <th>Телефон</th>
                  <th className="num">Гледани имоти</th>
                  <th className="num">Запазени</th>
                  <th className="num">Запитвания</th>
                  <th>Последно на сайта</th>
                  <th>Регистриран</th>
                </tr>
              </thead>
              <tbody>
                {registered.map((c: any) => (
                  <tr key={c.id}>
                    <td className="main">
                      <Link href={`/admin/klienti/${c.id}`}>{fullName(c)}</Link>
                    </td>
                    <td data-l="Телефон" className="nowrap">
                      <a href={`tel:${c.phone}`}>{phoneText(c.phone)}</a>
                    </td>
                    <td className="num" data-l="Гледани имоти">
                      {c.views}
                    </td>
                    <td className="num" data-l="Запазени">
                      {c.favs}
                    </td>
                    <td className="num" data-l="Запитвания">
                      {c.leads}
                    </td>
                    <td data-l="Последно на сайта" className="muted">
                      {c.last_view ? ago(c.last_view) : 'няма данни'}
                    </td>
                    <td data-l="Регистриран" className="muted">
                      {dateText(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              title="Още няма регистрирани клиенти"
              text="Когато някой си направи профил на сайта, тук ще виждаш какво разглежда и какво си запазва."
            />
          )}
        </div>
      </section>

      <section className="adm-sec">
        <h2>
          Оставили запитване без регистрация
          <span className="muted small" style={{ fontFamily: 'var(--sans)', letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>
            {many(contacts.length, 'човек', 'души')}
          </span>
        </h2>
        <div className="panel">
          {contacts.length ? (
            <table className="tbl stack">
              <thead>
                <tr>
                  <th>Име</th>
                  <th>Телефон</th>
                  <th className="num">Запитвания</th>
                  <th>Последно</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c: any) => (
                  <tr key={c.phone}>
                    <td className="main">
                      <Link href={`/admin/zapitvania/${c.last_lead_id}`}>{fullName(c)}</Link>
                    </td>
                    <td data-l="Телефон" className="nowrap">
                      <a href={`tel:${c.phone}`}>{phoneText(c.phone)}</a>
                    </td>
                    <td className="num" data-l="Запитвания">
                      {c.leads}
                    </td>
                    <td data-l="Последно" className="muted">
                      {ago(c.last_at)}
                    </td>
                    <td className="num" data-l="">
                      <Link className="link small" href={`/admin/zapitvania/${c.last_lead_id}`}>
                        Виж запитването
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty title="Няма такива хора" text="Тук влизат всички, които са оставили име и телефон през чата, без да си правят профил." />
          )}
        </div>
      </section>
    </>
  );
}
