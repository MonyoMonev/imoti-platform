import { INTENTS, exitReasonLabel, stepShort } from '@/lib/chat-tree';
import { timeText } from '@/lib/format';
import { EVENT_LABELS } from './helpers';

function timeOnly(d: any) {
  return timeText(d);
}

/** Събитията от един разговор в чата, по ред. */
export default function ChatTimeline({ events }: { events: any[] }) {
  if (!events.length) return <p className="muted">Няма записани стъпки за този разговор.</p>;
  return (
    <ol className="tl">
      {events.map((e: any, i: number) => {
        let text: React.ReactNode = EVENT_LABELS[e.type] || e.type;
        if (e.type === 'answer') {
          const val = e.step === 'start' ? INTENTS[e.value] || e.value : e.value;
          text = (
            <>
              <span className="q">{stepShort(e.step)}:</span> <b>{val}</b>
            </>
          );
        } else if (e.type === 'skip') {
          text = (
            <>
              <span className="q">{stepShort(e.step)}:</span> пропусна
            </>
          );
        } else if (e.type === 'exit') {
          text = e.value ? `Затвори чата. Причина: ${exitReasonLabel(e.value)}` : 'Затвори чата';
        }
        const cls = e.type === 'submit' ? 'good' : e.type === 'open' ? 'strong' : e.type === 'exit' || e.type === 'close' ? 'bad' : undefined;
        return (
          <li key={i} className={cls}>
            <span className="t">{timeOnly(e.created_at)}</span>
            {text}
          </li>
        );
      })}
    </ol>
  );
}
