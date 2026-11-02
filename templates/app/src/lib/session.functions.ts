import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { getAuth } from "./auth.server"

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getAuth().api.getSession({ headers: getRequestHeaders() })
  return session
    ? { user: { id: session.user.id, name: session.user.name, email: session.user.email } }
    : null
})
