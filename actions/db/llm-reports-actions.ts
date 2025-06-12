"use server"

import { db } from "@/db/db"
import { InsertLlmReport, SelectLlmReport, llmReportsTable } from "@/db/schema"
import { ActionState } from "@/types"
import { eq, desc } from "drizzle-orm"

export async function createLlmReportAction(
  report: InsertLlmReport
): Promise<ActionState<SelectLlmReport>> {
  try {
    const [newReport] = await db.insert(llmReportsTable).values(report).returning()
    return {
      isSuccess: true,
      message: "Report created successfully",
      data: newReport
    }
  } catch (error) {
    console.error("Error creating LLM report:", error)
    return { isSuccess: false, message: "Failed to create report" }
  }
}

export async function getLlmReportsByUserIdAction(
  userId: string
): Promise<ActionState<SelectLlmReport[]>> {
  try {
    const reports = await db.query.llmReports.findMany({
      where: eq(llmReportsTable.userId, userId),
      orderBy: [desc(llmReportsTable.createdAt)]
    })
    return {
      isSuccess: true,
      message: "Reports retrieved successfully",
      data: reports
    }
  } catch (error) {
    console.error("Error getting LLM reports:", error)
    return { isSuccess: false, message: "Failed to get reports" }
  }
}

export async function getLlmReportByIdAction(
  id: string
): Promise<ActionState<SelectLlmReport | undefined>> {
  try {
    const report = await db.query.llmReports.findFirst({
      where: eq(llmReportsTable.id, id)
    })
    return {
      isSuccess: true,
      message: "Report retrieved successfully",
      data: report
    }
  } catch (error) {
    console.error("Error getting LLM report:", error)
    return { isSuccess: false, message: "Failed to get report" }
  }
}

export async function updateLlmReportAction(
  id: string,
  data: Partial<InsertLlmReport>
): Promise<ActionState<SelectLlmReport>> {
  try {
    const [updatedReport] = await db
      .update(llmReportsTable)
      .set(data)
      .where(eq(llmReportsTable.id, id))
      .returning()

    return {
      isSuccess: true,
      message: "Report updated successfully",
      data: updatedReport
    }
  } catch (error) {
    console.error("Error updating LLM report:", error)
    return { isSuccess: false, message: "Failed to update report" }
  }
}

export async function deleteLlmReportAction(id: string): Promise<ActionState<void>> {
  try {
    await db.delete(llmReportsTable).where(eq(llmReportsTable.id, id))
    return {
      isSuccess: true,
      message: "Report deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting LLM report:", error)
    return { isSuccess: false, message: "Failed to delete report" }
  }
} 