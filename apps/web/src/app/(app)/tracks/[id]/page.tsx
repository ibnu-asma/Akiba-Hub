import { redirect, notFound } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type TrackDto, type Group } from '@/lib/api';
import { mySolvedSet, solverMap } from '@/lib/student';
import { TrackDetailBoard, type TrackProblem } from '@/components/student/track-detail-board';

/** Student Track detail — own progress + group progress + the track's questions (SPEC §6.9). */
export default async function TrackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) >= 2) redirect('/tracks/new');

  const [tracks, problems, solved, solvers, groups] = await Promise.all([
    safe(hubFetch<TrackDto[]>('/tracks')),
    safe(hubFetch<TrackProblem[]>(`/tracks/${id}/problems`)),
    mySolvedSet(),
    solverMap(),
    safe(hubFetch<Group[]>('/groups')),
  ]);

  const track = (tracks ?? []).find((t) => t.id === id);
  if (!track) notFound();

  const myGroup = (groups ?? []).find((g) => g.id === me.groupId);
  const teammates = myGroup?.students && myGroup.students.length > 0
    ? myGroup.students
    : [{ id: me.id, name: me.name, avatarUrl: me.avatarUrl }];

  return (
    <TrackDetailBoard
      track={track}
      problems={problems ?? []}
      solved={solved}
      solvers={solvers}
      teammates={teammates}
      myId={me.id}
      myName={me.name}
      myAvatarUrl={me.avatarUrl}
    />
  );
}