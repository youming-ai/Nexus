import "@tanstack/react-start/server-only"
import { env } from "cloudflare:workers"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { z } from "zod"
import { getDb } from "~/db/index.server"
import { organizationPlugins, schemaOptions } from "./auth.shared"
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
    plugins: [
      ...organizationPlugins({
        sendInvitationEmail: (invitation) =>
          sendAuthEmail(
            invitation.email,
            `Join ${invitation.organization.name}`,
            `${env.PUBLIC_ORIGIN}/team/invitations/${encodeURIComponent(invitation.id)}`
          ),
      }),
      tanstackStartCookies(),
    ],
  })
}
