import { cp, mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import "./build"

const cli = resolve(import.meta.dir, "../packages/cli")
const archive = resolve(process.argv[2] ?? join(cli, "nexus.tgz"))
const staging = await mkdtemp(join(tmpdir(), "nexus-pack-"))
try {
  const directory = join(staging, "package")
  await mkdir(directory)
  for (const path of ["dist", "assets", "README.md", "LICENSE"]) {
    await cp(join(cli, path), join(directory, path), { recursive: true })
  }
  await mkdir(dirname(archive), { recursive: true })
  const child = Bun.spawn(["tar", "-czf", archive, "-C", staging, "package"], {
    stdout: "inherit",
    stderr: "inherit",
  })
  if ((await child.exited) !== 0) throw new Error("Failed to pack CLI archive")
  console.log(`Packed CLI and templates: ${archive}`)
} finally {
  await rm(staging, { recursive: true, force: true })
}
