# Storage

The module adds a private R2 binding and authenticated upload/download routes.

- `POST /api/files/` with a raw body, session cookie and same-origin `Origin` header returns `{ id }`.
- `GET /api/files/<id>` downloads a file owned by the current user.
- Maximum file size: 10 MiB. Uploads require a valid `Content-Length`; the stream is checked against it. Files download as attachments.

Run `bun run typecheck` to regenerate binding and route types, then `bun run test`. The module adds its local R2 test binding automatically.

Provision the bucket with the cf CLI before production deployment. Find the current command with `bunx cf cli search "create an R2 bucket"`; use the bucket name in `nexus.bindings.ts`. No resources are provisioned by `nexus add`.
