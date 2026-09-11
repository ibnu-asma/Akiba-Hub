/**
 * Role model — central authority for privileges and nav-section visibility.
 *
 * Nav-section rule (spec §4): the sidebar is split into role sections.
 *   Student sees 1 section, HoE sees 2, HoA sees 3.
 */

export const ROLES = {
  student: 'student',
  headOfEducation: 'head_of_education',
  headOfAcademy: 'head_of_academy',
} as const;

/** Draft roles observed on the HoA invite dropdown (display-only for now). */
export const DRAFT_ROLES = {
  community: 'community',
  executive: 'executive',
  head: 'head',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type DraftRole = (typeof DRAFT_ROLES)[keyof typeof DRAFT_ROLES];
export type AnyRole = Role | DraftRole;

export const ROLE_NAMES: Record<Role, string> = {
  [ROLES.student]: 'Student',
  [ROLES.headOfEducation]: 'Head of Education',
  [ROLES.headOfAcademy]: 'Head of Academy',
};

export const ROLE_BADGES: Record<Role, string> = {
  [ROLES.student]: 'Student',
  [ROLES.headOfEducation]: 'Head',
  [ROLES.headOfAcademy]: 'Academy',
};

/** Privilege level (higher = more sections visible in the sidebar). */
export const ROLE_LEVEL: Record<Role, number> = {
  [ROLES.student]: 1,
  [ROLES.headOfEducation]: 2,
  [ROLES.headOfAcademy]: 3,
};

/** Sidebar sections visible per role (1 / 2 / 3). */
export interface SidebarSections {
  student: string[];
  headOfEducation: string[];
  headOfAcademy: string[];
}

/** Keys are the section keys; values are nav item names. */
export const SIDEBAR_SECTIONS: SidebarSections = {
  student: ['Dashboard', 'Tracks', 'Exercises', 'Problems', 'Contests', 'Roadmap', 'Groups & Users', 'Forum'],
  headOfEducation: [
    'Dashboard',
    'Take attendance',
    'Add problem',
    'Add track',
    'Add contest',
    'Add exercise',
    'Add session',
    'Daily problem',
    'Stipend & Funds',
    'Summary',
    'Forum',
  ],
  headOfAcademy: [
    'Dashboard',
    'Generate Invite',
    'Add Group',
    'Roles',
    'Super Groups',
    'Recent Actions',
    'Reports',
    'Summary',
    'Forum',
  ],
};

/** Convenience: sections a given role can access (their own + all lower ones). */
export function visibleSections(role: Role): string[] {
  const out: string[] = [];
  if (role === ROLES.headOfAcademy) out.push(...SIDEBAR_SECTIONS.headOfAcademy);
  if (role === ROLES.headOfEducation || role === ROLES.headOfAcademy) {
    out.push(...SIDEBAR_SECTIONS.headOfEducation);
  }
  if (role === ROLES.student || role === ROLES.headOfEducation || role === ROLES.headOfAcademy) {
    out.push(...SIDEBAR_SECTIONS.student);
  }
  return out;
}

export function isHoEOrHigher(role: string): boolean {
  return role === ROLES.headOfEducation || role === ROLES.headOfAcademy;
}

export function isHoA(role: string): boolean {
  return role === ROLES.headOfAcademy;
}