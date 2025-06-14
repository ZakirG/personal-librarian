"use server"

import { Pinecone } from "@pinecone-database/pinecone"
import { ActionState } from "@/types"

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
})

export async function createIndexWithHostedModelAction(
  indexName: string = "librarian-index"
): Promise<ActionState<{ indexName: string; ready: boolean }>> {
  try {
    console.log(`Creating Pinecone index: ${indexName} with llama-text-embed-v2`)
    
    // Check if index already exists
    const indexList = await pinecone.listIndexes()
    const existingIndex = indexList.indexes?.find(index => index.name === indexName)
    
    if (existingIndex) {
      return {
        isSuccess: true,
        message: `Index ${indexName} already exists`,
        data: {
          indexName,
          ready: existingIndex.status?.ready || false
        }
      }
    }

    // Create index with hosted embedding model
    await pinecone.createIndex({
      name: indexName,
      dimension: 4096, // llama-text-embed-v2 dimension
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      },
      waitUntilReady: true
    })

    return {
      isSuccess: true,
      message: `Successfully created index ${indexName} with llama-text-embed-v2`,
      data: {
        indexName,
        ready: true
      }
    }
  } catch (error) {
    console.error("Error creating Pinecone index:", error)
    return {
      isSuccess: false,
      message: `Failed to create index: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function checkIndexStatusAction(
  indexName: string = "librarian-index"
): Promise<ActionState<{
  exists: boolean
  ready: boolean
  stats?: any
}>> {
  try {
    const indexList = await pinecone.listIndexes()
    const index = indexList.indexes?.find(idx => idx.name === indexName)
    
    if (!index) {
      return {
        isSuccess: true,
        message: `Index ${indexName} does not exist`,
        data: {
          exists: false,
          ready: false
        }
      }
    }

    // Get index stats if it exists
    let stats
    try {
      const indexInstance = pinecone.index(indexName)
      stats = await indexInstance.describeIndexStats()
    } catch (statsError) {
      console.log("Could not get index stats:", statsError)
    }

    return {
      isSuccess: true,
      message: `Index ${indexName} status checked`,
      data: {
        exists: true,
        ready: index.status?.ready || false,
        stats
      }
    }
  } catch (error) {
    console.error("Error checking index status:", error)
    return {
      isSuccess: false,
      message: `Failed to check index status: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function deleteIndexAction(
  indexName: string = "librarian-index"
): Promise<ActionState<void>> {
  try {
    await pinecone.deleteIndex(indexName)
    
    return {
      isSuccess: true,
      message: `Successfully deleted index ${indexName}`,
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting index:", error)
    return {
      isSuccess: false,
      message: `Failed to delete index: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 