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
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (v) => v.startsWith('postgres://') || v.startsWith('postgresql://'),
      {
        message:
          'DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://',
      },
    )
    .default('postgres://hub:hub@localhost:5433/a2sv_hub'),
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
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim();
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function sanitizeDatabaseUrl(val?: string): string | undefined {
  if (typeof val !== 'string') return val;
  let v = val.trim();
  if (v.startsWith('DATABASE_URL=')) {
    v = v.slice('DATABASE_URL='.length).trim();
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

loadDotEnv();

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = sanitizeDatabaseUrl(process.env.DATABASE_URL);
}
if (process.env.JWT_SECRET) {
  let s = process.env.JWT_SECRET.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    process.env.JWT_SECRET = s.slice(1, -1).trim();
  }
}

export const env = EnvSchema.parse(process.env);