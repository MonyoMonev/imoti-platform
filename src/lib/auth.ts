import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { q, q1 } from './db';
import { randomToken } from './password';

export type Role = 'boss' | 'broker' | 'client';

export type User = {
  id: number;
  role: Role;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  active: boolean;
};

const COOKIE = 'sid';
const DAYS = 30;

export async function createSession(userId: number) {
  const token = randomToken();
  await q(`insert into sessions (token, user_id, expires_at) values ($1, $2, now() + interval '${DAYS} days')`, [
    token,
    userId,
  ]);
  await q(`update users set last_login_at = now() where id = $1`, [userId]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * DAYS,
    secure: process.env.NODE_ENV === 'production' && !process.env.INSECURE_COOKIES,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await q(`delete from sessions where token = $1`, [token]);
  jar.delete(COOKIE);
}

/** Влезлият потребител или null. Кешира се в рамките на една заявка. */
export const currentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const u = await q1<User>(
    `select u.id, u.role, u.first_name, u.last_name, u.phone, u.email, u.active
       from sessions s join users u on u.id = s.user_id
      where s.token = $1 and s.expires_at > now() and u.active`,
    [token]
  );
  return u;
});

export function isStaff(u: User | null): u is User {
  return !!u && (u.role === 'boss' || u.role === 'broker');
}

/** За страници от админ панела: брокер или шеф, иначе към входа. */
export async function requireStaff(): Promise<User> {
  const u = await currentUser();
  if (!isStaff(u)) redirect('/admin/vhod');
  return u;
}

/** За страници само за шефа. Брокерът се връща към таблото. */
export async function requireBoss(): Promise<User> {
  const u = await requireStaff();
  if (u.role !== 'boss') redirect('/admin');
  return u;
}

/** За API: връща потребителя или null, без пренасочване. */
export async function apiStaff(): Promise<User | null> {
  const u = await currentUser();
  return isStaff(u) ? u : null;
}

/** Идентификаторът на посетителя (бисквитка vid), ако има такъв. */
export async function visitorId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get('vid')?.value || null;
}
