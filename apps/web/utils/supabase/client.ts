import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/model"
import { getSupabaseEnv } from "@/utils/supabase/env"

export function createClient() {
  const { supabaseUrl, supabaseKey } = getSupabaseEnv()

  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
