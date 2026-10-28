"use client"

import { Button } from "@workspace/ui/components/button"
import type { FC } from "react"
import { useTransition } from "react"
import { logoutAction } from "@/app/actions/auth/logout"

export type SignOutButtonProps = Record<string, never>

export const SignOutButton: FC<SignOutButtonProps> = () => {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(logoutAction)
  }

  return (
    <Button disabled={isPending} className="hover:cursor-pointer" onClick={handleLogout}>
      {isPending ? "Signing out..." : "Sign Out"}
    </Button>
  )
}
