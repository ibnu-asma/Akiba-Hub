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
  department: z.string().max(160).optional(),
  instagram: z.string().max(120).optional(),
  linkedin: z.string().max(320).optional(),
  studentId: z.string().max(64).optional(),
  bio: z.string().max(2000).optional(),
});

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: string };
}