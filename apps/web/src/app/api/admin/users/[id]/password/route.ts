import { proxyAction } from '@/lib/bff';
import { NextRequest } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  return proxyAction(`/users/${id}/password`, body, 'PATCH');
}
