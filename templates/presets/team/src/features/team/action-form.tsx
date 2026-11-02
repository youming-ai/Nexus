import { useState } from "react"
import { z } from "zod"
import { Button } from "~/components/ui/button"

type Field = { name: string; label: string; type?: string }

export function ActionForm({
  title,
  fields,
  submit,
}: {
  title: string
  fields: Field[]
  submit: (data: FormData) => Promise<string>
}) {
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  return (
    <section>
      <h2>{title}</h2>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          const form = event.currentTarget
          setPending(true)
          setMessage("")
          try {
            setMessage(await submit(new FormData(form)))
            form.reset()
          } catch (error) {
            setMessage(
              error instanceof z.ZodError
                ? (error.issues[0]?.message ?? "Check your inputs.")
                : error instanceof Error && error.message
                  ? error.message
                  : "Unable to complete the request. Check your inputs and permissions."
            )
          } finally {
            setPending(false)
          }
        }}
      >
        {fields.map((field) => (
          <label key={field.name}>
            {field.label}
            <input
              name={field.name}
              type={field.type ?? "text"}
              required
              maxLength={field.type === "email" ? 254 : 100}
            />
          </label>
        ))}
        <Button type="submit" disabled={pending}>
          {pending ? "Please wait…" : title}
        </Button>
      </form>
      {message && (
        <p role="status" className="message">
          {message}
        </p>
      )}
    </section>
  )
}
