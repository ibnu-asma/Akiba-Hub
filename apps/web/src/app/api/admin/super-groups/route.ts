import { proxyAction } from '@/lib/bff';

/** HoA: create a super group (SPEC §8.3). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Super group name is required.' } }, { status: 400 });
  }
  return proxyAction('/super-groups', body);
}
