'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FALLBACK_QUOTES, type Quote } from '@/lib/quote';

function randomFallback(): Quote {
  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]!;
}

/** Quote banner — energetic daily quote from 3rd party + role watermark + Problems CTA (SPEC §6.2). */
export function QuoteBanner({
  firstName,
  watermark,
  initialQuote,
}: {
  firstName: string;
  watermark?: string;
  initialQuote?: Quote | null;
}) {
  const [quote, setQuote] = useState<Quote>(() => initialQuote ?? randomFallback());
  const [loading, setLoading] = useState(false);

  async function loadQuote() {
    setLoading(true);
    try {
      const res = await fetch('/api/quote', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as Quote;
        if (data?.text) setQuote(data);
      }
    } catch {
      // Keep current quote
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialQuote) {
      loadQuote();
    }
  }, [initialQuote]);

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold leading-snug text-slate-800">“{quote.text}”</p>
            <p className="mt-1 text-sm text-slate-600">— {quote.author}</p>
          </div>
          <button
            type="button"
            onClick={loadQuote}
            disabled={loading}
            title="Get another quote"
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>

        <p className="mt-5 text-sm font-medium text-slate-700">Welcome back, {firstName}!</p>
        <Link href="/problems" className="btn-primary mt-3 px-6 inline-flex">
          Problems
        </Link>
      </div>
    </section>
  );
}
