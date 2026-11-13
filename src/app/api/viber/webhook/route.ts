import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Viber иска адрес, на който да провери, че сайтът съществува, преди да позволи публикуване.
// Нищо не се обработва тук: публикуването в канал не връща събития.
export async function POST() {
  return NextResponse.json({ status: 0 });
}

export async function GET() {
  return NextResponse.json({ status: 0 });
}
