import { useForm } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "~/components/ui/button"
import { authClient } from "~/lib/auth-client"
import { forgotPasswordInput, loginInput, resetPasswordInput, signupInput } from "~/schemas/auth"

type Mode = "login" | "signup" | "forgot" | "reset"
const titles = {
  login: "Welcome back.",
  signup: "Make it yours.",
  forgot: "Forgot your password?",
  reset: "Set a new password.",
}
const labels = {
  login: "Sign in",
  signup: "Create account",
  forgot: "Send reset link",
  reset: "Update password",
}
const schemas = {
  login: loginInput,
  signup: signupInput,
  forgot: forgotPasswordInput,
  reset: resetPasswordInput,
}

export function AuthForm({ mode, token }: { mode: Mode; token?: string }) {
  const [message, setMessage] = useState("")
  const form = useForm({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    onSubmit: async ({ value }) => {
      setMessage("")
      const validated = schemas[mode].safeParse(value)
      if (!validated.success) {
        setMessage(validated.error.issues[0]?.message ?? "Check your inputs")
        return
      }
      try {
        const result = await submitAuth(mode, value, token)
        if (result.error) {
          setMessage(result.error.message ?? "Please try again")
          return
        }
        if (mode === "login") {
          window.location.assign("/dashboard")
          return
        }
        setMessage(successMessages[mode])
      } catch {
        setMessage("Unable to complete the request. Please try again.")
      }
    },
  })
  const fields: {
    name: "name" | "email" | "password" | "confirmPassword"
    label: string
    type: string
    autoComplete: string
  }[] = []
  if (mode === "signup")
    fields.push({ name: "name", label: "Name", type: "text", autoComplete: "name" })
  if (mode !== "reset")
    fields.push({ name: "email", label: "Email", type: "email", autoComplete: "email" })
  if (mode !== "forgot")
    fields.push({
      name: "password",
      label: "Password",
      type: "password",
      autoComplete: mode === "login" ? "current-password" : "new-password",
    })
  if (mode === "reset")
    fields.push({
      name: "confirmPassword",
      label: "Confirm password",
      type: "password",
      autoComplete: "new-password",
    })
  return (
    <main className="auth">
      <p className="eyebrow">NEXUS ACCOUNT</p>
      <h1>{titles[mode]}</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        {fields.map((field) => (
          <form.Field key={field.name} name={field.name}>
            {(state) => (
              <label>
                {field.label}
                <input
                  name={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  value={state.state.value}
                  onBlur={state.handleBlur}
                  onChange={(event) => state.handleChange(event.target.value)}
                  required
                  minLength={field.type === "password" && mode !== "login" ? 12 : undefined}
                  maxLength={field.type === "password" ? 128 : undefined}
                />
              </label>
            )}
          </form.Field>
        ))}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(pending) => (
            <Button type="submit" disabled={pending || (mode === "reset" && !token)}>
              {pending ? "Please wait…" : labels[mode]}
            </Button>
          )}
        </form.Subscribe>
      </form>
      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
      {mode === "reset" && !token && (
        <p role="alert">This reset link is missing its token. Request a new link.</p>
      )}
      {mode === "login" ? (
        <>
          <p>
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
          <p>
            New here? <Link to="/signup">Create an account</Link>
          </p>
        </>
      ) : (
        <p>
          <Link to="/login">Back to sign in</Link>
        </p>
      )}
    </main>
  )
}

const successMessages = {
  login: "Signed in.",
  signup: "Check your inbox to verify your email before signing in.",
  forgot: "If an account exists, a reset link has been sent.",
  reset: "Password updated. You can now sign in.",
}

function submitAuth(
  mode: Mode,
  value: { name: string; email: string; password: string; confirmPassword: string },
  token?: string
) {
  switch (mode) {
    case "signup":
      return authClient.signUp.email({ ...signupInput.parse(value), callbackURL: "/login" })
    case "login":
      return authClient.signIn.email(loginInput.parse(value))
    case "forgot":
      return authClient.requestPasswordReset({
        ...forgotPasswordInput.parse(value),
        redirectTo: "/reset-password",
      })
    case "reset":
      return authClient.resetPassword({
        newPassword: resetPasswordInput.parse(value).password,
        token,
      })
  }
}
