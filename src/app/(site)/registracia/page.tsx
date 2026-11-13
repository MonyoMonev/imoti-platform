import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import AuthForm from '@/components/site/AuthForm';
import { Photo } from '@/components/site/ui';
import '../pages.css';

export const metadata: Metadata = { title: 'Регистрация' };

export default async function Page() {
  const user = await currentUser();
  if (user) redirect(user.role === 'client' ? '/profil' : '/admin');
  return (
    <main className="auth">
      <div className="auth__form">
        <p className="label" style={{ marginBottom: 16 }}>
          Нов профил
        </p>
        <h1 className="title">Две имена, телефон и парола</h1>
        <p className="lead" style={{ marginTop: 16 }}>
          Без имейли и без кодове за потвърждение. В профила пазиш имотите, които ти харесват, и следиш запитванията си.
        </p>
        <AuthForm mode="register" />
        <p className="auth__alt">
          Вече имаш профил? <Link href="/vhod">Влез</Link>
        </p>
        <p className="auth__alt" style={{ marginTop: 8, fontSize: '0.9rem' }}>
          С регистрацията приемаш, че пазим данните ти, както е описано в <Link href="/poveritelnost">Поверителност</Link>.
        </p>
      </div>
      <div className="auth__side">
        <Photo src="/img/properties/briz-penthaus/1.jpg" alt="" sizes="45vw" priority />
        <blockquote>Брокерът ти вижда какво си разглеждал и идва на огледа подготвен.</blockquote>
      </div>
    </main>
  );
}
