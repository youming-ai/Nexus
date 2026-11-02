import { defineEnv, url } from "void/env"
import { z } from "zod"

// Set local values in .env (for example: BETTER_AUTH_SECRET=...) and production values with `void secret put`.
export default defineEnv({
  PUBLIC_ORIGIN: url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32),
})
