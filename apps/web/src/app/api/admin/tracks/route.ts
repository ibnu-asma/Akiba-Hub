import { proxyAction, proxyGet } from '@/lib/bff';

/** HoE/HoA: list tracks (SPEC §7.6). */
export async function GET() {
  return proxyGet('/tracks');
}

/** HoE/HoA: create a track for a program phase (SPEC §7.6). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Track details are required.' } }, { status: 400 });
  }
  return proxyAction('/tracks', body);
}
