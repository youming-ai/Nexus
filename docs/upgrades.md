# Project upgrades

Supported transition: **0.6.0 app development baseline (without optional modules) → 0.7.0**. The baseline is captured in `tests/fixtures/app-0.6.0.json`; it is a development fixture, not a claim that 0.6.0 was publicly released. The transition adds `.nvmrc`, `AGENTS.md`, and clarifies local/production environment setup. It does not change dependencies or database schemas.

```sh
nexus upgrade --dry-run
nexus upgrade --dry-run --json
nexus upgrade
```

The CLI uses the templates bundled in its installed package. It does not fetch a mutable branch or execute remote migration scripts.

For every proposed file:

- If the file already matches the target, record that baseline without rewriting it.
- If the upstream file has not changed, preserve local edits.
- If only upstream changed, update the unchanged local file.
- If both upstream and local changed, include the proposed diff in preview and stop the entire operation.
- If the local file was deleted and the upstream file changed, stop for manual reconciliation.

Resolve conflicts against the previewed target, commit the reconciled files, and run the preview again. There is no force-overwrite flag. The generated `nexus.json` records the new template version only when the plan executes successfully. Private `.env` files and untracked custom application files are not part of the upgrade plan.

Execution checks for edits made since planning, rejects symlink destinations, and restores already-written files on a caught write error. It is not a crash-safe filesystem transaction; use a clean commit for recovery.

Adding a future transition requires a migration gate in `packages/core/src/migrations.ts`, an actual captured source fixture, conflict/preservation tests, and packed-CLI verification of the resulting application. File removals, dependency changes, auth-schema changes, and SQL changes need explicit review; the current migration does not exercise those cases.
