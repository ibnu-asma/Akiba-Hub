import { proxyAction } from '@/lib/bff';

/** HoA: promote/demote/transfer a user (role + group) — SPEC §8.7. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Role and group are required.' } }, { status: 400 });
  }
  return proxyAction(`/users/${id}/role`, body, 'PATCH');
}
