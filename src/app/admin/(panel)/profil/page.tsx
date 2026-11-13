import { requireStaff } from '@/lib/auth';
import { brokerProfile } from '@/lib/admin-data';
import { phoneText } from '@/lib/format';
import { PageHead } from '@/components/admin/ui';
import { AccountForm, PasswordForm, PublicProfileForm } from '@/components/admin/ProfileForms';
import { ViberChannel } from '@/components/admin/ViberChannel';

export const metadata = { title: 'Моят профил' };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ nov?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const b = (await brokerProfile(user.id))!;

  return (
    <>
      <PageHead
        kicker={user.role === 'boss' ? 'Управител' : 'Брокер'}
        title="Моят профил"
        sub="Данните за вход са само за теб. Публичният профил е това, което клиентите виждат на сайта и до всеки твой линк."
      >
        {b.slug && b.visible ? (
          <a className="btn quiet" href={`/brokeri/${b.slug}`} target="_blank" rel="noreferrer">
            Виж ме на сайта
          </a>
        ) : null}
      </PageHead>

      {sp.nov === '1' ? (
        <div className="notice" style={{ marginBottom: 24 }}>
          <b>Добре дошъл, {user.first_name}. Профилът ти е създаден.</b>
          Качи снимка и напиши няколко изречения за себе си. Щом си готов, управителят те пуска на страницата с брокерите.
        </div>
      ) : !b.visible ? (
        <div className="notice" style={{ marginBottom: 24 }}>
          <b>Още не се виждаш на сайта.</b>
          Попълни профила си и кажи на управителя да те покаже на страницата с брокерите.
        </div>
      ) : null}

      <div className="cols">
        <section>
          <h2 className="cap">Публичен профил</h2>
          <PublicProfileForm initial={b} />
        </section>
        <div className="stackv">
          <section id="viber">
            <h2 className="cap">Известия във Viber</h2>
            <div className="panel pad">
              <ViberChannel connected={!!b.viber_channel_on} name={b.viber_channel_name} />
            </div>
          </section>
          <section>
            <h2 className="cap">Данни за вход</h2>
            <div className="panel pad">
              <AccountForm
                initial={{
                  first_name: b.first_name,
                  last_name: b.last_name,
                  phone: phoneText(b.phone),
                  notify_phone: phoneText(b.notify_phone || b.phone),
                }}
              />
            </div>
          </section>
          <section>
            <h2 className="cap">Смяна на парола</h2>
            <div className="panel pad">
              <PasswordForm />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
