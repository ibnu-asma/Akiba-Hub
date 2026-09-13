import type { AllIconName } from '@/lib/nav';

/** Single-path stroke icons (24×24) — keeps the bundle tiny and themable. */
const PATHS: Record<AllIconName, string> = {
  chart: 'M4 20V10m6 10V4m6 16v-7M3 20h18',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  code: 'm8 8-4 4 4 4m8-8 4 4-4 4',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  trophy:
    'M8 21h8m-4-4v4m-6-17h12v4a6 6 0 0 1-12 0V4ZM6 6H3v1a4 4 0 0 0 3 3.87M18 6h3v1a4 4 0 0 1-3 3.87',
  chat: 'M7 8h10M7 12h6m8 0a9 9 0 0 1-13.4 7.8L3 21l1.2-4.6A9 9 0 1 1 21 12Z',
  calendar: 'M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  plus: 'M12 5v14m-7-7h14',
  wallet: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm14 4h.01',
  shield: 'm12 3 7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z',
  users:
    'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m20-1v-1a4 4 0 0 0-3-3.87M14 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm5 1a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  clipboard:
    'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h4',
  file: 'M14 3v5h5m-5-5H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z',
  search: 'm21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9m-1.3 13a2 2 0 0 1-3.4 0',
  sparkles:
    'm12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
  sliders: 'M4 7h9m4 0h3M15 5v4M4 12h3m4 0h9M9 10v4M4 17h11m4 0h1M17 15v4',
  check: 'm5 13 4 4L19 7',
  checkCircle: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm-3.8 9.2 2.6 2.6 5-5.2',
  menu: 'M4 7h16M4 12h16M4 17h16',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  x: 'M18 6 6 18M6 6l12 12',
  trend: 'm7 7 10 10M17 7v10H7',
  user: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 10v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2',
  dots: 'M12 6h.01M12 12h.01M12 18h.01',
  mail: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 1.5 8 5.5 8-5.5',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 4.5V12l3 2.5',
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M5 20h14',
  externalLink: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6v6m-11 5L21 3',
  bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
};

export function Icon({ name, className = 'h-5 w-5' }: { name: AllIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
