/*
<ai_context>
Defines the database schema for users and user profiles, matching the data_model.sql structure.
</ai_context>
*/

import { pgTable, text, timestamp, uuid, time, pgEnum } from "drizzle-orm/pg-core"

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export const userProfilesTable = pgTable("user_profiles", {
  userId: uuid("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  goalSummary: text("goal_summary"),
  globalRules: text("global_rules"),
  timezone: text("timezone"),
  dailyReportAt: time("daily_report_at") // optional "send my report around 09:00"
})

export type InsertUser = typeof usersTable.$inferInsert
export type SelectUser = typeof usersTable.$inferSelect
export type InsertUserProfile = typeof userProfilesTable.$inferInsert
export type SelectUserProfile = typeof userProfilesTable.$inferSelect 