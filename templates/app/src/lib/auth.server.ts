import "@tanstack/react-start/server-only"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { env } from "void/env"
import { z } from "zod"
import { getDb } from "~/db/index.server"
import "../../env"
import { schemaOptions } from "./auth.shared"
import { sendAuthEmail } from "./email.server"

export function getAuth() {
  return betterAuth({
    ...schemaOptions,
    database: drizzleAdapter(getDb(), { provider: "sqlite" }),
    secret: z.string().min(32).parse(env.BETTER_AUTH_SECRET),
    baseURL: z.url().parse(env.PUBLIC_ORIGIN),
    trustedOrigins: [env.PUBLIC_ORIGIN],
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: true,
      sendResetPassword: ({ user, url }) => sendAuthEmail(user.email, "Reset your password", url),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: ({ user, url }) => sendAuthEmail(user.email, "Verify your email", url),
    },
    plugins: [...schemaOptions.plugins, tanstackStartCookies()],
  })
}
