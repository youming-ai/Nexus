import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start"
import { setResponseHeader } from "@tanstack/react-start/server"

const securityHeaders = createMiddleware().server(async ({ next }) => {
  const traceId = crypto.randomUUID()
  const started = Date.now()
  setResponseHeader("X-Request-ID", traceId)
  setResponseHeader("X-Content-Type-Options", "nosniff")
  setResponseHeader("X-Frame-Options", "DENY")
  setResponseHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  setResponseHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  try {
    const response = await next()
    console.info({ event: "request.complete", traceId, durationMs: Date.now() - started })
    return response
  } catch (error) {
    console.error({ event: "request.failed", traceId, durationMs: Date.now() - started })
    throw error
  }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" }),
    securityHeaders,
  ],
}))
