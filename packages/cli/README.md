# Nexus CLI

Create and maintain Bun + TanStack Start applications on Cloudflare Workers.

```sh
create-nexus my-app
nexus add storage
nexus doctor
nexus upgrade --dry-run
```

Use `--help` for command details. Bun 1.4.4+ is required; generated apps also need Node 22.23+ to run the Cloudflare CLI. The package bundles all template files and does not fetch mutable Git branches at creation time.

This is an unpublished development version. Build and use the local executable from the repository; a registry release is a separate step.
