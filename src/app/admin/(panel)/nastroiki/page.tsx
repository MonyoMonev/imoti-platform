import { requireBoss } from '@/lib/auth';
import { channelStatus, demoCounts } from '@/lib/admin-data';
import { num } from '@/lib/format';
import { PageHead } from '@/components/admin/ui';
import WipeDemo from '@/components/admin/WipeDemo';

export const metadata = { title: 'Настройки' };

export default async function SettingsPage() {
  await requireBoss();
  const ch = await channelStatus();
  const demo = await demoCounts();
  const demoTotal = demo.visitors + demo.views + demo.chats + demo.leads + demo.notifications;

  return (
    <>
      <PageHead kicker="Само за управителя" title="Настройки" sub="Състояние на известията, примерните данни и кой какво може в панела." />

      <section>
        <h2 className="cap">Известия до брокерите</h2>
        <div className="panel pad">
          <dl className="dl" style={{ gridTemplateColumns: '170px minmax(0, 1fr)' }}>
            <dt>Viber канали</dt>
            <dd>
              <span className={`st ${ch.channels > 0 ? 'st-deal' : 'st-off'}`}>
                {ch.channels > 0 ? `Свързани ${ch.channels} от ${ch.staff}` : 'Никой не е свързан'}
              </span>
            </dd>
            <dt>Telegram</dt>
            <dd>
              <span className={`st ${ch.telegram ? 'st-deal' : 'st-off'}`}>{ch.telegram ? 'Свързан' : 'Не е свързан'}</span>
            </dd>
          </dl>
          <p className="muted" style={{ marginTop: 14, maxWidth: '80ch' }}>
            Всеки брокер свързва свой частен Viber канал от „Моят профил“ и новите запитвания му излизат там като съобщение. Който още не го е
            направил, не получава нищо на телефона: съобщенията му само се пазят в Известия. Ако изпращането не успее, грешката също се
            вижда там.
          </p>
        </div>
      </section>

      <section className="adm-sec">
        <h2>Примерни данни</h2>
        <div className="panel pad">
          {demoTotal > 0 ? (
            <p style={{ marginBottom: 16, maxWidth: '80ch' }}>
              Панелът е зареден с един месец измислена активност, за да се вижда как изглежда пълен: {num(demo.visitors)} посетители,{' '}
              {num(demo.views)} гледания, {num(demo.chats)} разговора в чата, {num(demo.leads)} запитвания и {num(demo.notifications)} съобщения.
              Имотите, брокерите и истинските запитвания не се пипат.
            </p>
          ) : null}
          <WipeDemo total={demoTotal} />
        </div>
      </section>

      <section className="adm-sec">
        <h2>Кой какво може</h2>
        <div className="roles">
          <article className="role">
            <h3>Управител</h3>
            <p className="who2">Един профил, вижда всичко</p>
            <ul>
              <li>Всички запитвания, на всеки брокер, и прехвърлянето им</li>
              <li>Всички имоти, избраните за началната страница и чий е всеки имот</li>
              <li>Кани брокери с код, спира и връща достъп, сменя пароли</li>
              <li>Редактира публичния профил на всеки и реда им на сайта</li>
              <li>Анализ на чата: къде и защо хората се отказват</li>
              <li>Всички клиенти, какво гледат и какво са питали</li>
              <li>Настройки и примерни данни</li>
            </ul>
          </article>
          <article className="role">
            <h3>Брокер</h3>
            <p className="who2">Влиза с код за покана от управителя</p>
            <ul>
              <li>Само своите запитвания: статус, бележки, обаждане</li>
              <li>Добавя и редактира своите имоти и снимките им</li>
              <li>Прави линк към всеки активен имот със своето име</li>
              <li>Своите клиенти и своите известия</li>
              <li>Своя публичен профил, телефон и парола</li>
              <li className="no">Не вижда запитванията и клиентите на колегите</li>
              <li className="no">Не променя чужди имоти и не избира имоти за началната страница</li>
              <li className="no">Няма достъп до брокери, анализ и настройки</li>
            </ul>
          </article>
          <article className="role">
            <h3>Клиент</h3>
            <p className="who2">Регистрира се сам на сайта с име и телефон</p>
            <ul>
              <li>Запазва имоти в любими</li>
              <li>Вижда своите запитвания и докъде са стигнали</li>
              <li>Чатът вече знае името и телефона му</li>
              <li className="no">Няма никакъв достъп до панела</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
