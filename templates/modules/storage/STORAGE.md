# Storage

The module adds a private R2 binding (`env.STORAGE`) and authenticated upload/download routes.

- `POST /api/files/` with a raw body, session cookie, and same-origin `Origin` header returns `{ id }`.
- `GET /api/files/<id>` downloads a file owned by the current user.
- Maximum file size: 10 MiB. Uploads require a valid `Content-Length`; the stream is checked against it via `FixedLengthStream`. Files download as attachments.

Run `bun run typecheck` to regenerate Void binding and route types, then `bun run test`. The module enables `storage: true` in `nexus.bindings.ts` and adds its local R2 test binding in `nexus.test.ts`.

On the first `void deploy`, Void infers and provisions the R2 bucket and records its ID in `void.lock.json`. No cloud resources are provisioned locally by `nexus add`.
