import { fileURLToPath } from "node:url"
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin"
import { defineConfig } from "vitest/config"
import { featureTestBindings } from "./nexus.test.ts"

export default defineConfig(async () => ({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
      "@tanstack/react-start/server-only": fileURLToPath(
        new URL("./test/server-only.ts", import.meta.url)
      ),
    },
  },
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: "2026-10-15",
        compatibilityFlags: ["nodejs_compat"],
        d1Databases: ["DB"],
        ...featureTestBindings,
        bindings: {
          PUBLIC_ORIGIN: "http://localhost:3000",
          __VOID_EMAIL_FROM: "Nexus <hello@example.com>",
          BETTER_AUTH_SECRET: "test-secret-that-is-at-least-thirty-two-characters-long",
          TEST_MIGRATIONS: await readD1Migrations("./db/migrations"),
        },
      },
    }),
  ],
  test: { setupFiles: ["./test/apply-migrations.ts"], include: ["test/**/*.test.ts"] },
}))
