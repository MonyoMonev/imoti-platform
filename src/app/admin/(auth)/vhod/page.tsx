import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser, isStaff } from '@/lib/auth';
import { LoginForm } from '@/components/admin/AuthForms';
import { AuthArt } from '@/components/admin/AuthArt';

export const metadata = { title: 'Вход' };

export default async function LoginPage() {
  const u = await currentUser();
  if (isStaff(u)) redirect('/admin');

  const demo = process.env.HIDE_DEMO_LOGIN
    ? []
    : [
        { label: 'Управител: Красимир Данев', phone: '0888 555 010', password: 'shef2026' },
        { label: 'Брокер: Мария Колева', phone: '0888 555 011', password: 'broker2026' },
      ];

  return (
    <div className="adm-auth">
      <AuthArt title="Панел на екипа" text="Запитванията, имотите и клиентите на агенцията на едно място." />
      <section className="box">
        <h1>Вход за екипа</h1>
        <p>Влез с телефона и паролата си. Тук са само брокерите и управителят.</p>
        <LoginForm demo={demo} />
        <p className="alt">
          Нов си в агенцията?{' '}
          <Link className="link" href="/admin/pokana">
            Имам код за покана
          </Link>
        </p>
      </section>
    </div>
  );
}
