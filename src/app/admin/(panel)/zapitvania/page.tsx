import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { leadsList, staffList } from '@/lib/admin-data';
import { LEAD_STATUS, SOURCES, ago, fullName, phoneText, sourceLabel } from '@/lib/format';
import { Empty, LeadStatus, PageHead } from '@/components/admin/ui';
import AutoForm from '@/components/admin/AutoForm';
import { leadWants, many } from '@/components/admin/helpers';

export const metadata = { title: 'Запитвания' };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; broker?: string; source?: string; q?: string }>;
}) {
  const user = await requireStaff();
  const boss = user.role === 'boss';
  const sp = await searchParams;
  const f = {
    status: LEAD_STATUS[String(sp.status)] ? String(sp.status) : '',
    broker: boss ? String(sp.broker || '') : '',
    source: SOURCES[String(sp.source)] ? String(sp.source) : '',
    text: String(sp.q || '').slice(0, 60),
  };
  const { rows, total } = await leadsList(user, f);
  const staff = boss ? await staffList(false) : [];
  const filtered = !!(f.status || f.broker || f.source || f.text);

  return (
    <>
      <PageHead
        kicker={boss ? 'Целият екип' : 'Само моите'}
        title="Запитвания"
        sub="Всеки, който е минал през чата и е оставил име и телефон. Новите са отгоре и чакат обаждане."
      />

      <AutoForm action="/admin/zapitvania">
        <label className="field wide">
          <span>Търсене</span>
          <input type="search" name="q" defaultValue={f.text} placeholder="Име, телефон или дума от запитването" />
        </label>
        <label className="field">
          <span>Статус</span>
          <select name="status" defaultValue={f.status}>
            <option value="">Всички</option>
            {Object.entries(LEAD_STATUS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {boss ? (
          <label className="field">
            <span>Брокер</span>
            <select name="broker" defaultValue={f.broker}>
              <option value="">Всички</option>
              <option value="none">Без брокер</option>
              {staff.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {fullName(s)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          <span>Дошли от</span>
          <select name="source" defaultValue={f.source}>
            <option value="">Навсякъде</option>
            {Object.entries(SOURCES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" type="submit">
          Покажи
        </button>
        {filtered ? (
          <Link className="btn quiet" href="/admin/zapitvania">
            Изчисти
          </Link>
        ) : null}
      </AutoForm>

      <p className="muted small" style={{ marginBottom: 10 }}>
        {many(total, 'запитване', 'запитвания')}
        {rows.length < total ? `, показани са последните ${rows.length}` : ''}
      </p>

      <div className="panel">
        {rows.length ? (
          <table className="tbl stack">
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Какво търси</th>
                {boss ? <th>Брокер</th> : null}
                <th>Дошъл от</th>
                <th>Статус</th>
                <th className="num">Кога</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l: any) => {
                const w = leadWants(l);
                return (
                  <tr key={l.id} className={l.status === 'new' ? 'fresh' : undefined}>
                    <td className="main">
                      <Link href={`/admin/zapitvania/${l.id}`}>{fullName(l)}</Link>
                      <span className="sub nowrap">{phoneText(l.phone)}</span>
                    </td>
                    <td className="wide">
                      {w.title}
                      <span className="sub clamp2">{l.property_title ? `${l.property_title} (${l.property_ref})` : w.rest}</span>
                    </td>
                    {boss ? (
                      <td data-l="Брокер" className="nowrap">
                        {l.b_first ? `${l.b_first} ${l.b_last}` : <span className="muted">Без брокер</span>}
                      </td>
                    ) : null}
                    <td data-l="Дошъл от">{sourceLabel(l.source)}</td>
                    <td data-l="Статус">
                      <LeadStatus status={l.status} />
                    </td>
                    <td className="num muted" data-l="Кога">
                      {ago(l.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : filtered ? (
          <Empty title="Нищо не отговаря на този филтър" text="Махни някое от условията или изчисти търсенето." href="/admin/zapitvania" action="Изчисти филтъра" />
        ) : (
          <Empty
            title="Още няма запитвания"
            text="Запитване се появява, когато човек мине през чата на сайта и остави име и телефон. Сподели линк към имот, за да тръгне."
            href="/admin/linkove"
            action="Направи линк за споделяне"
          />
        )}
      </div>
    </>
  );
}
