"use server"

import { extractTextFromFileAction } from "./document-processing-actions"
import { embedAndStoreTextAction } from "../embeddings/embedding-actions"
import { ActionState } from "@/types"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

interface ProcessingResult {
  documentId: string
  totalChunks: number
}

export async function processAndEmbedDocumentAction(
  userId: string,
  filePath: string,
  documentId: string,
  fileName: string
): Promise<ActionState<ProcessingResult>> {
  try {
    // Extract text from file
    const { isSuccess: extractSuccess, data: text } = await extractTextFromFileAction(filePath)
    if (!extractSuccess || !text) {
      throw new Error("Failed to extract text from file")
    }

    // Initialize text splitter with overlapping chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", " ", ""]
    })

    // Split text into chunks
    const chunks = await textSplitter.splitText(text)
    console.log(`Split text into ${chunks.length} chunks`)

    // Embed and store chunks
    const { isSuccess: embedSuccess, data: embedResult } = await embedAndStoreTextAction(
      userId,
      documentId,
      chunks
    )

    if (!embedSuccess || !embedResult) {
      throw new Error("Failed to embed and store text")
    }

    return {
      isSuccess: true,
      message: "Document processed and embedded successfully",
      data: embedResult
    }
  } catch (error) {
    console.error("Error in processAndEmbedDocumentAction:", error)
    return {
      isSuccess: false,
      message: "Failed to process and embed document"
    }
  }
} 