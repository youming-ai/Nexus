# Agent Instructions

This project was generated with **Nexus** (`preset: team`). Check `nexus.json` for the template version and enabled modules.

## Stack & Runtime Boundaries

- **Package manager & scripts**: Bun (`bun install`, `bun run <script>`).
- **Framework & Deploy CLI**: TanStack Start (React 19 + TanStack Router) + **Void** (`void.config.ts`, `voidPlugin()`, `void db`, `void deploy`, `void/env`, `void/email`). Requires Node `>= 22.23.0` (see `.nvmrc`). Do not write `wrangler.toml` or `.env.example`.
- **Production & test runtime**: Cloudflare Workers (`workerd` V8 isolate). Use Web-standard APIs (`fetch`, `crypto.randomUUID()`, Web Streams); never use `Bun.*` or `node:fs` inside Worker code.
- **Database & Auth**: Cloudflare D1 + Drizzle ORM (`drizzle-orm/d1`) + Better Auth (with `organization` plugin) + Cloudflare Email Sending (`void/email`).

## Commands

| Command | Purpose |
| --- | --- |
| `bun install --frozen-lockfile` | Install dependencies |
| `bun run db:migrate` | Apply D1 migrations locally via `void db migrate` |
| `bun run dev` | Start local dev server (`http://localhost:3000`, email inbox at `/__void/inbox`) |
| `bun run auth:generate` | Regenerate `db/auth-schema.ts` from `src/lib/auth.cli.ts` |
| `bun run db:generate` | Generate SQL migration from `db/schema.ts` into `db/migrations/` via `void db generate` |
| `bun run typecheck` | Run `tsr generate && void prepare && tsc --noEmit` |
| `bun run test` | Run Vitest suite inside `workerd` with local D1 and `void/email/testing` |
| `bun run build` | Production build via `vite build` |
| `bun run deploy` | Typecheck, test, and deploy via `void deploy` |

## Coding & Multi-Tenant Authorization Rules

1. **Request-scoped bindings**: Always call `getDb()` and `getAuth()` inside request handlers or server functions. Never instantiate Drizzle or Better Auth at module scope, and never cache user or organization state across requests.
2. **Server-side tenant isolation (`src/features/team/team.server.ts`)**:
   - D1 has no Row Level Security (RLS). Every organization query or mutation must verify the caller's membership and role (`owner`, `admin`, `member`) on the server before reading or writing tenant data.
   - Never trust `organizationId` or role claims from URL parameters or client state without checking the `member` table for the authenticated `session.user.id`.
   - `owner` and `admin` may create tenant resources and read `auditEvents`; `member` is read-only for projects.
   - Tenant mutations (such as project creation) must commit the business row and its `auditEvents` record together in a single atomic `db.batch([...])`.
   - Every new tenant resource must include cross-organization, role-restriction, and revoked-membership tests in `test/team.test.ts`.
3. **Environment variables (`env.ts`)**:
   - Declare all server environment variables in `env.ts` using `defineEnv` from `void/env` and read them via `import { env } from "void/env"`.
   - Local values live only in `.env` (gitignored). Void rejects `.env.example`, `.env.*`, and `.dev.vars*`. Production secrets are set with `void secret put`.
4. **File naming & boundaries**:
   - `*.server.ts`: Server-only modules (must import `@tanstack/react-start/server-only`). Never import into client components.
   - `*.functions.ts`: `createServerFn` wrappers, safe to import from route components.
   - `src/schemas/*.ts`: Shared Zod schemas. Always validate inputs on the server.
5. **Database discipline**:
   - Primary keys are `text` (`crypto.randomUUID()`); timestamps use integer `timestamp_ms`.
   - Never hand-edit `db/auth-schema.ts` or committed files in `db/migrations/`.
6. **Security & CSRF**:
   - Keep `createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" })` in `src/start.ts` alongside security headers.
   - Invitations may only be accepted when signed into the account matching the invited email address.
7. **Managed extension files**:
   - `nexus.bindings.ts` and `nexus.test.ts` are managed by `nexus add` / `nexus upgrade`. Add custom project settings directly in `void.config.ts`.
   - If `storage` is enabled in `nexus.json` (or `STORAGE.md` is present), keep R2 object keys scoped by authenticated user ID and validate `Origin` and `Content-Length` before streaming to R2.
