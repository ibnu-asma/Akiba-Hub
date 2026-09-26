'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from './icon';
import { ROLE_NAMES } from '@hub/shared';
import type { NavSection } from '@/lib/nav';
import type { Me } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

interface StudentSearchItem {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  groupName?: string;
  isInvited?: boolean;
  university?: string | null;
}

interface ProblemSearchItem {
  id: string;
  name: string;
  platform: string;
  difficulty: string;
  link: string;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  codeSnippet?: string;
  timestamp: string;
}

const AI_PROMPT_SUGGESTIONS = [
  {
    title: 'Dynamic Programming Memoization',
    prompt: 'How does memoization work in Dynamic Programming, and when should I use top-down vs bottom-up?',
    answer:
      'Memoization is an optimization technique used in **Top-Down Dynamic Programming** where recursive function calls cache their results in a table (array or hash map) so identical subproblems are solved only once.\n\n### When to use:\n- **Top-Down (Memoization)**: Natural to write when you already have the recursive relationship. Only solves subproblems that are actually needed.\n- **Bottom-Up (Tabulation)**: Iterative approach that solves all subproblems in topological order, eliminating recursion stack overhead.',
    codeSnippet: `// Classic Fibonacci with Memoization in TypeScript
function fib(n: number, memo: Record<number, number> = {}): number {
  if (n in memo) return memo[n]!;
  if (n <= 1) return n;
  memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
  return memo[n]!;
}
// Time Complexity: O(n) | Space: O(n)`,
  },
  {
    title: 'Time & Space Complexity',
    prompt: 'How can I calculate time and space complexity for recursive and graph algorithms?',
    answer:
      'For recursive algorithms, analyze the recursion tree:\n1. **Branching factor (b)**: Number of recursive calls per level.\n2. **Depth (d)**: Height of the recursion tree.\n- Total operations ≈ \\(O(b^d)\\) without memoization.\n\nFor graph algorithms (BFS/DFS):\n- **Time**: \\(O(V + E)\\) where \\(V\\) is vertices and \\(E\\) is edges.\n- **Space**: \\(O(V)\\) for the visited set and queue/call stack.',
    codeSnippet: `// BFS Time Complexity: O(V + E)
function bfs(start: number, adj: number[][]): void {
  const visited = new Set<number>([start]);
  const queue: number[] = [start];

  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const neighbor of adj[node] ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
}`,
  },
  {
    title: 'Binary Search Edge Cases',
    prompt: 'What are the most common off-by-one errors in Binary Search and how do I avoid them?',
    answer:
      'Binary Search edge cases usually stem from three things:\n1. **Mid calculation**: Use `left + Math.floor((right - left) / 2)` to avoid integer overflow.\n2. **Loop condition**: Choose consistently between `left <= right` with `right = mid - 1` vs `left < right` with `right = mid`.\n3. **Post-loop validation**: Check if the target was actually found or if index is out of bounds.',
    codeSnippet: `// Standard Lower Bound Binary Search
function lowerBound(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length; // half-open [left, right)

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid]! < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  return left;
}`,
  },
  {
    title: 'Contest Preparation Tips',
    prompt: 'What are the best strategies for competitive programming contests on HUB?',
    answer:
      '### Top 4 Contest Strategies:\n1. **Read all problems first**: Don\'t just jump into Problem A; skim all problems to find the lowest-hanging fruit.\n2. **Test edge cases early**: Check \\(n = 0, 1\\), negative numbers, maximum constraints, and duplicate values before submitting.\n3. **Time box**: If stuck for >15 minutes on an approach, step back, re-read constraints, and check if a simpler pattern applies (Two Pointers, Greedy, Hash Map).\n4. **Keep solution templates handy**: Fast I/O, Disjoint Set Union (DSU), and modular arithmetic.',
    codeSnippet: null,
  },
];

