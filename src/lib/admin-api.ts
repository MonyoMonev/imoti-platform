import 'server-only';
import { NextResponse } from 'next/server';
import { apiStaff, type User } from './auth';

export function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function ok(data: Record<string, any> = {}) {
  return NextResponse.json({ ok: true, ...data });
}

/** Влязъл служител или готов отговор с грешка. */
export async function staffOrError(): Promise<{ user: User; error?: undefined } | { user?: undefined; error: NextResponse }> {
  const user = await apiStaff();
  if (!user) return { error: bad('Влез в панела, за да продължиш.', 401) };
  return { user };
}

/** Само управителят или готов отговор с грешка. */
export async function bossOrError(): Promise<{ user: User; error?: undefined } | { user?: undefined; error: NextResponse }> {
  const r = await staffOrError();
  if (r.error) return r;
  if (r.user.role !== 'boss') return { error: bad('Това може само управителят.', 403) };
  return r;
}

export function text(v: any, max = 200): string {
  return String(v ?? '').trim().slice(0, max);
}

export function intOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || Math.abs(n) > 2147483647) return null;
  return Math.round(n);
}

/** Списък от редове или от масив: маха празните и повторенията. */
export function list(v: any, maxItems = 20, maxLen = 60): string[] {
  const arr = Array.isArray(v) ? v : String(v ?? '').split(/\n|,/);
  const out: string[] = [];
  for (const x of arr) {
    const t = String(x ?? '').trim().slice(0, maxLen);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}
