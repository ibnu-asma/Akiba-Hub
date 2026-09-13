import { proxyAction } from '@/lib/bff';

/** HoE/HoA: rank groups across a mode (SPEC §7.11, §8.10). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Comparison request is required.' } }, { status: 400 });
  }
  return proxyAction('/comparison', body);
}
