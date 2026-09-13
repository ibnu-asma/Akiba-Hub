import { NextResponse } from 'next/server';
import { fetchDailyQuote } from '@/lib/quote';

export const dynamic = 'force-dynamic';

export async function GET() {
  const quote = await fetchDailyQuote();
  return NextResponse.json(quote);
}

