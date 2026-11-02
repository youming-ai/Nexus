import "@tanstack/react-start/server-only"
import { env } from "cloudflare:workers"
import { z } from "zod"

const fileId = z.uuid()
const MAX_BYTES = 10 * 1024 * 1024

export async function storeFile(ownerId: string, request: Request) {
  if (!request.body) return new Response("Missing file body", { status: 400 })
  const lengthHeader = request.headers.get("content-length")
  if (lengthHeader === null) return new Response("Content-Length is required", { status: 411 })
  if (!/^\d+$/.test(lengthHeader)) return new Response("Invalid Content-Length", { status: 400 })
  const declaredSize = Number(lengthHeader)
  if (declaredSize > MAX_BYTES) return new Response("File exceeds 10 MiB", { status: 413 })
  // R2 requires a known-length stream. FixedLengthStream also rejects a body
  // that disagrees with the declared length without buffering the upload.
  const body = new FixedLengthStream(declaredSize)
  const cancellation = new AbortController()
  const id = crypto.randomUUID()
  try {
    await Promise.all([
      request.body.pipeTo(body.writable, { signal: cancellation.signal }),
      env.STORAGE.put(`${ownerId}/${id}`, body.readable, {
        httpMetadata: { contentType: "application/octet-stream" },
      }),
    ])
  } finally {
    cancellation.abort()
  }
  return Response.json({ id }, { status: 201 })
}

export async function readFile(ownerId: string, id: string) {
  const parsed = fileId.safeParse(id)
  if (!parsed.success) return new Response("Not found", { status: 404 })
  const object = await env.STORAGE.get(`${ownerId}/${parsed.data}`)
  if (!object) return new Response("Not found", { status: 404 })
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${parsed.data}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  })
}
