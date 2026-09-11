import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { users, eq } from '@hub/database';
import { DomainError, ROLES } from '@hub/shared';
import { DataScope } from '../../common/auth/scope.service.js';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  groupId: string | null;
  isRemoved: boolean;
  rating: number;
}

function toSummary(row: Record<string, unknown>): UserSummary {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as string,
    groupId: (row.groupId as string | null) ?? null,
    isRemoved: (row.isRemoved as boolean) ?? false,
    rating: (row.rating as number) ?? 1200,
  };
}

/** User administration use-cases — HoA only (spec §8.7: promote/demote/delete). */
@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseProvider) {}

  async list(scope: DataScope): Promise<UserSummary[]> {
    // TODO(iteration 2): scope HoE to their groups via scope.groupIds.
    void scope;
    const rows = await this.db.db.select().from(users).where(eq(users.isRemoved, false)).execute();
    return rows.map(toSummary);
  }

  async updateRole(userId: string, role: string, groupId: string | null): Promise<UserSummary> {
    if (!(Object.values(ROLES) as string[]).includes(role)) {
      throw DomainError.validation(`Unknown role: ${role}`);
    }
    const rows = await this.db.db
      .update(users)
      .set({ role, groupId })
      .where(eq(users.id, userId))
      .returning()
      .execute();
    if (!rows[0]) throw DomainError.notFound(`User ${userId}`);
    return toSummary(rows[0]);
  }

  async softDelete(userId: string): Promise<void> {
    const rows = await this.db.db
      .update(users)
      .set({ isRemoved: true, removedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
      .execute();
    if (!rows[0]) throw DomainError.notFound(`User ${userId}`);
  }

  async listRemoved(): Promise<UserSummary[]> {
    const rows = await this.db.db.select().from(users).where(eq(users.isRemoved, true)).execute();
    return rows.map(toSummary);
  }
}