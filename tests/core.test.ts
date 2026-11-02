import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import {
  doctor,
  executePlan,
  loadProject,
  planAddStorage,
  planCreate,
  planUpgrade,
} from "../packages/core/src"

const template = resolve(import.meta.dir, "../templates/app")
const storage = resolve(import.meta.dir, "../templates/modules/storage")
const team = resolve(import.meta.dir, "../templates/presets/team")
const temporary: string[] = []
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})
async function fixture() {
  const parent = await mkdtemp(join(tmpdir(), "nexus-core-"))
  temporary.push(parent)
  return join(parent, "sample")
}

test("plans without writing; creation is deterministic, includes the lockfile and excludes secrets", async () => {
  const root = await fixture()
  const first = await planCreate(template, root, "sample")
  expect(first).toEqual(await planCreate(template, root, "sample"))
  expect(first.changes.some((change) => change.path === ".env")).toBe(false)
  expect(first.changes.some((change) => change.path === "bun.lock")).toBe(true)
  await executePlan(first)
  expect((await loadProject(root)).manifest.name).toBe("sample")
  expect(JSON.parse(await readFile(join(root, "package.json"), "utf8")).name).toBe("sample")
  expect((await doctor(root)).some((finding) => finding.level === "error")).toBe(false)
  await expect(executePlan(first)).rejects.toThrow()
})

test("invalid names never become generated code", async () => {
  for (const name of ["../escape", "Bad Name", 'name";throw', "-bad", "bad-"]) {
    await expect(planCreate(template, await fixture(), name)).rejects.toThrow()
  }
})

test("team preset composes with storage and preserves its schema and version baseline", async () => {
  const root = await fixture()
  await executePlan(await planCreate(template, root, "sample", "team", team))
  expect((await loadProject(root)).manifest.preset).toBe("team")
  expect(await readFile(join(root, "db/schema.ts"), "utf8")).toContain("auditEvents")
  await executePlan(await planAddStorage(storage, root))
  expect((await planUpgrade(template, storage, root, team)).changes).toEqual([])
})

test("storage updates only its managed files and refuses conflicting local edits", async () => {
  const root = await fixture()
  await executePlan(await planCreate(template, root, "sample"))
  const bindings = join(root, "nexus.bindings.ts")
  await writeFile(bindings, "custom bindings\n")
  const conflict = await planAddStorage(storage, root)
  expect(conflict.conflicts).toEqual(["nexus.bindings.ts"])
  await expect(executePlan(conflict)).rejects.toThrow("modified files")
  expect((await loadProject(root)).manifest.modules).toEqual([])
})

test("storage installs with test bindings and cannot be installed twice", async () => {
  const root = await fixture()
  await executePlan(await planCreate(template, root, "sample"))
  await executePlan(await planAddStorage(storage, root))
  expect((await loadProject(root)).manifest.modules).toEqual(["storage"])
  expect(await readFile(join(root, "nexus.bindings.ts"), "utf8")).toContain("sample-storage")
  expect(await readFile(join(root, "nexus.test.ts"), "utf8")).toContain("r2Buckets")
  await expect(planAddStorage(storage, root)).rejects.toThrow("already installed")
  expect((await planUpgrade(template, storage, root)).changes).toEqual([])
})

test("adopting identical pre-existing module files still records module metadata", async () => {
  const root = await fixture()
  await executePlan(await planCreate(template, root, "sample"))
  const original = await planAddStorage(storage, root)
  for (const change of original.changes.filter((change) => change.path !== "nexus.json")) {
    await mkdir(dirname(join(root, change.path)), { recursive: true })
    await writeFile(join(root, change.path), change.content)
  }
  const adoption = await planAddStorage(storage, root)
  expect(adoption.changes.map((change) => change.path)).toEqual(["nexus.json"])
  await executePlan(adoption)
  expect((await loadProject(root)).manifest.modules).toEqual(["storage"])
})

test("execution detects edits made after planning and follows no project symlinks", async () => {
  const root = await fixture()
  await executePlan(await planCreate(template, root, "sample"))
  const plan = await planAddStorage(storage, root)
  await writeFile(join(root, "nexus.bindings.ts"), "changed after preview")
  await expect(executePlan(plan)).rejects.toThrow("changed since planning")
  const other = await fixture()
  await mkdir(other)
  await rm(join(root, "nexus.bindings.ts"))
  await symlink(join(other, "outside.ts"), join(root, "nexus.bindings.ts"))
  await expect(executePlan(plan)).rejects.toThrow("symlink")
})

test("doctor reports missing files and manifest paths cannot escape the project", async () => {
  const root = await fixture()
  await executePlan(await planCreate(template, root, "sample"))
  await rm(join(root, "src/lib/auth.server.ts"))
  expect(
    (await doctor(root)).some(
      (finding) => finding.code === "missing-file" && finding.level === "error"
    )
  ).toBe(true)
  const { manifest } = await loadProject(root)
  manifest.files["../outside"] = "a".repeat(64)
  await writeFile(join(root, "nexus.json"), JSON.stringify(manifest))
  await expect(loadProject(root)).rejects.toThrow("Unsafe project path")
})
