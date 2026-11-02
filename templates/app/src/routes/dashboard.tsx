import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { Button } from "~/components/ui/button"
import { authClient } from "~/lib/auth-client"
import { getSession } from "~/lib/session.functions"

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: "/login" })
    return { user: session.user }
  },
  component: Dashboard,
})

function Dashboard() {
  const { user } = Route.useRouteContext()
  const router = useRouter()
  return (
    <main>
      <p className="eyebrow">WORKSPACE</p>
      <h1>Welcome, {user.name}.</h1>
      <p>You are signed in as {user.email}.</p>
      <Button
        type="button"
        onClick={async () => {
          await authClient.signOut()
          await router.invalidate()
          await router.navigate({ to: "/login" })
        }}
      >
        Sign out
      </Button>
    </main>
  )
}
