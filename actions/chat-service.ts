"use server"

import { createLlmReportAction } from "./db/llm-reports-actions"
import { createPromptHistoryAction } from "./db/prompt-history-actions"
import { ragQueryAction } from "./rag/rag-service"
import { ActionState } from "@/types"

interface ChatResponse {
  message: string
  reportGenerated?: {
    id: string
    title: string
    content: string
  }
  sources?: Array<{
    id: string
    score: number
    text: string
    source?: string
  }>
  isRagResponse?: boolean
}

export async function processChatMessageAction(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<ActionState<ChatResponse>> {
  try {
    console.log("🚀 CHAT SERVICE: Starting processChatMessageAction")
    console.log("📝 Input params:", {
      userId,
      userIdType: typeof userId,
      message: message.substring(0, 100) + "...",
      historyLength: conversationHistory.length
    })

    // Use RAG to generate a personalized response based on user's documents
    console.log("🔍 CHAT SERVICE: Calling ragQueryAction...")
    const ragResult = await ragQueryAction({
      userId,
      query: message,
      conversationHistory
    })

    console.log("📊 CHAT SERVICE: RAG result:", {
      isSuccess: ragResult.isSuccess,
      message: ragResult.message,
      hasData: !!ragResult.data,
      sourcesCount: ragResult.data?.sources?.length || 0,
      answerLength: ragResult.data?.answer?.length || 0
    })

    if (ragResult.isSuccess && ragResult.data) {
      console.log("✅ CHAT SERVICE: RAG succeeded, returning RAG response")
      console.log("📄 RAG Sources found:", ragResult.data.sources?.map(s => ({
        id: s.id,
        score: s.score,
        textPreview: s.text.substring(0, 50) + "..."
      })))
      
      return {
        isSuccess: true,
        message: "Generated RAG-powered response",
        data: {
          message: ragResult.data.answer,
          sources: ragResult.data.sources,
          isRagResponse: true,
          reportGenerated: ragResult.data.reportId ? {
            id: ragResult.data.reportId,
            title: `Query: ${message.substring(0, 50)}...`,
            content: ragResult.data.answer
          } : undefined
        }
      }
    }

    // Fallback to simple response if RAG fails
    console.log("⚠️ CHAT SERVICE: RAG failed, using fallback response")
    const fallbackResponse = await generateFallbackResponse(message)

    return {
      isSuccess: true,
      message: "Generated fallback response",
      data: {
        message: fallbackResponse,
        isRagResponse: false
      }
    }
  } catch (error) {
    console.error("❌ CHAT SERVICE: Error processing chat message:", error)
    return { isSuccess: false, message: "Failed to process chat message" }
  }
}

async function shouldTriggerResearchReport(message: string): Promise<boolean> {
  // Simple heuristics to determine if we should generate a research report
  const reportTriggers = [
    'research',
    'find information',
    'look up',
    'analyze',
    'study',
    'investigate',
    'explore',
    'learn about',
    'tell me about',
    'what do you know about',
    'help me with',
    'solve',
    'improve',
    'optimize'
  ]
  
  const messageToLower = message.toLowerCase()
  return reportTriggers.some(trigger => messageToLower.includes(trigger))
}

async function generateResearchReport(userId: string, prompt: string) {
  // Simulate research report generation
  // In a real implementation, this would call Scira, Grok, or other research APIs
  
  const topics = extractTopicsFromPrompt(prompt)
  const title = generateReportTitle(topics)
  const content = await generateReportContent(topics, prompt)
  
  return await createLlmReportAction({
    userId,
    title,
    content,
    sourceUrls: [
      "https://example.com/research1",
      "https://example.com/research2"
    ]
  })
}

function extractTopicsFromPrompt(prompt: string): string[] {
  // Simple topic extraction - in real implementation, use NLP
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'can', 'you', 'help', 'me', 'find', 'research']
  return prompt
    .toLowerCase()
    .split(/\s+/)
    .filter(word => !commonWords.includes(word) && word.length > 3)
    .slice(0, 3) // Take first 3 meaningful words
}

function generateReportTitle(topics: string[]): string {
  if (topics.length === 0) return "Research Report"
  return `Research Report: ${topics.map(topic => 
    topic.charAt(0).toUpperCase() + topic.slice(1)
  ).join(' & ')}`
}

async function generateReportContent(topics: string[], prompt: string): Promise<string> {
  // Simulate comprehensive research report generation
  // In real implementation, this would integrate with Scira/Grok APIs
  
  const reportSections = [
    generateIntroduction(topics, prompt),
    generateKeyFindings(topics),
    generateRecommendations(topics),
    generateConclusion(topics)
  ]
  
  return reportSections.join('\n\n')
}

function generateIntroduction(topics: string[], prompt: string): string {
  return `## Introduction

Based on your request: "${prompt}"

I've conducted comprehensive research on ${topics.join(', ')} to provide you with evidence-based insights and actionable recommendations. This report synthesizes information from multiple authoritative sources to address your specific needs.`
}

function generateKeyFindings(topics: string[]): string {
  const findings = topics.map((topic, index) => 
    `${index + 1}. **${topic.charAt(0).toUpperCase() + topic.slice(1)}**: Recent research indicates significant developments in this area, with multiple studies showing promising results for practical application.`
  ).join('\n')
  
  return `## Key Findings

${findings}

Current research trends show a growing consensus around evidence-based approaches, with particular emphasis on sustainable and personalized solutions.`
}

function generateRecommendations(topics: string[]): string {
  const recommendations = topics.map((topic, index) => 
    `${index + 1}. **Start with ${topic}**: Begin implementing small, measurable changes based on current best practices.\n2. **Monitor progress**: Track key metrics to ensure effectiveness.\n3. **Iterate and improve**: Use feedback to refine your approach.`
  ).join('\n\n')
  
  return `## Recommendations

${recommendations}

These recommendations are based on peer-reviewed research and proven methodologies. Implementation should be gradual and tailored to your specific circumstances.`
}

function generateConclusion(topics: string[]): string {
  return `## Conclusion

The research on ${topics.join(' and ')} demonstrates clear pathways for improvement and growth. By following evidence-based approaches and maintaining consistent implementation, you can achieve meaningful progress in these areas.

Key next steps:
1. Review the detailed recommendations above
2. Select 1-2 areas to focus on initially
3. Create a specific action plan with measurable goals
4. Schedule regular check-ins to assess progress

This report will be added to your personal knowledge base to inform future recommendations and research.`
}

async function generateFallbackResponse(message: string): Promise<string> {
  // Generate simple fallback responses when RAG is not available
  const responses = [
    "I understand your request. However, I don't have access to your personal documents right now. Please make sure you've uploaded some documents first so I can provide personalized insights.",
    "That's an interesting question. To give you the most relevant answer, I'd need to search through your uploaded documents. Have you added any personal documents to your library yet?",
    "I can help you with that once you've uploaded some documents to your Personal Librarian. Your documents help me provide personalized, relevant responses.",
    "Based on your message, I'd like to search through your personal documents to provide the best guidance. Please upload some documents first.",
    "I'm ready to help! To provide personalized insights, I need access to your documents. Try uploading some PDFs or text files about your goals, problems, or interests."
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
} 