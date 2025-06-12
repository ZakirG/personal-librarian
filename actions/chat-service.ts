"use server"

import { createLlmReportAction } from "./db/llm-reports-actions"
import { createPromptHistoryAction } from "./db/prompt-history-actions"
import { ActionState } from "@/types"

interface ChatResponse {
  message: string
  reportGenerated?: {
    id: string
    title: string
    content: string
  }
}

export async function processChatMessageAction(
  userId: string,
  message: string
): Promise<ActionState<ChatResponse>> {
  try {
    // Store the user prompt in history
    await createPromptHistoryAction({
      userId,
      prompt: message,
      llmResponseId: null
    })

    // Analyze the message to determine if we should generate a research report
    const shouldGenerateReport = await shouldTriggerResearchReport(message)
    
    if (shouldGenerateReport) {
      // Generate a research report
      const reportResult = await generateResearchReport(userId, message)
      
      if (reportResult.isSuccess && reportResult.data) {
        // Update prompt history with the report ID
        await createPromptHistoryAction({
          userId,
          prompt: message,
          llmResponseId: reportResult.data.id
        })

        return {
          isSuccess: true,
          message: "Generated research report based on your request",
          data: {
            message: `I've generated a comprehensive research report titled "${reportResult.data.title}". You can find it in your reports feed above.`,
            reportGenerated: {
              id: reportResult.data.id,
              title: reportResult.data.title || "Research Report",
              content: reportResult.data.content
            }
          }
        }
      }
    }

    // Generate a regular chat response
    const response = await generateChatResponse(message)

    return {
      isSuccess: true,
      message: "Chat response generated",
      data: {
        message: response
      }
    }
  } catch (error) {
    console.error("Error processing chat message:", error)
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

async function generateChatResponse(message: string): Promise<string> {
  // Generate contextual chat responses
  const responses = [
    "I understand your request. Let me analyze this and see if I should generate a detailed research report for you.",
    "That's an interesting question. I'll search through your documents and available research to provide the best guidance.",
    "I can help you with that. Give me a moment to process your request and determine the most helpful approach.",
    "Based on your message, I'm evaluating whether to provide a quick response or generate a comprehensive research report.",
    "I'm processing your request and will provide either immediate insights or a detailed research analysis depending on the complexity."
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
} 