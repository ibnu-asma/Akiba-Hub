import { proxyAction, proxyGet } from '@/lib/bff';

/** HoA: list groups with heads + students (SPEC §8.6). */
export async function GET() {
  return proxyGet('/groups');
}

/** HoA: create a group (SPEC §8.6). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Group details are required.' } }, { status: 400 });
  }
  return proxyAction('/groups', body);
}


