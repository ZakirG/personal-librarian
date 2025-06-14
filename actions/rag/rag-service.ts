"use server"

import { ChatOpenAI } from "@langchain/openai"
import { searchSimilarChunksAction, embedAndStoreTextAction } from "./embedding-actions"
import { ActionState } from "@/types"
import { createLlmReportAction } from "@/actions/db/llm-reports-actions"
import { createPromptHistoryAction } from "@/actions/db/prompt-history-actions"

// Initialize GPT-4.1-mini
const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY!,
  modelName: "gpt-4o-mini", // Updated model name
  temperature: 0.7,
  streaming: false
})

interface RAGResponse {
  answer: string
  sources: Array<{
    id: string
    score: number
    text: string
    source?: string
  }>
  contextUsed: string
  reportId?: string
}

interface RAGContext {
  userId: string
  query: string
  conversationHistory?: Array<{
    role: "user" | "assistant"
    content: string
  }>
}

export async function ragQueryAction(
  context: RAGContext,
  topK: number = 5,
  includeHistory: boolean = true
): Promise<ActionState<RAGResponse>> {
  try {
    const { userId, query, conversationHistory = [] } = context

    console.log("🔍 RAG SERVICE: Starting ragQueryAction")
    console.log("📝 RAG INPUT:", {
      userId,
      userIdType: typeof userId,
      query: query.substring(0, 100) + "...",
      topK,
      includeHistory,
      historyLength: conversationHistory.length
    })

    if (!query || !userId) {
      console.log("❌ RAG SERVICE: Missing required params")
      return {
        isSuccess: false,
        message: "Query and user ID are required"
      }
    }

    // Step 1: Search for similar chunks in Pinecone
    console.log("🔍 RAG SERVICE: Searching for similar chunks in Pinecone...")
    const searchResult = await searchSimilarChunksAction(query, userId)
    
    console.log("📊 RAG SERVICE: Search result:", {
      isSuccess: searchResult.isSuccess,
      message: searchResult.message,
      chunksFound: searchResult.data?.length || 0,
      chunks: searchResult.data?.map(chunk => ({
        score: chunk.score,
        textPreview: chunk.text.substring(0, 50) + "...",
        documentId: chunk.metadata.documentId
      })) || []
    })
    
    if (!searchResult.isSuccess) {
      console.log("❌ RAG SERVICE: Search failed")
      return {
        isSuccess: false,
        message: `Failed to retrieve context: ${searchResult.message}`
      }
    }

    const similarChunks = searchResult.data || []
    console.log(`📄 RAG SERVICE: Found ${similarChunks.length} chunks`)
    
    // Step 2: Prepare context from retrieved chunks
    const relevantChunks = similarChunks.filter(chunk => chunk.score > 0.2)
    console.log(`🎯 RAG SERVICE: ${relevantChunks.length} chunks above 0.2 threshold`)
    
    const contextChunks = relevantChunks
      .map(chunk => chunk.text)
      .join("\n\n")

    console.log("📝 RAG SERVICE: Context prepared:", {
      totalContextLength: contextChunks.length,
      hasContext: contextChunks.length > 0,
      contextPreview: contextChunks.substring(0, 200) + "..."
    })

    // Step 3: Build conversation history context
    const historyContext = includeHistory && conversationHistory.length > 0
      ? conversationHistory
          .slice(-6) // Last 3 exchanges (6 messages)
          .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n")
      : ""

    console.log("💬 RAG SERVICE: History context:", {
      includeHistory,
      historyLength: historyContext.length,
      historyPreview: historyContext.substring(0, 100) + "..."
    })

    // Step 4: Create enhanced prompt with personal context
    const systemPrompt = `You are a Personal Librarian AI assistant. You help users by analyzing their personal documents and providing personalized insights.

Context about the user (retrieved from their documents):
${contextChunks || "No specific context found in user's documents."}

${historyContext ? `Recent conversation:\n${historyContext}\n` : ""}

Instructions:
- Use the provided context to give personalized, relevant answers
- If the context doesn't contain relevant information, say so and provide general guidance
- Be helpful, concise, and reference specific details from the user's documents when appropriate
- If you reference information from the context, mention that it's from their personal documents
- Always maintain a helpful and professional tone`

    console.log("🤖 RAG SERVICE: System prompt prepared:", {
      promptLength: systemPrompt.length,
      hasDocumentContext: contextChunks.length > 0,
      hasHistoryContext: historyContext.length > 0
    })

    // Step 5: Generate response using GPT-4
    console.log("🧠 RAG SERVICE: Calling LLM...")
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: query }
    ]

    const response = await llm.invoke(messages)
    const answer = response.content as string

    console.log("✅ RAG SERVICE: LLM response received:", {
      answerLength: answer.length,
      answerPreview: answer.substring(0, 100) + "..."
    })

    // Step 6: Prepare sources for reference
    const sources = similarChunks.map(chunk => ({
      id: chunk.metadata.documentId,
      score: chunk.score,
      text: chunk.text.substring(0, 200) + "...", // Truncate for display
      source: chunk.metadata.documentId
    }))

    console.log("📚 RAG SERVICE: Sources prepared:", {
      sourcesCount: sources.length,
      sources: sources.map(s => ({ id: s.id, score: s.score }))
    })

    // Step 7: Save the interaction to database
    let reportId: string | undefined

    try {
      console.log("💾 RAG SERVICE: Saving to database...")
      console.log("Creating LLM report in RAG service:", {
        userId,
        userIdType: typeof userId,
        title: `Query: ${query.substring(0, 50)}...`,
        content: answer.substring(0, 100) + "..." // Truncate for logging
      })

      // Create LLM report entry
      const reportResult = await createLlmReportAction({
        userId,
        title: `Query: ${query.substring(0, 50)}...`,
        content: answer
      })

      console.log("LLM report creation result:", {
        success: reportResult.isSuccess,
        message: reportResult.message,
        reportId: reportResult.data?.id,
        userId: reportResult.data?.userId,
        userIdType: typeof reportResult.data?.userId
      })

      if (reportResult.isSuccess && reportResult.data) {
        reportId = reportResult.data.id

        // Save prompt history linked to the report
        await createPromptHistoryAction({
          userId,
          prompt: query,
          llmResponseId: reportId
        })
        console.log("✅ RAG SERVICE: Prompt history saved")
      }
    } catch (dbError: any) {
      console.error("❌ RAG SERVICE: Error saving to database:", dbError)
      // Continue anyway - the response is still valid
    }

    // Step 8: Optionally re-embed the response for future context
    try {
      console.log("🔄 RAG SERVICE: Re-embedding conversation...")
      const embeddingText = `Query: ${query}\nAnswer: ${answer}`
      await embedAndStoreTextAction(
        [embeddingText],
        userId,
        `conversation_${Date.now()}`
      )
      console.log("✅ RAG SERVICE: Conversation embedded")
    } catch (embeddingError) {
      console.error("⚠️ RAG SERVICE: Error embedding conversation:", embeddingError)
      // This is not critical, continue
    }

    console.log("🎉 RAG SERVICE: Successfully completed ragQueryAction")
    return {
      isSuccess: true,
      message: "Successfully generated RAG response",
      data: {
        answer,
        sources,
        contextUsed: contextChunks,
        reportId
      }
    }
  } catch (error) {
    console.error("❌ RAG SERVICE: Error in ragQueryAction:", error)
    return {
      isSuccess: false,
      message: `Failed to generate RAG response: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

interface DocumentProcessingResult {
  success: boolean
  message: string
}

export async function processAndEmbedDocumentAction(
  documentContent: string,
  userId: string,
  documentId: string
): Promise<ActionState<DocumentProcessingResult>> {
  try {
    if (!documentContent || !userId || !documentId) {
      return {
        isSuccess: false,
        message: "Document content, user ID, and document ID are required"
      }
    }

    // Step 1: Split document into chunks
    const chunks = splitDocumentIntoChunks(documentContent)

    // Step 2: Embed and store chunks
    const embeddingResult = await embedAndStoreTextAction(
      chunks,
      userId,
      documentId
    )

    if (!embeddingResult.isSuccess) {
      return {
        isSuccess: false,
        message: `Failed to embed document: ${embeddingResult.message}`
      }
    }

    return {
      isSuccess: true,
      message: "Successfully processed and embedded document",
      data: {
        success: true,
        message: "Document processed successfully"
      }
    }
  } catch (error) {
    console.error("Error in processAndEmbedDocumentAction:", error)
    return {
      isSuccess: false,
      message: `Failed to process document: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Helper function to split document into chunks
function splitDocumentIntoChunks(text: string, chunkSize: number = 1000): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || []
  const chunks: string[] = []
  let currentChunk = ""

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += " " + sentence
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

export async function generatePersonalizedInsightAction(
  userId: string,
  topic: string,
  topK: number = 10
): Promise<ActionState<{ insight: string; reportId?: string }>> {
  try {
    if (!userId || !topic) {
      return {
        isSuccess: false,
        message: "User ID and topic are required"
      }
    }

    // Step 1: Search for relevant chunks
    const searchResult = await searchSimilarChunksAction(topic, userId)
    
    if (!searchResult.isSuccess) {
      return {
        isSuccess: false,
        message: `Failed to retrieve context: ${searchResult.message}`
      }
    }

    const relevantChunks = searchResult.data || []
    
    // Step 2: Prepare context
    const context = relevantChunks
      .filter(chunk => chunk.score > 0.7)
      .map(chunk => chunk.text)
      .join("\n\n")

    // Step 3: Generate insight
    const systemPrompt = `You are a Personal Librarian AI assistant. Generate a personalized insight about "${topic}" based on the user's documents.

Context from user's documents:
${context || "No specific context found in user's documents."}

Instructions:
- Analyze the provided context and generate a unique insight
- If the context doesn't contain relevant information, provide general guidance
- Be specific and reference details from the user's documents when possible
- Keep the insight concise and actionable
- Maintain a professional and helpful tone`

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `Generate an insight about ${topic}` }
    ]

    const response = await llm.invoke(messages)
    const insight = response.content as string

    // Step 4: Save the insight as a report
    let reportId: string | undefined

    try {
      const reportResult = await createLlmReportAction({
        userId,
        title: `Insight: ${topic}`,
        content: insight
      })

      if (reportResult.isSuccess && reportResult.data) {
        reportId = reportResult.data.id
      }
    } catch (dbError) {
      console.error("Error saving insight to database:", dbError)
      // Continue anyway - the insight is still valid
    }

    return {
      isSuccess: true,
      message: "Successfully generated personalized insight",
      data: {
        insight,
        reportId
      }
    }
  } catch (error) {
    console.error("Error in generatePersonalizedInsightAction:", error)
    return {
      isSuccess: false,
      message: `Failed to generate insight: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 