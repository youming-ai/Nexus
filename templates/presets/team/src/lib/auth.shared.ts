import type { BetterAuthOptions } from "better-auth"
import { type OrganizationOptions, organization } from "better-auth/plugins"

export function organizationPlugins(
  options: Pick<OrganizationOptions, "sendInvitationEmail"> = {}
) {
  return [organization(options)]
}

export const schemaOptions = {
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: { "/sign-in/email": { window: 60, max: 5 } },
  },
  plugins: organizationPlugins(),
} satisfies BetterAuthOptions
