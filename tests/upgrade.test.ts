import { afterEach, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { executePlan, loadProject, planUpgrade, VERSION } from "../packages/core/src"
import { manifestSchema } from "../packages/core/src/manifest"
import baseline from "./fixtures/app-0.6.0.json"

const temporary: string[] = []
const template = resolve(import.meta.dir, "../templates/app")
const storage = resolve(import.meta.dir, "../templates/modules/storage")
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "nexus-upgrade-"))
  temporary.push(root)
  for (const [path, content] of Object.entries(baseline.files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }
  await writeFile(join(root, "nexus.json"), JSON.stringify(baseline.manifest))
  return root
}

test("reviewed development baseline upgrades while preserving user code and private environment", async () => {
  const root = await fixture()
  const path = "src/routes/index.tsx"
  const custom = `${await readFile(join(root, path), "utf8")}\n// My product changes\n`
  await writeFile(join(root, path), custom)
  await writeFile(join(root, ".env"), "PRIVATE_USER_VALUE=preserve-me\n")
  const plan = await planUpgrade(template, storage, root)
  expect(plan.conflicts).toEqual([])
  expect(plan.changes.some((change) => change.path === ".nvmrc")).toBe(true)
  expect(plan.changes.some((change) => change.path === "AGENTS.md")).toBe(true)
  expect(existsSync(join(root, ".nvmrc"))).toBe(false)
  await executePlan(plan)
  expect((await loadProject(root)).manifest.templateVersion).toBe(VERSION)
  expect(await readFile(join(root, path), "utf8")).toBe(custom)
  expect(await readFile(join(root, ".env"), "utf8")).toContain("preserve-me")
  expect((await planUpgrade(template, storage, root)).changes).toEqual([])
})

test("a file changed upstream and locally blocks the whole upgrade", async () => {
  const root = await fixture()
  await writeFile(join(root, ".env.example"), "# My custom environment template\n")
  const plan = await planUpgrade(template, storage, root)
  expect(plan.conflicts).toContain(".env.example")
  await expect(executePlan(plan)).rejects.toThrow("modified files")
  expect((await loadProject(root)).manifest.templateVersion).toBe("0.6.0")
  expect(existsSync(join(root, ".nvmrc"))).toBe(false)
})

test("unknown and newer versions require an explicit reviewed migration", async () => {
  const root = await fixture()
  const manifest = manifestSchema.parse(baseline.manifest)
  for (const version of ["0.1.0", "99.0.0"]) {
    await writeFile(
      join(root, "nexus.json"),
      JSON.stringify({ ...manifest, templateVersion: version })
    )
    await expect(planUpgrade(template, storage, root)).rejects.toThrow("No reviewed migration")
  }
  await writeFile(join(root, "nexus.json"), JSON.stringify({ ...manifest, modules: ["storage"] }))
  await expect(planUpgrade(template, storage, root)).rejects.toThrow("No reviewed migration")
})
