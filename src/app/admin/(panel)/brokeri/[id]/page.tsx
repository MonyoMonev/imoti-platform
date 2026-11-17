import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBoss } from '@/lib/auth';
import { brokerProfile } from '@/lib/admin-data';
import { fullName, phoneText, toId } from '@/lib/format';
import { PageHead } from '@/components/admin/ui';
import { PublicProfileForm } from '@/components/admin/ProfileForms';
import { ResetPassword, VisibilityForm } from '@/components/admin/TeamControls';

export const metadata = { title: 'Профил на брокер' };

export default async function BrokerEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireBoss();
  const { id } = await params;
  const b = toId(id) ? await brokerProfile(toId(id)!) : null;
  if (!b) notFound();

  return (
    <>
      <PageHead
        kicker={<Link href="/admin/brokeri">Брокери</Link>}
        title={fullName(b)}
        sub={`${b.role === 'boss' ? 'Управител' : 'Брокер'}, ${phoneText(b.phone)}${b.active ? '' : '. Достъпът му е спрян.'}`}
      >
        {b.slug ? (
          <a className="btn quiet" href={`/brokeri/${b.slug}`} target="_blank" rel="noreferrer">
            Виж на сайта
          </a>
        ) : null}
      </PageHead>

      <div className="cols">
        <section>
          <h2 className="cap">Публичен профил</h2>
          <PublicProfileForm initial={b} bossEditsId={b.id} />
        </section>
        <div className="stackv">
          <section>
            <h2 className="cap">Показване на сайта</h2>
            <div className="panel pad">
              <VisibilityForm id={b.id} visible={!!b.visible} sort={b.sort ?? 100} />
            </div>
          </section>
          <section>
            <h2 className="cap">Парола</h2>
            <div className="panel pad">
              <ResetPassword id={b.id} name={b.first_name} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
