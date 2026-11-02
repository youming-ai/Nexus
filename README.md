# Nexus

A Bun CLI that creates and maintains TanStack Start applications on Cloudflare Workers.

**Development version: 0.7.0. Not published to a registry.**

## Use locally

Requires Bun 1.4.4+ and a Node version supported by `cf` (22.23+, 24.22+, or 26.12+ in the corresponding release lines). Bun manages packages and scripts; `cf` and its Vite configuration loader run on Node.

```sh
bun install --frozen-lockfile
bun run build
bun packages/cli/dist/index.js create ./my-app
cd my-app
cp .env.example .env
# Set BETTER_AUTH_SECRET in .env to a private value, at least 32 characters.
# Generate one with: openssl rand -base64 32
bun run db:migrate
bun run dev
```

Open http://localhost:3000. Local email is simulated and appears in the Cloudflare Local Explorer (`/__debug`). No real email is sent by local development or tests. Verify the account using the link in that inbox before signing in.

After publication, the intended entry point is `bunx @youming-ai/create-nexus my-app`.

## Commands

```sh
# Preview without writing files or installing dependencies
bun packages/cli/dist/index.js create ./my-app --dry-run --json

# Generate files without installing dependencies
bun packages/cli/dist/index.js ./my-app --preset app --no-install

# Generate a team application
bun packages/cli/dist/index.js ./team-app --preset team --no-install

# Add private R2 uploads and downloads
bun packages/cli/dist/index.js add storage --cwd ./my-app --dry-run
bun packages/cli/dist/index.js add storage --cwd ./my-app

# Inspect files, dependencies and deployment placeholders
bun packages/cli/dist/index.js doctor --cwd ./my-app --json
```

Creation refuses existing directories, including empty directories. Names must start with a lowercase letter and contain only lowercase letters, numbers and hyphens, with a maximum of 48 characters. Use `--name` when the directory basename is not a valid app name.

`doctor` exits 1 on errors; `--strict` also treats warnings as failures. Warnings include local-only D1 IDs, example senders, absent local secrets and modified generated files. It does not contact Cloudflare or verify production credentials. `--json` emits one JSON result; errors exit 1.

`add` previews or applies a file plan. It refuses conflicts in managed files, checks for changes since planning, rejects symlink destinations, and rolls back files on a caught write error. This is not a crash-safe transaction; use version control for recovery. It never creates cloud resources or sends email.

`upgrade` supports the captured **0.6.0 app development baseline (without modules) → 0.7.0** transition and the current template version. It preserves local edits when the upstream file is unchanged, previews conflicts when both changed, and refuses unreviewed version transitions. This is an internal development baseline, not a previously published release. See [upgrade behavior](docs/upgrades.md).

## What the app includes

- TanStack Start SSR, React, TanStack Router, Tailwind v4 and TanStack Form.
- Better Auth: registration, email verification, login, logout, password recovery and reset.
- Drizzle over D1, generated authentication schema, committed migrations and lockfile.
- A protected workspace; server-side session validation and CSRF/security headers.
- Vitest tests in workerd with local D1 and email bindings.
- Optional private R2 storage, with authenticated routes and ownership tests.

Two presets are available: `app` for individual accounts, and `team` for organizations, invitations, owner/admin/member roles, tenant-scoped projects, and project audit events. The team preset checks membership on every business operation and includes cross-tenant and revoked-membership tests. A general module registry and additional reviewed upgrade paths remain future work.

## Repository

```text
packages/cli/          command line entry point and distributable package
packages/core/         manifest, planning, execution and project inspection
scripts/              package build and generated-project verification
templates/app/        independently installable reference application
templates/modules/    optional source modules (currently storage)
tests/                generator and CLI tests
docs/                 architecture and legacy configuration
```

The former Next.js/Supabase app is preserved in `apps/web`, `packages/db`, `packages/ui`, and `packages/typescript-config` for migration reference. It is excluded from the Bun workspace and new CI. Its original README and pnpm/Turbo/hook configuration are in `docs/legacy`; its prior setup is also available in Git history. The new CLI does not migrate existing Supabase data or accounts.

## Validate and package

```sh
bun run check
bun run typecheck
bun run test
bun run verify:generated
```

`verify:generated` builds and packs the CLI, runs the packed executable outside the source tree, generates a fresh app, installs from its frozen lockfile, migrates local D1, typechecks, tests and builds it, then adds storage and repeats the applicable checks. It also generates the team preset with storage, checks its migrations, typechecks, workerd tests, production build, and HTTP authentication/organization flow. The captured 0.6.0 baseline is also upgraded through the packaged CLI and checked with frozen installation, typecheck, workerd tests and build. No cloud credentials are needed.

```sh
bun run build
cd packages/cli
bun pm pack
```

The package bundles the core and templates. It does not depend on a separately published internal package or a mutable Git branch. Publishing and production deployment are separate actions.

## Stack source

Based on [bun-ts-stack-skills at ba44f26](https://github.com/youming-ai/bun-ts-stack-skills/blob/ba44f2676f059a011536ed5c1cf72db1ede37dba/tanstack/SKILL.md). The project deliberately uses `cf` instead of Void, following the supplied Cloudflare CLI instructions. Configuration is `cloudflare.config.ts`; local migration and deployment are explicit. Better Auth schema generation uses the current `auth` CLI matching the installed Better Auth version.

See [the architecture](docs/architecture.md) and the generated app README for implementation and deployment details.
