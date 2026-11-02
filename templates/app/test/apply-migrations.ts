import { applyD1Migrations, type D1Migration } from "cloudflare:test"
import { env } from "cloudflare:workers"
import { createEmailTestHarness } from "void/email/testing"

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

createEmailTestHarness()
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
