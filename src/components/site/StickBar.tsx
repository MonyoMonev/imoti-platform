'use client';

import { useEffect } from 'react';
import { ChatButton, type ChatCtx } from '@/components/chat/Chat';

/** Лента в долния край на телефона: винаги на един пръст от чата и от обаждането. */
export default function StickBar({ ctx, label, phone, photo }: { ctx: ChatCtx; label: string; phone: string; photo?: string | null }) {
  useEffect(() => {
    document.documentElement.classList.add('has-stick');
    return () => document.documentElement.classList.remove('has-stick');
  }, []);
  return (
    <div className="stick">
      <ChatButton className="btn btn--lime" ctx={ctx}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cavatar" src={photo} alt="" width={34} height={34} style={{ width: 34, height: 34 }} />
        )}
        {label}
      </ChatButton>
      <a className="btn btn--ghost stick__call" href={`tel:${phone}`} aria-label="Обади се">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4 3h3l1.500 4-2 1.500a10 10 0 0 0 5 5l1.500-2 4 1.500v3a1.500 1.500 0 0 1-1.500 1.500A13.500 13.500 0 0 1 2.500 4.500 1.500 1.500 0 0 1 4 3z" fill="none" stroke="currentColor" strokeWidth="1.500" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  );
}
