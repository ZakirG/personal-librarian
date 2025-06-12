/*
<ai_context>
Defines the database schema for user-uploaded documents and content items, matching the data_model.sql structure.
</ai_context>
*/

import { pgTable, text, timestamp, uuid, integer, pgEnum } from "drizzle-orm/pg-core"
import { usersTable } from "./users-schema"

export const documentsTable = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title"),
  fileType: text("file_type"),
  storageUri: text("storage_uri"),
  status: text("status").notNull().$type<'uploaded' | 'parsed' | 'embedded'>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export const contentSourceEnum = pgEnum("content_source", ["document_chunk", "llm_report", "user_feedback"])

export const contentItemsTable = pgTable("content_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  sourceType: contentSourceEnum("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  chunkIndex: integer("chunk_index").default(0),
  text: text("text").notNull(),
  pineconeId: text("pinecone_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertDocument = typeof documentsTable.$inferInsert
export type SelectDocument = typeof documentsTable.$inferSelect
export type InsertContentItem = typeof contentItemsTable.$inferInsert
export type SelectContentItem = typeof contentItemsTable.$inferSelect 