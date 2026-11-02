# Nexus architecture

Nexus converts a tested application template into a standalone project. Its CLI runs on Bun; generated application handlers run in Cloudflare `workerd`. Cloudflare's `cf` command and config loader use Node. The CLI never provisions cloud resources during project creation, module installation, inspection, or upgrade.

## Components

- `packages/cli` parses arguments, prompts for a directory only in an interactive terminal, selects bundled assets, prints human or `--json` results, and optionally installs the generated project's locked dependencies.
- `packages/core` validates identity and metadata, renders declared identity fields, plans file changes, detects conflicts, applies changes with rollback on write errors, and inspects projects. It does not own terminal UI or Cloudflare credentials.
- `templates/app` is a runnable reference project, separately locked and tested. Its exact dependency versions are intentional.
- `templates/presets/team` overlays the base app with organization authentication, business schemas/migrations, server-side authorization services, UI, `AGENTS.md`, and cross-tenant tests.
- `templates/modules/storage` adds private R2 routes, tests, and two managed binding files (`nexus.bindings.ts` and `nexus.test.ts`). Application-specific bindings belong in `cloudflare.config.ts`, outside managed files.

All creation, module addition, and upgrades go through an immutable `Plan`. Preview (`--dry-run`) prints that plan without writes. Execution validates destinations, rejects symlinks, and verifies current file contents before replacing files. `nexus.json` records generator/template versions, preset, enabled modules, and SHA-256 hashes of baseline files. Hashes identify local edits; they are not a cryptographic signature.

The CLI archive contains a bundled executable and template assets (including `AGENTS.md` for AI coding assistants). `@nexus/core` is a build-time workspace dependency bundled into `dist/index.js`, not a separately installed runtime dependency. Packaging tests run outside the repository checkout in a directory path with spaces to expose missing assets and workspace assumptions.

## Application boundaries

Routes use TanStack Start server functions (`*.functions.ts`) for React data and server handlers (`src/routes/api/**`) for authentication and binary file streams. Server-only modules (`*.server.ts`) carry Start's `@tanstack/react-start/server-only` marker. D1 and Better Auth are instantiated per request. The browser receives a minimal session projection, never the raw session token or account row.

Better Auth owns users, credentials, sessions, and verification tokens. Its schema is generated with the matching `auth` CLI and migrated with Drizzle-generated SQL. The `app` preset is single-user. The `team` preset adds Better Auth organizations plus server-side membership and role checks (`owner`, `admin`, `member`) for every project and audit query, committing project writes and `audit_event` records atomically in a D1 batch.

Authentication requires verified email and validates passwords on the server. Rate limiting uses D1. The global middleware (`src/start.ts`) preserves Start's CSRF middleware (`createCsrfMiddleware`) while setting security headers. Private R2 keys are scoped by the authenticated user ID; downloads use attachment headers and private cache control. Uploads require same-origin requests and enforce a streaming size limit.

## Deliberate deviations from the stack skill

Source: `youming-ai/bun-ts-stack-skills` commit `ba44f2676f059a011536ed5c1cf72db1ede37dba`.

1. `cf` replaces Void, following this repository's Cloudflare CLI policy. There is one authored Cloudflare configuration (`cloudflare.config.ts`) and no authored Wrangler or Void file. Cloud resources are provisioned explicitly; no Void lockfile is generated.
2. Bun handles packages and scripts; Node is required by `cf`. Worker code uses Web APIs.
3. Better Auth schema generation uses `auth`, the current replacement for the deprecated `@better-auth/cli` package.
4. Biome and GitHub Actions are enabled for the generator. Git hooks are not installed automatically.
5. Exact tested package versions and committed Bun lockfiles replace open-ended scaffolding through floating `latest` CLIs.

## Release gates

Every change to the CLI or templates must pass `bun run check`, `bun run typecheck`, `bun run test`, and `bun run verify:generated`. `verify:generated` packs the CLI tarball, installs it outside the workspace, scaffolds `app` and `team` presets, adds `storage`, runs local D1 migrations, typechecks, runs `workerd` tests, builds production bundles, exercises live HTTP authentication/storage/organization flows, and verifies the captured `0.6.0 -> 0.7.0` upgrade path.
