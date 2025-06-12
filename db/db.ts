/*
<ai_context>
Initializes the database connection and schema for the app.
</ai_context>
*/

import { 
  usersTable,
  userProfilesTable,
  profilesTable, 
  todosTable, 
  documentsTable,
  contentItemsTable,
  llmReportsTable, 
  reportFeedbackTable, 
  promptHistoryTable 
} from "@/db/schema"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

config({ path: ".env.local" })

const schema = {
  users: usersTable,
  userProfiles: userProfilesTable,
  profiles: profilesTable,
  todos: todosTable,
  documents: documentsTable,
  contentItems: contentItemsTable,
  llmReports: llmReportsTable,
  reportFeedback: reportFeedbackTable,
  promptHistory: promptHistoryTable
}

const client = postgres(process.env.DATABASE_URL!)

export const db = drizzle(client, { schema })
