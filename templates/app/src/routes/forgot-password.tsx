import { createFileRoute } from "@tanstack/react-router"
import { AuthForm } from "~/components/auth-form"

export const Route = createFileRoute("/forgot-password")({
  component: () => <AuthForm mode="forgot" />,
})
