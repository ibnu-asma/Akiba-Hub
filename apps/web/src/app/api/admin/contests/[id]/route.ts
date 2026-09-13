import { proxyAction } from '@/lib/bff';

/** HoE/HoA: edit a contest (SPEC §7.7). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Contest details are required.' } }, { status: 400 });
  }
  return proxyAction(`/contests/${id}`, body, 'PATCH');
}

/** HoE/HoA: soft-delete a contest (SPEC §7.7). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAction(`/contests/${id}`, {}, 'DELETE');
}
