import { proxyAction } from '@/lib/bff';

/** HoA: edit a group's details (SPEC §8.6). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Group details are required.' } }, { status: 400 });
  }
  return proxyAction(`/groups/${id}`, body, 'PATCH');
}

/** HoA: soft-delete a group (SPEC §8.6). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAction(`/groups/${id}`, {}, 'DELETE');
}

