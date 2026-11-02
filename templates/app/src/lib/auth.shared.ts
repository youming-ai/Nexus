import type { BetterAuthOptions } from "better-auth"

export const schemaOptions = {
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: { "/sign-in/email": { window: 60, max: 5 } },
  },
  plugins: [],
} satisfies BetterAuthOptions
