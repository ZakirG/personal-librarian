import { Pinecone } from "@pinecone-database/pinecone"
import { createClient } from "@supabase/supabase-js"
import { db } from "@/db/db"
import { documentsTable, contentItemsTable } from "@/db/schema/documents-schema"
// Note: We don't clean up llmReportsTable or promptHistoryTable as they're not direct upload side effects
import { eq } from "drizzle-orm"
import * as dotenv from "dotenv"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

// Initialize Supabase client for storage operations
function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase environment variables are not set")
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

async function cleanupSupabaseStorage(userId?: string) {
  try {
    console.log("🗑️  Cleaning up Supabase storage...")
    
    const supabase = getSupabaseClient()
    const bucketName = "user-uploads"
    
    if (userId) {
      // Delete files for specific user
      console.log(`   Deleting files for user: ${userId}`)
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list(`${userId}/`, { limit: 1000 })
      
      if (listError) {
        console.error("Error listing user files:", listError)
        return { isSuccess: false, message: `Failed to list files: ${listError.message}` }
      }
      
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${userId}/${file.name}`)
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove(filePaths)
        
        if (deleteError) {
          console.error("Error deleting user files:", deleteError)
          return { isSuccess: false, message: `Failed to delete files: ${deleteError.message}` }
        }
        
        console.log(`   ✅ Deleted ${files.length} files for user ${userId}`)
      } else {
        console.log(`   No files found for user ${userId}`)
      }
    } else {
      // Delete all files in bucket (nuclear option)
      console.log("   🚨 DANGER: Deleting ALL files in storage bucket...")
      
      // List all files in the bucket
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list("", { limit: 1000 })
      
      if (listError) {
        console.error("Error listing all files:", listError)
        return { isSuccess: false, message: `Failed to list files: ${listError.message}` }
      }
      
      if (files && files.length > 0) {
        // Get all file paths recursively
        const allFilePaths: string[] = []
        
        for (const item of files) {
          if (item.name) {
            // List files in each user directory
            const { data: userFiles, error: userListError } = await supabase.storage
              .from(bucketName)
              .list(item.name, { limit: 1000 })
            
            if (!userListError && userFiles) {
              userFiles.forEach(file => {
                if (file.name) {
                  allFilePaths.push(`${item.name}/${file.name}`)
                }
              })
            }
          }
        }
        
        if (allFilePaths.length > 0) {
          // Delete files in batches of 100
          const batchSize = 100
          for (let i = 0; i < allFilePaths.length; i += batchSize) {
            const batch = allFilePaths.slice(i, i + batchSize)
            const { error: deleteError } = await supabase.storage
              .from(bucketName)
              .remove(batch)
            
            if (deleteError) {
              console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError)
            } else {
              console.log(`   Deleted batch ${i / batchSize + 1} (${batch.length} files)`)
            }
          }
          
          console.log(`   ✅ Deleted ${allFilePaths.length} total files from storage`)
        } else {
          console.log("   No files found in storage bucket")
        }
      } else {
        console.log("   Storage bucket is already empty")
      }
    }
    
    return { isSuccess: true, message: "Storage cleanup completed" }
  } catch (error) {
    console.error("Error cleaning up Supabase storage:", error)
    return { isSuccess: false, message: `Storage cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}` }
  }
}

async function cleanupUploadSideEffects(userId?: string) {
  try {
    console.log("🗑️  Cleaning up file upload side effects...")
    console.log("   📝 Note: Keeping users table and database schema intact")
    
    let deletedCounts = {
      documents: 0,
      contentItems: 0
    }
    
    if (userId) {
      // Delete upload side effects for specific user
      console.log(`   Cleaning up uploads for user: ${userId}`)
      
      // Delete content items first (they reference documents via foreign key)
      const deletedContentItems = await db
        .delete(contentItemsTable)
        .where(eq(contentItemsTable.userId, userId))
        .returning()
      deletedCounts.contentItems = deletedContentItems.length
      
      // Delete documents (this is what shows in "View Uploaded Docs")
      const deletedDocuments = await db
        .delete(documentsTable)
        .where(eq(documentsTable.userId, userId))
        .returning()
      deletedCounts.documents = deletedDocuments.length
      
    } else {
      // Delete all upload side effects (but keep users and schema)
      console.log("   Cleaning up ALL file upload data...")
      
      // Delete content items first (they reference documents)
      const deletedContentItems = await db.delete(contentItemsTable).returning()
      deletedCounts.contentItems = deletedContentItems.length
      
      // Delete documents
      const deletedDocuments = await db.delete(documentsTable).returning()
      deletedCounts.documents = deletedDocuments.length
    }
    
    console.log("   ✅ Upload side effects cleanup completed:")
    console.log(`      - Documents: ${deletedCounts.documents}`)
    console.log(`      - Content Items (chunks): ${deletedCounts.contentItems}`)
    console.log("   ✅ Users table and schema preserved")
    
    return { isSuccess: true, message: "Upload side effects cleanup completed", data: deletedCounts }
  } catch (error) {
    console.error("Error cleaning up upload side effects:", error)
    return { isSuccess: false, message: `Upload cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}` }
  }
}

async function cleanupPinecone() {
  try {
    console.log("🧹 Starting Pinecone cleanup...")

    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not set in environment variables")
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    })

    const indexName = process.env.PINECONE_INDEX_NAME || "librarian-index"
    console.log(`📍 Using index: ${indexName}`)

    // Get the index
    const index = pinecone.Index(indexName)

    // Get index stats before cleanup
    console.log("📊 Getting index stats before cleanup...")
    const statsBefore = await index.describeIndexStats()
    console.log("Stats before cleanup:", JSON.stringify(statsBefore, null, 2))

    if (statsBefore.totalRecordCount === 0) {
      console.log("✅ Index is already empty!")
      return
    }

    // Method 1: Delete all vectors in the main namespace (no namespace specified)
    console.log("🗑️  Deleting all vectors in main namespace...")
    await index.deleteAll()

    // Method 2: Delete all vectors in user-specific namespaces
    // Get all namespaces from stats
    if (statsBefore.namespaces) {
      console.log("🗑️  Deleting vectors in user namespaces...")
      for (const namespace of Object.keys(statsBefore.namespaces)) {
        if (namespace && namespace !== "") {
          console.log(`   Deleting namespace: ${namespace}`)
          await index.namespace(namespace).deleteAll()
        }
      }
    }

    // Wait a moment for deletions to propagate
    console.log("⏳ Waiting for deletions to propagate...")
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Get index stats after cleanup
    console.log("📊 Getting index stats after cleanup...")
    const statsAfter = await index.describeIndexStats()
    console.log("Stats after cleanup:", JSON.stringify(statsAfter, null, 2))

    if (statsAfter.totalRecordCount === 0) {
      console.log("✅ Successfully cleaned up Pinecone index!")
      console.log("🎉 All vectors have been deleted. You can now start fresh!")
    } else {
      console.log(`⚠️  Warning: ${statsAfter.totalRecordCount} vectors still remain`)
      console.log("This might be due to propagation delay. Try running the script again in a few minutes.")
    }

  } catch (error) {
    console.error("❌ Error cleaning up Pinecone:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        console.log("💡 The index might not exist. This could mean:")
        console.log("   - The index name is incorrect")
        console.log("   - The index was already deleted")
        console.log("   - You're using the wrong Pinecone project/API key")
      } else if (error.message.includes("API key")) {
        console.log("💡 Please check your PINECONE_API_KEY in .env.local")
      }
    }
    
    process.exit(1)
  }
}

// Add option to delete the entire index (more aggressive cleanup)
async function deleteEntireIndex() {
  try {
    console.log("🚨 DANGER: Deleting entire Pinecone index...")
    
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not set in environment variables")
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    })

    const indexName = process.env.PINECONE_INDEX_NAME || "librarian-index"
    
    // Check if index exists
    const indexList = await pinecone.listIndexes()
    const indexExists = indexList.indexes?.some(index => index.name === indexName)
    
    if (!indexExists) {
      console.log(`✅ Index ${indexName} doesn't exist. Nothing to delete.`)
      return
    }

    console.log(`🗑️  Deleting entire index: ${indexName}`)
    await pinecone.deleteIndex(indexName)
    
    console.log("✅ Index deleted successfully!")
    console.log("💡 You'll need to recreate the index when you upload new documents.")
    
  } catch (error) {
    console.error("❌ Error deleting index:", error)
    process.exit(1)
  }
}

