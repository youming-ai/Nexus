import { spawn } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"
import { z } from "zod"

const origin = "http://localhost:3000"
const mailboxPath = "/__void/inbox"

export async function smokeApp(project: string, storage = false, team = false) {
  try {
    await fetch(origin, { signal: AbortSignal.timeout(500) })
    throw new Error(
      "Port 3000 is in use; stop the local server before running generated-project verification"
    )
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Port 3000")) throw error
  }
  await writeFile(
    `${project}/.env`,
    `BETTER_AUTH_SECRET=${crypto.randomUUID()}${crypto.randomUUID()}\n`,
    { flag: "wx" }
  )
  const child = spawn("bun", ["run", "dev"], {
    cwd: project,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  })
  let logs = ""
  child.stdout.on("data", (chunk: Buffer) => {
    logs = (logs + chunk.toString()).slice(-12000)
  })
  child.stderr.on("data", (chunk: Buffer) => {
    logs = (logs + chunk.toString()).slice(-12000)
  })
  try {
    await waitForServer(child)
    await checkFlows(project, storage, team)
    console.log(
      `HTTP smoke passed: verification, login, session, password reset${storage ? ", private uploads" : ""}${team ? ", team workspace" : ""}`
    )
  } catch (error) {
    process.stderr.write(logs)
    throw error
  } finally {
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM")
      } catch {}
    }
    await new Promise<void>((resolve) => {
      if (child.exitCode !== null) resolve()
      else child.once("exit", () => resolve())
    })
  }
}

async function waitForServer(child: ReturnType<typeof spawn>) {
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Development server exited before becoming ready")
    try {
      if ((await fetch(`${origin}/login`, { signal: AbortSignal.timeout(1000) })).ok) return
    } catch {}
    await Bun.sleep(100)
  }
  throw new Error("Development server did not become ready")
}

async function checkFlows(project: string, storage: boolean, team: boolean) {
  const email = `local-${crypto.randomUUID()}@example.com`
  const password = "a-private-smoke-test-password-42"
  const cookies = new Map<string, string>()
  async function request(path: string, data?: Record<string, string>) {
    const response = await fetch(`${origin}${path}`, {
      method: data ? "POST" : "GET",
      redirect: "manual",
      headers: {
        Origin: origin,
        Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
        ...(data ? { "Content-Type": "application/json" } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0] ?? ""
      const equals = pair.indexOf("=")
      cookies.set(pair.slice(0, equals), pair.slice(equals + 1))
    }
    return response
  }
  const assertStatus = (response: Response, status: number, step: string) => {
    if (response.status !== status)
      throw new Error(`${step}: expected ${status}, received ${response.status}`)
  }
  assertStatus(await request("/dashboard"), 307, "anonymous workspace")
  assertStatus(
    await request("/api/auth/sign-up/email", {
      name: "Local Example",
      email,
      password,
      callbackURL: "/login",
    }),
    200,
    "registration"
  )
  assertStatus(
    await request("/api/auth/sign-in/email", { email, password }),
    403,
    "unverified login"
  )
  const verification = await getEmailLink(project, email, "Verify your email")
  assertStatus(
    await request(`${verification.pathname}${verification.search}`),
    302,
    "email verification"
  )
  assertStatus(await request("/api/auth/sign-in/email", { email, password }), 200, "verified login")
  assertStatus(await request("/dashboard"), 200, "authenticated workspace")
  if (team) {
    assertStatus(
      await request("/api/auth/organization/create", {
        name: "Smoke team",
        slug: `smoke-${crypto.randomUUID()}`,
      }),
      200,
      "create organization"
    )
    const workspace = await request("/team")
    assertStatus(workspace, 200, "team workspace")
    if (!(await workspace.text()).includes("Smoke team"))
      throw new Error("Organization missing from server-rendered workspace")
  }
  if (storage) {
    const response = await fetch(`${origin}/api/files/`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
      },
      body: "a private upload",
    })
    assertStatus(response, 201, "upload")
    const { id } = z.object({ id: z.uuid() }).parse(await response.json())
    if ((await (await request(`/api/files/${id}`)).text()) !== "a private upload")
      throw new Error("Uploaded content mismatch")
    assertStatus(
      await fetch(`${origin}/api/files/${id}`, { redirect: "manual" }),
      401,
      "anonymous download"
    )
  }
  assertStatus(await request("/api/auth/sign-out", {}), 200, "sign out")
  assertStatus(await request("/dashboard"), 307, "workspace after sign out")
  assertStatus(
    await request("/api/auth/request-password-reset", { email, redirectTo: "/reset-password" }),
    200,
    "request password reset"
  )
  const reset = await getEmailLink(project, email, "Reset your password")
  const resetRedirect = await request(`${reset.pathname}${reset.search}`)
  assertStatus(resetRedirect, 302, "reset link")
  const token = new URL(resetRedirect.headers.get("location") ?? "", origin).searchParams.get(
    "token"
  )
  if (!token) throw new Error("Reset token missing")
  const newPassword = `${password}-changed`
  assertStatus(
    await request("/api/auth/reset-password", { token, newPassword }),
    200,
    "reset password"
  )
  assertStatus(
    await request("/api/auth/reset-password", { token, newPassword }),
    400,
    "reset token reuse"
  )
  assertStatus(await request("/api/auth/sign-in/email", { email, password }), 401, "old password")
  assertStatus(
    await request("/api/auth/sign-in/email", { email, password: newPassword }),
    200,
    "new password"
  )
}

async function getEmailLink(project: string, email: string, subject: string) {
  const token = (await readFile(`${project}/.void/dev-trigger-token`, "utf8")).trim()
  const listHtml = await (
    await fetch(`${origin}${mailboxPath}`, { headers: { "x-void-dev-trigger": token } })
  ).text()
  const ids = [
    ...new Set(
      [...listHtml.matchAll(/\/__void\/inbox\/(dev_[A-Za-z0-9_-]+)/g)].map((match) => match[1])
    ),
  ]
  for (const id of ids) {
    const raw = await (
      await fetch(`${origin}${mailboxPath}/${id}/raw`, {
        headers: { "x-void-dev-trigger": token },
      })
    ).text()
    if (!raw.includes(`Subject: ${subject}`) || !raw.includes(email)) continue
    const plainSection = raw.split("Content-Type: text/html")[0] ?? raw
    const link = plainSection.match(/https?:\/\/\S+/)?.[0]
    if (!link) throw new Error("Email link missing")
    const url = new URL(link)
    if (url.origin !== origin) throw new Error("Email link must remain local")
    return url
  }
  throw new Error(`Simulated email missing: ${subject}`)
}
