import { proxyAction } from '@/lib/bff';

/** HoE/HoA: remove one exercise from a track (SPEC §7.6). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; problemId: string }> }) {
  const { id, problemId } = await params;
  return proxyAction(`/tracks/${id}/problems/${problemId}`, {}, 'DELETE');
}
