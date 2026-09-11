import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { superGroups, groups, eq, inArray, isNull, and } from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';
import { DomainError, ROLE_NAMES } from '@hub/shared';

export interface SuperGroupSummary {
  id: string;
  name: string;
  createdAt: Date;
  groups: { id: string; name: string; shortName: string }[];
}

/** SuperGroup aggregate (HoA only; spec §8.4). */
@Injectable()
export class SuperGroupsService {
  constructor(private readonly db: DatabaseProvider, private readonly audit: AuditService) {}

  async create(name: string, actor: { id: string; name: string }, global: boolean): Promise<{ id: string; name: string }> {
    if (!global) throw DomainError.forbidden('Only the Head of Academy can create supergroups');
    const rows = await this.db.db
      .insert(superGroups)
      .values({ name, createdBy: actor.id })
      .returning({ id: superGroups.id, name: superGroups.name })
      .execute();
    const created = rows[0]!;
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: ROLE_NAMES.head_of_academy,
      action: 'CREATE',
      entityType: 'super_group',
      entityId: created.id,
      description: `created a super group called '${name}'`,
    });
    return created;
  }

  async list(): Promise<SuperGroupSummary[]> {
    const sgs = await this.db.db.select().from(superGroups).execute();
    if (sgs.length === 0) return [];
    const groupRows = await this.db.db
      .select()
      .from(groups)
      .where(and(inArray(groups.superGroupId, sgs.map((s) => s.id)), isNull(groups.deletedAt)))
      .execute();
    return sgs.map((sg) => ({
      id: sg.id,
      name: sg.name,
      createdAt: sg.createdAt as Date,
      groups: groupRows.filter((g) => g.superGroupId === sg.id).map((g) => ({ id: g.id, name: g.name, shortName: g.shortName })),
    }));
  }

  async remove(id: string, actor: { id: string; name: string }): Promise<void> {
    if (!actor.id) throw DomainError.forbidden('Only the Head of Academy can delete supergroups');
    const rows = await this.db.db.delete(superGroups).where(eq(superGroups.id, id)).returning().execute();
    if (!rows[0]) throw DomainError.notFound(`SuperGroup ${id}`);
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: ROLE_NAMES.head_of_academy,
      action: 'DELETE',
      entityType: 'super_group',
      entityId: id,
      description: `deleted the super group '${rows[0].name}'`,
    });
  }
}