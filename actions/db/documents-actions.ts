"use server"

import { db } from "@/db/db"
import { documentsTable } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function getDocumentsByUserIdAction(
  userId: string
): Promise<ActionState<typeof documentsTable.$inferSelect[]>> {
  try {
    const documents = await db.query.documents.findMany({
      where: eq(documentsTable.userId, userId)
    })

    return {
      isSuccess: true,
      message: "Documents retrieved successfully",
      data: documents
    }
  } catch (error) {
    console.error("Error getting documents:", error)
    return { isSuccess: false, message: "Failed to get documents" }
  }
} 