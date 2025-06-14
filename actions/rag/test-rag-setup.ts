"use server"

import { embedAndStoreTextAction, searchSimilarChunksAction, ragQueryAction } from "@/actions/rag"
import { checkIndexStatusAction, createIndexWithHostedModelAction } from "./pinecone-setup"
import { ActionState } from "@/types"

interface RAGTestResult {
  step: string
  success: boolean
  message: string
  data?: any
}

interface RAGTestSuite {
  allTestsPassed: boolean
  results: RAGTestResult[]
  summary: string
}

export async function testRAGSetupAction(
  userId: string
): Promise<ActionState<RAGTestSuite>> {
  const results: RAGTestResult[] = []
  let allTestsPassed = true

  try {
    // Test 0: Check Pinecone Index
    console.log("Testing RAG Setup - Step 0: Checking Pinecone Index")
    const indexCheck = await checkIndexStatusAction()
    
    results.push({
      step: "Pinecone Index Check",
      success: indexCheck.isSuccess && (indexCheck.data?.exists || false),
      message: indexCheck.data?.exists 
        ? `Index exists and is ${indexCheck.data.ready ? 'ready' : 'not ready'}`
        : "Index does not exist - will attempt to create",
      data: indexCheck.data
    })

    // Create index if it doesn't exist
    if (!indexCheck.data?.exists) {
      console.log("Creating Pinecone index...")
      const createResult = await createIndexWithHostedModelAction()
      
      results.push({
        step: "Pinecone Index Creation",
        success: createResult.isSuccess,
        message: createResult.message,
        data: createResult.data
      })

      if (!createResult.isSuccess) {
        allTestsPassed = false
      }
    }

    // Test 1: Embedding and Storage
    console.log("Testing RAG Setup - Step 1: Embedding and Storage")
    const testText = `Personal goals and aspirations:
    
    I want to become a better software developer by learning new technologies and working on meaningful projects. 
    My goal is to build applications that solve real problems and help people improve their lives.
    
    I'm particularly interested in AI and machine learning applications, and I want to understand how to build 
    systems that can learn and adapt to user needs.
    
    Career objectives:
    - Lead a development team within 2 years
    - Contribute to open source projects
    - Build a successful SaaS product
    - Develop expertise in AI/ML technologies`

    const embeddingResult = await embedAndStoreTextAction(
      testText,
      userId,
      "test_document_rag_setup",
      "RAG Setup Test"
    )

    results.push({
      step: "Embedding and Storage (Pinecone llama-text-embed-v2)",
      success: embeddingResult.isSuccess,
      message: embeddingResult.message,
      data: embeddingResult.data
    })

    if (!embeddingResult.isSuccess) {
      allTestsPassed = false
    }

    // Test 2: Similarity Search
    console.log("Testing RAG Setup - Step 2: Similarity Search")
    const searchResult = await searchSimilarChunksAction(
      "What are my career goals?",
      userId,
      3
    )

    results.push({
      step: "Similarity Search (Pinecone Inference)",
      success: searchResult.isSuccess,
      message: searchResult.message,
      data: searchResult.data ? {
        resultsFound: searchResult.data.length,
        topScore: searchResult.data[0]?.score || 0,
        hasRelevantResults: searchResult.data.some(r => r.score > 0.7)
      } : undefined
    })

    if (!searchResult.isSuccess) {
      allTestsPassed = false
    }

    // Test 3: RAG Query (End-to-End)
    console.log("Testing RAG Setup - Step 3: RAG Query")
    const ragResult = await ragQueryAction({
      userId,
      query: "What technologies am I interested in learning?",
      conversationHistory: []
    })

    results.push({
      step: "RAG Query (GPT-4 Integration)",
      success: ragResult.isSuccess,
      message: ragResult.message,
      data: ragResult.data ? {
        hasAnswer: !!ragResult.data.answer,
        answerLength: ragResult.data.answer?.length || 0,
        sourcesFound: ragResult.data.sources?.length || 0,
        reportCreated: !!ragResult.data.reportId
      } : undefined
    })

    if (!ragResult.isSuccess) {
      allTestsPassed = false
    }

    // Generate summary
    const passedTests = results.filter(r => r.success).length
    const totalTests = results.length
    const summary = allTestsPassed 
      ? `🎉 All ${totalTests} Pinecone RAG tests passed! Your setup is working correctly.`
      : `⚠️ ${passedTests}/${totalTests} tests passed. Check the failed tests for configuration issues.`

    return {
      isSuccess: true,
      message: "Pinecone RAG setup test completed",
      data: {
        allTestsPassed,
        results,
        summary
      }
    }
  } catch (error) {
    console.error("Error in RAG setup test:", error)
    
    results.push({
      step: "Setup Test Error",
      success: false,
      message: `Test failed with error: ${error instanceof Error ? error.message : "Unknown error"}`,
      data: { error: error instanceof Error ? error.message : "Unknown error" }
    })

    return {
      isSuccess: false,
      message: "Pinecone RAG setup test failed: " + (error instanceof Error ? error.message : "Unknown error")
    }
  }
}

export async function cleanupTestDataAction(userId: string): Promise<ActionState<void>> {
  try {
    // Remove test document chunks
    const { deleteUserChunksAction } = await import("./embedding-actions")
    const result = await deleteUserChunksAction(userId, "test_document_rag_setup")
    
    return {
      isSuccess: result.isSuccess,
      message: result.isSuccess ? "Test data cleaned up successfully" : "Failed to cleanup test data",
      data: undefined
    }
  } catch (error) {
    console.error("Error cleaning up test data:", error)
    return {
      isSuccess: false,
      message: "Failed to cleanup test data"
    }
  }
}

// Quick environment check
export async function checkRAGEnvironmentAction(): Promise<ActionState<{
  pineconeConfigured: boolean
  openaiConfigured: boolean
  allConfigured: boolean
  missingVars: string[]
}>> {
  try {
    const missingVars: string[] = []
    
    const pineconeKey = process.env.PINECONE_API_KEY
    const indexName = process.env.PINECONE_INDEX_NAME
    const openaiKey = process.env.OPENAI_API_KEY // Still needed for GPT-4

    const pineconeConfigured = !!pineconeKey && !!indexName
    const openaiConfigured = !!openaiKey

    if (!pineconeKey) missingVars.push("PINECONE_API_KEY")
    if (!indexName) missingVars.push("PINECONE_INDEX_NAME")
    if (!openaiKey) missingVars.push("OPENAI_API_KEY (for GPT-4)")

    const allConfigured = pineconeConfigured && openaiConfigured

    return {
      isSuccess: true,
      message: allConfigured ? "All environment variables configured" : "Some environment variables missing",
      data: {
        pineconeConfigured,
        openaiConfigured,
        allConfigured,
        missingVars
      }
    }
  } catch (error) {
    console.error("Error checking environment:", error)
    return {
      isSuccess: false,
      message: "Failed to check environment configuration"
    }
  }
} 