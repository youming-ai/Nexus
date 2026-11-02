import { defineConfig } from "void/config"
import { featureBindings } from "./nexus.bindings.ts"

export default defineConfig({
  worker: {
    compatibility_date: "2026-10-15",
    compatibility_flags: ["nodejs_compat"],
  },
  email: { from: "Nexus <hello@example.com>" },
  inference: {
    bindings: { db: true, email: true, ...featureBindings },
  },
  cloudflare: {
    name: "nexus-app",
    main: "./src/server.ts",
    assets: { binding: "ASSETS" },
    observability: { enabled: true },
  },
})
