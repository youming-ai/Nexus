import { createFileRoute } from "@tanstack/react-router"
import { getAuth } from "~/lib/auth.server"
import { readFile } from "~/lib/storage.server"

export const Route = createFileRoute("/api/files/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await getAuth().api.getSession({ headers: request.headers })
        if (!session) return new Response("Unauthorized", { status: 401 })
        return readFile(session.user.id, params.id)
      },
    },
  },
})
