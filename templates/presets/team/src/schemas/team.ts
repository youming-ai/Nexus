import { z } from "zod"

export const organizationIdInput = z.object({ organizationId: z.string().min(1).max(128) })
export const projectInput = organizationIdInput.extend({ name: z.string().trim().min(1).max(100) })
export const organizationInput = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().regex(/^[a-z][a-z0-9-]{0,47}$/),
})
export const invitationInput = organizationIdInput.extend({ email: z.email() })
export const workspaceInput = z.object({ organizationId: z.string().min(1).max(128).optional() })

export const canManageProjects = (role: string) =>
  role.split(",").some((role) => role === "owner" || role === "admin")
