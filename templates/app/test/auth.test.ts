import { env } from "cloudflare:workers"
import { eq } from "drizzle-orm"
import { expect, test } from "vitest"
import { z } from "zod"
import { user } from "../db/schema"
import { getDb } from "../src/db/index.server"
import { getAuth } from "../src/lib/auth.server"

const origin = "http://localhost:3000"
const password = "a-private-test-password-42"
function request(path: string, data: Record<string, string>) {
  return new Request(`${origin}/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(data),
  })
}

test("registration stores credentials in D1 and blocks login before email verification", async () => {
  const auth = getAuth()
  const signup = await auth.handler(
    request("sign-up/email", { name: "Example", email: "person@example.com", password })
  )
  expect(signup.status).toBe(200)
  const db = getDb()
  const [registered] = await db.select().from(user).where(eq(user.email, "person@example.com"))
  expect(registered?.emailVerified).toBe(false)
  const login = await auth.handler(
    request("sign-in/email", { email: "person@example.com", password })
  )
  expect(login.status).toBe(403)
  // Complete the verification precondition in D1. No ORM or database mocks.
  await db.update(user).set({ emailVerified: true }).where(eq(user.email, "person@example.com"))
  const verifiedLogin = await auth.handler(
    request("sign-in/email", { email: "person@example.com", password })
  )
  expect(verifiedLogin.status).toBe(200)
  const cookie = verifiedLogin.headers.get("set-cookie")
  expect(cookie).toContain("better-auth.session_token")
  const session = await auth.handler(
    new Request(`${origin}/api/auth/get-session`, { headers: { Cookie: cookie ?? "" } })
  )
  expect(
    z.object({ user: z.object({ email: z.string() }) }).parse(await session.json()).user.email
  ).toBe("person@example.com")
  const invalidLogin = await auth.handler(
    request("sign-in/email", { email: "person@example.com", password: "wrong-password" })
  )
  expect(invalidLogin.status).toBe(401)
})

test("auth rejects cross-origin writes and weak passwords", async () => {
  const auth = getAuth()
  const foreign = request("sign-up/email", { name: "Other", email: "other@example.com", password })
  foreign.headers.set("Origin", "https://untrusted.example")
  expect((await auth.handler(foreign)).status).toBe(403)
  expect(
    (
      await auth.handler(
        request("sign-up/email", { name: "Other", email: "other@example.com", password: "short" })
      )
    ).status
  ).toBe(400)
  expect(
    await env.DB.prepare('SELECT id FROM "user" WHERE email = ?').bind("other@example.com").first()
  ).toBeNull()
})
