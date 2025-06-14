"use server"

import { db } from "@/db/db"
import { InsertLlmReport, SelectLlmReport, llmReportsTable } from "@/db/schema"
import { ActionState } from "@/types"
import { eq, desc, sql } from "drizzle-orm"

export async function createLlmReportAction(
  report: InsertLlmReport
): Promise<ActionState<SelectLlmReport>> {
  try {
    console.log("Creating LLM report with data:", {
      userId: report.userId,
      userIdType: typeof report.userId,
      title: report.title,
      content: report.content,
      sourceUrls: report.sourceUrls
    })

    const [newReport] = await db.insert(llmReportsTable).values(report).returning()
    
    console.log("Successfully created report:", {
      id: newReport.id,
      userId: newReport.userId,
      userIdType: typeof newReport.userId
    })

    return {
      isSuccess: true,
      message: "Report created successfully",
      data: newReport
    }
  } catch (error: any) {
    console.error("Error creating LLM report:", error)
    console.error("Error details:", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      where: error?.where,
      file: error?.file,
      line: error?.line,
      routine: error?.routine,
      stack: error?.stack
    })
    return { isSuccess: false, message: "Failed to create report" }
  }
}

export async function getLlmReportsByUserIdAction(
  userId: string
): Promise<ActionState<SelectLlmReport[]>> {
  try {
    console.log("Getting reports for user ID:", userId)
    console.log("User ID type:", typeof userId)
    console.log("User ID value:", userId)
    
    const reports = await db
      .select()
      .from(llmReportsTable)
      .where(eq(llmReportsTable.userId, userId))
      .orderBy(desc(llmReportsTable.createdAt))
    
    console.log("Query result:", reports)
    
    return {
      isSuccess: true,
      message: "Reports retrieved successfully",
      data: reports
    }
  } catch (error: any) {
    console.error("Error getting LLM reports:", error)
    console.error("Error details:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    })
    return { isSuccess: false, message: "Failed to get reports" }
  }
}

export async function getLlmReportByIdAction(
  id: string
): Promise<ActionState<SelectLlmReport | undefined>> {
  try {
    const [report] = await db
      .select()
      .from(llmReportsTable)
      .where(eq(llmReportsTable.id, id))
      .limit(1)
    
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