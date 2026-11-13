import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import AuthForm from '@/components/site/AuthForm';
import { Photo } from '@/components/site/ui';
import '../pages.css';

export const metadata: Metadata = { title: 'Вход' };

export default async function Page() {
  const user = await currentUser();
  if (user) redirect(user.role === 'client' ? '/profil' : '/admin');
  return (
    <main className="auth">
      <div className="auth__form">
        <p className="label" style={{ marginBottom: 16 }}>
          Профил на клиент
        </p>
        <h1 className="title">Добре дошъл отново</h1>
        <AuthForm mode="login" />
        <p className="auth__alt">
          Нямаш профил? <Link href="/registracia">Направи си за половин минута</Link>
        </p>
        <p className="auth__alt" style={{ marginTop: 8, fontSize: '0.94rem' }}>
          Брокер ли си? <Link href="/admin/vhod">Входът за екипа е тук</Link>
        </p>
      </div>
      <div className="auth__side">
        <Photo src="/img/properties/chayka-tristaen-more/5.jpg" alt="" sizes="45vw" priority />
        <blockquote>Запазените имоти и запитванията ти те чакат вътре.</blockquote>
      </div>
    </main>
  );
}
