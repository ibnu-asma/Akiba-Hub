'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { GroupCard } from './group-card';
import type { Group, SuperGroup, Me, UserSummaryDto } from '@/lib/api';
import { ROLE_LEVEL, type Role } from '@hub/shared';


function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

function Avatar({ name, url, size = 'h-8 w-8 text-xs' }: { name: string; url?: string | null; size?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${size} shrink-0 rounded-full object-cover border border-white shadow-xs`} />;
  }
  return (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800 border border-white shadow-xs`}>
      {initials(name)}
    </span>
  );
}

const ALL = '__all__';


export function GroupsCatalog({
  groups,
  superGroups,
  users,
  me,
}: {
  groups: Group[];
  superGroups: SuperGroup[];
  users?: UserSummaryDto[];
  me: Me;
}) {
  const [activeTab, setActiveTab] = useState<'groups' | 'users'>('groups');
  
  const [q, setQ] = useState('');
  const [superGroupId, setSuperGroupId] = useState(ALL);
  const [country, setCountry] = useState(ALL);
  

  const [page, setPage] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  const pageSize = 12;

  const [userGroupFilter, setUserGroupFilter] = useState(ALL);
  const [userRoleFilter, setUserRoleFilter] = useState(ALL);
  const [userCountryFilter, setUserCountryFilter] = useState(ALL);
  const [userUnivFilter, setUserUnivFilter] = useState(ALL);


  const isHead = (ROLE_LEVEL[me.role as Role] ?? 1) >= 2;
  const isHoA = (ROLE_LEVEL[me.role as Role] ?? 1) >= 3;

  // Split groups for HoE: My Cohorts vs All Groups
  const myCohorts = useMemo(() => groups.filter(g => g.heads.some((h) => h.id === me.id)), [groups, me.id]);
  const otherGroups = useMemo(() => groups.filter(g => !g.heads.some((h) => h.id === me.id)), [groups, me.id]);

const filterGroup = (g: Group) => {
    const query = q.trim().toLowerCase();
    if (query) {
      const matchName = g.name.toLowerCase().includes(query) || g.shortName.toLowerCase().includes(query);
      const matchCountry = g.country?.toLowerCase().includes(query);
      if (!matchName && !matchCountry) return false;
    }
    if (superGroupId !== ALL && g.superGroupId !== superGroupId) return false;
    if (country !== ALL && g.country !== country) return false;
    return true;
  };

  const filteredMyCohorts = useMemo(() => {
    return myCohorts.filter(filterGroup).sort((a, b) => a.name.localeCompare(b.name));
  }, [myCohorts, q, superGroupId, country]);

  // Apply filters to Groups (only applies to All Groups section)
  const filteredGroups = useMemo(() => {
    const source = isHead && !isHoA ? otherGroups : groups;
    return source.filter(filterGroup).sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, otherGroups, q, superGroupId, country, isHead, isHoA]);

  const pagedGroups = useMemo(() => {
    const start = page * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, page]);

  // Apply filters to Users

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const query = q.trim().toLowerCase();
    return users.filter(u => {
      if (query) {
        if (!u.name.toLowerCase().includes(query) && !u.email.toLowerCase().includes(query)) return false;
      }
      if (userGroupFilter !== ALL && u.groupId !== userGroupFilter) return false;
      if (userRoleFilter !== ALL && u.role !== userRoleFilter) return false;
      if (userCountryFilter !== ALL && (u.country ?? '') !== userCountryFilter) return false;
      if (userUnivFilter !== ALL && (u.university ?? '') !== userUnivFilter) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, q, userGroupFilter, userRoleFilter, userCountryFilter, userUnivFilter]);

  const userGroups = useMemo(() => {
    if (!users) return [];
    const ids = new Set(users.map(u => u.groupId).filter(Boolean) as string[]);
    return groups.filter(g => ids.has(g.id)).sort((a,b) => a.name.localeCompare(b.name));
  }, [users, groups]);
  
  const userCountries = useMemo(() => {
    if (!users) return [];
    return Array.from(new Set(users.map(u => u.country).filter(Boolean) as string[])).sort();
  }, [users]);
  
  const userUnivs = useMemo(() => {
    if (!users) return [];
    return Array.from(new Set(users.map(u => u.university).filter(Boolean) as string[])).sort();
  }, [users]);
  
  const userRoles = useMemo(() => {
    if (!users) return [];
    return Array.from(new Set(users.map(u => u.role))).sort();
  }, [users]);


  const pagedUsers = useMemo(() => {
    const start = usersPage * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, usersPage]);

  const totalGroupsPages = Math.ceil(filteredGroups.length / pageSize);
  const totalUsersPages = Math.ceil(filteredUsers.length / pageSize);

  const countries = useMemo(() => {
    const set = new Set(groups.map((g) => g.country).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [groups]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Groups & Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isHead ? 'Manage your cohorts and browse student rosters.' : 'Explore cohorts and track detailed group progress.'}
          </p>
        </div>
        
        {/* Toggle Tabs (Only for Heads) */}
        {isHead && (
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1 font-semibold text-sm self-start md:self-auto">
            <button
              onClick={() => { setActiveTab('groups'); setQ(''); }}
              className={`rounded-lg px-4 py-1.5 transition-all ${activeTab === 'groups' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Groups
            </button>
            <button
              onClick={() => { setActiveTab('users'); setQ(''); }}
              className={`rounded-lg px-4 py-1.5 transition-all ${activeTab === 'users' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Users
            </button>
          </div>
        )}
      </header>

      {/* Filters (Shared) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'groups' ? "Search groups by name or country..." : "Search users by name or email..."}
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); setUsersPage(0); }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100"
          />
        </div>
        
        {activeTab === 'groups' && (
          <>
            <select
              value={superGroupId}
              onChange={(e) => { setSuperGroupId(e.target.value); setPage(0); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none text-slate-700"
            >
              <option value={ALL}>All Super Groups</option>
              {superGroups.map((sg) => (
                <option key={sg.id} value={sg.id}>{sg.name}</option>
              ))}
            </select>

            <select
              value={country}
              onChange={(e) => { setCountry(e.target.value); setPage(0); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none text-slate-700"
            >
              <option value={ALL}>All Countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {activeTab === 'groups' ? (
        <div className="space-y-10">
          {isHead && !isHoA && filteredMyCohorts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">My Cohorts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMyCohorts.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {isHead && !isHoA && filteredMyCohorts.length > 0 && (
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">All Groups</h2>
            )}
            
            {pagedGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagedGroups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                <Icon name="search" className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                <h3 className="text-sm font-semibold text-slate-900">No groups found</h3>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters.</p>
              </div>
            )}

            {totalGroupsPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-6">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500 font-medium">Page {page + 1} of {totalGroupsPages}</span>
                <button
                  disabled={page >= totalGroupsPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
<table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Group</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {pagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                pagedUsers.map((u) => {
                  const userGroup = groups.find(g => g.id === u.groupId);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/profile?userId=${u.id}`} className="flex items-center gap-3 group/link">
                          <Avatar name={u.name} url={u.avatarUrl} size="h-10 w-10 text-sm" />
                          <span className="text-sm font-medium text-slate-900 group-hover/link:text-a2sv-600 transition">{u.name}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {userGroup ? (
                          <Link href={`/groups/${userGroup.id}`} className="hover:text-a2sv-600 hover:underline inline-flex items-center gap-1">
                            {userGroup.name}
                          </Link>
                        ) : (
                          <span className="text-slate-300">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">
                        {u.role.replace(/_/g, ' ')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          
          {totalUsersPages > 1 && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm text-slate-500">
                Showing {usersPage * pageSize + 1} to {Math.min((usersPage + 1) * pageSize, filteredUsers.length)} of {filteredUsers.length} users
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={usersPage === 0}
                  onClick={() => setUsersPage(usersPage - 1)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  Prev
                </button>
                
                <div className="hidden sm:flex items-center px-1">
                  {Array.from({ length: totalUsersPages }).map((_, i) => {
                    if (i === 0 || i === totalUsersPages - 1 || Math.abs(i - usersPage) <= 1) {
                      return (
                        <button
                          key={i}
                          onClick={() => setUsersPage(i)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${i === usersPage ? 'bg-a2sv-500 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                          {i + 1}
                        </button>
                      );
                    }
                    if (Math.abs(i - usersPage) === 2) {
                      return <span key={i} className="text-slate-400 px-1">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  disabled={usersPage >= totalUsersPages - 1}
                  onClick={() => setUsersPage(usersPage + 1)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
