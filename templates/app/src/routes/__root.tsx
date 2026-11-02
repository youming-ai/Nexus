import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router"
import appCss from "../styles/app.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nexus" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: Root,
  notFoundComponent: () => (
    <main>
      <h1>Page not found</h1>
      <Link to="/">Go home</Link>
    </main>
  ),
  errorComponent: () => (
    <main>
      <h1>Something went wrong</h1>
      <p>Try again in a moment.</p>
    </main>
  ),
})

function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <Link to="/" className="brand">
            Nexus
          </Link>
          <nav>
            <Link to="/login">Sign in</Link>
            <Link to="/dashboard">Workspace</Link>
          </nav>
        </header>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
