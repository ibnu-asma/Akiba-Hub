import { proxyAction, proxyGet } from '@/lib/bff';

/** HoE/HoA: list problems with search/filter/pagination (SPEC §7.5). */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams.toString();
  return proxyGet(`/problems${params ? `?${params}` : ''}`);
}

/** HoE/HoA: add a DSA problem to the library (SPEC §7.5). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Problem details are required.' } }, { status: 400 });
  }
  return proxyAction('/problems', body);
}
