import { chmod, cp, mkdir, rm, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { VERSION } from "../packages/core/src/manifest"
import { readTree } from "../packages/core/src/plan"

const root = resolve(import.meta.dir, "..")
const cli = join(root, "packages/cli")
for (const path of ["package.json", "packages/cli/package.json", "packages/core/package.json"]) {
  const manifest = (await Bun.file(join(root, path)).json()) as { version: string }
  if (manifest.version !== VERSION)
    throw new Error(`Version mismatch in ${path}: expected ${VERSION}`)
}
await rm(join(cli, "dist"), { recursive: true, force: true })
await rm(join(cli, "assets"), { recursive: true, force: true })
const build = await Bun.build({
  entrypoints: [join(cli, "src/index.ts")],
  outdir: join(cli, "dist"),
  target: "bun",
  minify: false,
})
if (!build.success) throw new Error(build.logs.join("\n"))
await chmod(join(cli, "dist/index.js"), 0o755)
for (const directory of ["app", "modules/storage", "presets/team"]) {
  for (const [path, content] of Object.entries(
    await readTree(join(root, "templates", directory))
  )) {
    // Package managers omit .gitignore from tarballs. Restore its name at generation time.
    const destination = join(cli, "assets", directory, path === ".gitignore" ? "gitignore" : path)
    await mkdir(resolve(destination, ".."), { recursive: true })
    await writeFile(destination, content)
  }
}
await cp(join(root, "LICENSE"), join(cli, "LICENSE"))
console.log("Built CLI and bundled templates in packages/cli")
