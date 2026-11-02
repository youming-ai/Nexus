import { createFileRoute } from "@tanstack/react-router"
import { getAuth } from "~/lib/auth.server"
import { storeFile } from "~/lib/storage.server"

export const Route = createFileRoute("/api/files/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getAuth().api.getSession({ headers: request.headers })
        if (!session) return new Response("Unauthorized", { status: 401 })
        if (request.headers.get("origin") !== new URL(request.url).origin)
          return new Response("Forbidden", { status: 403 })
        return storeFile(session.user.id, request)
      },
    },
  },
})
