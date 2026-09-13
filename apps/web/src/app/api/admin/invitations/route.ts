import { proxyGet } from '@/lib/bff';

/** HoA: list invitations with status filter, search, and pagination (SPEC §8.5). */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams.toString();
  return proxyGet(`/invitations${params ? `?${params}` : ''}`);
}
