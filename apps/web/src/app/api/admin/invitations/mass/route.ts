import { proxyAction } from '@/lib/bff';

/** HoA: bulk-generate invite links (SPEC §8.5). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Emails and role are required.' } }, { status: 400 });
  }
  return proxyAction('/invitations/mass', body);
}
