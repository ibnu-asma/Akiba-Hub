import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/**
 * Environment configuration — validated at boot with Zod so a misconfigured
 * deploy fails fast with a clear message.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.union([z.coerce.number().int().positive(), z.string()]).default(3000),
  DATABASE_URL: z.string().min(1).default('postgres://hub:hub@localhost:5433/a2sv_hub'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES: z.string().default('15m'),
  REFRESH_EXPIRES: z.string().default('30d'),
  INVITE_EXPIRES: z.string().default('7d'),
  WEB_ORIGIN: z.string().default('http://localhost:3100'),
  // Email delivery (SPEC §8.5). `preview` logs the rendered email instead of sending.
  MAIL_MODE: z.enum(['preview', 'smtp']).default('preview'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.string().default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('Akiba <noreply@akibatech.com>'),
});

/** Minimal .env loader (no extra dependency, never overrides real env vars). */
function loadDotEnv(path = resolve(process.cwd(), '.env')): void {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf-8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

export const env = EnvSchema.parse(process.env);