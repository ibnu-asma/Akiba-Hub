'use client';

import { useState } from 'react';
import { OutlinedInput } from '@/components/form/field';
import type { CommentDto, PostDto } from '@/lib/api';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icon';
import { Modal } from '@/components/modal';
import { timeAgo } from '@/lib/format';
import { ROLE_NAMES, type Role } from '@hub/shared';
import { ROLE_NAMES } from '@hub/shared';
import type { CommentDto, PostDto, Me } from '@/lib/api';

function initials(name: string): string {
  return name
const SORTS = [
  { key: 'latest', label: 'Latest', icon: 'clock' },
  { key: 'top', label: 'Top Upvoted', icon: 'trophy' },
  { key: 'comments', label: 'Most Discussed', icon: 'chat' },
  { key: 'oldest', label: 'Oldest', icon: 'list' },
] as const;

type SortKey = (typeof SORTS)[number]['key'];

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'student', label: 'Students' },
  { value: 'head_of_education', label: 'Heads of Education' },
  { value: 'head_of_academy', label: 'Heads of Academy' },
];

const SUGGESTED_TOPICS = [
  'Algorithms',
  'Data Structures',
  'Contest Upsolve',
  'System Design',
  'Interview Prep',
  'Career & Tips',
];

function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm font-semibold',
  }[size];

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name ?? 'User'}
        className={`${sizeClasses} rounded-full object-cover shrink-0 ring-1 ring-slate-200/80`}
      />
    );
  }

  const initials = (name ?? 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .map((p) => p[0]!.toUpperCase())
    .join('');

  return (
    <span
      className={`grid ${sizeClasses} place-items-center rounded-full bg-gradient-to-tr from-a2sv-600 to-emerald-400 font-bold text-white shrink-0 shadow-xs ring-1 ring-white select-none`}
    >
      {initials || 'U'}
    </span>
  );
}

