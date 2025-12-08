import { getUser } from "@/lib/dal/user"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const user = await getUser()

  if (!user) {
    notFound()
  }

  return <div className="min-h-screen flex items-center justify-center">{children}</div>
}
