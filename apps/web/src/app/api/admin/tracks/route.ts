import { proxyAction } from '@/lib/bff';

/** HoE/HoA: create a track for a program phase (SPEC §6.2 / §7.5). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Track details are required.' } }, { status: 400 });
  }
  return proxyAction('/tracks', body);
}