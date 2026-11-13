import Link from 'next/link';
import { q1 } from '@/lib/db';
import { BRAND } from '@/lib/brand';
import { InviteForm } from '@/components/admin/AuthForms';
import { AuthArt } from '@/components/admin/AuthArt';

export const metadata = { title: 'Покана' };

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ kod?: string }> }) {
  const sp = await searchParams;
  const code = String(sp.kod || '').trim().toUpperCase().slice(0, 8);

  let problem = '';
  let inviter = '';
  if (code) {
    const inv = await q1(
      `select i.used_at, i.revoked, (i.expires_at < now()) as expired, u.first_name, u.last_name
         from invites i left join users u on u.id = i.created_by where i.code = $1`,
      [code]
    );
    if (!inv) problem = 'Не намираме такъв код. Провери дали е изписан точно.';
    else if (inv.used_at) problem = 'Този код вече е използван. Ако профилът е твой, влез с телефона и паролата си.';
    else if (inv.revoked) problem = 'Тази покана е отменена. Поискай нова от управителя.';
    else if (inv.expired) problem = 'Срокът на тази покана е изтекъл. Поискай нова от управителя.';
    else inviter = `${inv.first_name} ${inv.last_name}`;
  }

  return (
    <div className="adm-auth">
      <AuthArt title="Добре дошъл в екипа" text="Трябват ти само кодът от управителя, име, телефон и парола." />
      <section className="box">
        <h1>Покана за брокер</h1>
        <p>
          {inviter
            ? `${inviter} те кани в панела на ${BRAND.full}. Попълни името си, телефон и парола и си вътре.`
            : 'Въведи кода, който си получил от управителя, и си направи профил. Без имейли и потвърждения.'}
        </p>
        {problem ? (
          <p className="err" role="alert" style={{ marginBottom: 18 }}>
            {problem}
          </p>
        ) : null}
        <InviteForm code={problem ? '' : code} />
        <p className="alt">
          Вече имаш профил?{' '}
          <Link className="link" href="/admin/vhod">
            Към входа
          </Link>
        </p>
      </section>
    </div>
  );
}
