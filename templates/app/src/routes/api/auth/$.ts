import { createFileRoute } from "@tanstack/react-router"
import { getAuth } from "~/lib/auth.server"

const handler = ({ request }: { request: Request }) => getAuth().handler(request)
export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: handler, POST: handler } },
})
