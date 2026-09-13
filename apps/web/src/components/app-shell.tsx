import { ROLE_NAMES, ROLE_LEVEL, type Role } from '@hub/shared';
import { ShellFrame } from './shell-frame';
import { sectionsFor } from '@/lib/nav';
import { hubFetch, safe, type Me, type TrackDto, type ContestDto } from '@/lib/api';

/** Server shell — resolves the principal, injects tracks and contests into the nav, renders the client frame. */
export async function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  const roleLabel = ROLE_NAMES[me.role as keyof typeof ROLE_NAMES] ?? me.role;
  const isStudent = (ROLE_LEVEL[me.role as Role] ?? 1) === 1;

  // 1) The student's program tracks become children of the "Tracks" sidebar item.
  let trackChildren: { label: string; href: string }[] = [];
  if (me.superGroupId) {
    const tracks = (await safe(hubFetch<TrackDto[]>('/tracks'))) ?? [];
    trackChildren = tracks
      .filter((t) => t.superGroupId === me.superGroupId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({ label: t.name, href: `/tracks/${t.id}` }));
  }

  // 2) Contests become children of the "Contests" sidebar item (newest on top).
  // Students only see contests attached to their group or supergroup; heads see all.
  const contestsData = (await safe(hubFetch<ContestDto[] | { rows: ContestDto[] }>('/contests?limit=100'))) ?? [];
  const contestList: ContestDto[] = Array.isArray(contestsData) ? contestsData : (contestsData.rows ?? []);

  const filteredContests = contestList.filter((c) => {
    if (!isStudent) return true; // Heads see all contests
    // Student must match group or supergroup
    const matchesGroup = Boolean(me.groupId && c.groupIds?.includes(me.groupId));
    const matchesSuperGroup = Boolean(me.superGroupId && c.superGroupIds?.includes(me.superGroupId));
    return matchesGroup || matchesSuperGroup;
  });

  const contestChildren = filteredContests
    .sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt).getTime();
      const timeB = new Date(b.date || b.createdAt).getTime();
      return timeB - timeA;
    })
    .map((c) => ({
      label: c.number ? `${c.name} #${c.number}` : c.name,
      href: `/contests/${c.id}`,
    }));

  const hasTrackChildren = trackChildren.length > 0;
  const hasContestChildren = contestChildren.length > 0;

  const sections = sectionsFor(me.role).map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.href === '/tracks' && hasTrackChildren) {
        return { ...item, children: trackChildren };
      }
      if (item.href === '/contests' && hasContestChildren) {
        return { ...item, children: contestChildren };
      }
      return item;
    }),
  }));

  return (
    <ShellFrame roleLabel={roleLabel} sections={sections} name={me.name}>
      {children}
    </ShellFrame>
  );
}
