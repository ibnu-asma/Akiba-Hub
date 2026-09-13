import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../../config/database.provider.js';
import { users, groups, invitations, eq } from '@hub/database';

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
  rating: number;
  country: string | null;
  university: string | null;
}

interface InviteRow {
  id: string;
  role: string;
  groupId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  usedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
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

  /** Full profile for /auth/me — the user row plus their group's super group. */
  async findProfileById(id: string): Promise<(UserRow & { superGroupId: string | null }) | undefined> {
    const usersRows = await this.db.db.select().from(users).where(eq(users.id, id)).limit(1).execute();
    const user = usersRows[0] as UserRow | undefined;
    if (!user) return undefined;
    if (!user.groupId) return { ...user, superGroupId: null };

    const groupRows = await this.db.db
      .select({ superGroupId: groups.superGroupId })
      .from(groups)
      .where(eq(groups.id, user.groupId))
      .limit(1)
      .execute();
    return { ...user, superGroupId: groupRows[0]?.superGroupId ?? null };
  }

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
    role: string;
    groupId?: string | null;
    country?: string | null;
    university?: string | null;
    avatarUrl?: string | null;
    department?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    studentId?: string | null;
    bio?: string | null;
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
        avatarUrl: input.avatarUrl ?? null,
        department: input.department ?? null,
        instagram: input.instagram ?? null,
        linkedin: input.linkedin ?? null,
        studentId: input.studentId ?? null,
        bio: input.bio ?? null,
        invitedById: input.invitedById ?? null,
      })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role, groupId: users.groupId, avatarUrl: users.avatarUrl })
      .execute();
    return rows[0] as PublicUser;
  }

  async updateProfile(
    userId: string,
    data: {
      avatarUrl?: string | null;
      country?: string | null;
      university?: string | null;
      department?: string | null;
      instagram?: string | null;
      linkedin?: string | null;
      studentId?: string | null;
      bio?: string | null;
    },
  ): Promise<PublicUser> {
    const rows = await this.db.db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role, groupId: users.groupId, avatarUrl: users.avatarUrl })
      .execute();
    return rows[0] as PublicUser;
  }

  async findInviteByHash(tokenHash: string): Promise<InviteRow | undefined> {
    const rows = await this.db.db
      .select({
        id: invitations.id,
        role: invitations.role,
        groupId: invitations.groupId,
        email: invitations.email,
        firstName: invitations.firstName,
        lastName: invitations.lastName,
        usedAt: invitations.usedAt,
        revokedAt: invitations.revokedAt,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(eq(invitations.tokenHash, tokenHash))
      .execute();
    return rows[0] as InviteRow | undefined;
  }

  async markInviteUsed(id: string, takenOverByUserId: string): Promise<void> {
    await this.db.db
      .update(invitations)
      .set({ usedAt: new Date(), takeOverUserId: takenOverByUserId })
      .where(eq(invitations.id, id))
      .execute();
  }
}