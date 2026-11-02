import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <main>
      <p className="eyebrow">YOUR NEXT PROJECT STARTS HERE</p>
      <h1>
        A foundation
        <br />
        for what comes next.
      </h1>
      <p className="lead">Typed from form to database. Built on TanStack Start and Cloudflare.</p>
      <div className="actions">
        <Link to="/signup" className="button">
          Create an account
        </Link>
        <Link to="/login">Sign in →</Link>
      </div>
      <section className="grid">
        <article>
          <h2>One application</h2>
          <p>Server rendering, typed functions, and React in one project.</p>
        </article>
        <article>
          <h2>Own your data</h2>
          <p>D1, Drizzle migrations, and request-scoped authentication.</p>
        </article>
        <article>
          <h2>Ready to grow</h2>
          <p>Add capabilities when your product needs them.</p>
        </article>
      </section>
    </main>
  )
}
