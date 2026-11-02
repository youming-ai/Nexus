import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { schemaOptions } from "./auth.shared"

export const auth = betterAuth({
  ...schemaOptions,
  database: drizzleAdapter({}, { provider: "sqlite" }),
})
