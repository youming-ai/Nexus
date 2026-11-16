import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import baseline from "../tests/fixtures/app-0.6.0.json"
import { customizeGenerated } from "./customize-generated"
import { smokeApp } from "./smoke-app"

const root = resolve(import.meta.dir, "..")
const temporary = await mkdtemp(join(tmpdir(), "nexus-package-"))
async function run(command: string[], cwd: string) {
  const started = performance.now()
  const child = Bun.spawn(command, { cwd, stdout: "inherit", stderr: "inherit" })
  if ((await child.exited) !== 0) throw new Error(`Failed: ${command.join(" ")}`)
  console.log(
    `[timing] ${command.join(" ")}: ${((performance.now() - started) / 1000).toFixed(2)}s`
  )
}
async function verifyApp(project: string) {
  for (const script of ["typecheck", "test", "build"]) {
    await run(["bun", "run", script], project)
  }
}
try {
  const archive = join(temporary, "nexus.tgz")
  await run(["bun", "run", "pack", archive], root)
  const consumer = join(temporary, "consumer with spaces")
  await mkdir(consumer)
  await run(["tar", "-xzf", archive, "-C", consumer], temporary)
  const cli = join(consumer, "package/dist/index.js")
  // Run the packed executable away from source and workspace dependencies.
  await run(["bun", cli, "sample", "--no-install", "--json"], temporary)
  const project = join(temporary, "sample")
  const manifest = JSON.parse(await readFile(join(project, "nexus.json"), "utf8"))
  if (manifest.name !== "sample") throw new Error("Generated identity mismatch")
  if (!(await readFile(join(project, ".gitignore"), "utf8")).includes(".env"))
    throw new Error("Packed template must preserve secret ignore rules")
  await run(["bun", "install", "--frozen-lockfile"], project)
  await run(["bun", "run", "db:migrate"], project)
  await verifyApp(project)
  await smokeApp(project)
  await run(["bun", cli, "doctor", "--json"], project)
  const checkAppCustomization = await customizeGenerated(project)
  await run(["bun", cli, "add", "storage", "--json"], project)
  await checkAppCustomization()
  await verifyApp(project)
  await rm(join(project, ".env"))
  // Independent fixtures also isolate persistent authentication rate-limit buckets.
  await rm(join(project, ".cloudflare/state"), { recursive: true, force: true })
  await rm(join(project, ".void"), { recursive: true, force: true })
  await rm(join(project, ".wrangler"), { recursive: true, force: true })
  await run(["bun", "run", "db:migrate"], project)
  await smokeApp(project, true, false, 'aria-label="Project quote"')
  const teamProject = join(temporary, "team-sample")
  await run(["bun", cli, "team-sample", "--preset", "team", "--no-install", "--json"], temporary)
  const checkTeamCustomization = await customizeGenerated(teamProject)
  await run(["bun", cli, "add", "storage", "--json"], teamProject)
  await checkTeamCustomization()
  await run(["bun", "install", "--frozen-lockfile"], teamProject)
  await run(["bun", "run", "db:migrate"], teamProject)
  await verifyApp(teamProject)
  await smokeApp(teamProject, true, true, 'aria-label="Project quote"')
  const upgradeProject = join(temporary, "upgrade-example")
  for (const [path, content] of Object.entries(baseline.files)) {
    await mkdir(dirname(join(upgradeProject, path)), { recursive: true })
    await writeFile(join(upgradeProject, path), content)
  }
  await writeFile(join(upgradeProject, "nexus.json"), JSON.stringify(baseline.manifest))
  const checkUpgradeCustomization = await customizeGenerated(upgradeProject)
  const privateEnvironment = "PRIVATE_PRODUCT_VALUE=preserve-local-config\n"
  await writeFile(join(upgradeProject, ".env"), privateEnvironment)
  await run(["bun", cli, "upgrade", "--dry-run", "--json"], upgradeProject)
  await checkUpgradeCustomization()
  await run(["bun", cli, "upgrade", "--json"], upgradeProject)
  await checkUpgradeCustomization()
  if ((await readFile(join(upgradeProject, ".env"), "utf8")) !== privateEnvironment)
    throw new Error("Upgrade overwrote private product configuration")
  await run(["bun", "install", "--frozen-lockfile"], upgradeProject)
  await run(["bun", "run", "db:migrate"], upgradeProject)
  await verifyApp(upgradeProject)
  await rm(join(upgradeProject, ".env"))
  await smokeApp(upgradeProject, false, false, 'aria-label="Project quote"')
  console.log("Packed CLI, app/team presets, storage module, and baseline upgrade verified.")
} finally {
  await rm(temporary, { recursive: true, force: true })
}
