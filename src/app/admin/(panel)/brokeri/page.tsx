import Link from 'next/link';
import { requireBoss } from '@/lib/auth';
import { brokersList, invitesList } from '@/lib/admin-data';
import { BRAND } from '@/lib/brand';
import { ago, dateText, fullName, phoneText } from '@/lib/format';
import { Avatar, PageHead } from '@/components/admin/ui';
import { AccessControl, InviteMaker, RevokeInvite } from '@/components/admin/TeamControls';
import { many } from '@/components/admin/helpers';

export const metadata = { title: 'Брокери' };

export default async function BrokersPage() {
  await requireBoss();
  const team = await brokersList();
  const invites = await invitesList();
  const active = team.filter((t: any) => t.active);
  const pending = invites.filter((i: any) => !i.used_at && !i.revoked && !i.expired);
  const past = invites.filter((i: any) => i.used_at || i.revoked || i.expired).slice(0, 8);

  return (
    <>
      <PageHead
        kicker="Само за управителя"
        title="Брокери"
        sub={`${many(active.length, 'човек има', 'души имат')} достъп до панела. Нов колега влиза с код за покана: създаваш го тук и му го пращаш във Viber.`}
      />

      <section>
        <h2 className="cap">Покани нов брокер</h2>
        <div className="panel pad">
          <InviteMaker agency={BRAND.full} />
        </div>
      </section>

      {pending.length || past.length ? (
        <section className="adm-sec">
          <h2>Покани</h2>
          <div className="panel">
            <table className="tbl stack">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>За кого</th>
                  <th>Създадена</th>
                  <th>Състояние</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...pending, ...past].map((i: any) => {
                  const state = i.used_at
                    ? `Използвана от ${i.used_first || ''} ${i.used_last || ''}`.trim()
                    : i.revoked
                      ? 'Отменена'
                      : i.expired
                        ? 'Изтекла'
                        : `Чака, важи до ${dateText(i.expires_at)}`;
                  const live = !i.used_at && !i.revoked && !i.expired;
                  return (
                    <tr key={i.code}>
                      <td className="main">
                        <b style={{ fontFamily: 'var(--cond)', fontSize: 22, letterSpacing: '0.14em' }}>{i.code}</b>
                      </td>
                      <td data-l="За кого">{i.note || <span className="muted">Без бележка</span>}</td>
                      <td data-l="Създадена" className="muted">
                        {ago(i.created_at)}
                      </td>
                      <td data-l="Състояние">
                        <span className={`st ${live ? 'st-viewing' : i.used_at ? 'st-deal' : 'st-off'}`}>{state}</span>
                      </td>
                      <td className="num" data-l="">
                        {live ? <RevokeInvite code={i.code} /> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="adm-sec">
        <h2>Екипът</h2>
        <div className="panel">
          <table className="tbl stack">
            <thead>
              <tr>
                <th>Брокер</th>
                <th>Телефон</th>
                <th className="num">Имоти</th>
                <th className="num">Запитвания за 30 дни</th>
                <th className="num">Чакат обаждане</th>
                <th>На сайта</th>
                <th>Достъп</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {team.map((t: any) => (
                <tr key={t.id}>
                  <td className="main">
                    <span className="who">
                      <Avatar photo={t.photo} name={fullName(t)} />
                      <span>
                        <Link href={`/admin/brokeri/${t.id}`}>{fullName(t)}</Link>
                        <span className="sub">{t.role === 'boss' ? 'Управител' : t.title || 'Брокер'}</span>
                      </span>
                    </span>
                  </td>
                  <td data-l="Телефон" className="nowrap">
                    {phoneText(t.phone)}
                  </td>
                  <td className="num" data-l="Имоти">
                    {t.props}
                  </td>
                  <td className="num" data-l="Запитвания за 30 дни">
                    {t.leads30}
                  </td>
                  <td className="num" data-l="Чакат обаждане">
                    {t.fresh > 0 ? <b style={{ color: 'var(--red-ink)' }}>{t.fresh}</b> : 0}
                  </td>
                  <td data-l="На сайта">
                    <span className={`st ${t.visible ? 'st-active' : 'st-off'}`}>{t.visible ? 'Показва се' : 'Скрит'}</span>
                  </td>
                  <td data-l="Достъп">
                    <span className={`st ${t.active ? 'st-deal' : 'st-off'}`}>{t.active ? 'Активен' : 'Спрян'}</span>
                    <span className="sub">{t.last_login_at ? `влизал ${ago(t.last_login_at)}` : 'още не е влизал'}</span>
                  </td>
                  <td className="num" data-l="">
                    {t.role === 'boss' ? null : (
                      <AccessControl
                        id={t.id}
                        name={fullName(t)}
                        active={t.active}
                        props={t.props}
                        others={active.filter((o: any) => o.id !== t.id).map((o: any) => ({ id: o.id, name: fullName(o) }))}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
