import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"
import { createClient } from "@/utils/supabase/server"

export const verifySession = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user?.id) {
    redirect("/login")
  }

  return { isAuth: true, user: data.user }
})
