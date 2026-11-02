import { join } from "node:path"
import { z } from "zod"
import { hash } from "./manifest"
import { readOptional } from "./plan"
import { loadProject } from "./project"

export type Finding = { level: "error" | "warning" | "ok"; code: string; message: string }

export async function doctor(root: string): Promise<Finding[]> {
  const { manifest } = await loadProject(root)
  const findings: Finding[] = []
  for (const path of Object.keys(manifest.files)) {
    const content = await readOptional(join(root, path))
    if (content === null)
      findings.push({
        level: "error",
        code: "missing-file",
        message: `Missing generated file: ${path}`,
      })
    else if (hash(content) !== manifest.files[path])
      findings.push({
        level: "warning",
        code: "modified-file",
        message: `Locally modified: ${path}`,
      })
  }
  findings.push(...(await checkDependencies(root)))
  const local = await readOptional(join(root, ".env"))
  const secret =
    process.env.BETTER_AUTH_SECRET ??
    local
      ?.match(/^BETTER_AUTH_SECRET=(.*)$/m)?.[1]
      ?.trim()
      .replace(/^['"]|['"]$/g, "")
  if (!secret || secret.length < 32)
    findings.push({
      level: "warning",
      code: "local-secret",
      message:
        "Set a private BETTER_AUTH_SECRET (at least 32 characters) in .env or the environment",
    })
  const config = await readOptional(join(root, "void.config.ts"))
  if (manifest.modules.includes("storage") && !config?.includes("featureBindings"))
    findings.push({
      level: "error",
      code: "missing-storage-bindings",
      message: "void.config.ts must spread featureBindings from ./nexus.bindings.ts",
    })
  if (!(await readOptional(join(root, "void.lock.json"))))
    findings.push({
      level: "warning",
      code: "unprovisioned-resources",
      message: "void.lock.json is not present yet. Run void deploy to provision resources.",
    })
  if (config?.includes("hello@example.com"))
    findings.push({
      level: "warning",
      code: "email-sender",
      message: "Set email.from in void.config.ts to an onboarded sender before deploying.",
    })
  if (findings.every((finding) => finding.level !== "error"))
    findings.unshift({
      level: "ok",
      code: "project",
      message: `${manifest.name}: project structure is valid (${manifest.templateVersion})`,
    })
  return findings
}

async function checkDependencies(root: string): Promise<Finding[]> {
  const findings: Finding[] = []
  const packageContent = await readOptional(join(root, "package.json"))
  if (packageContent) {
    let raw: unknown
    try {
      raw = JSON.parse(packageContent)
    } catch {
      return [
        { level: "error", code: "invalid-package-json", message: "package.json is not valid JSON" },
      ]
    }
    const parsed = z
      .object({
        dependencies: z.record(z.string(), z.string()).default({}),
        devDependencies: z.record(z.string(), z.string()).default({}),
      })
      .safeParse(raw)
    if (!parsed.success)
      return [
        {
          level: "error",
          code: "invalid-package-json",
          message: "package.json has invalid dependency fields",
        },
      ]
    const pkg = parsed.data
    for (const dependency of ["@tanstack/react-start", "better-auth", "drizzle-orm", "zod"]) {
      if (!pkg.dependencies[dependency])
        findings.push({
          level: "error",
          code: "missing-dependency",
          message: `Missing dependency: ${dependency}`,
        })
    }
    if (!pkg.devDependencies.void)
      findings.push({ level: "error", code: "missing-dependency", message: "Missing void CLI" })
  }
  return findings
}
