import { proxyAction } from '@/lib/bff';

/** HoA: create a group (SPEC §8.5). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Group details are required.' } }, { status: 400 });
  }
  return proxyAction('/groups', body);
}
