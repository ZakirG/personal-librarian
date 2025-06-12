/*
<ai_context>
Defines the database schema for AI-generated research reports and user feedback, matching the data_model.sql structure.
</ai_context>
*/

import { pgTable, text, timestamp, uuid, integer, jsonb } from "drizzle-orm/pg-core"
import { usersTable } from "./users-schema"

export const llmReportsTable = pgTable("llm_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title"),
  content: text("content").notNull(),
  sourceUrls: jsonb("source_urls"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export const reportFeedbackTable = pgTable("report_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").references(() => llmReportsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  rating: integer("rating"), // 1-5 rating
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export const promptHistoryTable = pgTable("prompt_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  llmResponseId: uuid("llm_response_id").references(() => llmReportsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertLlmReport = typeof llmReportsTable.$inferInsert
export type SelectLlmReport = typeof llmReportsTable.$inferSelect
export type InsertReportFeedback = typeof reportFeedbackTable.$inferInsert
export type SelectReportFeedback = typeof reportFeedbackTable.$inferSelect
export type InsertPromptHistory = typeof promptHistoryTable.$inferInsert
export type SelectPromptHistory = typeof promptHistoryTable.$inferSelect 