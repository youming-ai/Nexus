import { createHash } from "node:crypto"
import { z } from "zod"

export const VERSION = "0.7.0"
export const nameSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]{0,47}$/,
    "Use 1–48 lowercase letters, digits, or hyphens, starting with a letter"
  )
  .refine((name) => !name.endsWith("-"), "Name must not end in a hyphen")
export const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatorVersion: z.string(),
    templateVersion: z.string(),
    name: nameSchema,
    preset: z.enum(["app", "team"]),
    modules: z.array(z.literal("storage")),
    files: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
  })
  .strict()

export type Manifest = z.infer<typeof manifestSchema>
export const hash = (content: string) => createHash("sha256").update(content).digest("hex")
export const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

export function safeRelativePath(path: string) {
  if (
    !path ||
    path.includes("\\") ||
    path.startsWith("/") ||
    path.split("/").some((part) => part === ".." || part === "." || !part)
  ) {
    throw new Error(`Unsafe project path: ${path}`)
  }
  return path
}
