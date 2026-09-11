import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { groups, groupHeads, users, superGroups, eq, and, isNull, inArray } from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';
import { DomainError, ROLE_NAMES } from '@hub/shared';

export interface GroupSummary {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  country: string | null;
  superGroupId: string | null;
  heads: { id: string; name: string }[];
  studentCount: number;
}

/** Group aggregate (HoA admin; HoE/HoA read; spec §8.6). */
@Injectable()
export class GroupsService {
  constructor(private readonly db: DatabaseProvider, private readonly audit: AuditService) {}

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

  async list(): Promise<GroupSummary[]> {
    const groupRows = await this.db.db
      .select()
      .from(groups)
      .leftJoin(superGroups, eq(groups.superGroupId, superGroups.id))
      .where(isNull(groups.deletedAt))
      .execute();
    if (groupRows.length === 0) return [];

    const ids = groupRows.map((r) => r.groups.id);
    const headRows = await this.db.db
      .select({ groupId: groupHeads.groupId, userId: users.id, name: users.name })
      .from(groupHeads)
      .innerJoin(users, eq(groupHeads.userId, users.id))
      .execute();
    const countRows = await this.db.db
      .select({ groupId: users.groupId })
      .from(users)
      .where(and(inArray(users.groupId, ids), eq(users.isRemoved, false)))
      .execute();

    const byHead: Record<string, { id: string; name: string }[]> = {};
    for (const h of headRows) {
      (byHead[h.groupId] ??= []).push({ id: h.userId, name: h.name });
    }
    const counts: Record<string, number> = {};
    for (const c of countRows) {
      if (c.groupId) counts[c.groupId] = (counts[c.groupId] ?? 0) + 1;
    }

    return groupRows.map((r) => ({
      id: r.groups.id,
      name: r.groups.name,
      shortName: r.groups.shortName,
      description: r.groups.description,
      country: r.groups.country,
      superGroupId: r.groups.superGroupId,
      heads: byHead[r.groups.id] ?? [],
      studentCount: counts[r.groups.id] ?? 0,
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
}