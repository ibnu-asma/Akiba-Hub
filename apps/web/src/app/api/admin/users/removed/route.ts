import { proxyGet } from '@/lib/bff';

/** HoA: list removed (soft-deleted) users with search + pagination (SPEC §8.7). */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams.toString();
  return proxyGet(`/users/removed${params ? `?${params}` : ''}`);
}

