import { createInterface } from "node:readline/promises"
import { parseArgs } from "node:util"
import { VERSION } from "@nexus/core"

export const help = `Nexus ${VERSION}

  create-nexus <directory> [--name <name>] [--preset app|team] [--no-install]
  nexus create <directory> [--name <name>] [--preset app|team] [--no-install]
  nexus add storage [--cwd <directory>]
  nexus doctor [--cwd <directory>] [--strict]
  nexus upgrade [--cwd <directory>]

All commands accept --json. Mutating commands accept --dry-run.
Existing directories are never overwritten. Creation does not provision cloud resources.
Upgrade supports the 0.6.0 app development baseline (without modules) and the current template version.
`

export function parseOptions() {
  return parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      name: { type: "string" },
      preset: { type: "string" },
      cwd: { type: "string" },
      "no-install": { type: "boolean" },
      "dry-run": { type: "boolean" },
      json: { type: "boolean" },
      strict: { type: "boolean" },
    },
  })
}
export type Options = ReturnType<typeof parseOptions>["values"]
export type Command = "create" | "add" | "doctor" | "upgrade"

export async function resolveCommand(
  positionals: string[],
  values: Options
): Promise<{ command: Command; argument?: string }> {
  if (!positionals.length && !values.json && process.stdin.isTTY && process.stdout.isTTY) {
    const prompt = createInterface({ input: process.stdin, output: process.stderr })
    try {
      positionals = ["create", await prompt.question("Project directory: ")]
    } finally {
      prompt.close()
    }
  }
  const [command, argument, ...extra] = positionals
  if (!command) throw new Error("Provide a project directory or command. Use --help for usage.")
  if (extra.length) throw new Error("Unexpected positional arguments")
  switch (command) {
    case "create":
    case "add":
    case "doctor":
    case "upgrade":
      return { command, argument }
    default:
      if (argument) throw new Error("Unexpected positional arguments")
      return { command: "create", argument: command }
  }
}

export function validateOptions(command: Command, argument: string | undefined, values: Options) {
  if (values.strict && command !== "doctor") throw new Error("--strict applies only to doctor")
  if (command !== "create" && (values.name || values.preset || values["no-install"]))
    throw new Error("--name, --preset, and --no-install apply only to create")
  if (values.preset && !["app", "team"].includes(values.preset))
    throw new Error("Supported presets: app, team")
  if (command === "add" && argument !== "storage") throw new Error("Supported module: storage")
  if (command === "upgrade" && argument)
    throw new Error("upgrade accepts --cwd, --json, and --dry-run")
  if (command === "doctor" && (argument || values["dry-run"]))
    throw new Error("doctor accepts --cwd, --json, and --strict")
}