/** Utility bar: Search (Cmd+K) · AI assist · Notifications · Profile Menu + Active Dot · Logout */
export function Topbar({
  me,
  name,
  sections = [],
  onMenu,
  notifications = 2,
}: {
  me?: Me | null;
  name: string;
  sections?: NavSection[];
  onMenu?: () => void;
  notifications?: number;
}) {
  const router = useRouter();

  // Dialog & Popover States
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'pages' | 'students' | 'problems'>('all');
  const [aiOpen, setAiOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(notifications);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Search Data
  const [students, setStudents] = useState<StudentSearchItem[]>([]);
  const [problems, setProblems] = useState<ProblemSearchItem[]>([]);
  const [loadedGroups, setLoadedGroups] = useState(false);
  const [loadedProblems, setLoadedProblems] = useState(false);

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Hello ${me?.name ? me.name.split(' ')[0] : 'there'}! I am your HUB AI Study Assistant. You can ask me any DSA concepts, debugging advice, or contest preparation strategies.`,
      timestamp: 'Just now',
    },
  ]);
  const [userChatInput, setUserChatInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  // Refs for click outside
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K opens search palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setAiOpen(false);
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      loadSearchData();
    }
  }, [searchOpen]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (aiOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, aiTyping, aiOpen]);

async function loadSearchData(query = '', signal?: AbortSignal) {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
      const data = await res.json().catch(() => null);
      if (data && Array.isArray(data.students)) {
        setStudents(data.students);
      }
      if (data && Array.isArray(data.problems)) {
        setProblems(data.problems);
      }
    } catch {
      // Continue with existing items
    }
  }

  // Debounced live search whenever user types
  useEffect(() => {
    if (!searchOpen) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadSearchData(searchQuery.trim(), controller.signal);
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, searchOpen]);

  // Navigation Items indexed from sections + standard routes
  const pageItems = useMemo(() => {
    const defaultPages = [
      { label: 'Dashboard', href: '/dashboard', icon: 'chart', category: 'Pages' },
      { label: 'Tracks', href: '/tracks', icon: 'map', category: 'Pages' },
      { label: 'Exercises', href: '/exercises', icon: 'code', category: 'Pages' },
      { label: 'Problems Library', href: '/problems', icon: 'list', category: 'Pages' },
      { label: 'Contests', href: '/contests', icon: 'trophy', category: 'Pages' },
      { label: 'Roadmap', href: '/roadmap', icon: 'map', category: 'Pages' },
      { label: 'Groups & Students', href: '/groups', icon: 'users', category: 'Pages' },
      { label: 'Community Forum', href: '/forum', icon: 'chat', category: 'Pages' },
      { label: 'My Profile', href: '/profile', icon: 'user', category: 'Pages' },
    ];

    const dynamicChildren: { label: string; href: string; icon: string; category: string }[] = [];
    for (const section of sections) {
      for (const item of section.items) {
        if (item.children) {
          for (const child of item.children) {
            dynamicChildren.push({
              label: child.label,
              href: child.href,
              icon: item.icon,
              category: item.label,
            });
          }
        }
      }
    }

    return [...defaultPages, ...dynamicChildren];
  }, [sections]);

// Filtered search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Pages match
    const matchingPages = pageItems.filter(
      (p) => !q || p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );

    // Students match
    const matchingStudents = students.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.groupName && s.groupName.toLowerCase().includes(q)) ||
        (s.university && s.university.toLowerCase().includes(q)),
    );

    // Problems match
    const matchingProblems = problems.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.difficulty.toLowerCase().includes(q) || p.platform.toLowerCase().includes(q),
    );

    return {
      pages: matchingPages.slice(0, searchFilter === 'pages' ? 15 : 6),
      students: matchingStudents.slice(0, searchFilter === 'students' ? 15 : 6),
      problems: matchingProblems.slice(0, searchFilter === 'problems' ? 15 : 6),
      total: matchingPages.length + matchingStudents.length + matchingProblems.length,
    };
  }, [searchQuery, searchFilter, pageItems, students, problems]);

  // Logout Handler
  async function logout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  }

  // AI Chat Submit Handler
  function handleSendChatMessage(textToSend?: string, snippet?: string | null) {
    const text = (textToSend ?? userChatInput).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setUserChatInput('');
    setAiTyping(true);

    // Check if matching preset suggestion
    const match = AI_PROMPT_SUGGESTIONS.find(
      (s) => s.prompt.toLowerCase() === text.toLowerCase(),
    );

    setTimeout(() => {
      let aiResponseText = '';
      let code = snippet ?? null;

      if (match) {
        aiResponseText = match.answer;
        code = match.codeSnippet;
      } else if (text.toLowerCase().includes('time complexity') || text.toLowerCase().includes('space')) {
        aiResponseText =
          'To analyze complexity:\n- Count nested loops for polynomial time \\(O(n^k)\\).\n- Dividing search space in half gives logarithmic time \\(O(\\log n)\\).\n- Auxiliary data structures (hash maps, arrays, recursion depth) determine space complexity.';
      } else if (text.toLowerCase().includes('debug') || text.toLowerCase().includes('error')) {
        aiResponseText =
          'When debugging algorithm code:\n1. Print out the variables at each loop iteration.\n2. Check boundary inputs: empty arrays, single elements, identical values.\n3. Make sure recursion has a valid base case terminating condition.';
      } else {
        aiResponseText = `Great question regarding: "${text}".\n\nWhen implementing algorithms, always evaluate constraint sizes first. If \\(N \\le 10^5\\), aim for \\(O(N \\log N)\\) or \\(O(N)\\) complexity. Let me know if you would like a code snippet or step-by-step breakdown!`;
      }

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        codeSnippet: code ?? undefined,
        timestamp: 'Just now',
      };

      setChatMessages((prev) => [...prev, aiMsg]);
      setAiTyping(false);
    }, 700);
  }

  const roleLabel = me?.role ? ROLE_NAMES[me.role as keyof typeof ROLE_NAMES] ?? me.role : 'Member';

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-2.5 lg:px-6">
        {/* Left: Mobile Menu Toggle & Global Search trigger */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            type="button"
            className="icon-btn lg:hidden text-slate-600 hover:text-slate-900"
            aria-label="Open menu"
            onClick={onMenu}
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          {/* Desktop Search Trigger Bar */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-1.5 text-xs text-slate-400 hover:border-slate-300 hover:bg-white hover:text-slate-600 transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <Icon name="search" className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              <span>Search academy, tracks, problems, students...</span>
            </div>
            <kbd className="pointer-events-none rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Mobile Search Icon Button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="sm:hidden icon-btn text-slate-500 hover:text-slate-900"
            aria-label="Search"
          >
            <Icon name="search" className="h-5 w-5" />
          </button>
        </div>

        {/* Right: Actions, AI Assist, Notifications, Profile, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* AI Assistant Button */}
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="relative inline-flex items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-colors"
            title="HUB AI Study Assistant"
            aria-label="HUB AI Assistant"
          >
            <Icon name="sparkles" className="h-5 w-5 text-violet-600" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-violet-400 ring-2 ring-white" />
          </button>

          {/* Notifications Popover */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileMenuOpen(false);
              }}
              className="relative inline-flex items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Notifications"
              title="Notifications"
            >
              <Icon name="bell" className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                    {unreadNotifications > 0 && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200">
                        {unreadNotifications} new
                      </span>
                    )}
                  </div>
                  {unreadNotifications > 0 && (
                    <button
                      type="button"
                      onClick={() => setUnreadNotifications(0)}
                      className="text-xs font-semibold text-a2sv-600 hover:text-a2sv-700 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 transition-colors">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
                      <Icon name="trophy" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900">SuperGroup Contest Active</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Contest problem submissions are live. Solve questions with your team!
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">15m ago</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 transition-colors">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-600 shrink-0">
                      <Icon name="code" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900">New Exercise Added</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        &quot;Binary Tree Right Side View&quot; has been assigned in Tree BFS.
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">2h ago</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 transition-colors">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                      <Icon name="chat" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900">Community Forum Discussion</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Your post received new upvotes and comment replies from students.
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">5h ago</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-2.5 text-center">
                  <Link
                    href="/forum"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    View all discussions & activity &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <span className="h-5 w-px bg-slate-200 mx-1" />

          {/* Profile Menu Trigger + Online Green Indicator */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-a2sv-500/20"
              aria-label="User menu"
              aria-expanded={profileMenuOpen}
            >
              <div className="relative">
                {me?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={me.avatarUrl}
                    alt={name}
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-a2sv-600 to-emerald-400 font-bold text-white text-[11px] shadow-2xs">
                    {initials(name)}
                  </span>
                )}
                {/* The Online Green Icon */}
                <span
                  title="Online and connected"
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
                />
              </div>

              {/* Name on desktop */}
              <div className="hidden md:block text-left mr-0.5">
                <span className="text-xs font-bold text-slate-800 leading-none">{name}</span>
              </div>
              <Icon
                name="chevronDown"
                className={`hidden md:block h-3.5 w-3.5 text-slate-400 transition-transform ${
                  profileMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown Popover */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-40 animate-in fade-in zoom-in-95 duration-100">
                {/* User Header */}
                <div className="flex items-start gap-3 border-b border-slate-100 pb-3 px-2">
                  <div className="relative shrink-0">
                    {me?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={me.avatarUrl}
                        alt={name}
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-tr from-a2sv-600 to-emerald-400 font-bold text-white text-xs shadow-2xs">
                        {initials(name)}
                      </span>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
                    <p className="text-xs text-slate-500 truncate">{me?.email ?? 'student@akibatech.com'}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {roleLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="py-2 space-y-0.5">
                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Icon name="user" className="h-4 w-4 text-slate-400" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/forum"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Icon name="chat" className="h-4 w-4 text-slate-400" />
                    <span>Community Forum</span>
                  </Link>

                </div>

                {/* Sign Out Action */}
                <div className="border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={logout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    {isLoggingOut ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
                    ) : (
                      <Icon name="logout" className="h-4 w-4 text-rose-500" />
                    )}
                    <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette / Search Dialog */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setSearchOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
            {/* Top Search Input */}
            <div className="flex items-center border-b border-slate-200 px-4 py-3 bg-slate-50/50">
              <Icon name="search" className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a command, page, student name, or DSA problem..."
                className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 mr-2"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              )}
              <kbd
                onClick={() => setSearchOpen(false)}
                className="cursor-pointer rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-400 hover:bg-slate-100"
              >
                ESC
              </kbd>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-100 px-4 py-2 bg-white text-xs font-medium text-slate-500 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSearchFilter('all')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  searchFilter === 'all'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                All Results
              </button>
              <button
                type="button"
                onClick={() => setSearchFilter('pages')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  searchFilter === 'pages'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                Pages ({searchResults.pages.length})
              </button>
              <button
                type="button"
                onClick={() => setSearchFilter('students')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  searchFilter === 'students'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                Students & Peers ({searchResults.students.length})
              </button>
              <button
                type="button"
                onClick={() => setSearchFilter('problems')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  searchFilter === 'problems'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                Problems ({searchResults.problems.length})
              </button>
            </div>

            {/* Results Area */}
            <div className="overflow-y-auto p-3 space-y-4 flex-1">
              {/* Pages Category */}
              {(searchFilter === 'all' || searchFilter === 'pages') && searchResults.pages.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Navigation & Pages
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {searchResults.pages.map((p) => (
                      <Link
                        key={p.href}
                        href={p.href}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 group transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon name={p.icon as any} className="h-4 w-4 text-slate-400 group-hover:text-a2sv-600" />
                          <span>{p.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">{p.category}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Students Category */}
              {(searchFilter === 'all' || searchFilter === 'students') && searchResults.students.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Students & Peers
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {searchResults.students.map((student) => (
                      <Link
                        key={student.id}
                        href={student.isInvited ? `/invites?q=${encodeURIComponent(student.name)}` : `/profile?userId=${student.id}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 group transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {student.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={student.avatarUrl}
                              alt={student.name}
                              className="h-7 w-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-a2sv-100 text-[10px] font-bold text-a2sv-700">
                              {initials(student.name)}
                            </span>
                          )}
                          <div className="flex flex-col text-left truncate">
                            <span className="font-semibold text-slate-900 truncate">{student.name}</span>
                            {student.email && (
                              <span className="text-[10px] text-slate-400 font-normal truncate">{student.email}</span>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          student.isInvited
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {student.groupName ?? 'Student'}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Problems Category */}
              {(searchFilter === 'all' || searchFilter === 'problems') && searchResults.problems.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    DSA Problems
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {searchResults.problems.map((prob) => (
                      <Link
                        key={prob.id}
                        href="/problems"
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 group transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon name="code" className="h-4 w-4 text-slate-400 group-hover:text-a2sv-600" />
                          <span>{prob.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 font-medium">
                            {prob.platform}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              prob.difficulty === 'Easy'
                                ? 'bg-emerald-50 text-emerald-700'
                                : prob.difficulty === 'Medium'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {prob.difficulty}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty Search State */}
              {searchResults.total === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <Icon name="search" className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No results found for &quot;{searchQuery}&quot;</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try searching for a route, contest, student name, or algorithm tag.</p>
                </div>
              )}
            </div>

            {/* Footer shortcuts */}
            <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Select with click or Enter</span>
              <div className="flex items-center gap-3">
                <span>Navigate: <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">↑↓</kbd></span>
                <span>Close: <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">ESC</kbd></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUB AI Study Assistant Drawer / Modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setAiOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Assistant Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-violet-50/50 to-white">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white shadow-xs">
                  <Icon name="sparkles" className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">HUB AI Study Assistant</h2>
                    <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                      TUTOR
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Your 24/7 DSA & Academy Companion</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiOpen(false)}
                className="icon-btn text-slate-400 hover:text-slate-700"
                aria-label="Close Assistant"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            {/* Prompt Suggestion Chips */}
            <div className="border-b border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Suggested Topics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {AI_PROMPT_SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => handleSendChatMessage(s.prompt, s.codeSnippet)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.sender === 'ai' ? (
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-white text-xs shrink-0 shadow-2xs">
                      <Icon name="sparkles" className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-a2sv-500 text-white text-[10px] font-bold shrink-0">
                      {initials(name)}
                    </span>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-a2sv-600 text-white font-medium shadow-xs'
                        : 'bg-slate-100/90 text-slate-800 border border-slate-200/60 shadow-2xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {msg.codeSnippet && (
                      <div className="mt-2.5 rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto border border-slate-800">
                        <pre>
                          <code>{msg.codeSnippet}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {aiTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-white text-xs shrink-0">
                    <Icon name="sparkles" className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-xl">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="border-t border-slate-200 p-3 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={userChatInput}
                  onChange={(e) => setUserChatInput(e.target.value)}
                  placeholder="Ask a question about algorithms, approaches..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="submit"
                  disabled={!userChatInput.trim() || aiTyping}
                  className="rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-violet-700 disabled:opacity-40 transition-colors"
                >
                  Send
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>Non-spoiler hints and algorithmic walkthroughs</span>
                <button
                  type="button"
                  onClick={() =>
                    setChatMessages([
                      {
                        id: 'msg-welcome',
                        sender: 'ai',
                        text: `Hello ${name.split(' ')[0]}! How can I assist your coding today?`,
                        timestamp: 'Just now',
                      },
                    ])
                  }
                  className="hover:text-slate-600"
                >
                  Clear chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
