import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ExerciseDto, type TrackDto } from '@/lib/api';
import { mySolvedSet } from '@/lib/student';
import { TracksBoard } from '@/components/student/tracks-board';

/** Student Tracks — curriculum phases with per-track completion (SPEC §6.9). */
export default async function StudentTracksPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) >= 2) redirect('/tracks/new');

  const [tracks, exercises, solved] = await Promise.all([
    safe(hubFetch<TrackDto[]>('/tracks')),
    safe(hubFetch<ExerciseDto[]>('/tracks/exercises')),
    mySolvedSet(),
  ]);

  return (
    <TracksBoard
      tracks={tracks ?? []}
      exercises={exercises ?? []}
      solved={solved}
      mySuperGroupId={me.superGroupId}
    />
  );
}