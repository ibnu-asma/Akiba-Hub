export interface Quote {
  text: string;
  author: string;
}

export const FALLBACK_QUOTES: Quote[] = [
  { text: 'However difficult life may seem, there is always something you can do and succeed at.', author: 'Stephen Hawking' },
  { text: 'Success is an iceberg — what people see above the surface is only a fraction of your effort.', author: 'Anonymous' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Believe you can and you are halfway there.', author: 'Theodore Roosevelt' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'Continuous learning is the minimum requirement for success in any field.', author: 'Brian Tracy' },
];

/** Fetch an energetic quote from 3rd-party APIs on server side (no CORS blocks), with 1h cache and robust fallbacks. */
export async function fetchDailyQuote(): Promise<Quote> {
  try {
    const res = await fetch('https://zenquotes.io/api/random', {
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as { q: string; a: string }[];
      if (data?.[0]?.q) {
        return { text: data[0].q.trim(), author: data[0].a?.trim() || 'Unknown' };
      }
    }
  } catch {
    // Try secondary provider
  }

  try {
    const res = await fetch('https://dummyjson.com/quotes/random', {
      signal: AbortSignal.timeout(3500),
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as { quote: string; author: string };
      if (data?.quote) {
        return { text: data.quote.trim(), author: data.author?.trim() || 'Unknown' };
      }
    }
  } catch {
    // Fall back to curated list
  }

  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]!;
}

