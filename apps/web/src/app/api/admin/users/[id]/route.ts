import { proxyAction } from '@/lib/bff';

/** HoA: soft-delete a user (SPEC §8.7) — moves them to the removed-users list. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAction(`/users/${id}`, {}, 'DELETE');
}
