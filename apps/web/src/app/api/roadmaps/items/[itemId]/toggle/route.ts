import { proxyAction } from '@/lib/bff';

export async function POST(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return proxyAction(`/roadmaps/items/${itemId}/toggle`, {});
}
