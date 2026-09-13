import { proxyAction } from '@/lib/bff';

/** HoA: cancel an unused invite (SPEC §8.5 lifecycle). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAction(`/invitations/${id}/revoke`, {}, 'POST');
}
