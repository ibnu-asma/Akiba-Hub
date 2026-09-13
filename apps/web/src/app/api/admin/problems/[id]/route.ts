import { proxyAction } from '@/lib/bff';

/** HoE/HoA: edit a problem (SPEC §7.5). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Problem details are required.' } }, { status: 400 });
  }
  return proxyAction(`/problems/${id}`, body, 'PATCH');
}

/** HoE/HoA: delete a problem (soft, SPEC §7.5). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAction(`/problems/${id}`, {}, 'DELETE');
}
