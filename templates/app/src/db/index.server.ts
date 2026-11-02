import "@tanstack/react-start/server-only"
import { env } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/d1"
import * as schema from "../../db/schema"

export const getDb = () => drizzle(env.DB, { schema })
