import { Injectable, Inject } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { DomainError, ROLES } from '@hub/shared';
import { JwtService } from '../../common/auth/jwt.service.js';
import { AuthRepository } from './infrastructure/auth.repository.js';
import { AuthSession } from './auth.dto.js';

/** Login / invite-registration use-cases (application layer). */
@Injectable()
export class AuthService {
  constructor(@Inject(AuthRepository) private readonly repo: AuthRepository,
    @Inject(JwtService) private readonly jwt: JwtService
  ) {}

  async login(email: string, password: string): Promise<AuthSession> {
    const user = await this.repo.findByEmail(email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw DomainError.forbidden('Invalid email or password');
    }
    return this.buildSession(user);
  }

  /**
   * Register via an invitation token (SPEC §8.5 mass-invite flow).
   * The invite carries role + optional group; only unused, unexpired tokens redeem.
   */
  async registerWithInvite(
    token: string,
    payload: {
      name: string;
      password: string;
      country: string;
      university: string;
      avatarUrl?: string;
      department?: string;
      instagram?: string;
      linkedin?: string;
      telegram?: string;
      leetcode?: string;
      codeforces?: string;
      studentId?: string;
      bio?: string;
    },
  ): Promise<AuthSession> {
    const tokenHash = hashToken(token);
    const invite = await this.repo.findInviteByHash(tokenHash);
    if (!invite) throw DomainError.notFound('Invitation not found');
    if (invite.usedAt) throw DomainError.conflict('Invitation already used');
    if (invite.revokedAt) throw DomainError.conflict('Invitation has been revoked');
    if (invite.expiresAt < new Date()) throw DomainError.conflict('Invitation expired');

    const role = invite.role in ROLES ? invite.role : ROLES.student;
    // The invite carries the generated org login email (SPEC §8.5); fall back to
    // a name-derived alias only for legacy invites without an email.
    const email = invite.email ?? orgEmail(payload.name);
    const name = payload.name || [invite.firstName, invite.lastName].filter(Boolean).join(' ');
    const user = await this.repo.create({
      email,
      name,
      passwordHash: await bcrypt.hash(payload.password, 10),
      role,
      groupId: invite.groupId,
      country: payload.country,
      university: payload.university,
      avatarUrl: payload.avatarUrl,
      department: payload.department,
      instagram: payload.instagram,
      linkedin: payload.linkedin,
      telegram: payload.telegram,
      leetcode: payload.leetcode,
      codeforces: payload.codeforces,
      studentId: payload.studentId,
      bio: payload.bio,
      invitedById: null,
    });
    await this.repo.markInviteUsed(invite.id, user.id);
    return this.buildSession(user);
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      password?: string;
      avatarUrl?: string | null;
      country?: string | null;
      university?: string | null;
      department?: string | null;
      instagram?: string | null;
      linkedin?: string | null;
      github?: string | null;
      telegram?: string | null;
      leetcode?: string | null;
      codeforces?: string | null;
      studentId?: string | null;
      bio?: string | null;
    },
  ) {
    const { password, ...rest } = data;
    const updateData: any = { ...rest };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    const updated = await this.repo.updateProfile(userId, updateData);
    return this.me(updated.id);
  }

  async me(userId: string) {
    const user = await this.repo.findProfileById(userId);
    if (!user) throw DomainError.notFound('User not found');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      groupId: user.groupId,
      superGroupId: user.superGroupId,
      rating: user.rating ?? 1200,
      avatarUrl: user.avatarUrl ?? null,
      country: user.country ?? null,
      university: user.university ?? null,
      department: user.department ?? null,
      instagram: user.instagram ?? null,
      linkedin: user.linkedin ?? null,
      github: user.github ?? null,
      githubPat: user.githubPat ?? null,
      telegram: user.telegram ?? null,
      leetcode: user.leetcode ?? null,
      codeforces: user.codeforces ?? null,
      studentId: user.studentId ?? null,
      bio: user.bio ?? null,
      createdAt: user.createdAt,
    };
  }

  private buildSession(user: { id: string; name: string; email: string; role: string }): AuthSession {
    const accessToken = this.jwt.sign({ sub: user.id, role: user.role, session: 1, name: user.name });
    return {
      accessToken,
      refreshToken: 'refresh:issued-later', // opaque refresh tokens: phase-2
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}

/** Deterministic O(1) token indexing — hash at rest only. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Fallback org login email derived from a full name (legacy invites only). */
function orgEmail(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '.') + '@akibatech.com';
}
