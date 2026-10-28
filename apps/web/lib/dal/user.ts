import "server-only"
import { cache } from "react"
import { verifySession } from "@/lib/dal/verifySession"
import type { UsersType } from "@/types/model"
import { createClient } from "@/utils/supabase/server"

export const getUser = cache(async (userId?: string) => {
  const session = await verifySession()
  if (!session) return null
  const supabase = await createClient()

  const id = userId || session.user.id

  const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle()

  if (error) throw error

  return data as UsersType["Row"] | null
})

export const createUser = async (data: UsersType["Insert"] & Pick<UsersType["Row"], "id">) => {
  const supabase = await createClient()
  // biome-ignore lint/suspicious/noExplicitAny: Supabase SDK type compatibility issue
  return supabase.from("users").insert(data as any)
}

export const deleteRegisteredUser = async (userId: string) => {
  const supabase = await createClient()
  return supabase.auth.admin.deleteUser(userId)
}
