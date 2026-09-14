import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import {
  groups,
  groupHeads,
  users,
  superGroups,
  sessions,
  sessionGroups,
  attendanceRecords,
  eq,
  and,
  isNull,
  inArray,
  asc,
  desc,
  sql,
} from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';
import { DomainError, ROLE_NAMES } from '@hub/shared';
import { SummaryService } from '../summary/summary.service.js';

export interface GroupSummary {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  country: string | null;
  superGroupId: string | null;
  superGroupName: string | null;
  heads: { id: string; name: string }[];
  students: { id: string; name: string; avatarUrl: string | null }[];
  studentCount: number;
}

/** Group aggregate (HoA admin; HoE/HoA read; spec §8.6). */
@Injectable()
export class GroupsService {
  constructor(
    private readonly db: DatabaseProvider,
    private readonly audit: AuditService,
    private readonly summary: SummaryService,
  ) {}

  async create(input: {
    name: string;
    shortName: string;
    description?: string;
    country?: string;
    superGroupId?: string;
    headUserIds: string[];
    actor: { id: string; name: string };
  }): Promise<{ id: string; name: string }> {
    const rows = await this.db.db
      .insert(groups)
      .values({
        name: input.name,
        shortName: input.shortName,
        description: input.description ?? null,
        country: input.country ?? null,
        superGroupId: input.superGroupId ?? null,
      })
      .returning({ id: groups.id, name: groups.name })
      .execute();
    const created = rows[0]!;
    if (input.headUserIds.length > 0) {
      await this.db.db
        .insert(groupHeads)
        .values(input.headUserIds.map((userId) => ({ groupId: created.id, userId })))
        .execute();
    }
    await this.audit.record({
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: ROLE_NAMES.head_of_academy,
      action: 'CREATE',
      entityType: 'group',
      entityId: created.id,
      description: `created a group called '${input.name}'`,
    });
    return created;
  }

