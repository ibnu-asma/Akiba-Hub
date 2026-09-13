import { proxyAction } from '@/lib/bff';

/** HoA: remove a student from a group (SPEC §11). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  return proxyAction(`/groups/${id}/students/${userId}`, {}, 'DELETE');
}
