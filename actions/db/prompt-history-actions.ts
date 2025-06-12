"use server"

import { db } from "@/db/db"
import { InsertPromptHistory, SelectPromptHistory, promptHistoryTable } from "@/db/schema"
import { ActionState } from "@/types"
import { eq, desc } from "drizzle-orm"

export async function createPromptHistoryAction(
  prompt: InsertPromptHistory
): Promise<ActionState<SelectPromptHistory>> {
  try {
    const [newPrompt] = await db.insert(promptHistoryTable).values(prompt).returning()
    return {
      isSuccess: true,
      message: "Prompt history created successfully",
      data: newPrompt
    }
  } catch (error) {
    console.error("Error creating prompt history:", error)
    return { isSuccess: false, message: "Failed to create prompt history" }
  }
}

export async function getPromptHistoryByUserIdAction(
  userId: string
): Promise<ActionState<SelectPromptHistory[]>> {
  try {
    const prompts = await db.query.promptHistory.findMany({
      where: eq(promptHistoryTable.userId, userId),
      orderBy: [desc(promptHistoryTable.createdAt)]
    })
    return {
      isSuccess: true,
      message: "Prompt history retrieved successfully",
      data: prompts
    }
  } catch (error) {
    console.error("Error getting prompt history:", error)
    return { isSuccess: false, message: "Failed to get prompt history" }
  }
}

export async function getRecentPromptHistoryAction(
  userId: string,
  limit: number = 10
): Promise<ActionState<SelectPromptHistory[]>> {
  try {
    const prompts = await db.query.promptHistory.findMany({
      where: eq(promptHistoryTable.userId, userId),
      orderBy: [desc(promptHistoryTable.createdAt)],
      limit
    })
    return {
      isSuccess: true,
      message: "Recent prompt history retrieved successfully",
      data: prompts
    }
  } catch (error) {
    console.error("Error getting recent prompt history:", error)
    return { isSuccess: false, message: "Failed to get recent prompt history" }
  }
} 