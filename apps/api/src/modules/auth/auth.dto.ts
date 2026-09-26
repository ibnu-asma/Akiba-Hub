import { z } from 'zod';

export const loginDto = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerInviteDto = z.object({
  token: z.string().min(20),
  name: z.string().min(1).max(120),
  password: z.string().min(6).max(100),
  country: z.string().min(1).max(80),
  university: z.string().min(1).max(160),
  avatarUrl: z.string().optional(),
  department: z.string().max(160).optional(),
  instagram: z.string().max(120).optional(),
  linkedin: z.string().max(320).optional(),
  studentId: z.string().max(64).optional(),
  bio: z.string().max(2000).optional(),
  github: z.string().max(120).optional(),
  telegram: z.string().max(120).optional(),
  leetcode: z.string().max(120).optional(),
  codeforces: z.string().max(120).optional(),
});

export const updateProfileDto = z.object({
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(6).max(100).optional(),
  avatarUrl: z.string().nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  university: z.string().max(160).nullable().optional(),
  department: z.string().max(160).nullable().optional(),
  instagram: z.string().max(120).nullable().optional(),
  linkedin: z.string().max(320).nullable().optional(),
  github: z.string().max(120).nullable().optional(),
  githubPat: z.string().max(255).nullable().optional(),
  studentId: z.string().max(64).nullable().optional(),
  telegram: z.string().max(120).nullable().optional(),
  leetcode: z.string().max(120).nullable().optional(),
  codeforces: z.string().max(120).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
});

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: string };
}