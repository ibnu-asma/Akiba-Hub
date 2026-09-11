import { proxyAction } from '@/lib/bff';

/** HoE/HoA: add a DSA problem to the library (SPEC §7.5). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Problem details are required.' } }, { status: 400 });
  }
  return proxyAction('/problems', body);
}