const SORTS = [
  { key: 'latest', label: 'Latest' },
  { key: 'top', label: 'Top' },
  { key: 'oldest', label: 'Oldest' },
] as const;
function RoleBadge({ role }: { role?: string | null }) {
  if (!role) return null;
  const label = ROLE_NAMES[role as keyof typeof ROLE_NAMES] ?? role;
  const colorClasses =
    {
      student: 'bg-slate-100 text-slate-700 border-slate-200/80',
      head_of_education: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium',
      head_of_academy: 'bg-violet-50 text-violet-700 border-violet-200/80 font-medium',
    }[role.toLowerCase()] ?? 'bg-slate-100 text-slate-700 border-slate-200';

type SortKey = (typeof SORTS)[number]['key'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${colorClasses}`}>
      {label}
    </span>
  );
}

/** Forum board — new post, sort, vote, and comment thread (SPEC §6.7). */
export function ForumBoard({ initialPosts }: { initialPosts: PostDto[] }) {
/** Professional Community Forum Board (SPEC §6.7). */
export function ForumBoard({ initialPosts, me }: { initialPosts: PostDto[]; me?: Me | null }) {
  const [posts, setPosts] = useState<PostDto[]>(initialPosts);
  const [sort, setSort] = useState<SortKey>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // New Post Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, CommentDto[]>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [postingBusy, setPostingBusy] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [composerTab, setComposerTab] = useState<'write' | 'preview'>('write');

  async function reload(nextSort: SortKey = sort) {
    const res = await fetch(`/api/posts?sort=${nextSort}`);
    const rows = (await res.json().catch(() => null)) as PostDto[] | null;
    if (res.ok && rows) setPosts(rows);
  // Comments State
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentDto[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [draftComments, setDraftComments] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Body Expansion
  const [expandedBodies, setExpandedBodies] = useState<Record<string, boolean>>({});

  // Copy Link Feedback
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Reload posts from API
  async function reload(targetSort: SortKey = sort) {
    const apiSort = targetSort === 'comments' ? 'latest' : targetSort;
    try {
      const res = await fetch(`/api/posts?sort=${apiSort}`);
      const rows = (await res.json().catch(() => null)) as PostDto[] | null;
      if (res.ok && rows) {
        setPosts(rows);
      }
    } catch {}
  }

  function changeSort(next: SortKey) {
  function handleSortChange(next: SortKey) {
    setSort(next);
    void reload(next);
    setPage(0);
    if (next !== 'comments') {
      void reload(next);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
  // Create post submission
  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    setPostError(null);
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      setPostError('Title and body are both required.');
      return;
    }
    setBusy(true);
    setPostingBusy(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not post.');
        const payload = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setPostError(payload?.error?.message ?? 'Failed to publish post.');
        return;
      }
      setTitle('');
      setBody('');
      await reload();
      setModalOpen(false);
      await reload(sort);
    } catch {
      setError('Network error — is the API running?');
      setPostError('Network error. Is the server running?');
    } finally {
      setBusy(false);
      setPostingBusy(false);
      // Keep existing posts on error
    }
  }

  async function vote(postId: string, value: 1 | -1) {
  // Vote handler with optimistic UI update
  async function handleVote(postId: string, voteValue: 1 | -1) {
    setPosts((current) =>
      current.map((p) => {
        if (p.id !== postId) return p;
        const currentVote = p.myVote ?? 0;
        let nextVote: number = voteValue;
        let scoreDiff = 0;
  // Voting with optimistic update
  async function handleVote(postId: string, value: 1 | -1) {
    const currentPost = posts.find((p) => p.id === postId);
    if (!currentPost) return;

        if (currentVote === voteValue) {
          // Toggle off
          nextVote = 0;
          scoreDiff = -voteValue;
        } else if (currentVote === 0) {
          // New vote
          nextVote = voteValue;
          scoreDiff = voteValue;
        } else {
          // Switch vote from +1 to -1 or vice-versa
          nextVote = voteValue;
          scoreDiff = voteValue * 2;
        }
    const currentMyVote = currentPost.myVote ?? 0;
    let nextMyVote = 0;
    let scoreDelta = 0;

        return {
          ...p,
          myVote: nextVote,
          score: p.score + scoreDiff,
        };
      })
    if (currentMyVote === value) {
      // Toggle off
      nextMyVote = 0;
      scoreDelta = -value;
    } else {
      // New or switched vote
      nextMyVote = value;
      scoreDelta = value - currentMyVote;
    }

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              score: (p.score ?? 0) + scoreDelta,
              myVote: nextMyVote,
            }
          : p,
      ),
    );

    try {
      await fetch(`/api/posts/${postId}/vote`, {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
        body: JSON.stringify({ value: voteValue }),
      });
      await reload();

      if (!res.ok) {
        // Revert on failure
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  score: currentPost.score,
                  myVote: currentPost.myVote,
                }
              : p,
          ),
        );
      }
    } catch {
      /* leave as-is on network failure */
      // Revert if request failed
      void reload(sort);
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                score: currentPost.score,
                myVote: currentPost.myVote,
              }
            : p,
        ),
      );
    }
  }

  // Comments handler
  // Toggle comments and fetch if needed
  async function toggleComments(postId: string) {
    if (open[postId]) {
      setOpen((o) => ({ ...o, [postId]: false }));
      return;
    const nextOpen = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: nextOpen }));
    const nextIsOpen = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: nextIsOpen }));

    if (nextOpen && !commentsByPost[postId]) {
    if (nextIsOpen && !commentsByPost[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await fetch(`/api/posts/${postId}/comments`);
        const rows = (await res.json().catch(() => null)) as CommentDto[] | null;
        if (res.ok && rows) {
          setCommentsByPost((prev) => ({ ...prev, [postId]: rows }));
        const data = (await res.json().catch(() => null)) as CommentDto[] | null;
        if (res.ok && data) {
          setCommentsByPost((prev) => ({ ...prev, [postId]: data }));
        }
      } catch {}
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
    setOpen((o) => ({ ...o, [postId]: true }));
    const res = await fetch(`/api/posts/${postId}/comments`);
    const rows = (await res.json().catch(() => null)) as CommentDto[] | null;
    if (res.ok && rows) setComments((c) => ({ ...c, [postId]: rows }));
  }

  async function addComment(postId: string) {
    const text = (drafts[postId] ?? '').trim();
  // Add a new comment
  async function handleAddComment(postId: string) {
    const text = (draftComments[postId] ?? '').trim();
    if (!text) return;
    const commentBody = draftComments[postId]?.trim();
    if (!commentBody) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
        body: JSON.stringify({ body: commentBody }),
      });
      if (!res.ok) return;
      setDrafts((d) => ({ ...d, [postId]: '' }));
      await reload();
      const c = (await fetch(`/api/posts/${postId}/comments`).then((r) => r.json().catch(() => null))) as CommentDto[] | null;
      if (c) setComments((prev) => ({ ...prev, [postId]: c }));
    } catch {
      /* ignore */
      if (res.ok) {
      const created = (await res.json().catch(() => null)) as CommentDto | null;
      if (res.ok && created) {
        // Enforce user info from me if not set by API
        const commentWithUser: CommentDto = {
          ...created,
          userName: created.userName ?? me?.name ?? 'You',
          userAvatar: created.userAvatar ?? me?.avatarUrl ?? null,
          userRole: created.userRole ?? me?.role ?? 'student',
        };

        setCommentsByPost((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] ?? []), commentWithUser],
        }));

        setDraftComments((prev) => ({ ...prev, [postId]: '' }));
        // Refresh comments thread and comment counts
        const cRes = await fetch(`/api/posts/${postId}/comments`);
        const comments = (await cRes.json().catch(() => null)) as CommentDto[] | null;
        if (cRes.ok && comments) {
          setCommentsByPost((prev) => ({ ...prev, [postId]: comments }));
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, commentCount: comments.length } : p))
          );
        }

        // Increment comment count optimistically
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, commentCount: (p.commentCount ?? 0) + 1 }
              : p,
          ),
        );
      }
    } catch {}
    setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  }

  function copyPostLink(postId: string) {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/forum#${postId}` : '';
    if (url) {
      navigator.clipboard?.writeText(url);
      setCopiedPostId(postId);
      setTimeout(() => setCopiedPostId(null), 2500);
  // Create a new post
  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setPostingBusy(true);
    setPostError(null);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const created = (await res.json().catch(() => null)) as PostDto | null;

      if (!res.ok || !created) {
        setPostError((created as unknown as { error?: { message?: string } })?.error?.message ?? 'Failed to publish post');
        return;
      }

      // Close modal & reset fields
      setModalOpen(false);
      setTitle('');
      setBody('');

      // Prepend newly created post
      const newPost: PostDto = {
        ...created,
        userName: created.userName ?? me?.name ?? 'You',
        userAvatar: created.userAvatar ?? me?.avatarUrl ?? null,
        userRole: created.userRole ?? me?.role ?? 'student',
        score: 0,
        commentCount: 0,
        myVote: 0,
      };

      setPosts((prev) => [newPost, ...prev]);
      setPage(0);
      void reload();
    } catch {
      setPostError('Network error while publishing post');
    } finally {
      setPostingBusy(false);
    }
  }

  // Filter and sort discussions
  // Share post link
  function handleCopyLink(postId: string) {
    const url = `${window.location.origin}/forum#${postId}`;
    void navigator.clipboard.writeText(url);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2000);
  }

  // Filtered & sorted posts
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Search query: title, body, author
    const q = searchQuery.trim().toLowerCase();
    if (q) {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          (p.userName && p.userName.toLowerCase().includes(q))
          (p.userName && p.userName.toLowerCase().includes(q)),
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter((p) => p.userRole && p.userRole.toLowerCase() === roleFilter);
      result = result.filter(
        (p) => p.userRole && p.userRole.toLowerCase() === roleFilter.toLowerCase(),
      );
    }

    // Client-side sort if "comments"
    if (sort === 'comments') {
      result.sort((a, b) => b.commentCount - a.commentCount || b.score - a.score);
    // Sorting
    if (sort === 'top') {
      result.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else if (sort === 'comments') {
      result.sort((a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0));
    } else if (sort === 'oldest') {
      result.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    } else {
      // latest
      result.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return result;
  }, [posts, searchQuery, roleFilter, sort]);

  // Community metrics
  const totalDiscussions = posts.length;
  const totalComments = useMemo(
    () => posts.reduce((sum, p) => sum + (p.commentCount ?? 0), 0),
    [posts],
  );
  const totalUpvotes = useMemo(
    () => posts.reduce((sum, p) => sum + Math.max(0, p.score ?? 0), 0),
    [posts],
  );

  // Pagination calculation
  const totalItems = filteredPosts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const totalPages = Math.ceil(filteredPosts.length / pageSize) || 1;
  const paginatedPosts = useMemo(() => {
    const start = currentPage * pageSize;
    const start = page * pageSize;
    return filteredPosts.slice(start, start + pageSize);
  }, [filteredPosts, currentPage, pageSize]);
  }, [filteredPosts, page, pageSize]);

  const hasActiveFilters = searchQuery.trim().length > 0 || roleFilter !== 'all';
  const totalCommentsCount = useMemo(() => posts.reduce((acc, p) => acc + (p.commentCount || 0), 0), [posts]);
  const totalUpvotesCount = useMemo(() => posts.reduce((acc, p) => acc + Math.max(0, p.score || 0), 0), [posts]);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-sm font-bold text-slate-900">+ New Post</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <OutlinedInput label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's on your mind?" />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your post…"
            rows={4}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100"
      {/* Header & Quick Metrics Banner */}
      {/* Top Header & Metrics */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Community Forum</h1>
          <p className="mt-1 text-sm text-slate-500">
            Academy-wide discussions, problem-solving strategies, and peer sharing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Icon name="plus" className="h-4 w-4" />
          <span>New Discussion</span>
        </button>
      </header>

      {/* Metrics Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-a2sv-50 text-a2sv-600">
      {/* Metric Cards Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60">
            <Icon name="chat" className="h-5 w-5" />
          </span>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{posts.length}</p>
            <p className="text-xs font-medium text-slate-400">Total Discussions</p>
            <div className="text-xl font-bold text-slate-900">{totalDiscussions}</div>
            <div className="text-xs font-medium text-slate-500">Discussions</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <Icon name="clipboard" className="h-5 w-5" />
          </span>
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-200/60">
            <Icon name="list" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{totalCommentsCount}</p>
            <p className="text-xs font-medium text-slate-400">Total Comments</p>
            <div className="text-xl font-bold text-slate-900">{totalComments}</div>
            <div className="text-xs font-medium text-slate-500">Total Replies</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs col-span-2 sm:col-span-1 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-200/60">
            <Icon name="trophy" className="h-5 w-5" />
          </span>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">+{totalUpvotesCount}</p>
            <p className="text-xs font-medium text-slate-400">Community Upvotes</p>
            <div className="text-xl font-bold text-slate-900">{totalUpvotes}</div>
            <div className="text-xs font-medium text-slate-500">Community Upvotes</div>
          </div>
        </div>
      </section>
      </div>

      {/* Search & Filter Toolbar */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-xs space-y-3.5">
        {/* Search row */}
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search discussions by title, body, or author..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </form>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
      {/* Search, Filter & Sort Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Sort tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SORTS.map((s) => (
              placeholder="Search discussions by keyword, topic, or author..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-a2sv-500/20"
            />
            {searchQuery && (
              <button
                key={s.key}
                type="button"
                onClick={() => handleSortChange(s.key)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  sort === s.key
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <Icon name={s.icon as any} className="h-3.5 w-3.5" />
                <span>{s.label}</span>
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            ))}
            )}
          </div>

          {/* Controls: Role filter & Sort tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Author Role filter */}
            <div className="min-w-[140px]">
            {/* Role Filter */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Page size selector */}
            <div className="w-[105px]">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            {/* Sort Tabs */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1">
              {SORTS.map((s) => {
                const isActive = sort === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setSort(s.key);
                      setPage(0);
                      void reload(s.key);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon name={s.icon} className={`h-3.5 w-3.5 ${isActive ? 'text-a2sv-600' : 'text-slate-400'}`} />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Reset active filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setPage(0);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                <Icon name="x" className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
            {/* Per-page selector */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Results summary bar */}
        <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
          <span>
            Showing <strong className="text-slate-800">{filteredPosts.length}</strong>{' '}
            {filteredPosts.length === 1 ? 'discussion' : 'discussions'}
            {hasActiveFilters && ` (filtered from ${posts.length} total)`}
          </span>
        </div>
      </section>
        {/* Filter Summary & Reset */}
        {(searchQuery || roleFilter !== 'all') && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Showing {filteredPosts.length} of {posts.length} discussions
              {searchQuery ? ` matching "${searchQuery}"` : ''}
              {roleFilter !== 'all' ? ` posted by ${ROLE_OPTIONS.find((r) => r.value === roleFilter)?.label}` : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setPage(0);
              }}
              className="font-medium text-a2sv-600 hover:text-a2sv-700 hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => changeSort(s.key)}
            className={`chip px-3 py-1.5 text-sm transition ${sort === s.key ? 'bg-a2sv-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {/* Discussions Feed */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <span className="text-4xl">💬</span>
          <h3 className="mt-2 text-base font-bold text-slate-800">
            {hasActiveFilters ? 'No matching discussions found' : 'No discussions yet'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Try adjusting your search keywords or clearing your active filters to see more results.'
              : 'Be the first to start a community discussion, share an upsolve solution, or ask a question!'}
      {/* Discussion Posts List */}
      {paginatedPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
            <Icon name="chat" className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-800">No discussions found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || roleFilter !== 'all'
              ? 'No discussions matched your active search or filters. Try adjusting them.'
              : 'Be the first member to spark an insightful conversation in the academy!'}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {hasActiveFilters ? (
          <div className="mt-4">
            {searchQuery || roleFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setPage(0);
                }}
                className="btn-secondary"
                className="btn-secondary text-xs"
              >
                Clear Filters
                Reset Filters
              </button>
            ) : (
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
                + Start Discussion
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="btn-primary text-xs"
              >
                Start First Discussion
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedPosts.map((post) => {
            const isUpvoted = post.myVote === 1;
            const isDownvoted = post.myVote === -1;
            const isOpen = Boolean(openComments[post.id]);
            const isCommentsOpen = Boolean(openComments[post.id]);
            const isExpanded = Boolean(expandedBodies[post.id]);
            const isLongBody = post.body.length > 280;
            const postComments = commentsByPost[post.id] ?? [];
            const isCopied = copiedPostId === post.id;
            const isBodyLong = post.body.length > 320;
            const isBodyExpanded = Boolean(expandedBodies[post.id]);
            const myVote = post.myVote ?? 0;

      {posts.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No posts yet — start the conversation.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="card p-5">
              <div className="flex items-center gap-2.5">
                <span className="avatar h-9 w-9 text-[11px]">{initials(post.userName ?? 'U')}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{post.userName ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
            return (
              <article
                key={post.id}
                id={post.id}
                className="group bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all"
                className="rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  {/* Upvote / Downvote Widget */}
                  <div className="flex flex-col items-center shrink-0 rounded-xl bg-slate-50/80 border border-slate-100 p-1 select-none">
                    <button
                      type="button"
                      onClick={() => handleVote(post.id, 1)}
                      title="Upvote"
                      aria-label="Upvote"
                      className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                        isUpvoted
                          ? 'bg-emerald-100 text-emerald-700 shadow-xs'
                          : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                      }`}
                    >
                      <span className="text-base font-bold leading-none">▲</span>
                    </button>

                    <span
                      className={`py-1 text-xs font-bold ${
                        post.score > 0
                          ? 'text-emerald-600'
                          : post.score < 0
                            ? 'text-rose-600'
                            : 'text-slate-600'
                      }`}
                    >
                      {post.score > 0 ? `+${post.score}` : post.score}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleVote(post.id, -1)}
                      title="Downvote"
                      aria-label="Downvote"
                      className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                        isDownvoted
                          ? 'bg-rose-100 text-rose-700 shadow-xs'
                          : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                    >
                      <span className="text-base font-bold leading-none">▼</span>
                    </button>
                  </div>

                  {/* Post Content */}
                  <div className="min-w-0 flex-1">
                    {/* Author info strip */}
                    <div className="flex flex-wrap items-center gap-2">
                      <UserAvatar name={post.userName} avatarUrl={post.userAvatar} size="sm" />
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="truncate text-xs font-bold text-slate-800">
                          {post.userName ?? 'Anonymous'}
                        </span>
                        <RoleBadge role={post.userRole} />
                        <span className="text-slate-300 text-xs">·</span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {timeAgo(post.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Post Title */}
                    <h2
                      onClick={() => toggleComments(post.id)}
                      className="mt-2.5 text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition cursor-pointer leading-snug"
                    >
                      {post.title}
                    </h2>

                    {/* Post Body */}
                    <div className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line break-words">
                      {isBodyLong && !isBodyExpanded ? `${post.body.slice(0, 320)}…` : post.body}
                    </div>

                    {isBodyLong && (
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Voting Column */}
                    <div className="flex flex-col items-center rounded-xl bg-slate-50/80 border border-slate-200/60 p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBodies((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                        }
                        className="mt-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
                        onClick={() => void handleVote(post.id, 1)}
                        title="Upvote"
                        className={`p-1 rounded-lg transition-colors ${
                          myVote === 1
                            ? 'bg-emerald-100 text-emerald-700 font-bold'
                            : 'text-slate-400 hover:bg-slate-200/70 hover:text-emerald-600'
                        }`}
                      >
                        {isBodyExpanded ? 'Show less' : 'Read full discussion…'}
                        <Icon name="chevronDown" className="h-4 w-4 rotate-180" />
                      </button>
                    )}

                    {/* Action Bar */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleComments(post.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          isOpen
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                      <span
                        className={`my-1 text-xs font-bold tabular-nums ${
                          myVote === 1
                            ? 'text-emerald-600'
                            : myVote === -1
                              ? 'text-rose-600'
                              : 'text-slate-700'
                        }`}
                      >
                        <Icon name="chat" className="h-3.5 w-3.5 text-emerald-600" />
                        <span>
                          {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
                        </span>
                        <Icon
                          name="chevronDown"
                          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                        {post.score ?? 0}
                      </span>

                      <button
                        type="button"
                        onClick={() => copyPostLink(post.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition"
                        onClick={() => void handleVote(post.id, -1)}
                        title="Downvote"
                        className={`p-1 rounded-lg transition-colors ${
                          myVote === -1
                            ? 'bg-rose-100 text-rose-700 font-bold'
                            : 'text-slate-400 hover:bg-slate-200/70 hover:text-rose-600'
                        }`}
                      >
                        <Icon name="externalLink" className="h-3.5 w-3.5 text-slate-400" />
                        <span>{isCopied ? 'Link copied!' : 'Share'}</span>
                        <Icon name="chevronDown" className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Collapsible Comments Section */}
                    {isOpen && (
                      <div className="mt-4 space-y-3.5 rounded-2xl bg-slate-50/70 p-4 md:p-5 border border-slate-200/60">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Discussion Thread ({post.commentCount})
                          </h4>
                    {/* Content Column */}
                    <div className="min-w-0 flex-1">
                      {/* Author Meta Strip */}
                      <div className="flex flex-wrap items-center gap-2">
                        <UserAvatar name={post.userName} avatarUrl={post.userAvatar} size="sm" />
                        <span className="text-xs font-semibold text-slate-900">{post.userName ?? 'Anonymous'}</span>
                        <RoleBadge role={post.userRole} />
                        <span className="text-slate-300">•</span>
                        <time
                          dateTime={post.createdAt}
                          className="text-[11px] text-slate-400"
                          title={new Date(post.createdAt).toLocaleString()}
                        >
                          {timeAgo(post.createdAt)}
                        </time>
                      </div>

                      {/* Title */}
                      <h2 className="mt-2 text-base font-bold text-slate-900 tracking-tight leading-snug">
                        {post.title}
                      </h2>

                      {/* Body */}
                      <div className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                        {isLongBody && !isExpanded ? `${post.body.slice(0, 280)}...` : post.body}
                      </div>

                      {isLongBody && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedBodies((prev) => ({ ...prev, [post.id]: !isExpanded }))
                          }
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-a2sv-600 hover:text-a2sv-700"
                        >
                          <span>{isExpanded ? 'Show less' : 'Read full discussion…'}</span>
                          <Icon
                            name="chevronDown"
                            className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      )}

                      {/* Footer Actions */}
                      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                        {/* Toggle Comments Button */}
                        <button
                          type="button"
                          onClick={() => void toggleComments(post.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                            isCommentsOpen
                              ? 'bg-slate-100 text-slate-800'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          <Icon name="chat" className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {post.commentCount === 1
                              ? '1 comment'
                              : `${post.commentCount ?? 0} comments`}
                          </span>
                          <Icon
                            name="chevronDown"
                            className={`h-3 w-3 text-slate-400 transition-transform ${isCommentsOpen ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {/* Share / Copy Link */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(post.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        >
                          <Icon name={isCopied ? 'check' : 'externalLink'} className="h-3.5 w-3.5 text-slate-400" />
                          <span>{isCopied ? 'Copied!' : 'Share'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Comments Section */}
                {isCommentsOpen && (
                  <section className="border-t border-slate-100 bg-slate-50/50 p-5">
                    <div className="space-y-4">
                      {loadingComments[post.id] ? (
                        <div className="flex items-center justify-center py-6 text-xs text-slate-400">
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent mr-2" />
                          Loading comments...
                        </div>

                        {/* Comments List */}
                        {loadingComments[post.id] ? (
                          <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                            Loading comments…
                          </div>
                        ) : (commentsByPost[post.id] ?? []).length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No comments yet. Start the conversation!
                          </div>
                        ) : (
                          <ul className="space-y-2.5">
                            {(commentsByPost[post.id] ?? []).map((c) => (
                              <li
                                key={c.id}
                                className="bg-white rounded-xl p-3.5 border border-slate-200/70 shadow-2xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <UserAvatar name={c.userName} avatarUrl={c.userAvatar} size="sm" />
                                    <span className="text-xs font-bold text-slate-800">
                                      {c.userName ?? 'Anonymous'}
                                    </span>
                                    <RoleBadge role={c.userRole} />
                      ) : (
                        <>
                          {postComments.length > 0 ? (
                            <div className="space-y-3">
                              {postComments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-2xs"
                                >
                                  <UserAvatar
                                    name={comment.userName}
                                    avatarUrl={comment.userAvatar}
                                    size="sm"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-semibold text-slate-900">
                                        {comment.userName ?? 'Anonymous'}
                                      </span>
                                      <RoleBadge role={comment.userRole} />
                                      <span className="text-slate-300">•</span>
                                      <time
                                        dateTime={comment.createdAt}
                                        className="text-[11px] text-slate-400"
                                      >
                                        {timeAgo(comment.createdAt)}
                                      </time>
                                    </div>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                                      {comment.body}
                                    </p>
                                  </div>
                                  <span className="text-[11px] font-medium text-slate-400">
                                    {timeAgo(c.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-700 pl-9 whitespace-pre-line leading-relaxed">
                                  {c.body}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                              ))}
                            </div>
                          ) : (
                            <div className="py-2 text-center text-xs text-slate-400 italic">
                              No comments yet. Be the first to share your thoughts!
                            </div>
                          )}

                        {/* Add Comment Input */}
                        <div className="pt-2">
                          <div className="flex items-start gap-2.5">
                          {/* Inline Comment Composer */}
                          <div className="mt-4 flex items-start gap-3 pt-2">
                            <UserAvatar name={me?.name} avatarUrl={me?.avatarUrl} size="sm" />
                            <div className="flex-1 space-y-2">
                            <div className="flex-1">
                              <textarea
                                rows={2}
                                value={draftComments[post.id] ?? ''}
                                onChange={(e) =>
                                  setDraftComments((prev) => ({ ...prev, [post.id]: e.target.value }))
                                  setDraftComments((prev) => ({
                                    ...prev,
                                    [post.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleAddComment(post.id);
                                  }
                                }}
                                placeholder="Write a constructive reply… (Cmd+Enter to send)"
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                placeholder="Write a constructive reply... (Cmd+Enter to send)"
                                className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20"
                              />
                              <div className="flex items-center justify-end gap-2">
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[11px] text-slate-400">
                                  Markdown supported • <kbd className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded border border-slate-200">⌘+Enter</kbd> to submit
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddComment(post.id)}
                                  disabled={
                                    submittingComment[post.id] || !(draftComments[post.id] ?? '').trim()
                                    submittingComment[post.id] ||
                                    !draftComments[post.id]?.trim()
                                  }
                                  className="btn-primary text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5 shadow-2xs"
                                  onClick={() => void handleAddComment(post.id)}
                                  className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                  <Icon name="chat" className="h-3.5 w-3.5" />
                                  <span>{submittingComment[post.id] ? 'Sending…' : 'Reply'}</span>
                                  {submittingComment[post.id] && (
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  )}
                                  <span>Reply</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => void vote(post.id, 1)} className="icon-btn h-8 w-8" aria-label="Upvote">
                    ▲
                        </>
                      )}
                    </div>
                  </section>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            Page <strong className="text-slate-800">{currentPage + 1}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong> ({totalItems} total discussions)
          </p>
        <div className="flex items-center justify-between border-t border-slate-200/80 pt-4">
          <div className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-800">{page + 1}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>

            {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
              let pageNumber = idx;
              if (totalPages > 5 && currentPage > 2) {
                pageNumber = Math.min(currentPage - 2 + idx, totalPages - 1);
            {Array.from({ length: totalPages }).map((_, idx) => {
              // Only render nearby pages if many
              if (totalPages > 7 && Math.abs(idx - page) > 2 && idx !== 0 && idx !== totalPages - 1) {
                if (idx === 1 || idx === totalPages - 2) {
                  return (
                    <span key={idx} className="px-1 text-xs text-slate-400">
                      …
                    </span>
                  );
                }
                return null;
              }

              const isCurrent = idx === page;
              return (
                <button
                  key={pageNumber}
                  key={idx}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-semibold transition ${
                    currentPage === pageNumber
                      ? 'bg-emerald-600 text-white shadow-xs'
                  onClick={() => setPage(idx)}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'bg-a2sv-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNumber + 1}
                  {idx + 1}
                </button>
              );
            })}

            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* New Discussion Modal */}
      {modalOpen && (
        <Modal
          title={
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <Icon name="chat" className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Start a New Discussion</h3>
                <p className="text-xs text-slate-400">Share your thoughts, solution, or ask the academy</p>
              </div>
            </div>
          }
          title={<h2 className="text-base font-semibold text-slate-900">Start a New Discussion</h2>}
          onClose={() => {
            if (!postingBusy) setModalOpen(false);
            if (!postingBusy) {
              setModalOpen(false);
              setPostError(null);
            }
          }}
        >
          <form onSubmit={handleCreatePost} className="space-y-4">
            {/* Suggested tag / topic pills */}
            {postError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                <Icon name="x" className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{postError}</span>
              </div>
            )}

            {/* Suggested Topic Chips */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Suggested Topics:</p>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Suggested Topics
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      if (!title.includes(`[${topic}]`)) {
                        setTitle((prev) => (prev ? `[${topic}] ${prev}` : `[${topic}] `));
                      const tag = `[${topic}] `;
                      if (!title.includes(tag)) {
                        setTitle((t) => `${tag}${t}`);
                      }
                    }}
                    className="chip bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-lg transition"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-a2sv-300 hover:bg-a2sv-50 hover:text-a2sv-700 transition-colors"
                  >
                    + {topic}
                  </button>
                  <span className="text-sm font-bold text-slate-900">{post.score}</span>
                  <button type="button" onClick={() => void vote(post.id, -1)} className="icon-btn h-8 w-8" aria-label="Downvote">
                    ▼
                ))}
              </div>
            </div>

            {/* Title Input */}
            {/* Title Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Discussion Title</label>
                <span className="text-[11px] text-slate-400">{title.length} / 240</span>
                <label htmlFor="post-title" className="block text-xs font-semibold text-slate-700">
                  Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {title.length} / 240
                </span>
              </div>
              <input
                id="post-title"
                type="text"
                required
                maxLength={240}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How to optimize Dijkstra for dense graphs?"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="e.g., Best approach for dynamic programming state reduction?"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20"
              />
            </div>

            {/* Body Editor with Write / Preview Tabs */}
            {/* Content Field with Write / Preview tabs */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Content</label>
                <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-[11px] font-semibold">
                <label htmlFor="post-body" className="block text-xs font-semibold text-slate-700">
                  Content <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setComposerTab('write')}
                    className={`px-2.5 py-0.5 rounded-md transition ${
                    className={`rounded-md px-2 py-0.5 ${
                      composerTab === 'write' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerTab('preview')}
                    className={`px-2.5 py-0.5 rounded-md transition ${
                    className={`rounded-md px-2 py-0.5 ${
                      composerTab === 'preview' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">{post.title}</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{post.body}</p>

              <div className="mt-3 flex items-center gap-3">
                <button type="button" onClick={() => void toggleComments(post.id)} className="text-xs font-semibold text-a2sv-600 hover:underline">
                  {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
                </button>
              {composerTab === 'write' ? (
                <textarea
                  id="post-body"
                  required
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Explain your thought process, share problem context, or pose your question clearly..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Elaborate on your question or discussion point. Include relevant problem links, edge cases, or code snippets..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20"
                />
              ) : (
                <div className="min-h-[148px] rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {body.trim() ? body : <span className="text-slate-400 italic">Nothing to preview yet.</span>}
                <div className="min-h-[148px] rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm text-slate-800 whitespace-pre-wrap">
                  {body.trim() ? (
                    body
                  ) : (
                    <span className="text-slate-400 italic">Nothing to preview yet.</span>
                  )}
                </div>
              )}
            </div>

            {postError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                {postError}
              </div>
            )}

              {open[post.id] && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                  {(comments[post.id] ?? []).map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <span className="avatar h-7 w-7 text-[10px]">{initials(c.userName ?? 'U')}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700">{c.userName ?? 'Unknown'}</p>
                        <p className="text-sm text-slate-600">{c.body}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={drafts[post.id] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                      placeholder="Write a comment…"
                      className="field-input py-2 text-sm"
                    />
                    <button type="button" onClick={() => void addComment(post.id)} className="btn-primary px-4 py-2 text-sm">
                      Send
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={postingBusy}
                onClick={() => setModalOpen(false)}
                disabled={postingBusy}
                className="btn-ghost"
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={postingBusy || !title.trim() || !body.trim()}
                className="btn-primary inline-flex items-center gap-2"
                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Icon name="chat" className="h-4 w-4" />
                <span>{postingBusy ? 'Publishing…' : 'Publish Discussion'}</span>
                {postingBusy && (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <span>Publish Discussion</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

