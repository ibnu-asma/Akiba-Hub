import { Inject,  Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { users, groups, groupHeads, eq } from '@hub/database';
import { ROLES } from '@hub/shared';

export interface DataScope {
  role: string;
  /** Groups this actor may administer/monitor. Empty for global roles. */
  groupIds: string[];
  /** HoA sees every group across every supergroup. */
  isGlobal: boolean;
}

/**
 * Scope resolver — single enforcement point for the 3-level visibility
 * invariant (spec §12.4: self / group / supergroup).
 */
@Injectable()
export class ScopeService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider) {}

  async forUser(userId: string, role: string): Promise<DataScope> {
    // HoA: platform-wide.
    if (role === ROLES.headOfAcademy) {
      return { role, groupIds: [], isGlobal: true };
    }

    // HoE: the groups they head (group_heads).
    if (role === ROLES.headOfEducation) {
      const headed = await this.db.db
        .select({ id: groups.id })
        .from(groupHeads)
        .innerJoin(groups, eq(groupHeads.groupId, groups.id))
        .where(eq(groupHeads.userId, userId))
        .execute();
      return { role, groupIds: headed.map((r) => r.id), isGlobal: false };
    }

    // Student / others: a single group membership.
    const row = await this.db.db
      .select({ id: groups.id })
      .from(groups)
      .innerJoin(users, eq(users.groupId, groups.id))
      .where(eq(users.id, userId))
      .execute();
    return { role, groupIds: row.map((r) => r.id), isGlobal: false };
  }
}