import "@tanstack/react-start/server-only"
import { and, desc, eq } from "drizzle-orm"
import { getDb } from "~/db/index.server"
import { getAuth } from "~/lib/auth.server"
import { canManageProjects, projectInput } from "~/schemas/team"
import { auditEvents, member, organization, projects } from "../../../db/schema"

async function requireUser(headers: Headers) {
  const session = await getAuth().api.getSession({ headers })
  if (!session) throw new Error("Unauthorized")
  return session.user
}

async function requireMembership(headers: Headers, organizationId: string) {
  const user = await requireUser(headers)
  const [membership] = await getDb()
    .select()
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, user.id)))
  if (!membership) throw new Error("Forbidden")
  return membership
}

export async function listProjects(headers: Headers, organizationId: string) {
  await requireMembership(headers, organizationId)
  return getDb()
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .orderBy(desc(projects.createdAt))
}

export async function createProject(headers: Headers, input: unknown) {
  const data = projectInput.parse(input)
  const membership = await requireMembership(headers, data.organizationId)
  if (!canManageProjects(membership.role)) throw new Error("Forbidden")
  const id = crypto.randomUUID()
  const db = getDb()
  const createdAt = new Date()
  // D1 batch is atomic: the business write and its audit event succeed together.
  await db.batch([
    db.insert(projects).values({ id, ...data, createdBy: membership.userId, createdAt }),
    db.insert(auditEvents).values({
      id: crypto.randomUUID(),
      organizationId: data.organizationId,
      actorId: membership.userId,
      event: "project.created",
      resourceId: id,
      createdAt,
    }),
  ])
  return { id }
}

export async function getWorkspace(headers: Headers, organizationId?: string) {
  const user = await requireUser(headers)
  const memberships = await getDb()
    .select({ id: organization.id, name: organization.name, role: member.role })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, user.id))
    .orderBy(organization.name)
  const active = organizationId
    ? memberships.find((membership) => membership.id === organizationId)
    : memberships[0]
  if (organizationId && !active) throw new Error("Forbidden")
  return {
    memberships,
    active: active ?? null,
    projects: active ? await listProjects(headers, active.id) : [],
    activity:
      active && canManageProjects(active.role)
        ? (await getAuditEvents(headers, active.id)).map((event) => ({
            id: event.id,
            event: event.event,
            resourceId: event.resourceId,
            createdAt: event.createdAt.toISOString(),
          }))
        : [],
  }
}

export async function getAuditEvents(headers: Headers, organizationId: string) {
  const membership = await requireMembership(headers, organizationId)
  if (!canManageProjects(membership.role)) throw new Error("Forbidden")
  return getDb()
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.organizationId, organizationId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(100)
}
