import { join, resolve } from "node:path"
import {
  hash,
  type Manifest,
  manifestSchema,
  nameSchema,
  safeRelativePath,
  VERSION,
} from "./manifest"
import { assertUpgradeSupported } from "./migrations"
import { type Change, type Plan, readOptional, readTree, withManifest } from "./plan"

export async function loadProject(root: string) {
  const content = await readOptional(join(root, "nexus.json"))
  if (!content) throw new Error("No nexus.json found. Run this command inside a Nexus project.")
  const manifest = manifestSchema.parse(JSON.parse(content))
  for (const path of Object.keys(manifest.files)) safeRelativePath(path)
  return { manifest, content }
}

export async function renderApp(templateDir: string, name: string, overlayDir?: string) {
  nameSchema.parse(name)
  const source = await readTree(templateDir)
  if (overlayDir) Object.assign(source, await readTree(overlayDir))
  const files: Record<string, string> = {}
  for (const [path, content] of Object.entries(source)) {
    files[path === "gitignore" ? ".gitignore" : path] = [
      "package.json",
      "bun.lock",
      "cloudflare.config.ts",
    ].includes(path)
      ? content
          .replaceAll('"nexus-app"', JSON.stringify(name))
          .replaceAll('"nexus-app-db"', JSON.stringify(`${name}-db`))
      : content
  }
  return files
}

export async function planCreate(
  templateDir: string,
  root: string,
  name: string,
  preset: "app" | "team" = "app",
  teamDir?: string
): Promise<Plan> {
  if (preset === "team" && !teamDir) throw new Error("Team template assets are missing")
  const files = await renderApp(templateDir, name, preset === "team" ? teamDir : undefined)
  const manifest: Manifest = {
    schemaVersion: 1,
    generatorVersion: VERSION,
    templateVersion: VERSION,
    name,
    preset,
    modules: [],
    files: Object.fromEntries(
      Object.entries(files).map(([path, content]) => [path, hash(content)])
    ),
  }
  return {
    root: resolve(root),
    operation: "create",
    changes: withManifest(
      Object.entries(files).map(([path, content]) => ({ path, content, before: null })),
      manifest,
      null
    ),
    conflicts: [],
    manifest,
  }
}

export async function planAddStorage(moduleDir: string, root: string): Promise<Plan> {
  const { manifest, content } = await loadProject(root)
  if (manifest.modules.includes("storage")) throw new Error("Storage is already installed")
  if (manifest.templateVersion !== VERSION)
    throw new Error("Upgrade this project before adding modules")
  const files = await readTree(moduleDir)
  files["nexus.bindings.ts"] = (files["nexus.bindings.ts"] ?? "").replaceAll(
    '"nexus-app-storage"',
    JSON.stringify(`${manifest.name}-storage`)
  )
  return planUpdates(root, "add", manifest, content, files, {
    ...manifest,
    modules: [...manifest.modules, "storage"],
  })
}

export async function planUpgrade(
  templateDir: string,
  moduleDir: string,
  root: string,
  teamDir?: string
): Promise<Plan> {
  const { manifest, content } = await loadProject(root)
  assertUpgradeSupported(manifest)
  if (manifest.preset === "team" && !teamDir) throw new Error("Team template assets are missing")
  const files = await renderApp(
    templateDir,
    manifest.name,
    manifest.preset === "team" ? teamDir : undefined
  )
  if (manifest.modules.includes("storage")) {
    Object.assign(files, await readTree(moduleDir))
    files["nexus.bindings.ts"] = (files["nexus.bindings.ts"] ?? "").replaceAll(
      '"nexus-app-storage"',
      JSON.stringify(`${manifest.name}-storage`)
    )
  }
  return planUpdates(root, "upgrade", manifest, content, files, manifest)
}

async function planUpdates(
  root: string,
  operation: "add" | "upgrade",
  previous: Manifest,
  manifestContent: string,
  files: Record<string, string>,
  next: Manifest
): Promise<Plan> {
  const changes: Change[] = []
  const conflicts: string[] = []
  const hashes = { ...previous.files }
  for (const [path, content] of Object.entries(files)) {
    const before = await readOptional(join(root, safeRelativePath(path)))
    if (before === content) {
      hashes[path] = hash(content)
      continue
    }
    if (operation === "upgrade" && previous.files[path] === hash(content)) continue
    if (before !== null && hash(before) !== previous.files[path]) conflicts.push(path)
    else if (before === null && previous.files[path]) conflicts.push(path)
    changes.push({ path, content, before })
    hashes[path] = hash(content)
  }
  const manifest = { ...next, generatorVersion: VERSION, templateVersion: VERSION, files: hashes }
  const metadataChanged = JSON.stringify(manifest) !== JSON.stringify(previous)
  return {
    root: resolve(root),
    operation,
    changes:
      changes.length || metadataChanged ? withManifest(changes, manifest, manifestContent) : [],
    conflicts,
    manifest,
  }
}
