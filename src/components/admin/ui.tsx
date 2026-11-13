import Link from 'next/link';
import { LEAD_STATUS, STATUS_LABELS } from '@/lib/format';

// Малки общи парчета за страниците на панела (сървърни компоненти).

export function PageHead({
  kicker,
  title,
  sub,
  children,
}: {
  kicker?: React.ReactNode;
  title: string;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="adm-head">
      <div>
        {kicker ? <div className="adm-kicker">{kicker}</div> : null}
        <h1>{title}</h1>
        {sub ? <p className="adm-sub">{sub}</p> : null}
      </div>
      {children ? <div className="adm-actions">{children}</div> : null}
    </header>
  );
}

export function LeadStatus({ status }: { status: string }) {
  return <span className={`st st-${status}`}>{LEAD_STATUS[status] || status}</span>;
}

export function PropStatus({ status }: { status: string }) {
  return <span className={`st st-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

export function Empty({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty">
      <b>{title}</b>
      {text ? <p>{text}</p> : null}
      {href && action ? (
        <Link href={href} className="btn small">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function Avatar({ photo, name, big }: { photo?: string | null; name: string; big?: boolean }) {
  const cls = `avatar${big ? ' big' : ''}`;
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={photo} alt="" loading="lazy" />;
  }
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  return <span className={`${cls} none`}>{initials}</span>;
}

/** Хоризонтални ленти с една мярка: име, лента, стойност на върха. */
export function HBars({
  rows,
  unit,
}: {
  rows: { label: string; value: number; note?: string }[];
  unit?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="hbars" role="list">
      {rows.map((r) => (
        <div className="hbar" role="listitem" key={r.label} title={`${r.label}: ${r.value}${unit ? ' ' + unit : ''}`}>
          <span className="n">{r.label}</span>
          <span className="track">
            <i style={{ width: `calc((100% - 96px) * ${(r.value / max).toFixed(4)})` }} />
            <b>{r.value}</b>
            {r.note ? <span>{r.note}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Delta({ now, prev, suffix = 'спрямо предишните 30 дни' }: { now: number; prev: number; suffix?: string }) {
  if (!prev) return <div className="d">няма данни за предишния период</div>;
  const diff = Math.round(((now - prev) / prev) * 100);
  if (diff === 0) return <div className="d">без промяна {suffix}</div>;
  return (
    <div className="d">
      <b className={diff > 0 ? 'up' : 'down'}>
        {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}%
      </b>{' '}
      {suffix}
    </div>
  );
}
