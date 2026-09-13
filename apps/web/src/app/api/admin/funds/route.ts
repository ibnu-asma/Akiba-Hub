import { proxyAction, proxyGet } from '@/lib/bff';

/** HoE/HoA: list funds with paid/pending roll-ups (manager cards). */
export async function GET() {
  return proxyGet('/funds');
}

/** HoE/HoA: create a named budget (SPEC §7.8). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Fund details are required.' } }, { status: 400 });
  }
  return proxyAction('/funds', body);
}