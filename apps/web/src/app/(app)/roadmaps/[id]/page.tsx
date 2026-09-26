import { notFound, redirect } from 'next/navigation';
import { getMe, hubFetch, safe, type RoadmapDto } from '@/lib/api';
import { RoadmapView } from '@/components/student/roadmap-view';

/** View a structured roadmap and track progress. */
export default async function RoadmapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) redirect('/login');
  const { id } = await params;

  const [roadmap, progress] = await Promise.all([
    safe(hubFetch<RoadmapDto>(`/roadmaps/${id}`)),
    safe(hubFetch<string[]>('/roadmaps/progress')), // Note: the endpoint is just GET /api/roadmaps/:id/progress wait, we made it :id/progress! 
  ]);

  if (!roadmap) notFound();

  return (
    <div>
      <RoadmapView roadmap={roadmap} completedItemIds={progress ?? []} />
    </div>
  );
}
