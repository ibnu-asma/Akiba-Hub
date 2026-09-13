import { proxyAction } from '@/lib/bff';

/** HoA: rename a super group (SPEC §8.4). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Super group name is required.' } }, { status: 400 });
  }
  return proxyAction(`/super-groups/${id}`, body, 'PATCH');
}

/** HoA: delete a super group (SPEC §8.4). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAction(`/super-groups/${id}`, {}, 'DELETE');
}
