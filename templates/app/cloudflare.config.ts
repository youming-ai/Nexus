import { bindings, defineConfig } from "cf/config"
import { featureBindings } from "./nexus.bindings.ts"

export default defineConfig({
  worker: {
    name: "nexus-app",
    entrypoint: "./src/server.ts",
    compatibilityDate: "2026-11-02",
    compatibilityFlags: ["nodejs_compat"],
    observability: { enabled: true, traces: { enabled: true } },
    env: {
      DB: bindings.d1({ name: "nexus-app-db", id: "00000000-0000-4000-8000-000000000001" }),
      EMAIL: bindings.sendEmail(),
      PUBLIC_ORIGIN: bindings.text("http://localhost:3000"),
      EMAIL_FROM: bindings.text("Nexus <hello@example.com>"),
      BETTER_AUTH_SECRET: bindings.secret(),
      ...featureBindings,
    },
  },
})
