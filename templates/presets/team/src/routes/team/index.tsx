import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { ActionForm } from "~/features/team/action-form"
import { addProject, loadWorkspace } from "~/features/team/team.functions"
import { authClient } from "~/lib/auth-client"
import { getSession } from "~/lib/session.functions"
import {
  canManageProjects,
  invitationInput,
  organizationInput,
  projectInput,
  workspaceInput,
} from "~/schemas/team"

export const Route = createFileRoute("/team/")({
  validateSearch: workspaceInput,
  beforeLoad: async () => {
    if (!(await getSession())) throw redirect({ to: "/login" })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => loadWorkspace({ data: deps }),
  component: TeamWorkspace,
})

function TeamWorkspace() {
  const { memberships, active, projects, activity } = Route.useLoaderData()
  const router = useRouter()
  return (
    <main>
      <p className="eyebrow">TEAM WORKSPACE</p>
      <h1>{active?.name ?? "Build together."}</h1>
      {memberships.length > 0 && (
        <label>
          Organization
          <select
            value={active?.id}
            onChange={(event) => {
              void router.navigate({ to: "/team", search: { organizationId: event.target.value } })
            }}
          >
            {memberships.map((membership) => (
              <option key={membership.id} value={membership.id}>
                {membership.name} · {membership.role}
              </option>
            ))}
          </select>
        </label>
      )}
      {active && (
        <section>
          <h2>Projects</h2>
          {projects.length ? (
            <ul>
              {projects.map((project) => (
                <li key={project.id}>{project.name}</li>
              ))}
            </ul>
          ) : (
            <p>No projects yet.</p>
          )}
          <p>Your role: {active.role}</p>
        </section>
      )}
      {activity.length > 0 && (
        <section>
          <h2>Recent activity</h2>
          <ul>
            {activity.map((event) => (
              <li key={event.id}>
                {event.event} ·{" "}
                <time
                  dateTime={event.createdAt}
                >{`${event.createdAt.slice(0, 19).replace("T", " ")} UTC`}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="grid">
        <ActionForm
          title="Create organization"
          fields={[
            { name: "name", label: "Name" },
            { name: "slug", label: "Slug" },
          ]}
          submit={async (form) => {
            const data = organizationInput.parse({ name: form.get("name"), slug: form.get("slug") })
            const result = await authClient.organization.create(data)
            if (result.error) return result.error.message ?? "Unable to create organization"
            await router.invalidate()
            return "Organization created."
          }}
        />
        {active && canManageProjects(active.role) && (
          <>
            <ActionForm
              title="Create project"
              fields={[{ name: "name", label: "Project name" }]}
              submit={async (form) => {
                await addProject({
                  data: projectInput.parse({ organizationId: active.id, name: form.get("name") }),
                })
                await router.invalidate()
                return "Project created and audit event recorded."
              }}
            />
            <ActionForm
              title="Invite member"
              fields={[{ name: "email", label: "Email", type: "email" }]}
              submit={async (form) => {
                const data = invitationInput.parse({
                  organizationId: active.id,
                  email: form.get("email"),
                })
                const result = await authClient.organization.inviteMember({
                  ...data,
                  role: "member",
                })
                return result.error?.message ?? "Invitation sent."
              }}
            />
          </>
        )}
      </div>
    </main>
  )
}
