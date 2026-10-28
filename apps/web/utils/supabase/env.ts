/**
 * Supabase public env vars.
 *
 * Prefers the new publishable key (`sb_publishable_...`) and falls back to the
 * legacy anon key so existing projects keep working.
 */
export function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return { supabaseUrl, supabaseKey }
}
