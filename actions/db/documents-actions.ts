"use server"

import { db } from "@/db/db"
import { documentsTable } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function getDocumentsByUserIdAction(
  userId: string
): Promise<ActionState<typeof documentsTable.$inferSelect[]>> {
  try {
    console.log("Getting documents for user ID:", userId)
    console.log("User ID type:", typeof userId)
    
    const documents = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.userId, userId))

    console.log("Documents query result:", documents)
    console.log("Number of documents found:", documents.length)

    return {
      isSuccess: true,
      message: "Documents retrieved successfully",
      data: documents
    }
  } catch (error) {
    console.error("Error getting documents:", error)
    console.error("Error details:", {
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack
    })
    return { isSuccess: false, message: "Failed to get documents" }
  }
} 