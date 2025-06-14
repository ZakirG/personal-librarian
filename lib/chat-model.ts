import { ChatOpenAI } from "@langchain/openai"

// Initialize chat model with OpenRouter configuration
export const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL, // Required for OpenRouter
      "X-Title": "Personal Librarian" // Optional, but good practice
    }
  },
  modelName: "openai/gpt-4.1-mini", // Full OpenRouter model identifier
  temperature: 0.7,
  streaming: true
}) 