import { proxyAction } from '@/lib/bff';

/** HoE/HoA: schedule an A2SV contest and assign groups (SPEC §7.6). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Contest details are required.' } }, { status: 400 });
  }
  return proxyAction('/contests', body);
}