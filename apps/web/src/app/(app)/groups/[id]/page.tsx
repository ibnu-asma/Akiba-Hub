import { redirect, notFound } from 'next/navigation';
import { getMe, hubFetch, safe, type GroupProgressData } from '@/lib/api';
import { GroupProgressView } from '@/components/groups/group-progress-view';

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect('/login');

  const progress = await safe(hubFetch<GroupProgressData>(`/groups/${id}/progress`));
  if (!progress) {
    notFound();
  }

  return <GroupProgressView progress={progress} me={me} />;
}

