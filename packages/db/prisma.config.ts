import "dotenv/config"
import { defineConfig } from "prisma/config"

// Prisma 7 no longer reads connection URLs from schema.prisma or loads `.env` automatically.
// The CLI (migrate / db push / studio) uses the direct connection; `prisma generate` doesn't
// need a URL, so it's left optional to keep codegen working in CI without credentials.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
})
