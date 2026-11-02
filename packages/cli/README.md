# `@youming-ai/create-nexus`

Create, inspect, and upgrade full-stack Bun + TanStack Start + Void applications on Cloudflare Workers.

```sh
create-nexus my-app
cd my-app
printf "BETTER_AUTH_SECRET=%s\nBETTER_AUTH_URL=http://localhost:3000\n" "$(openssl rand -base64 32)" > .env
bun run db:migrate
bun run dev
```

Additional commands:

```sh
create-nexus my-team-app --preset team
nexus add storage --cwd ./my-app
nexus doctor --cwd ./my-app
nexus upgrade --cwd ./my-app --dry-run
```

Use `--help` for command details. Bun `>= 1.4.4` is required; generated apps also need Node `>= 22.23.0` to run `void` / `cf` and Vite configuration loading. The package bundles all template files and does not fetch mutable Git branches at creation time.
