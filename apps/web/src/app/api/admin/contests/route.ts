import { proxyAction, proxyGet } from '@/lib/bff';

/** HoE/HoA: list contests (with search/filter/pagination via query string). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = new URLSearchParams();
  for (const key of ['q', 'type', 'limit', 'offset']) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return proxyGet(`/contests${qs ? `?${qs}` : ''}`);
}

/** HoE/HoA: schedule a contest and assign groups (SPEC §7.7). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Contest details are required.' } }, { status: 400 });
  }
  return proxyAction('/contests', body);
}
