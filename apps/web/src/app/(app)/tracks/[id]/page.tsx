import { redirect, notFound } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type TrackDto, type Group, type UserDto } from '@/lib/api';
import { mySolvedSet, solverMap } from '@/lib/student';
import { TrackDetailBoard, type TrackProblem } from '@/components/student/track-detail-board';

/** Student Track detail — own progress + group progress + the track's questions (SPEC §6.9). */
export default async function TrackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect('/login');
  
  const isHead = (ROLE_LEVEL[me.role as Role] ?? 1) >= 2;

  const [tracks, problems, solved, solvers, groups, users] = await Promise.all([
    safe(hubFetch<TrackDto[]>('/tracks')),
    safe(hubFetch<TrackProblem[]>(`/tracks/${id}/problems`)),
    mySolvedSet(),
    solverMap(),
    safe(hubFetch<Group[]>('/groups')),
    isHead ? safe(hubFetch<UserDto[]>('/users')) : Promise.resolve(null),
  ]);

  const track = (tracks ?? []).find((t) => t.id === id);
  if (!track) notFound();

  let teammates = [];
  if (isHead && users) {
    teammates = users.filter((u) => u.role === 'student').map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }));
  } else {
    const myGroup = (groups ?? []).find((g) => g.id === me.groupId);
    teammates = myGroup?.students && myGroup.students.length > 0
      ? myGroup.students
      : [{ id: me.id, name: me.name, avatarUrl: me.avatarUrl }];
  }

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
      isHead={isHead}
    />
  );
}