// Comprehensive cleanup function
async function comprehensiveCleanup(userId?: string) {
  try {
    console.log("🧹 Starting comprehensive upload cleanup...")
    console.log("This will undo all file upload side effects:")
    console.log("  - Pinecone vectors (all namespaces)")
    console.log("  - Supabase storage files")
    console.log("  - Database records (documents, content_items)")
    console.log("")
    console.log("✅ Preserving:")
    console.log("  - Users table and user accounts")
    console.log("  - Database schema and structure")
    console.log("  - LLM reports and chat history")
    console.log("")
    
    if (userId) {
      console.log(`🎯 Cleaning up uploads for user: ${userId}`)
    } else {
      console.log("🧹 Cleaning up ALL upload data (but keeping users & schema)")
    }
    console.log("")
    
    // Step 1: Clean up Pinecone vectors
    console.log("Step 1/3: Pinecone cleanup")
    await cleanupPinecone()
    console.log("")
    
    // Step 2: Clean up Supabase storage
    console.log("Step 2/3: Supabase storage cleanup")
    const storageResult = await cleanupSupabaseStorage(userId)
    if (!storageResult.isSuccess) {
      console.error("⚠️  Storage cleanup failed:", storageResult.message)
    }
    console.log("")
    
    // Step 3: Clean up upload side effects from database
    console.log("Step 3/3: Upload side effects cleanup")
    const dbResult = await cleanupUploadSideEffects(userId)
    if (!dbResult.isSuccess) {
      console.error("⚠️  Database cleanup failed:", dbResult.message)
    }
    console.log("")
    
    console.log("🎉 Comprehensive cleanup completed!")
    console.log("✅ Your system is now clean and ready for fresh uploads.")
    
  } catch (error) {
    console.error("❌ Error during comprehensive cleanup:", error)
    process.exit(1)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const userId = args.find(arg => arg.startsWith("--user="))?.split("=")[1]
  
  if (args.includes("--delete-index")) {
    console.log("⚠️  You chose to delete the entire Pinecone index!")
    console.log("⚠️  This will completely remove the index and all its data.")
    console.log("⚠️  The index will need to be recreated when you upload new documents.")
    console.log("")
    
    await deleteEntireIndex()
  } else if (args.includes("--comprehensive") || args.includes("--full")) {
    await comprehensiveCleanup(userId)
  } else if (args.includes("--storage-only")) {
    console.log("🗑️  Cleaning up Supabase storage only...")
    const result = await cleanupSupabaseStorage(userId)
    if (result.isSuccess) {
      console.log("✅ Storage cleanup completed!")
    } else {
      console.error("❌ Storage cleanup failed:", result.message)
    }
  } else if (args.includes("--db-only")) {
    console.log("🗑️  Cleaning up upload side effects only...")
    const result = await cleanupUploadSideEffects(userId)
    if (result.isSuccess) {
      console.log("✅ Database cleanup completed!")
    } else {
      console.error("❌ Database cleanup failed:", result.message)
    }
  } else {
    console.log("🧹 Cleaning up Pinecone vectors only...")
    console.log("💡 This will delete all vectors but keep the index structure.")
    console.log("💡 Use --comprehensive flag for full cleanup (Pinecone + Supabase + Database).")
    console.log("💡 Use --user=USER_ID flag to clean up specific user data.")
    console.log("")
    
    await cleanupPinecone()
  }
}

main() 