  /** Edit a group's details (SPEC §8.6). */
  async update(
    id: string,
    input: { name: string; shortName: string; description?: string | null; country?: string | null; superGroupId?: string | null },
    actor: { id: string; name: string },
  ): Promise<void> {
    const rows = await this.db.db
      .update(groups)
      .set({
        name: input.name,
        shortName: input.shortName,
        description: input.description ?? null,
        country: input.country ?? null,
        superGroupId: input.superGroupId ?? null,
      })
      .where(eq(groups.id, id))
      .returning()
      .execute();
    if (!rows[0]) throw DomainError.notFound(`Group ${id}`);
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: ROLE_NAMES.head_of_academy,
      action: 'UPDATE',
      entityType: 'group',
      entityId: id,
      description: `updated the group '${input.name}'`,
    });
  }

  async list(): Promise<GroupSummary[]> {
    const groupRows = await this.db.db
      .select()
      .from(groups)
      .leftJoin(superGroups, eq(groups.superGroupId, superGroups.id))
      .where(isNull(groups.deletedAt))
      .orderBy(asc(groups.name))
      .execute();
    if (groupRows.length === 0) return [];

    const ids = groupRows.map((r) => r.groups.id);
    const headRows = await this.db.db
      .select({ groupId: groupHeads.groupId, userId: users.id, name: users.name })
      .from(groupHeads)
      .innerJoin(users, eq(groupHeads.userId, users.id))
      .execute();
    const studentRows = await this.db.db
      .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, groupId: users.groupId })
      .from(users)
      .where(and(inArray(users.groupId, ids), eq(users.isRemoved, false), eq(users.role, 'student')))
      .execute();

    const byHead: Record<string, { id: string; name: string }[]> = {};
    for (const h of headRows) {
      (byHead[h.groupId] ??= []).push({ id: h.userId, name: h.name });
    }
    const byGroupStudents: Record<string, { id: string; name: string; avatarUrl: string | null }[]> = {};
    for (const s of studentRows) {
      if (s.groupId) (byGroupStudents[s.groupId] ??= []).push({ id: s.id, name: s.name, avatarUrl: s.avatarUrl });
    }

    return groupRows.map((r) => ({
      id: r.groups.id,
      name: r.groups.name,
      shortName: r.groups.shortName,
      description: r.groups.description,
      country: r.groups.country,
      superGroupId: r.groups.superGroupId,
      superGroupName: r.super_groups?.name ?? null,
      heads: byHead[r.groups.id] ?? [],
      students: byGroupStudents[r.groups.id] ?? [],
      studentCount: (byGroupStudents[r.groups.id] ?? []).length,
    }));
  }

  async softDelete(id: string, actor: { id: string; name: string }): Promise<void> {
    const rows = await this.db.db
      .update(groups)
      .set({ deletedAt: new Date() })
      .where(eq(groups.id, id))
      .returning()
      .execute();
    if (!rows[0]) throw DomainError.notFound(`Group ${id}`);
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: ROLE_NAMES.head_of_academy,
      action: 'DELETE',
      entityType: 'group',
      entityId: id,
      description: `deleted the group '${rows[0].name}'`,
    });
  }

  /** Replace the set of heads assigned to a group (SPEC §11 assign-head). */
  async assignHeads(groupId: string, headUserIds: string[], actor: { id: string; name: string }): Promise<void> {
    const g = await this.db.db.select().from(groups).where(eq(groups.id, groupId)).limit(1).execute();
    if (!g[0]) throw DomainError.notFound(`Group ${groupId}`);
    await this.db.db.delete(groupHeads).where(eq(groupHeads.groupId, groupId)).execute();
    if (headUserIds.length > 0) {
      await this.db.db
        .insert(groupHeads)
        .values(headUserIds.map((userId) => ({ groupId, userId })))
        .execute();
    }
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: ROLE_NAMES.head_of_academy,
      action: 'UPDATE',
      entityType: 'group',
      entityId: groupId,
      description: `assigned ${headUserIds.length} head(s) to group '${g[0].name}'`,
    });
  }

  /** Assign students into a group (SPEC §11 — the invite follow-up). */
  async addStudents(groupId: string, userIds: string[], actor: { id: string; name: string }): Promise<{ added: number }> {
    const g = await this.db.db.select().from(groups).where(eq(groups.id, groupId)).limit(1).execute();
    if (!g[0]) throw DomainError.notFound(`Group ${groupId}`);
    await this.db.db.update(users).set({ groupId }).where(inArray(users.id, userIds)).execute();
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: ROLE_NAMES.head_of_academy,
      action: 'UPDATE',
      entityType: 'group',
      entityId: groupId,
      description: `assigned ${userIds.length} student(s) to group '${g[0].name}'`,
    });
    return { added: userIds.length };
  }

  /** Remove a student from a group (clear their groupId). */
  async removeStudent(groupId: string, userId: string, actor: { id: string; name: string }): Promise<void> {
    await this.db.db.update(users).set({ groupId: null }).where(and(eq(users.id, userId), eq(users.groupId, groupId))).execute();
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: ROLE_NAMES.head_of_academy,
      action: 'UPDATE',
      entityType: 'group',
      entityId: groupId,
      description: `removed a student from a group`,
    });
  }

  /** Get group summary by ID. */
  async getById(id: string): Promise<GroupSummary> {
    const groupRows = await this.db.db
      .select()
      .from(groups)
      .leftJoin(superGroups, eq(groups.superGroupId, superGroups.id))
      .where(and(eq(groups.id, id), isNull(groups.deletedAt)))
      .limit(1)
      .execute();

    if (!groupRows[0]) throw DomainError.notFound(`Group ${id}`);
    const r = groupRows[0];

    const headRows = await this.db.db
      .select({ groupId: groupHeads.groupId, userId: users.id, name: users.name })
      .from(groupHeads)
      .innerJoin(users, eq(groupHeads.userId, users.id))
      .where(eq(groupHeads.groupId, id))
      .execute();

    const studentRows = await this.db.db
      .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, rating: users.rating })
      .from(users)
      .where(and(eq(users.groupId, id), eq(users.isRemoved, false), eq(users.role, 'student')))
      .orderBy(asc(users.name))
      .execute();

    return {
      id: r.groups.id,
      name: r.groups.name,
      shortName: r.groups.shortName,
      description: r.groups.description,
      country: r.groups.country,
      superGroupId: r.groups.superGroupId,
      superGroupName: r.super_groups?.name ?? null,
      heads: headRows.map((h) => ({ id: h.userId, name: h.name })),
      students: studentRows.map((s) => ({ id: s.id, name: s.name, avatarUrl: s.avatarUrl })),
      studentCount: studentRows.length,
    };
  }

  /** Get 7-tab progress data for a specific group. */
  async getProgress(id: string) {
    const group = await this.getById(id);
    const scope = { role: 'head_of_education', isGlobal: false, groupIds: [id] };

    const [attendance, consistency, completion, exercise, upsolving, divisions] = await Promise.all([
      this.summary.attendance(scope),
      this.summary.consistency(scope),
      this.summary.completion(scope),
      this.summary.exercise(scope),
      this.summary.upsolving(scope),
      this.summary.divisions(scope),
    ]);

    // Query recent sessions for this group
    const sessionRows = await this.db.db
      .select({
        id: sessions.id,
        name: sessions.name,
        date: sql<string>`to_char(${sessions.date}, 'YYYY-MM-DD')`,
        startTime: sessions.startTime,
        endTime: sessions.endTime,
      })
      .from(sessions)
      .innerJoin(sessionGroups, eq(sessions.id, sessionGroups.sessionId))
      .where(eq(sessionGroups.groupId, id))
      .orderBy(desc(sessions.date), desc(sessions.createdAt))
      .limit(30)
      .execute();

    const sessionIds = sessionRows.map((s) => s.id);
    let recordRows: { sessionId: string; userId: string; status: string }[] = [];
    if (sessionIds.length > 0) {
      recordRows = await this.db.db
        .select({
          sessionId: attendanceRecords.sessionId,
          userId: attendanceRecords.userId,
          status: attendanceRecords.status,
        })
        .from(attendanceRecords)
        .where(inArray(attendanceRecords.sessionId, sessionIds))
        .execute();
    }

    const sessionStatusByStudent: Record<string, Record<string, string>> = {};
    for (const r of recordRows) {
      (sessionStatusByStudent[r.userId] ??= {})[r.sessionId] = r.status;
    }

    const attendanceSessions = sessionRows.map((s) => ({
      id: s.id,
      name: s.name,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

    // Stats calculations
    const totalPresent = attendance.reduce((sum, r) => sum + r.present, 0);
    const totalAbsent = attendance.reduce((sum, r) => sum + r.absent, 0);
    const totalExcused = attendance.reduce((sum, r) => sum + r.excused, 0);
    const totalLate = attendance.reduce((sum, r) => sum + r.late, 0);
    const totalRecords = totalPresent + totalAbsent + totalExcused + totalLate;
    const overallPresentPct = totalRecords ? Math.round((totalPresent / totalRecords) * 100) : 0;

    const totalSolves = consistency.reduce((sum, r) => sum + r.totalSolves, 0);
    const avgSolves = consistency.length ? Math.round(totalSolves / consistency.length) : 0;

    const totalExercises = completion.length > 0 ? completion[0].total : 0;
    const avgCompleted = completion.length
      ? Math.round(completion.reduce((sum, r) => sum + r.solved, 0) / completion.length)
      : 0;
    const avgCompletionPct = completion.length
      ? Math.round(completion.reduce((sum, r) => sum + r.pct, 0) / completion.length)
      : 0;
    const avgAvailable = Math.max(0, totalExercises - avgCompleted);

    return {
      group,
      summary: {
        studentCount: group.studentCount,
        totalPresent,
        totalAbsent,
        totalExcused,
        totalLate,
        overallPresentPct,
        totalSolves,
        avgSolves,
        totalExercises,
        avgCompleted,
        avgCompletionPct,
        avgAvailable,
      },
      attendance,
      attendanceSessions,
      sessionStatusByStudent,
      consistency,
      completion,
      exercise,
      upsolving,
      divisions,
    };
  }
}