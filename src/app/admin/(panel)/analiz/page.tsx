import Link from 'next/link';
import { requireBoss } from '@/lib/auth';
import { answerPath, chatAnalysis, pct, staffList } from '@/lib/admin-data';
import { exitReasonLabel, stepShort } from '@/lib/chat-tree';
import { SOURCES, dateText, duration, fullName, sourceLabel, toId } from '@/lib/format';
import { Empty, HBars, PageHead } from '@/components/admin/ui';
import AutoForm from '@/components/admin/AutoForm';
import { many } from '@/components/admin/helpers';

export const metadata = { title: 'Анализ на чата' };

const DEVICES: Record<string, string> = { mobile: 'Телефон', desktop: 'Компютър' };

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ dni?: string; broker?: string; source?: string; device?: string }>;
}) {
  await requireBoss();
  const sp = await searchParams;
  const days = ['7', '30', '90'].includes(String(sp.dni)) ? Number(sp.dni) : 30;
  const broker = toId(sp.broker);
  const source = SOURCES[String(sp.source)] ? String(sp.source) : null;
  const device = DEVICES[String(sp.device)] ? String(sp.device) : null;
  const a = await chatAnalysis({ days, brokerId: broker, source, device });
  const staff = await staffList(false);

  const qs = (d: number) => {
    const p = new URLSearchParams();
    p.set('dni', String(d));
    if (broker) p.set('broker', String(broker));
    if (source) p.set('source', source);
    if (device) p.set('device', device);
    return `/admin/analiz?${p.toString()}`;
  };

  // Фунията се смята от таблицата по стъпки, за да излизат числата едни и същи навсякъде.
  const st = (id: string) => a.steps.find((s) => s.id === id)?.stopped || 0;
  const inQuestions = a.steps.filter((s) => !['start', 'summary', 'form'].includes(s.id)).reduce((n, s) => n + s.stopped, 0);
  const f1 = a.tot.opened;
  const f2 = f1 - st('start');
  const f3 = f2 - inQuestions;
  const f4 = f3 - st('summary');
  const f5 = f4 - st('form');
  const funnel = [
    { label: 'Отвориха чата', n: f1 },
    { label: 'Отговориха на първия въпрос', n: f2 },
    { label: 'Стигнаха до обобщението', n: f3 },
    { label: 'Натиснаха „Отправи запитване“', n: f4 },
    { label: 'Оставиха име и телефон', n: f5 },
  ];
  const drops = funnel.slice(1).map((s, i) => funnel[i].n - s.n);
  const worst = drops.indexOf(Math.max(...drops));
  const byStopped = [...a.steps].sort((x, y) => y.stopped - x.stopped || y.rate - x.rate);
  const topStop = byStopped[0]?.stopped || 0;
  const filtered = !!(broker || source || device);

  return (
    <>
      <PageHead
        kicker="Само за управителя"
        title="Анализ на чата"
        sub="Колко души започват разговор с помощника, докъде стигат и къде точно се отказват. Всяко число тук е човек, който е бил на една крачка от запитване."
      >
        <nav className="seg" aria-label="Период">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={qs(d)} aria-current={d === days ? 'true' : undefined}>
              {d} дни
            </Link>
          ))}
        </nav>
      </PageHead>

      <AutoForm action="/admin/analiz">
        <input type="hidden" name="dni" value={days} />
        <label className="field">
          <span>Брокер</span>
          <select name="broker" defaultValue={broker ? String(broker) : ''}>
            <option value="">Всички</option>
            {staff.map((s: any) => (
              <option key={s.id} value={s.id}>
                {fullName(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Дошли от</span>
          <select name="source" defaultValue={source || ''}>
            <option value="">Навсякъде</option>
            {Object.entries(SOURCES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Устройство</span>
          <select name="device" defaultValue={device || ''}>
            <option value="">Всички</option>
            <option value="mobile">Телефон</option>
            <option value="desktop">Компютър</option>
          </select>
        </label>
        <button className="btn" type="submit">
          Покажи
        </button>
        {filtered ? (
          <Link className="btn quiet" href={`/admin/analiz?dni=${days}`}>
            Изчисти
          </Link>
        ) : null}
      </AutoForm>

      {a.tot.opened === 0 ? (
        <div className="panel">
          <Empty
            title="Никой не е отварял чата в този период"
            text="Щом първият посетител натисне помощника, тук ще се появи пътят му стъпка по стъпка. Избери 90 дни или махни филтрите."
          />
        </div>
      ) : (
        <>
          <section className="kpis" aria-label="Основни числа">
            <div className="kpi">
              <div className="l">Отвориха чата</div>
              <div className="v" data-n="opened">
                {a.tot.opened}
              </div>
              <div className="d">за последните {days} дни</div>
            </div>
            <div className="kpi">
              <div className="l">Изпратиха запитване</div>
              <div className="v" data-n="sent">
                {a.tot.sent}
              </div>
              <div className="d">{pct(a.tot.sent, a.tot.opened)}% от отворилите</div>
            </div>
            <div className="kpi">
              <div className="l">Отказаха се по пътя</div>
              <div className="v" data-n="abandoned">
                {a.abandoned}
              </div>
              <div className="d">{pct(a.abandoned, a.tot.opened)}% от отворилите</div>
            </div>
            <div className="kpi">
              <div className="l">Време преди отказ</div>
              <div className="v" style={{ fontSize: 40, lineHeight: 1.4 }}>
                {duration(a.medianStay)}
              </div>
              <div className="d">половината си тръгват до този момент</div>
            </div>
          </section>

          {a.findings.length ? (
            <section className="adm-sec">
              <h2>Какво казват числата</h2>
              <div className="finds">
                {a.findings.map((f, i) => (
                  <article className="find" key={i}>
                    <span className="no">{i + 1}</span>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                    <p className="do">
                      <b>Идея</b>
                      {f.tip}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="adm-sec">
            <h2>Пътят от първото отваряне до запитването</h2>
            <div className="panel funnel">
              {funnel.map((s, i) => (
                <div key={s.label}>
                  {i > 0 ? (
                    <div className={`fdrop${i - 1 === worst && drops[worst] > 0 ? ' worst' : ''}`}>
                      отпадат <b>{drops[i - 1]}</b> ({pct(drops[i - 1], funnel[i - 1].n)}% от предишната стъпка)
                    </div>
                  ) : null}
                  <div className="step">
                    <span className="n">{s.label}</span>
                    <span className="track">
                      <i style={{ width: `calc((100% - 176px) * ${(s.n / Math.max(1, f1)).toFixed(4)})` }} />
                      <b data-funnel={i}>{s.n}</b>
                      <span>{pct(s.n, f1)}% от всички</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="adm-sec">
            <h2>Къде точно спират</h2>
            <p className="muted small" style={{ marginBottom: 10 }}>
              Всеки ред е една стъпка от разговора. „Спрели тук“ са хората, за които това е било последното, което са видели. Сборът им е{' '}
              {a.abandoned}, колкото са всички отказали се.
            </p>
            <div className="panel">
              <table className="tbl stack" data-steps>
                <thead>
                  <tr>
                    <th>Стъпка</th>
                    <th>Какво вижда човекът</th>
                    <th className="num">Видели</th>
                    <th className="num">Спрели тук</th>
                    <th style={{ width: 190 }}>Дял от видялите</th>
                  </tr>
                </thead>
                <tbody>
                  {byStopped.map((s) => (
                    <tr key={s.id} className={s.stopped === topStop && topStop > 0 ? 'hot' : undefined}>
                      <td className="main">
                        <span style={{ fontWeight: 700 }}>{s.short}</span>
                        <span className="sub">{s.flow === 'Всички' ? 'Всички разговори' : s.flow}</span>
                      </td>
                      <td className="wide muted">{s.question}</td>
                      <td className="num" data-l="Видели">
                        {s.seen}
                      </td>
                      <td className="num" data-l="Спрели тук" data-stopped={s.stopped}>
                        <b>{s.stopped}</b>
                      </td>
                      <td data-l="Дял от видялите">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 130 }}>
                          <span className={`meter${s.rate >= 20 ? ' hot' : ''}`} style={{ flex: 1 }}>
                            <i style={{ width: `${Math.min(100, s.rate)}%` }} />
                          </span>
                          <span style={{ width: 38, textAlign: 'right' }}>{s.rate}%</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="cols even adm-sec">
            <section>
              <h2 className="cap">Защо си тръгват, по техните думи</h2>
              <div className="panel">
                {a.reasons.length ? (
                  <>
                    <HBars
                      rows={a.reasons.map((r) => ({
                        label: r.label,
                        value: r.n,
                        note: `${pct(r.n, a.reasonsTotal)}%`,
                      }))}
                    />
                    <p className="muted small" style={{ padding: '0 20px 16px' }}>
                      При затваряне чатът пита с един клик какво е спряло човека. Отговорили са {a.reasonsTotal} от {a.abandoned},{' '}
                      останалите {a.noReason} са затворили без отговор.
                    </p>
                  </>
                ) : (
                  <Empty title="Още никой не е казал защо" text="При затваряне чатът пита с един клик какво е спряло човека. Отговорите ще се събират тук." />
                )}
              </div>
            </section>
            <section>
              <h2 className="cap">Телефон или компютър, и откъде идват</h2>
              <div className="panel">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Откъде</th>
                      <th className="num">Отвориха</th>
                      <th className="num">Изпратиха</th>
                      <th className="num">Завършват</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.devices.map((d) => (
                      <tr key={`d${d.k}`}>
                        <td className="main">
                          <span style={{ fontWeight: 700 }}>{DEVICES[d.k] || d.k}</span>
                        </td>
                        <td className="num">{d.opened}</td>
                        <td className="num">{d.sent}</td>
                        <td className="num">{pct(d.sent, d.opened)}%</td>
                      </tr>
                    ))}
                    {a.sources.map((d) => (
                      <tr key={`s${d.k}`}>
                        <td className="main">{sourceLabel(d.k)}</td>
                        <td className="num">{d.opened}</td>
                        <td className="num">{d.sent}</td>
                        <td className="num">{pct(d.sent, d.opened)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="adm-sec">
            <h2>
              Започнали, но не изпратили
              <span className="muted small" style={{ fontFamily: 'var(--sans)', letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>
                {a.sessions.length < a.abandoned ? `последните ${a.sessions.length} от ${a.abandoned}` : many(a.abandoned, 'разговор', 'разговора')}
              </span>
            </h2>
            <div className="panel">
              <table className="tbl stack">
                <thead>
                  <tr>
                    <th>Кога</th>
                    <th>Докъде стигна</th>
                    <th>Спря на</th>
                    <th>Причина</th>
                    <th>Дошъл от</th>
                    <th className="num">Остана</th>
                  </tr>
                </thead>
                <tbody>
                  {a.sessions.map((s: any) => {
                    const path = answerPath(s.answers);
                    return (
                      <tr key={s.id}>
                        <td className="main nowrap">
                          <Link href={`/admin/analiz/${s.id}`}>{dateText(s.started_at, true)}</Link>
                          <span className="sub">{s.property_title || 'Без конкретен имот'}</span>
                        </td>
                        <td className="wide">
                          {path.length ? (
                            <span className="path">
                              {path.map((p, i) => (
                                <span className="tag" key={i}>
                                  {p}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="muted">Не е отговорил на нищо</span>
                          )}
                        </td>
                        <td data-l="Спря на">{stepShort(s.last_step || 'start')}</td>
                        <td data-l="Причина">{s.exit_reason ? exitReasonLabel(s.exit_reason) : <span className="muted">Не каза</span>}</td>
                        <td data-l="Дошъл от">
                          {sourceLabel(s.source)}
                          <span className="sub">{DEVICES[s.device] || 'Компютър'}</span>
                        </td>
                        <td className="num muted" data-l="Остана">
                          {duration(s.sec || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
