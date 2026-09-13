import { proxyAction, proxyGet } from '@/lib/bff';

/** HoA: list super groups with member groups (SPEC §8.4). */
export async function GET() {
  return proxyGet('/super-groups');
}

/** HoA: create a super group with optional member groups (SPEC §8.4). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Super group name is required.' } }, { status: 400 });
  }
  return proxyAction('/super-groups', body);
}

