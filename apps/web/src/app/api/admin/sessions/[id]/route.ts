import { proxyAction } from '@/lib/bff';

/** HoE/HoA: edit a session (SPEC §7.3). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Session details are required.' } }, { status: 400 });
  }
  return proxyAction(`/sessions/${id}`, body, 'PATCH');
}

/** HoE/HoA: delete a session (SPEC §7.3). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAction(`/sessions/${id}`, {}, 'DELETE');
}
