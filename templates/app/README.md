# Nexus application

Bun + TanStack Start + Drizzle + Better Auth on Cloudflare Workers.

## Local development

Use the generated `.nvmrc` to select Node 24.22.0. Requires Bun 1.4.4+ and a Node version supported by `cf` (22.23+, 24.22+, or 26.12+ in the corresponding release lines).

```sh
bun install --frozen-lockfile
cp .env.example .env
# Set BETTER_AUTH_SECRET to a private value (at least 32 characters).
# Generate one with: openssl rand -base64 32
bun run db:migrate
bun run dev
```

Visit http://localhost:3000. Open `/__debug` for Cloudflare's local explorer and simulated email inbox. Registration requires email verification; follow the verification link in the local inbox before signing in. Password reset emails appear there too. Local sends do not deliver mail externally.

The checked-in database ID is a local placeholder. Each project's state is isolated under `.cloudflare/state`. The explicit `--persist-to` in the migration command points to the same state directory as the Vite development plugin.

## Code conventions

- `*.server.ts`: server-only bindings, database and auth. Never import into client code.
- `*.functions.ts`: typed server function boundaries, safe to import from components.
- `src/schemas`: shared Zod input schemas. Server validation remains mandatory.
- Create Drizzle and Better Auth inside requests, never cache user state at module scope.
- Use Web APIs in Worker code; Bun is a development tool, not the production runtime.
- Keep custom Cloudflare bindings in `cloudflare.config.ts`; `nexus.bindings.ts` and `nexus.test.ts` are managed extension files.
- The `app` preset is single-user. The `team` preset adds organization authorization; see `TEAM.md` when present. Any new tenant resource must check membership and authorization on the server.

## Database changes

```sh
# After changing schema-affecting options in src/lib/auth.shared.ts:
bun run auth:generate
bun run db:generate
bun run db:migrate
```

Business tables live in `db/schema.ts`; generated auth tables live in `db/auth-schema.ts`. Commit SQL and metadata with schema changes. Do not edit already-applied migrations.

```sh
bun run typecheck
bun run test
bun run build
```

Tests run inside workerd with local D1 and simulated email, without cloud credentials. Production email still needs a staging delivery test.

## Before production

1. Authenticate with `bunx cf auth login` or configure a CI API token.
2. Discover resource creation with `bunx cf cli search "create a D1 database"`. Set the returned database ID in `cloudflare.config.ts`, replacing the local placeholder. Update the ID in the local migration script too, so dev and CLI address the same binding.
3. Set `PUBLIC_ORIGIN` to the deployment's HTTPS origin. Set `EMAIL_FROM` to a sender on an onboarded Cloudflare Email Service domain. Discover the applicable setup commands with `bunx cf cli search "configure email sending domain"`.
4. Configure `BETTER_AUTH_SECRET` as a production secret. Use the current options shown by `bunx cf deploy --help`; never commit secret values. `.env` is local-only.
5. Apply migrations explicitly with `bunx cf d1 migrations apply <DATABASE_ID> --dir db/migrations` after reviewing the target account and database. Omitting `--local` targets the cloud. This is a separate operation from deploying code.
6. Run the checks above, then `bun run deploy`.

No CLI generation command creates resources, modifies DNS or deploys this project. Validate registration, email verification, login and password reset on a staging Worker before serving users. Restoring Worker code does not roll back database migrations.
