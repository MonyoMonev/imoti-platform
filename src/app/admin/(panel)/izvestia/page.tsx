import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { channelStatus, notificationsList } from '@/lib/admin-data';
import { dateText, phoneText } from '@/lib/format';
import { Empty, PageHead } from '@/components/admin/ui';

export const metadata = { title: 'Известия' };

const STATUS: Record<string, string> = {
  sent: 'Изпратено',
  simulated: 'Симулация',
  failed: 'Грешка',
};

export default async function NotificationsPage() {
  const user = await requireStaff();
  const boss = user.role === 'boss';
  const rows = await notificationsList(user);
  const ch = await channelStatus(user.id);
  const connected = boss ? ch.any : ch.mine || ch.viber || ch.telegram;

  return (
    <>
      <PageHead
        kicker={boss ? 'Към целия екип' : 'Само към мен'}
        title="Известия"
        sub="Съобщението, което брокерът получава на телефона си при всяко ново запитване: кой е клиентът, номерът му и какво търси."
      />

      {!connected ? (
        <div className="notice" style={{ marginBottom: 24 }}>
          <b>{boss ? 'Още никой не е свързал Viber канал.' : 'Още не си свързал своя Viber канал.'}</b>
          Всяко съобщение се подготвя и записва тук, точно както би изглеждало във Viber, но не излиза към телефона. Свързването отнема две
          минути и се прави от „Моят профил“.{' '}
          <Link className="link" href="/admin/profil">
            Свържи Viber
          </Link>
        </div>
      ) : null}

      {rows.length >= 30 ? (
        <p className="muted small" style={{ marginBottom: 12 }}>
          Показани са последните 30 съобщения.
        </p>
      ) : null}

      {rows.length ? (
        <div className="nlist">
          {rows.map((n: any) => (
            <article className="nitem" key={n.id}>
              <div className="head">
                <span className={`st st-${n.status}`}>{STATUS[n.status] || n.status}</span>
                <span className="muted small">{dateText(n.created_at, true)}</span>
              </div>
              <div className="vb">
                <div className="vb-meta">
                  <b>{n.channel === 'telegram' ? 'Telegram' : 'Viber'}</b>
                  <span>
                    до {n.b_first ? `${n.b_first} ${n.b_last}` : 'брокера'}
                    {n.recipient ? `, ${phoneText(n.recipient)}` : ''}
                  </span>
                </div>
                <div className="vb-msg">{n.body}</div>
              </div>
              <p className="small" style={{ marginTop: 6 }}>
                {n.lead_id ? (
                  <Link className="link" href={`/admin/zapitvania/${n.lead_id}`}>
                    Към запитването
                  </Link>
                ) : null}
                {n.error ? <span className="err"> {n.error}</span> : null}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty title="Още няма съобщения" text="Първото се появява в момента, в който някой изпрати запитване от сайта." />
        </div>
      )}
    </>
  );
}
