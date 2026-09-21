'use client';

import { useState } from 'react';
import { Icon } from '@/components/icon';
import { ProfileAvatarSection } from '@/components/profile/profile-editor';
import { ProfileEditorModal } from '@/components/profile/profile-editor-modal';
import { ProfileConsistency } from '@/components/profile/profile-consistency';
import { ProfileAttendance } from '@/components/profile/profile-attendance';
import { minutesToDays } from '@/lib/format';
import type { Me, UserAttendanceRecord } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function ProfileView({
  targetUser,
  groupName,
  superGroupName,
  isViewingSelf,
  solvedCount,
  totalMinutes,
  attendanceRecords,
  consistencySolves,
}: {
  targetUser: Me;
  groupName?: string | null;
  superGroupName?: string | null;
  isViewingSelf: boolean;
  solvedCount: number;
  totalMinutes: number;
  attendanceRecords: UserAttendanceRecord[];
  consistencySolves: { day: string; count: number }[];
}) {
  // Toggle between self view and public view preview
  const [viewMode, setViewMode] = useState<'self' | 'public'>('self');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const effectiveMode = isViewingSelf ? viewMode : 'public';

  // Overall attendance rate
  const totalAtt = attendanceRecords.length;
  const presentAtt = attendanceRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
  const attRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 95;

  // Active consistency streak
  const activeStreak = consistencySolves.length > 0 ? Math.min(consistencySolves.length, 5) : 1;

  return (
    <div className="space-y-6">
      {/* Top Banner: View mode selector for own profile */}
      {isViewingSelf && (
        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">View Mode:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('self')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  effectiveMode === 'self'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon name="user" className="h-3.5 w-3.5" />
                My Account
              </button>
              <button
                type="button"
                onClick={() => setViewMode('public')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  effectiveMode === 'public'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon name="sparkles" className="h-3.5 w-3.5" />
                Public View
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditorOpen(true)}
            className="btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold cursor-pointer"
          >
            <Icon name="sliders" className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>
      )}

      {/* Hero Profile Card */}
      <section className="card p-6 md:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar Section */}
          <div className="shrink-0">
            {effectiveMode === 'self' ? (
              <ProfileAvatarSection
                avatarUrl={targetUser.avatarUrl}
                name={targetUser.name}
                isViewingSelf={true}
              />
            ) : (
              <div className="relative group">
                <div className="h-28 w-28 overflow-hidden rounded-full ring-4 ring-slate-100 shadow-md">
                  {targetUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={targetUser.avatarUrl}
                      alt={targetUser.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-a2sv-600 via-teal-600 to-emerald-600 text-white font-bold text-3xl flex items-center justify-center">
                      {initials(targetUser.name)}
                    </div>
                  )}
                </div>
                <span
                  className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white bg-emerald-500 shadow-xs"
                  title="Online & Active"
                />
              </div>
            )}
          </div>

          {/* Core Info */}
          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    {targetUser.name}
                  </h1>
                  <span className="inline-flex items-center rounded-full bg-a2sv-50 px-2.5 py-0.5 text-xs font-bold text-a2sv-700 border border-a2sv-200/60 uppercase tracking-wide">
                    {targetUser.role.replace(/_/g, ' ')}
                  </span>
                </div>

                {effectiveMode === 'self' && (
                  <p className="mt-1 text-xs text-slate-400 font-medium">
                    {targetUser.email}
                  </p>
                )}
              </div>

              {effectiveMode === 'self' && (
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(true)}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Icon name="sliders" className="h-3.5 w-3.5" />
                  Edit Details
                </button>
              )}
            </div>

            {/* Bio */}
            <p className="mt-3 text-sm text-slate-600 max-w-2xl leading-relaxed">
              {targetUser.bio || (
                <span className="italic text-slate-400">
                  {effectiveMode === 'self'
                    ? 'Add a bio describing your goals, background, or favorite algorithms by clicking "Edit Profile".'
                    : 'A2SV Academy scholar solving daily algorithms and building software solutions.'}
                </span>
              )}
            </p>

            {/* Quick Social Links Bar directly in Hero Card */}
            <div className="mt-3.5 flex items-center justify-center md:justify-start gap-2 flex-wrap">
              {targetUser.linkedin && (
                <a
                  href={targetUser.linkedin.startsWith('http') ? targetUser.linkedin : `https://${targetUser.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200/60 transition"
                  title="LinkedIn"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.7a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
                  </svg>
                  <span>LinkedIn</span>
                </a>
              )}

              {targetUser.github && (
                <a
                  href={targetUser.github.startsWith('http') ? targetUser.github : `https://github.com/${targetUser.github.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 transition"
                  title="GitHub"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                  <span>GitHub</span>
                </a>
              )}

              {targetUser.instagram && (
                <a
                  href={targetUser.instagram.startsWith('http') ? targetUser.instagram : `https://instagram.com/${targetUser.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700 hover:bg-pink-100 border border-pink-200/60 transition"
                  title="Instagram"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span>Instagram</span>
                </a>
              )}

              {targetUser.telegram && (
                <a
                  href={targetUser.telegram.startsWith('http') ? targetUser.telegram : `https://t.me/${targetUser.telegram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 border border-sky-200/60 transition"
                  title="Telegram"
                >
                  <Icon name="chat" className="h-3.5 w-3.5" />
                  <span>Telegram</span>
                </a>
              )}

              {targetUser.leetcode && (
                <a
                  href={`https://leetcode.com/u/${targetUser.leetcode.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 border border-amber-200/60 transition"
                  title="LeetCode"
                >
                  <Icon name="code" className="h-3.5 w-3.5" />
                  <span>LeetCode</span>
                </a>
              )}

              {targetUser.codeforces && (
                <a
                  href={`https://codeforces.com/profile/${targetUser.codeforces.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition"
                  title="Codeforces"
                >
                  <Icon name="chart" className="h-3.5 w-3.5" />
                  <span>Codeforces</span>
                </a>
              )}

              <a
                href={`mailto:${targetUser.email}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                title={targetUser.email}
              >
                <svg className="h-3.5 w-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email</span>
              </a>
            </div>

            {/* Quick Metrics Strip: Consistent slate colors, no status tier tag */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-slate-100">
              <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Problems Solved
                </span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {solvedCount}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Time Spent
                </span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {totalMinutes}
                  <span className="text-xs font-semibold text-slate-400 ml-1">min</span>
                </p>
                <span className="text-[10px] font-semibold text-slate-400 truncate block">
                  {minutesToDays(totalMinutes)}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Contest Rating
                </span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {targetUser.rating ?? 1200}
                </p>
              </div>

              

              

              <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Attendance
                </span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {attRate}%
                </p>
                <span className="text-[10px] font-semibold text-slate-400">
                  {activeStreak}-day streak
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Redesigned Compact Academic & Personal Credentials */}
      <section className="card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Academic & Personal Credentials
            </h2>
          </div>
          {isViewingSelf && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="text-xs font-semibold text-a2sv-600 hover:text-a2sv-700 transition cursor-pointer flex items-center gap-1"
            >
              <Icon name="sliders" className="h-3.5 w-3.5" />
              Edit Credentials
            </button>
          )}
        </div>

        {/* Compact Key-Value Metadata Grid */}
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          <CompactDetail label="Program" value={superGroupName || 'G1 Akiba - Remote'} icon="bookmark" />
          <CompactDetail label="Group" value={groupName || 'Remote Group 4'} icon="users" />
          <CompactDetail label="University" value={targetUser.university || 'ASTU'} icon="file" />
          <CompactDetail label="Department" value={targetUser.department || 'Computer Science & Engineering'} icon="list" />
          <CompactDetail label="Student ID" value={targetUser.studentId || 'ATR/1234/12'} icon="shield" />
          <CompactDetail label="Country" value={targetUser.country || 'Ethiopia'} icon="map" />
          <CompactDetail
            label="Member Since"
            value={
              targetUser.createdAt
                ? new Date(targetUser.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Sep 2024'
            }
            icon="calendar"
          />
        </div>

        {/* Social Accounts with Brand Icons Strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Connected Accounts:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* LinkedIn */}
            {targetUser.linkedin ? (
              <a
                href={targetUser.linkedin.startsWith('http') ? targetUser.linkedin : `https://${targetUser.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 text-xs font-semibold transition"
              >
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.7a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
                </svg>
                <span>LinkedIn</span>
                <Icon name="externalLink" className="h-3 w-3 opacity-60" />
              </a>
            ) : isViewingSelf ? (
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 text-xs font-medium transition cursor-pointer"
              >
                <span>+ Add LinkedIn</span>
              </button>
            ) : null}

            {/* GitHub */}
            {targetUser.github ? (
              <a
                href={targetUser.github.startsWith('http') ? targetUser.github : `https://github.com/${targetUser.github.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition"
              >
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>GitHub</span>
                <Icon name="externalLink" className="h-3 w-3 opacity-60" />
              </a>
            ) : isViewingSelf ? (
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 text-xs font-medium transition cursor-pointer"
              >
                <span>+ Add GitHub</span>
              </button>
            ) : null}

            {/* Instagram */}
            {targetUser.instagram ? (
              <a
                href={targetUser.instagram.startsWith('http') ? targetUser.instagram : `https://instagram.com/${targetUser.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200/60 text-xs font-semibold transition"
              >
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>{targetUser.instagram.startsWith('@') ? targetUser.instagram : `@${targetUser.instagram}`}</span>
                <Icon name="externalLink" className="h-3 w-3 opacity-60" />
              </a>
            ) : isViewingSelf ? (
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 text-xs font-medium transition cursor-pointer"
              >
                <span>+ Add Instagram</span>
              </button>
            ) : null}

            {/* Telegram */}
            {targetUser.telegram ? (
              <a
                href={targetUser.telegram.startsWith('http') ? targetUser.telegram : `https://t.me/${targetUser.telegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/60 text-xs font-semibold transition"
              >
                <Icon name="chat" className="h-3.5 w-3.5" />
                <span>Telegram</span>
                <Icon name="externalLink" className="h-3 w-3 opacity-60" />
              </a>
            ) : isViewingSelf ? (
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 text-xs font-medium transition cursor-pointer"
              >
                <span>+ Add Telegram</span>
              </button>
            ) : null}

            {/* LeetCode */}
            {targetUser.leetcode ? (
              <a
                href={`https://leetcode.com/u/${targetUser.leetcode.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60 text-xs font-semibold transition"
              >
                <Icon name="code" className="h-3.5 w-3.5" />
                <span>LeetCode</span>
                <Icon name="externalLink" className="h-3 w-3 opacity-60" />
              </a>
            ) : isViewingSelf ? (
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 text-xs font-medium transition cursor-pointer"
              >
                <span>+ Add LeetCode</span>
              </button>
            ) : null}

            {/* Codeforces */}
            {targetUser.codeforces ? (
              <a
                href={`https://codeforces.com/profile/${targetUser.codeforces.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 text-xs font-semibold transition"
              >
                <Icon name="chart" className="h-3.5 w-3.5" />
                <span>Codeforces</span>
                <Icon name="externalLink" className="h-3 w-3 opacity-60" />
              </a>
            ) : isViewingSelf ? (
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 text-xs font-medium transition cursor-pointer"
              >
                <span>+ Add Codeforces</span>
              </button>
            ) : null}

            {/* Email */}
            <a
              href={`mailto:${targetUser.email}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
            >
              <svg className="h-3.5 w-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email</span>
            </a>
          </div>
        </div>
      </section>

      {/* Consistency Component: Collapsed = 52-week heatmap; Expanded = Attendance-style date cards */}
      <ProfileConsistency
        solves={consistencySolves}
        availableYears={[2026, 2025, 2024]}
      />

      {/* Attendance Component: Collapsed = 52-week heatmap; Expanded = Attendance-style date cards */}
      <ProfileAttendance
        records={attendanceRecords}
        availableYears={[2026, 2025, 2024]}
      />

      {/* Edit Profile Modal */}
      {isViewingSelf && (
        <ProfileEditorModal
          user={targetUser}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
}

function CompactDetail({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 transition hover:bg-slate-50">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white border border-slate-200/80 text-a2sv-600 shadow-2xs">
        <Icon name={icon} className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
          {label}
        </p>
        <p className="font-bold text-xs text-slate-800 truncate mt-0.5 leading-snug">{value}</p>
      </div>
    </div>
  );
}
