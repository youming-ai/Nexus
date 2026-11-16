import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

// Representative user-owned business code, deliberately outside template assets.
// This exercises preservation; it is not a customer adoption or time-saving study.
export async function customizeGenerated(project: string) {
  const dashboard = await readFile(join(project, "src/routes/dashboard.tsx"), "utf8")
  if (!dashboard.includes("<main>")) throw new Error("Dashboard fixture insertion point missing")
  const files: Record<string, string> = {
    "src/routes/dashboard.tsx":
      'import { QuoteCalculator } from "~/features/quote-calculator"\n' +
      dashboard.replace("<main>", "<main>\n      <QuoteCalculator />"),
    "src/features/quote.ts": `import { z } from "zod"

const quoteInput = z.object({
  hours: z.number().int().min(1).max(1000),
  hourlyRateCents: z.number().int().min(1).max(1000000),
})

export function quoteCents(input: unknown) {
  const { hours, hourlyRateCents } = quoteInput.parse(input)
  return hours * hourlyRateCents
}
`,
    "src/features/quote-calculator.tsx": `import { useState } from "react"
import { quoteCents } from "./quote"

export function QuoteCalculator() {
  const [hours, setHours] = useState(3)
  return (
    <section aria-label="Project quote">
      <label>
        Hours
        <input type="number" min="1" max="1000" value={hours}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isInteger(next) && next >= 1 && next <= 1000) setHours(next)
          }} />
      </label>
      <output>Quote: {quoteCents({ hours, hourlyRateCents: 5000 })} cents</output>
    </section>
  )
}
`,
    "test/quote.test.ts": `import { expect, test } from "vitest"
import { quoteCents } from "../src/features/quote"

test("custom business quote uses integer cents and validates inputs", () => {
  expect(quoteCents({ hours: 3, hourlyRateCents: 5000 })).toBe(15000)
  expect(quoteCents({ hours: 1, hourlyRateCents: 1 })).toBe(1)
  for (const hours of [0, -1, 1.5, 1001]) {
    expect(() => quoteCents({ hours, hourlyRateCents: 5000 })).toThrow()
  }
  expect(() => quoteCents({ hours: 3, hourlyRateCents: "5000" })).toThrow()
})
`,
  }
  const pkg = JSON.parse(await readFile(join(project, "package.json"), "utf8"))
  pkg.scripts["product:check"] = "vitest run test/quote.test.ts"
  files["package.json"] = `${JSON.stringify(pkg, null, 2)}\n`
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(project, path)), { recursive: true })
    await writeFile(join(project, path), content)
  }
  return async () => {
    for (const [path, content] of Object.entries(files)) {
      if ((await readFile(join(project, path), "utf8")) !== content)
        throw new Error(`User customization was overwritten: ${path}`)
    }
    console.log(`Preserved ${Object.keys(files).length} customized business files in ${project}`)
  }
}
