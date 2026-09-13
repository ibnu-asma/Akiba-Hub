import { proxyAction } from '@/lib/bff';

/** HoE/HoA: remove one problem from a contest (SPEC §7.7). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; problemId: string }> }) {
  const { id, problemId } = await params;
  return proxyAction(`/contests/${id}/problems/${problemId}`, {}, 'DELETE');
}
