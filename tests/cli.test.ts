import { afterEach, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const cli = resolve(import.meta.dir, "../packages/cli/src/index.ts")
const temporary: string[] = []
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})
async function directory() {
  const root = await mkdtemp(join(tmpdir(), "nexus-cli-"))
  temporary.push(root)
  return root
}
async function invoke(cwd: string, ...args: string[]) {
  const child = Bun.spawn(["bun", cli, ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { code, stderr, result: JSON.parse(stdout) }
}

test("JSON dry run is one parseable result and leaves no files", async () => {
  const root = await directory()
  const { code, result } = await invoke(root, "my-app", "--dry-run", "--json")
  expect(code).toBe(0)
  expect(result.operation).toBe("create")
  expect(result.dryRun).toBe(true)
  expect(existsSync(join(root, "my-app"))).toBe(false)
})

test("CLI errors are machine-readable and reject unsupported presets and flags", async () => {
  const root = await directory()
  for (const args of [
    [],
    ["my-app", "--preset", "unknown"],
    ["my-app", "--force"],
    ["doctor", "--dry-run"],
  ]) {
    const { code, result } = await invoke(root, ...args, "--json")
    expect(code).toBe(1)
    expect(result.ok).toBe(false)
    expect(typeof result.error).toBe("string")
  }
})

test("no-install, strict doctor, and module preview work outside the repository", async () => {
  const root = await directory()
  expect((await invoke(root, "my-app", "--no-install", "--json")).code).toBe(0)
  const project = join(root, "my-app")
  expect(existsSync(join(project, "node_modules"))).toBe(false)
  expect((await invoke(project, "doctor", "--strict", "--json")).code).toBe(1)
  expect((await invoke(project, "add", "storage", "--dry-run", "--json")).code).toBe(0)
  expect(JSON.parse(await readFile(join(project, "nexus.json"), "utf8")).modules).toEqual([])
  expect((await invoke(root, "my-app", "--no-install", "--json")).code).toBe(1)
  await symlink(join(root, "missing-target"), join(root, "dangling-app"))
  expect((await invoke(root, "dangling-app", "--dry-run", "--json")).code).toBe(1)
})
