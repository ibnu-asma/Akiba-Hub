import { proxyGet } from '@/lib/bff';

/** Cross-track exercises feed — "Add exercise" management list (SPEC §7.8). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = new URLSearchParams();
  for (const key of ['q', 'trackId', 'superGroupId', 'limit', 'offset']) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return proxyGet(`/tracks/exercises${qs ? `?${qs}` : ''}`);
}