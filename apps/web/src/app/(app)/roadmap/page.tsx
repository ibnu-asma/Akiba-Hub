import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ExerciseDto, type SessionDto, type TrackDto } from '@/lib/api';
import { mySolvedSet } from '@/lib/student';
import { RoadmapBoard } from '@/components/student/roadmap-board';

/** Student Roadmap — the program timeline across the five phases (SPEC §6.9, derived). */
export default async function StudentRoadmapPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) >= 2) redirect('/dashboard');

  const [tracks, exercises, sessions, solved] = await Promise.all([
    safe(hubFetch<TrackDto[]>('/tracks')),
    safe(hubFetch<ExerciseDto[]>('/tracks/exercises')),
    safe(hubFetch<SessionDto[]>('/sessions')),
    mySolvedSet(),
  ]);

  return (
    <RoadmapBoard
      tracks={(tracks ?? []).filter((t) => me.superGroupId == null || t.superGroupId === me.superGroupId)}
      exercises={exercises ?? []}
      sessions={sessions ?? []}
      solved={solved}
      mySuperGroupId={me.superGroupId}
    />
  );
}