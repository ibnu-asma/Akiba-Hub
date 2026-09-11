/** Presentation helpers — date formats match the SPEC examples ("02 Oct 2024 9:17 AM"). */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const steps: [number, string][] = [
    [60, 's'],
    [3600, 'm'],
    [86400, 'h'],
    [604800, 'd'],
  ];
  if (seconds < steps[0]![0]) return `${Math.floor(seconds)}s`;
  if (seconds < steps[1]![0]) return `${Math.floor(seconds / 60)}m`;
  if (seconds < steps[2]![0]) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < steps[3]![0]) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
}

export function minutesToDays(minutes: number): string {
  return `That's ${(minutes / 1440).toFixed(0)} days`;
}

/** Quote-of-the-day — deterministic per calendar day (SPEC §6.1/§7.2/§8.1). */
const QUOTES = [
  { text: 'Only the educated are free.', author: 'Epictetus' },
  { text: 'Persistence is very important. You should not give up unless you are forced to give up.', author: 'Elon Musk' },
  { text: 'On the other side of the clouds is a bright blue sky.', author: 'Unknown' },
];

export function quoteOfTheDay(): { text: string; author: string } {
  const dayOfYear = Math.floor(Date.now() / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length]!;
}
