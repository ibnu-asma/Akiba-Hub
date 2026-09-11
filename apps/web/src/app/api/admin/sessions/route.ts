import { proxyAction } from '@/lib/bff';

/** HoE/HoA: create a session (SPEC §7.3). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Session details are required.' } }, { status: 400 });
  }
  return proxyAction('/sessions', body);
}