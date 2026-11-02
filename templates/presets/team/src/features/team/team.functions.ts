import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { projectInput, workspaceInput } from "~/schemas/team"
import { createProject, getWorkspace } from "./team.server"

export const loadWorkspace = createServerFn({ method: "GET" })
  .validator(workspaceInput)
  .handler(({ data }) => getWorkspace(getRequestHeaders(), data.organizationId))
export const addProject = createServerFn({ method: "POST" })
  .validator(projectInput)
  .handler(({ data }) => createProject(getRequestHeaders(), data))
