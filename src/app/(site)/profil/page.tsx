import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { clientArea } from '@/lib/data';
import { INTENTS } from '@/lib/chat-tree';
import { LEAD_STATUS, dateText, phoneText } from '@/lib/format';
import { Photo, PropertyCard, Tri } from '@/components/site/ui';
import { LogoutButton } from '@/components/site/AuthForm';
import { ChatButton } from '@/components/chat/Chat';
import '../pages.css';

export const metadata: Metadata = { title: 'Моят профил' };

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/vhod');
  if (user.role !== 'client') redirect('/admin');
  const { favorites, leads, viewed } = await clientArea(user.id);
  return (
    <main>
      <div className="wrap">
        <header className="phead acct__head">
          <div>
            <p className="label phead__label">
              <Tri />
              Моят профил
            </p>
            <h1 className="title">Здравей, {user.first_name}</h1>
            <p className="lead" style={{ marginTop: 14 }}>
              {user.first_name} {user.last_name}, {phoneText(user.phone)}
            </p>
          </div>
          <LogoutButton />
        </header>

        <section className="acct__sec">
          <h2>Запитванията ми</h2>
          {leads.length === 0 ? (
            <div className="acct__none">
              <p style={{ marginBottom: 18 }}>Още не си изпращал запитване. Кажи какво търсиш и брокер ще ти се обади.</p>
              <ChatButton>Кажи какво търсиш</ChatButton>
            </div>
          ) : (
            leads.map((l: any) => (
              <div className="lrow" key={l.id}>
                <div className="lrow__ph">{l.b_photo && <Photo src={l.b_photo} alt="" sizes="64px" />}</div>
                <div>
                  <b>
                    {INTENTS[l.intent] || 'Запитване'}
                    {l.p_title ? `: ${l.p_title}` : ''}
                  </b>
                  <p>{l.summary}</p>
                  <small>
                    {dateText(l.created_at)}
                    {l.b_first ? `, при ${l.b_first} ${l.b_last}, ${phoneText(l.b_phone)}` : ', очаква разпределение'}
                  </small>
                </div>
                <span className={`status status--${l.status}`}>{LEAD_STATUS[l.status] || l.status}</span>
              </div>
            ))
          )}
        </section>

        <section className="acct__sec">
          <h2>Запазени имоти</h2>
          {favorites.length === 0 ? (
            <p className="acct__none">
              Нямаш запазени имоти. Отвори имот, който ти харесва, и натисни „Запази имота“. <Link href="/imoti" style={{ fontWeight: 600, textDecoration: 'underline' }}>Към имотите</Link>
            </p>
          ) : (
            <div className="grid" style={{ paddingBlock: 0 }}>
              {favorites.map((p) => (
                <PropertyCard key={p.id} p={p} sizes="(max-width: 560px) 100vw, 33vw" />
              ))}
            </div>
          )}
        </section>

        <section className="acct__sec" style={{ paddingBottom: 'clamp(60px, 8vw, 120px)' }}>
          <h2>Последно разгледани</h2>
          {viewed.length === 0 ? (
            <p className="acct__none">Тук ще се появят имотите, които отваряш.</p>
          ) : (
            <div className="grid" style={{ paddingBlock: 0 }}>
              {viewed.slice(0, 6).map((p) => (
                <PropertyCard key={p.id} p={p} sizes="(max-width: 560px) 100vw, 33vw" />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
