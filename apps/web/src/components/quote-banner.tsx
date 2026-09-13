'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** Energetic fallback quotes — shown instantly then or when the API is unavailable/rate-limited. */
const FALLBACK_QUOTES = [
  { text: 'Success is an iceberg — what people see above the surface is only a fraction of your effort.', author: 'Unknown' },
  { text: 'Believe you can and you are halfway there.', author: 'Theodore Roosevelt' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Push yourself, because no one else is going to do it for you.', author: 'Unknown' },
  { text: 'Great things never come from comfort zones.', author: 'Unknown' },
  { text: 'Your only limit is your own imagination.', author: 'Unknown' },
];

function randomFallback() {
  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]!;
}

interface Quote {
  text: string;
  author: string;
}

/** Fetch an energetic quote from a free API, falling back locally on any failure. */
async function fetchQuote(): Promise<Quote> {
  try {
    const res = await fetch('https://zenquotes.io/api/random', {
      signal: AbortSignal.timeout(4500),
      // no-store so a fresh quote arrives on each refresh
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { q: string; a: string }[];
    const first = data?.[0];
    if (!first?.q) throw new Error('empty');
    return { text: first.q, author: first.a?.trim() || 'Unknown' };
  } catch {
    return randomFallback();
  }
}

/** Quote banner — energetic daily quote + role watermark + Problems CTA (SPEC §6.2). */
export function QuoteBanner({ firstName, watermark }: { firstName: string; watermark?: string }) {
  const [quote, setQuote] = useState<Quote>(randomFallback);

  useEffect(() => {
    let active = true;
    fetchQuote().then((q) => {
      if (active) setQuote(q);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="relative overflow-hidden rounded-[1.25rem] border border-a2sv-200 bg-gradient-to-br from-banner-from to-banner-to p-6 md:p-8">
      {watermark && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden select-none items-center justify-center text-center text-[2.6rem] font-bold uppercase leading-none tracking-tight text-a2sv-500/15 md:flex lg:text-[3.4rem]"
        >
          {watermark}
        </span>
      )}
      <div className="relative max-w-2xl">
        <p className="text-lg font-semibold leading-snug text-slate-800">“{quote.text}”</p>
        <p className="mt-1 text-sm text-slate-600">— {quote.author}</p>
        <p className="mt-5 text-sm font-medium text-slate-700">Welcome back, {firstName}!</p>
        <Link href="/problems" className="btn-primary mt-3 px-6">
          Problems
        </Link>
      </div>
    </section>
  );
}
