import { and, eq } from "drizzle-orm"
import { expect, test } from "vitest"
import { z } from "zod"
import { member, user } from "../db/schema"
import { getDb } from "../src/db/index.server"
import {
  createProject,
  getAuditEvents,
  getWorkspace,
  listProjects,
} from "../src/features/team/team.server"
import { getAuth } from "../src/lib/auth.server"

async function post(headers: Headers, path: string, data: Record<string, string>) {
  const requestHeaders = new Headers(headers)
  requestHeaders.set("Origin", "http://localhost:3000")
  requestHeaders.set("Content-Type", "application/json")
  return getAuth().handler(
    new Request(`http://localhost:3000/api/auth/${path}`, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(data),
    })
  )
}

let actorAddress = 10

async function actor(email: string) {
  const password = "a-private-team-test-password-42"
  const headers = new Headers({ "cf-connecting-ip": `192.0.2.${actorAddress++}` })
  const signup = await post(headers, "sign-up/email", { name: "Example", email, password })
  expect(signup.status).toBe(200)
  const registered = z.object({ user: z.object({ id: z.string() }) }).parse(await signup.json())
  await getDb().update(user).set({ emailVerified: true }).where(eq(user.id, registered.user.id))
  const response = await post(headers, "sign-in/email", { email, password })
  expect(response.status).toBe(200)
  headers.set("Cookie", response.headers.get("set-cookie") ?? "")
  return { id: registered.user.id, email, headers }
}

async function createOrganization(headers: Headers, name: string, slug: string) {
  const response = await post(headers, "organization/create", { name, slug })
  expect(response.status).toBe(200)
  return z.object({ id: z.string() }).parse(await response.json())
}

test("tenant isolation, explicit roles, atomic audit records, and membership revocation", async () => {
  const owner = await actor("owner@example.com")
  const admin = await actor("admin@example.com")
  const reader = await actor("reader@example.com")
  const outsider = await actor("outsider@example.com")
  const team = await createOrganization(owner.headers, "Team A", "team-a")
  const other = await createOrganization(outsider.headers, "Team B", "team-b")
  await getDb()
    .insert(member)
    .values([
      {
        id: crypto.randomUUID(),
        organizationId: team.id,
        userId: admin.id,
        role: "admin",
        createdAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        organizationId: team.id,
        userId: reader.id,
        role: "member",
        createdAt: new Date(),
      },
    ])
  await createProject(owner.headers, { organizationId: team.id, name: "Private project" })
  await createProject(admin.headers, { organizationId: team.id, name: "Admin project" })
  expect(await listProjects(reader.headers, team.id)).toHaveLength(2)
  await expect(
    createProject(reader.headers, { organizationId: team.id, name: "Not permitted" })
  ).rejects.toThrow("Forbidden")
  await expect(listProjects(outsider.headers, team.id)).rejects.toThrow("Forbidden")
  await expect(getWorkspace(outsider.headers, team.id)).rejects.toThrow("Forbidden")
  await expect(
    createProject(new Headers(), { organizationId: team.id, name: "Anonymous" })
  ).rejects.toThrow("Unauthorized")
  expect(
    (await getWorkspace(outsider.headers)).memberships.map((membership) => membership.id)
  ).toEqual([other.id])
  expect(await getAuditEvents(owner.headers, team.id)).toHaveLength(2)
  await expect(getAuditEvents(reader.headers, team.id)).rejects.toThrow("Forbidden")
  await getDb()
    .delete(member)
    .where(and(eq(member.organizationId, team.id), eq(member.userId, reader.id)))
  await expect(listProjects(reader.headers, team.id)).rejects.toThrow("Forbidden")
})

test("invitations can only be accepted once by the invited account", async () => {
  const owner = await actor("inviter@example.com")
  const invited = await actor("invited@example.com")
  const team = await createOrganization(owner.headers, "Invitations", "invitations")
  const response = await post(owner.headers, "organization/invite-member", {
    organizationId: team.id,
    email: invited.email,
    role: "member",
  })
  expect(response.status).toBe(200)
  const invitation = z.object({ id: z.string() }).parse(await response.json())
  expect(
    (await post(owner.headers, "organization/accept-invitation", { invitationId: invitation.id }))
      .status
  ).toBe(403)
  expect(
    (await post(invited.headers, "organization/accept-invitation", { invitationId: invitation.id }))
      .status
  ).toBe(200)
  expect(await listProjects(invited.headers, team.id)).toHaveLength(0)
  expect(
    (await post(invited.headers, "organization/accept-invitation", { invitationId: invitation.id }))
      .status
  ).toBe(400)
})
