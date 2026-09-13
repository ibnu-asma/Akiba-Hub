import { proxyAction } from '@/lib/bff';

/** HoA: replace the member groups of a super group (SPEC §11). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Group list is required.' } }, { status: 400 });
  }
  return proxyAction(`/super-groups/${id}/groups`, body);
}
