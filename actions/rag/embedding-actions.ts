"use server"

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { Pinecone } from "@pinecone-database/pinecone"
import { ActionState } from "@/types"
import { v4 as uuidv4 } from "uuid"
import { OpenAIEmbeddings } from "@langchain/openai"

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
})

// Initialize text splitter
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", " ", ""]
})

const indexName = process.env.PINECONE_INDEX_NAME || "librarian-index"

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small"
})

interface EmbeddingResult {
  chunkIds: string[]
  totalChunks: number
}

interface ChunkMetadata {
  userId: string
  documentId?: string
  chunkIndex: number
  originalText: string
  timestamp: string
  source?: string
  [key: string]: any
}

export async function embedAndStoreTextAction(
  texts: string[],
  userId: string,
  documentId: string
): Promise<ActionState<void>> {
  try {
    // Step 1: Generate embeddings for all texts
    const embedResponses = await embeddings.embedDocuments(texts)
    
    if (!embedResponses || !Array.isArray(embedResponses)) {
      throw new Error("Failed to generate embeddings")
    }

    // Step 2: Prepare vectors for Pinecone
    const vectors = embedResponses.map((embedding, index) => {
      const chunkId = uuidv4()
      const metadata = {
        text: texts[index],
        userId,
        documentId,
        chunkIndex: index
      }

      return {
        id: chunkId,
        values: embedding,
        metadata
      }
    })

    // Step 3: Store in Pinecone
    const index = pinecone.index(indexName)
    await index.upsert(vectors)

    return {
      isSuccess: true,
      message: "Texts added to vector store successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error in embedAndStoreTextAction:", error)
    return {
      isSuccess: false,
      message: "Failed to embed and store texts"
    }
  }
}

export interface SearchResult {
  text: string
  score: number
  metadata: {
    documentId: string
    chunkIndex: number
  }
}

export async function searchSimilarChunksAction(
  query: string,
  userId: string
): Promise<ActionState<SearchResult[]>> {
  try {
    console.log("🔍 EMBEDDING SERVICE: Starting searchSimilarChunksAction")
    console.log("📝 SEARCH INPUT:", {
      query: query.substring(0, 100) + "...",
      userId,
      userIdType: typeof userId,
      indexName
    })

    // Step 1: Get embedding for the query using OpenAI
    console.log("🧠 EMBEDDING SERVICE: Generating query embedding...")
    const embedResponse = await embeddings.embedQuery(query)
    
    if (!embedResponse) {
      console.log("❌ EMBEDDING SERVICE: Failed to generate embedding")
      throw new Error("Failed to generate embedding for query")
    }

    console.log("✅ EMBEDDING SERVICE: Query embedding generated:", {
      embeddingLength: embedResponse.length,
      embeddingPreview: embedResponse.slice(0, 5)
    })

    // Step 2: Search in Pinecone using the embedded vector
    console.log("🔍 EMBEDDING SERVICE: Searching Pinecone...")
    const index = pinecone.index(indexName)
    
    // Search in both the main index and user namespace
    console.log("🔍 EMBEDDING SERVICE: Searching in main index...")
    const mainSearchResponse = await index.query({
      vector: embedResponse,
      topK: 10, // Get more results to filter out conversations
      includeMetadata: true,
      filter: {
        userId: { $eq: userId }
      }
    })
    
    console.log("🔍 EMBEDDING SERVICE: Searching in user namespace...")
    const namespaceSearchResponse = await index.namespace(userId).query({
      vector: embedResponse,
      topK: 10,
      includeMetadata: true
    })
    
    // Combine results from both searches
    const allMatches = [
      ...mainSearchResponse.matches,
      ...namespaceSearchResponse.matches
    ]
    
    const searchResponse = {
      matches: allMatches.sort((a, b) => (b.score || 0) - (a.score || 0))
    }

    // Filter out conversation history from results
    const filteredMatches = searchResponse.matches.filter(match => {
      const documentId = String(match.metadata?.documentId || "")
      return !documentId.startsWith("conversation_")
    }).slice(0, 5) // Take only top 5 after filtering

    console.log("📊 EMBEDDING SERVICE: Pinecone search response:", {
      mainIndexMatches: mainSearchResponse.matches.length,
      namespaceMatches: namespaceSearchResponse.matches.length,
      totalMatchesFound: searchResponse.matches.length,
      filteredMatchesFound: filteredMatches.length,
      matches: filteredMatches.map(match => ({
        id: match.id,
        score: match.score,
        hasMetadata: !!match.metadata,
        metadataKeys: match.metadata ? Object.keys(match.metadata) : [],
        textPreview: match.metadata?.text ? String(match.metadata.text).substring(0, 50) + "..." : "No text"
      }))
    })

    // Step 3: Format and return results
    const results: SearchResult[] = filteredMatches.map(match => ({
      text: String(match.metadata?.text || ""),
      score: match.score || 0,
      metadata: {
        documentId: String(match.metadata?.documentId || ""),
        chunkIndex: Number(match.metadata?.chunkIndex || 0)
      }
    }))

    console.log("✅ EMBEDDING SERVICE: Results formatted:", {
      resultsCount: results.length,
      results: results.map(r => ({
        score: r.score,
        textLength: r.text.length,
        documentId: r.metadata.documentId,
        textPreview: r.text.substring(0, 50) + "..."
      }))
    })

    return {
      isSuccess: true,
      message: "Similar chunks found successfully",
      data: results
    }
  } catch (error) {
    console.error("❌ EMBEDDING SERVICE: Error in searchSimilarChunksAction:", error)
    return {
      isSuccess: false,
      message: "Failed to search similar chunks"
    }
  }
}

export async function deleteUserChunksAction(
  userId: string,
  documentId?: string,
  indexName: string = "librarian-index"
): Promise<ActionState<void>> {
  try {
    if (!userId) {
      return {
        isSuccess: false,
        message: "User ID is required"
      }
    }

    const index = pinecone.index(indexName)
    const namespace = `user_${userId}`

    if (documentId) {
      // Delete specific document chunks
      await index.namespace(namespace).deleteMany({
        filter: { documentId }
      })
    } else {
      // Delete all user chunks
      await index.namespace(namespace).deleteAll()
    }

    return {
      isSuccess: true,
      message: documentId 
        ? `Successfully deleted chunks for document ${documentId}`
        : `Successfully deleted all chunks for user ${userId}`,
      data: undefined
    }
  } catch (error) {
    console.error("Error in deleteUserChunksAction:", error)
    return {
      isSuccess: false,
      message: `Failed to delete chunks: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getIndexStatsAction(
  indexName: string = "librarian-index"
): Promise<ActionState<any>> {
  try {
    const index = pinecone.index(indexName)
    const stats = await index.describeIndexStats()

    return {
      isSuccess: true,
      message: "Successfully retrieved index stats",
      data: stats
    }
  } catch (error) {
    console.error("Error in getIndexStatsAction:", error)
    return {
      isSuccess: false,
      message: `Failed to get index stats: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 