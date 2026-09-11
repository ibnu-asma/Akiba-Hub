# A2SV Hub

The A2SV education hub — tracks, contests, sessions, attendance, and analytics for
Students, Heads of Education, and Heads of Academy. See `SPEC.md` for the full
product specification (roles, screens, data model, API surface).

## Stack

| Layer      | Tech                                              |
| ---------- | ------------------------------------------------- |
| Monorepo   | pnpm workspaces + Turborepo                       |
| Web        | Next.js 16 (App Router) + React 19 + Tailwind v4  |
| API        | NestJS + Zod DTOs                                 |
| Database   | PostgreSQL + Drizzle ORM (SQL migrations)         |
| Shared     | `@hub/shared` (roles, errors, domain constants)   |
| Infra      | Docker Compose (Postgres)                         |

### Architecture

Clean architecture throughout: `controller → service → repository` per module in
the API; the web app is a BFF — browsers only ever talk to Next.js route handlers,
which hold the session in an httpOnly cookie and call the API server-side.

```
apps/
  api        NestJS REST API        (port 3000)
  web        Next.js web app / BFF  (port 3100)
packages/
  shared     roles · error contract · attendance & domain constants
  database   Drizzle schema · migrations · seed
```

## Getting started

```bash
pnpm install
docker compose up -d postgres   # or point DATABASE_URL at any Postgres
pnpm db:migrate && pnpm db:seed
pnpm dev:api                    # API on :3000
pnpm dev:web                    # Web on :3100
```

Seed accounts (see `packages/database/src/seed.ts`): `admin@a2sv.org` (Head of
Academy), `head@a2sv.org` (Head of Education), `student@a2sv.org` — all with the
seed password `a2sv-demo`.

## Verification

```bash
bash scripts/web-smoke.sh       # 23 checks: auth, RBAC nav sections, guards
bash scripts/api-smoke.sh 2>/dev/null || true   # (api checks live in repo history)
```

## Design language

The UI follows the A2SV Hub design language extracted from the reference app —
see `docs/a2sv-ui-design-language.md` for the full contract (Poppins, `#0FA958`
primary green, flat hairline cards, outlined floating-label fields, searchable
user picker, 1/2/3-section sidebar, locked status colors).

Shared primitives: `apps/web/src/components/form/field.tsx` (`OutlinedInput`,
`OutlinedSelect`, `Checkbox`), `apps/web/src/components/form/select-user.tsx`
(`SelectUser` combobox), `apps/web/src/components/sparkline.tsx` (stat-card
bars). New screens must use these instead of hand-rolled inputs.

## Conventions

- pnpm 11 build-script policy lives in `pnpm-workspace.yaml` (`allowBuilds`).
- The role-scoped sidebar implements the 1/2/3-section rule: Student sees the
  Student section only; Head of Education adds the education section; Head of
  Academy sees all three.
