import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../../config/database.provider.js';
import { users, invitations, eq } from '@hub/database';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  groupId: string | null;
  avatarUrl: string | null;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  groupId: string | null;
  avatarUrl: string | null;
}

/** Storage contract for the auth aggregate (infrastructure layer). */
@Injectable()
export class AuthRepository {
  constructor(private readonly db: DatabaseProvider) {}

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const rows = await this.db.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .execute();
    return rows[0] as UserRow | undefined;
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const rows = await this.db.db.select().from(users).where(eq(users.id, id)).execute();
    return rows[0] as UserRow | undefined;
  }

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
    role: string;
    groupId?: string | null;
    country?: string | null;
    university?: string | null;
    invitedById?: string | null;
  }): Promise<PublicUser> {
    const rows = await this.db.db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
        role: input.role,
        groupId: input.groupId ?? null,
        country: input.country ?? null,
        university: input.university ?? null,
        invitedById: input.invitedById ?? null,
      })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role, groupId: users.groupId, avatarUrl: users.avatarUrl })
      .execute();
    return rows[0] as PublicUser;
  }

  async findInviteByHash(tokenHash: string): Promise<{ id: string; role: string; groupId: string | null; usedAt: Date | null; expiresAt: Date } | undefined> {
    const rows = await this.db.db
      .select({ id: invitations.id, role: invitations.role, groupId: invitations.groupId, usedAt: invitations.usedAt, expiresAt: invitations.expiresAt })
      .from(invitations)
      .where(eq(invitations.tokenHash, tokenHash))
      .execute();
    return rows[0] as { id: string; role: string; groupId: string | null; usedAt: Date | null; expiresAt: Date } | undefined;
  }

  async markInviteUsed(id: string, takenOverByUserId: string): Promise<void> {
    await this.db.db
      .update(invitations)
      .set({ usedAt: new Date(), takeOverUserId: takenOverByUserId })
      .where(eq(invitations.id, id))
      .execute();
  }
}