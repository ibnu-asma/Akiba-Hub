import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { sessions, sessionGroups, attendanceRecords, users, and, asc, desc, eq, inArray, sql } from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';
import { ATTENDANCE_STATUSES, DomainError, ROLE_NAMES, isHoEOrHigher } from '@hub/shared';

type Status = (typeof ATTENDANCE_STATUSES)[keyof typeof ATTENDANCE_STATUSES];

export interface CreateSessionInput {
  name: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  resourceLink?: string;
  recordingLink?: string;
  lecturer?: string;
  fundId?: string;
  calendarInvite?: boolean;
  groupIds: string[];
}

/** Session + attendance use-cases (HoE/HoA; spec §7.3–7.4). */
@Injectable()
export class SessionsService {
  constructor(private readonly db: DatabaseProvider, private readonly audit: AuditService) {}

  async create(input: CreateSessionInput, actor: { id: string; name: string; role: string }) {
    if (!isHoEOrHigher(actor.role)) throw DomainError.forbidden('Only heads can create sessions');
    const rows = await this.db.db
      .insert(sessions)
      .values({
        name: input.name,
        description: input.description ?? null,
        date: input.date,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        location: input.location ?? null,
        resourceLink: input.resourceLink ?? null,
        recordingLink: input.recordingLink ?? null,
        lecturer: input.lecturer ?? null,
        fundId: input.fundId ?? null,
        calendarInvite: input.calendarInvite ?? false,
        createdBy: actor.id,
      })
      .returning()
      .execute();
    const created = rows[0]!;
    if (input.groupIds.length > 0) {
      await this.db.db
        .insert(sessionGroups)
        .values(input.groupIds.map((groupId) => ({ sessionId: created.id, groupId })))
        .execute();
    }
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'session',
      entityId: created.id,
      description: `created an event called '${input.name}'`,
    });
    return created;
  }

  /** Sessions visible to the actor's scope (all for HoA; by groupIds otherwise). */
  async list(groupIds: string[], all: boolean) {
    if (all) {
      return this.db.db.select().from(sessions).orderBy(desc(sessions.date)).execute();
    }
    if (groupIds.length === 0) return [];
    const links = await this.db.db
      .select({ sessionId: sessionGroups.sessionId })
      .from(sessionGroups)
      .where(inArray(sessionGroups.groupId, groupIds))
      .execute();
    const ids = links.map((r) => r.sessionId);
    if (ids.length === 0) return [];
    return this.db.db.select().from(sessions).where(inArray(sessions.id, ids)).orderBy(desc(sessions.date)).execute();
  }

  /** Roster per session with current attendance statuses (spec §7.4). */
  async getAttendance(sessionId: string, groupId: string) {
    const roster = await this.db.db
      .select({ userId: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.groupId, groupId), eq(users.isRemoved, false)))
      .execute();
    const records = await this.db.db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, sessionId))
      .execute();
    const byUser: Record<string, (typeof records)[number]> = {};
    for (const r of records) byUser[r.userId] = r;
    return roster.map((u) => ({
      userId: u.userId,
      name: u.name,
      status: (byUser[u.userId]?.status as Status | undefined) ?? 'pending',
      checkInAt: byUser[u.userId]?.checkInAt ?? null,
      checkOutAt: byUser[u.userId]?.checkOutAt ?? null,
    }));
  }

  /** Mark attendance for a roster (individual or batch). Present/Late capture a check-in time. */
  async setAttendance(
    sessionId: string,
    rows: { userId: string; status: string }[],
    markedBy: string,
  ): Promise<void> {
    for (const r of rows) {
      if (!(Object.values(ATTENDANCE_STATUSES) as string[]).includes(r.status)) {
        throw DomainError.validation(`Invalid status: ${r.status}`);
      }
      const arriving = r.status === 'present' || r.status === 'late';
      const existing = await this.db.db
        .select({ id: attendanceRecords.id, checkInAt: attendanceRecords.checkInAt })
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.sessionId, sessionId), eq(attendanceRecords.userId, r.userId)))
        .execute();
      const checkInAt = arriving ? (existing[0]?.checkInAt ?? new Date()) : null;
      if (existing[0]) {
        await this.db.db
          .update(attendanceRecords)
          .set({ status: r.status, markedBy, checkInAt })
          .where(eq(attendanceRecords.id, existing[0].id))
          .execute();
      } else {
        await this.db.db
          .insert(attendanceRecords)
          .values({ sessionId, userId: r.userId, status: r.status, markedBy, checkInAt })
          .execute();
      }
    }
  }

  /** Monthly color-coded grid — a group's students × that month's sessions (SPEC §7.4). */
  async getAttendanceGrid(groupId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const start = `${month}-01`;
    const next = mon === 12 ? [year + 1, 1] : [year, mon + 1];
    const end = `${String(next[0]).padStart(4, '0')}-${String(next[1]).padStart(2, '0')}-01`;

    const sessionRows = await this.db.db
      .select({ id: sessions.id, name: sessions.name, date: sessions.date })
      .from(sessions)
      .innerJoin(sessionGroups, eq(sessions.id, sessionGroups.sessionId))
      .where(and(eq(sessionGroups.groupId, groupId), sql`${sessions.date} >= ${start}::date`, sql`${sessions.date} < ${end}::date`))
      .orderBy(asc(sessions.date))
      .execute();

    const students = await this.db.db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.groupId, groupId), eq(users.role, 'student'), eq(users.isRemoved, false)))
      .orderBy(asc(users.name))
      .execute();

    const sessionIds = sessionRows.map((s) => s.id);
    const records = sessionIds.length
      ? await this.db.db.select().from(attendanceRecords).where(inArray(attendanceRecords.sessionId, sessionIds)).execute()
      : [];

    return {
      sessions: sessionRows,
      students: students.map((st) => ({
        userId: st.id,
        name: st.name,
        cells: Object.fromEntries(records.filter((r) => r.userId === st.id).map((r) => [r.sessionId, r.status])),
      })),
    };
  }
}

export { ROLE_NAMES };