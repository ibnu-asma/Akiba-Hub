import { proxyAction } from '@/lib/bff';

/** HoE/HoA: assign the 24-hour daily problem for a super group (SPEC §7.7). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Pick a problem and a date.' } }, { status: 400 });
  }
  return proxyAction('/daily-problems', body);
}