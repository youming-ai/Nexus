import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { AuthForm } from "~/components/auth-form"

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ token: z.string().optional(), error: z.string().optional() }),
  component: ResetPassword,
})

function ResetPassword() {
  const { token } = Route.useSearch()
  return <AuthForm mode="reset" token={token} />
}
