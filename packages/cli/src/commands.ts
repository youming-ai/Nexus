import { lstatSync } from "node:fs"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  doctor,
  executePlan,
  nameSchema,
  type Plan,
  planAddStorage,
  planCreate,
  planUpgrade,
  summarizePlan,
  VERSION,
} from "@nexus/core"
import {
  type Command,
  help,
  type Options,
  parseOptions,
  resolveCommand,
  validateOptions,
} from "./options"

export async function run() {
  const { values, positionals } = parseOptions()
  if (values.help || values.version) {
    const result = values.help ? { help } : { version: VERSION }
    console.log(values.json ? JSON.stringify(result) : values.help ? help : VERSION)
    return
  }
  const { command, argument } = await resolveCommand(positionals, values)
  validateOptions(command, argument, values)
  const root = resolve(values.cwd ?? process.cwd())
  if (command === "doctor") return runDoctor(root, values)
  const plan = await buildPlan(command, argument, root, values)
  if (!values["dry-run"]) await executePlan(plan)
  if (!values["dry-run"] && command === "create" && !values["no-install"]) await install(plan.root)
  report(plan, command, values)
}

function report(plan: Plan, command: Command, values: Options) {
  const summary = summarizePlan(plan)
  const result = { ok: plan.conflicts.length === 0, dryRun: Boolean(values["dry-run"]), ...summary }
  const lines = [
    `${values["dry-run"] ? "Plan" : "Done"}: ${plan.operation} (${plan.changes.length} files)`,
    plan.root,
  ]
  if (plan.conflicts.length) lines.push(`Conflicts: ${plan.conflicts.join(", ")}`)
  if (command === "create")
    lines.push(
      "Next: copy .env.example to .env, set a private secret, then run bun run db:migrate and bun run dev. See README.md for cloud setup."
    )
  console.log(values.json ? JSON.stringify(result) : lines.join("\n"))
  if (plan.conflicts.length) process.exitCode = 1
}

async function runDoctor(root: string, values: Options) {
  const findings = await doctor(root)
  const ok = !findings.some(
    (finding) => finding.level === "error" || (values.strict && finding.level === "warning")
  )
  console.log(
    values.json
      ? JSON.stringify({ ok, findings })
      : findings.map((finding) => `${finding.level.toUpperCase()} ${finding.message}`).join("\n")
  )
  process.exitCode = ok ? 0 : 1
}

function buildPlan(command: Command, argument: string | undefined, root: string, values: Options) {
  const bundled = new URL("../assets/", import.meta.url)
  const assets = import.meta.url.endsWith("/commands.ts")
    ? new URL("../../../templates/", import.meta.url)
    : bundled
  const templateDir = fileURLToPath(new URL("app/", assets))
  const moduleDir = fileURLToPath(new URL("modules/storage/", assets))
  const teamDir = fileURLToPath(new URL("presets/team/", assets))
  switch (command) {
    case "create": {
      if (!argument || lstatSync(resolve(root, argument), { throwIfNoEntry: false }))
        throw new Error(
          "Provide a new project directory; existing directories are never overwritten"
        )
      const destination = resolve(root, argument)
      return planCreate(
        templateDir,
        destination,
        nameSchema.parse(values.name ?? basename(destination)),
        values.preset === "team" ? "team" : "app",
        teamDir
      )
    }
    case "add":
      return planAddStorage(moduleDir, root)
    default:
      return planUpgrade(templateDir, moduleDir, root, teamDir)
  }
}

async function install(destination: string) {
  const installation = Bun.spawn(["bun", "install", "--frozen-lockfile"], {
    cwd: destination,
    stdout: "pipe",
    stderr: "inherit",
  })
  const output = await new Response(installation.stdout).text()
  if (output) process.stderr.write(output)
  if ((await installation.exited) !== 0)
    throw new Error(
      `Project created in ${destination}, but dependency installation failed. Retry bun install --frozen-lockfile there.`
    )
}
