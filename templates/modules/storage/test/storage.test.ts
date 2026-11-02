import { env } from "cloudflare:workers"
import { expect, test } from "vitest"
import { z } from "zod"
import { readFile, storeFile } from "../src/lib/storage.server"

test("downloads are scoped to the owner, including guessed file IDs", async () => {
  const id = crypto.randomUUID()
  await env.STORAGE.put(`owner/${id}`, "private file")
  expect(await (await readFile("owner", id)).text()).toBe("private file")
  expect((await readFile("another-user", id)).status).toBe(404)
  expect((await readFile("owner", "../owner")).status).toBe(404)
})

test("uploads enforce the size limit before storing", async () => {
  const response = await storeFile(
    "owner",
    new Request("http://localhost:3000/api/files/", {
      method: "POST",
      headers: { "Content-Length": String(11 * 1024 * 1024) },
      body: "small",
    })
  )
  expect(response.status).toBe(413)
})

test("uploads stream into R2 and can be downloaded by their owner", async () => {
  const uploaded = await storeFile(
    "writer",
    new Request("http://localhost:3000/api/files/", {
      method: "POST",
      body: "hello",
      headers: { "Content-Length": "5" },
    })
  )
  expect(uploaded.status).toBe(201)
  const payload = z.object({ id: z.uuid() }).parse(await uploaded.json())
  expect(await (await readFile("writer", payload.id)).text()).toBe("hello")
})
