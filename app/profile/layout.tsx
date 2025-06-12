/*
<ai_context>
Layout for profile routes - ensures authentication
</ai_context>
*/

"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function ProfileLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
} 