# Nexus

Create, inspect, and upgrade full-stack Bun + TanStack Start + Void applications on Cloudflare Workers.

Download `nexus.tgz` from [GitHub Releases](https://github.com/youming-ai/Nexus/releases) and extract it. Run the bundled CLI directly; no npm installation is needed:

```sh
bun package/dist/index.js create ./my-app
bun package/dist/index.js create ./my-team-app --preset team
bun package/dist/index.js add storage --cwd ./my-app
bun package/dist/index.js doctor --cwd ./my-app
bun package/dist/index.js upgrade --cwd ./my-app --dry-run
```

Keep `dist/` and `assets/` together. Use `--help` for command details. Bun `>= 1.4.4` is required; generated apps also need Node `>= 22.23.0` to run `void` / `cf` and Vite configuration loading. All templates are bundled, with no Git branch fetched at creation time. Generated project dependencies are still installed from the package registry using Bun.
