import { lstat, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { json, type Manifest, safeRelativePath } from "./manifest"

export type Change = { path: string; content: string; before: string | null }
export type Plan = {
  root: string
  operation: "create" | "add" | "upgrade"
  changes: Change[]
  conflicts: string[]
  manifest: Manifest
}

export async function readOptional(path: string) {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null
    throw error
  }
}

export async function readTree(root: string, prefix = ""): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  const entries = await readdir(join(root, prefix), { withFileTypes: true })
  entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
  for (const entry of entries) {
    if (entry.name.startsWith(".env") || entry.name.startsWith(".dev.vars")) continue
    if (
      [
        "node_modules",
        ".cloudflare",
        ".tanstack",
        ".void",
        ".wrangler",
        ".void-wrangler.jsonc",
        "dist",
        ".git",
        "coverage",
        ".DS_Store",
        "routeTree.gen.ts",
        "nexus.json",
      ].includes(entry.name)
    )
      continue
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isSymbolicLink()) throw new Error(`Template symlinks are not supported: ${path}`)
    if (entry.isDirectory()) Object.assign(files, await readTree(root, path))
    else files[path] = await readFile(join(root, path), "utf8")
  }
  return files
}

async function checkParents(root: string, path: string) {
  let current = root
  for (const part of safeRelativePath(path).split("/")) {
    current = join(current, part)
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error(`Refusing to follow symlink: ${current}`)
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
    }
  }
}

export async function executePlan(plan: Plan) {
  if (plan.conflicts.length)
    throw new Error(`Resolve modified files before continuing: ${plan.conflicts.join(", ")}`)
  const root = resolve(plan.root)
  if (plan.operation === "create") return createFiles(root, plan.changes)
  if ((await lstat(root)).isSymbolicLink()) throw new Error("Project root must not be a symlink")
  for (const change of plan.changes) {
    await checkParents(root, change.path)
    if ((await readOptional(join(root, change.path))) !== change.before)
      throw new Error(`File changed since planning: ${change.path}`)
  }
  await updateFiles(root, plan.changes)
}

async function createFiles(root: string, changes: Change[]) {
  await mkdir(dirname(root), { recursive: true })
  await mkdir(root)
  try {
    for (const change of changes) {
      const path = join(root, safeRelativePath(change.path))
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, change.content, { flag: "wx" })
    }
  } catch (error) {
    await rm(root, { recursive: true, force: true })
    throw error
  }
}

async function updateFiles(root: string, changes: Change[]) {
  const applied: Change[] = []
  try {
    for (const change of changes) {
      const path = join(root, change.path)
      await mkdir(dirname(path), { recursive: true })
      const temporary = `${path}.nexus-${crypto.randomUUID()}`
      try {
        await writeFile(temporary, change.content, { flag: "wx" })
        await rename(temporary, path)
      } finally {
        await rm(temporary, { force: true })
      }
      applied.push(change)
    }
  } catch (error) {
    for (const change of applied.reverse()) {
      const path = join(root, change.path)
      if (change.before === null) await rm(path, { force: true })
      else await writeFile(path, change.before)
    }
    throw error
  }
}

export function summarizePlan(plan: Plan) {
  return {
    operation: plan.operation,
    root: plan.root,
    changes: plan.changes.map(({ path, before, content }) => ({
      path,
      action: before === null ? "create" : "update",
      ...(plan.conflicts.includes(path) ? { conflict: true } : {}),
      ...(before === null || path === "nexus.json" ? {} : { before, after: content }),
    })),
    conflicts: plan.conflicts,
  }
}

export function withManifest(changes: Change[], manifest: Manifest, before: string | null) {
  return [...changes, { path: "nexus.json", content: json(manifest), before }]
}
