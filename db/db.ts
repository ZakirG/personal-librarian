/*
<ai_context>
Initializes the database connection and schema for the app.
</ai_context>
*/

import { 
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
import * as schema from "./schema"

config({ path: ".env.local" })

const connectionString = process.env.DATABASE_URL!

// Remove custom type configuration that might be causing issues
const client = postgres(connectionString)

export const db = drizzle(client, { schema })
