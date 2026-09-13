import { proxyGet } from '@/lib/bff';

/** HoA: list active users with search, role filter, and pagination (SPEC §8.7). */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams.toString();
  return proxyGet(`/users${params ? `?${params}` : ''}`);
}

