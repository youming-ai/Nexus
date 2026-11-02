# Nexus architecture

Nexus converts a tested application template into a standalone project. Its CLI runs on Bun; generated application handlers run in Cloudflare workerd. Cloudflare's `cf` command and config loader use Node. The CLI never provisions resources during project creation.

## Components

- `cli` parses arguments, prompts for a directory only in a terminal, selects bundled assets, prints results, and optionally installs the generated project's locked dependencies.
- `core` validates identity and metadata, renders declared identity fields, plans file changes, detects conflicts, applies changes, and inspects projects. It does not own terminal UI or Cloudflare credentials.
- `templates/app` is a runnable reference project, separately locked and tested. Its exact dependency versions are intentional.
- `templates/presets/team` overlays the base app with organization authentication, business schemas/migrations, authorization services, UI and tests.
- `templates/modules/storage` adds private R2 routes, tests and two managed binding files. Application-specific bindings belong in `cloudflare.config.ts`, outside managed files.

All creation and addition goes through a `Plan`. Preview prints that plan without writes. Execution validates destinations and the current contents before replacing files. `nexus.json` records generator/template versions, modules, and SHA-256 hashes of baseline files. Hashes identify local edits; they are not a security signature or proof of trust.

The CLI archive contains a bundled executable and template assets. Core is a build-time workspace dependency, not a separately installed runtime dependency. Packaging tests run outside the checkout to expose missing assets and workspace assumptions.

## Application boundaries

Routes use TanStack Start server functions for React data and server handlers for authentication and files. Server-only modules carry Start's server-only marker. D1 and Better Auth are created per request. The browser receives a minimal session projection, never the session token or account table.

Better Auth owns users, credentials, sessions and verification tokens. Its schema is generated with the matching `auth` CLI and migrated with Drizzle-generated SQL. The app preset has no tenant model. The team preset adds Better Auth organizations plus server-side membership and role checks for every project/audit query. The Supabase RLS policies from the old app do not apply to D1.

Authentication requires verified email and checks passwords on the server. Rate limiting uses D1. The global middleware preserves Start's CSRF middleware while setting security headers. Private R2 keys are scoped by the authenticated user ID; downloads use attachment headers and private cache control. Uploads require same-origin requests and enforce a streaming size limit.

## Deliberate deviations from the stack skill

Source: `youming-ai/bun-ts-stack-skills` commit `ba44f2676f059a011536ed5c1cf72db1ede37dba`.

1. `cf` replaces Void, following this project's supplied CLI policy. There is one authored Cloudflare configuration and no authored Wrangler file. Cloud resources are set up explicitly; no Void lockfile is generated.
2. Bun handles packages and scripts; Node is required by `cf`. Worker code uses Web APIs.
3. Better Auth schema generation uses `auth`, the current replacement for the deprecated `@better-auth/cli` package.
4. Biome and GitHub Actions are enabled for the generator. Git hooks are not installed automatically.
5. Exact tested package versions and committed Bun lockfiles replace open-ended scaffolding through latest CLIs.

## Release gates and remaining stages

The first release has `app` and `team` presets and a `storage` module. It must pass CLI safety tests and packed-package generation, frozen install, local D1 migrations, typecheck, workerd tests and production build. Optional module checks repeat against the generated app.

Before a public release, verify a real staging deployment, sender onboarding, production secrets and email delivery. Local simulations prove integration shape, not domain deliverability or cloud provisioning. Code rollback cannot reverse a database migration.

Next stages:

1. Extend the team preset with additional audited business operations and identity integrations when required.
2. Reviewed version-to-version migrations with fixtures for edited user projects. The initial reviewed transition covers the captured 0.6.0 app development baseline to 0.7.0; unknown transitions are refused.
3. A broader module registry only after several real modules establish the necessary interface.

The initial release includes the team authorization baseline; it does not include a compliance-grade audit system, SSO/SCIM, or arbitrary cross-version migrations.
