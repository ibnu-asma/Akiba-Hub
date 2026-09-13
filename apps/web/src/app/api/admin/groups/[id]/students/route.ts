import { proxyAction } from '@/lib/bff';

/** HoA: assign students into a group (SPEC §11 — invite follow-up). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Student list is required.' } }, { status: 400 });
  }
  return proxyAction(`/groups/${id}/students`, body);
}
