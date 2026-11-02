// Managed by Nexus. Add custom bindings directly in cloudflare.config.ts.
import { bindings } from "cf/config"

export const featureBindings = {
  STORAGE: bindings.r2({ name: "nexus-app-storage" }),
}
