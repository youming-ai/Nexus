# Nexus application

Bun + TanStack Start + Void + Drizzle + Better Auth on Cloudflare Workers.

## Local development

Use the generated `.nvmrc` to select Node 24.22.0. Requires Bun 1.4.4+ and Node 24.22.0+ (required by Void).

```sh
bun install --frozen-lockfile
printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -base64 32)" > .env
bun run db:migrate
bun run dev
```

Visit http://localhost:3000. During local development, `void/email` captures verification and password-reset emails in Void's local inbox at `/__void/inbox` (the tokenized URL is printed when `bun run dev` starts and the token is written to `.void/dev-trigger-token`). Local sends never deliver mail externally.

## Code conventions

- `*.server.ts`: server-only bindings, database, email, and auth. Never import into client code.
- `*.functions.ts`: typed server function boundaries, safe to import from components.
- `src/schemas`: shared Zod input schemas. Server validation remains mandatory.
- `env.ts`: typed server environment variables via `void/env`. Local values live only in `.env` (gitignored); production values are set with `void secret put`. Do not create `.env.example` or `.dev.vars*`.
- Create Drizzle (`getDb()`) and Better Auth (`getAuth()`) inside requests; never cache user state at module scope.
- Use Web APIs in Worker code; Bun is a development tool, not the production runtime.
- Keep custom Void and Cloudflare settings in `void.config.ts`; `nexus.bindings.ts` and `nexus.test.ts` are managed extension files.
- The `app` preset is single-user. The `team` preset adds organization authorization; see `TEAM.md` when present. Any new tenant resource must check membership and authorization on the server.

## Database changes

```sh
# After changing schema-affecting options in src/lib/auth.shared.ts:
bun run auth:generate
bun run db:generate
bun run db:migrate
```

Business tables live in `db/schema.ts`; generated auth tables live in `db/auth-schema.ts`. `void db generate` writes SQL and Drizzle metadata to `db/migrations/`; `void db migrate` applies pending migrations locally. Commit SQL and metadata with schema changes. Do not edit already-applied migrations.

```sh
bun run typecheck
bun run test
bun run build
```

Tests run inside `workerd` with local D1 and `createEmailTestHarness` from `void/email/testing`, without cloud credentials.

## Before production

1. Connect your deployment target with `bunx void connect --platform cloudflare` (or `bunx void auth login`).
2. Update `email.from` in `void.config.ts` to an address on a domain in your Cloudflare account.
3. Configure production server values declared in `env.ts`:
   ```sh
   bunx void secret put PUBLIC_ORIGIN
   bunx void secret put BETTER_AUTH_SECRET
   ```
4. Run `bun run deploy` (`bun run typecheck && bun run test && void deploy`). On first deploy, Void provisions missing Cloudflare resources (D1, R2 when `storage` is enabled, and email domain bindings), applies pending D1 migrations, and records resource IDs in `void.lock.json`. Commit `void.lock.json` after the first deployment.
