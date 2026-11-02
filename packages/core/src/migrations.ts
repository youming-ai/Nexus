import type { Manifest } from "./manifest"
import { VERSION } from "./manifest"

// Reviewed against tests/fixtures/app-0.6.0.json. This transition adds runtime
// setup guidance and .nvmrc; it does not change database schemas or dependencies.
export function assertUpgradeSupported(manifest: Manifest) {
  if (manifest.templateVersion === VERSION) return
  if (
    manifest.templateVersion === "0.6.0" &&
    VERSION === "0.7.0" &&
    manifest.preset === "app" &&
    manifest.modules.length === 0
  )
    return
  throw new Error(
    `No reviewed migration from ${manifest.templateVersion} (${manifest.preset}) to ${VERSION}.`
  )
}
