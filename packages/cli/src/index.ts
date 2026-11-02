#!/usr/bin/env bun
import { run } from "./commands"

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected error"
  if (process.argv.includes("--json")) console.log(JSON.stringify({ ok: false, error: message }))
  else console.error(`Nexus: ${message}`)
  process.exitCode = 1
})
