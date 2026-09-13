import { ROLE_LEVEL, type Role } from '@hub/shared';

export type IconName =
  | 'chart'
  | 'map'
  | 'code'
  | 'list'
  | 'trophy'
  | 'chat'
  | 'calendar'
  | 'plus'
  | 'wallet'
  | 'shield'
  | 'users'
  | 'clipboard'
  | 'file';

export type AllIconName =
  | IconName
  | 'search'
  | 'bell'
  | 'sparkles'
  | 'logout'
  | 'sliders'
  | 'check'
  | 'checkCircle'
  | 'menu'
  | 'chevronDown'
  | 'chevronRight'
  | 'x'
  | 'trend'
  | 'user'
  | 'dots'
  | 'mail'
  | 'clock'
  | 'upload'
  | 'externalLink'
  | 'bookmark';

export interface NavItem {
  label: string;
  href: string;
  icon: AllIconName;
  children?: { label: string; href: string }[];
}

export interface NavSection {
  id: string;
  title: string;
  level: number;
  items: NavItem[];
}

/**
 * Sidebar sections (SPEC §4). Visibility = role level ≥ section level:
 * Student sees 1 section, HoE 2, HoA 3.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'student',
    title: 'Student',
    level: 1,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'chart' },
      { label: 'Tracks', href: '/tracks', icon: 'map' },
      { label: 'Exercises', href: '/exercises', icon: 'code' },
      { label: 'Problems', href: '/problems', icon: 'list' },
      { label: 'Contests', href: '/contests', icon: 'trophy' },
      { label: 'Roadmap', href: '/roadmap', icon: 'map' },
      { label: 'Groups & Users', href: '/groups', icon: 'users' },
      { label: 'Forum', href: '/forum', icon: 'chat' },
    ],
  },
  {
    id: 'head-of-education',
    title: 'Head of Education',
    level: 2,
    items: [
      { label: 'Take attendance', href: '/attendance', icon: 'calendar' },
      { label: 'Add problem', href: '/problems/new', icon: 'plus' },
      { label: 'Add track', href: '/tracks/new', icon: 'plus' },
      { label: 'Add contest', href: '/contests/new', icon: 'plus' },
      { label: 'Add exercise', href: '/exercises/new', icon: 'plus' },
      { label: 'Add session', href: '/sessions/new', icon: 'plus' },
      { label: 'Daily problem', href: '/daily-problem', icon: 'list' },
      { label: 'Stipend & Funds', href: '/stipends', icon: 'wallet' },
      { label: 'Summary', href: '/summary', icon: 'chart' },
    ],
  },
  {
    id: 'head-of-academy',
    title: 'Head of Academy',
    level: 3,
    items: [
      { label: 'Generate Invite', href: '/invites', icon: 'plus' },
      { label: 'Add Group', href: '/groups/new', icon: 'plus' },
      { label: 'Roles', href: '/roles', icon: 'shield' },
      { label: 'Super Groups', href: '/super-groups', icon: 'users' },
      { label: 'Recent Actions', href: '/activities', icon: 'clipboard' },
      { label: 'Reports', href: '/reports', icon: 'file' },
    ],
  },
];

/** Sections visible to a role — implements the 1/2/3 rule from SPEC §4. */
export function sectionsFor(role: string): NavSection[] {
  const level = ROLE_LEVEL[role as Role] ?? 0;
  return NAV_SECTIONS.filter((section) => section.level <= level);
}
