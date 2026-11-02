import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "~/components/ui/button"
import { authClient } from "~/lib/auth-client"
import { getSession } from "~/lib/session.functions"

export const Route = createFileRoute("/team/invitations/$id")({
  beforeLoad: async () => {
    if (!(await getSession())) throw redirect({ to: "/login" })
  },
  component: Invitation,
})

function Invitation() {
  const { id } = Route.useParams()
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  return (
    <main className="auth">
      <p className="eyebrow">TEAM INVITATION</p>
      <h1>Join your team.</h1>
      <p>Accept using the account matching the invited email address.</p>
      <Button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          try {
            const result = await authClient.organization.acceptInvitation({ invitationId: id })
            if (result.error) {
              setMessage(result.error.message ?? "Unable to accept invitation")
              return
            }
            await router.navigate({ to: "/team", search: {} })
          } catch {
            setMessage("Unable to accept invitation. Please try again.")
          } finally {
            setPending(false)
          }
        }}
      >
        Accept invitation
      </Button>
      {message && <p role="status">{message}</p>}
    </main>
  )
}
