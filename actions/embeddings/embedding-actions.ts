"use server"

import { vectorStore } from "@/lib/embeddings"
import { ActionState } from "@/types"

interface EmbeddingResult {
  documentId: string
  totalChunks: number
}

export async function embedAndStoreTextAction(
  userId: string,
  documentId: string,
  chunks: string[]
): Promise<ActionState<EmbeddingResult>> {
  try {
    console.log("Starting embedding process...")
    console.log("Using Pinecone for embeddings")

    // Add texts to vector store
    await vectorStore.addDocuments(
      chunks.map((text, i) => ({
        pageContent: text,
        metadata: {
          userId,
          documentId,
          chunkIndex: i
        }
      })),
      { namespace: userId }
    )

    console.log("Texts added to vector store successfully")

    return {
      isSuccess: true,
      message: "Text embedded and stored successfully",
      data: {
        documentId,
        totalChunks: chunks.length
      }
    }
  } catch (error) {
    console.error("Error in embedAndStoreTextAction:", error)
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      })
    }
    return {
      isSuccess: false,
      message: "Failed to embed and store text"
    }
  }
} 