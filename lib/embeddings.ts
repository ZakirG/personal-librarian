import { PineconeStore } from "@langchain/pinecone"
import { pinecone } from "@/lib/pinecone"
import { OpenAIEmbeddings } from "@langchain/openai"

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small"
})

// Initialize Pinecone vector store
export const vectorStore = new PineconeStore(embeddings, {
  pineconeIndex: pinecone.Index(process.env.PINECONE_INDEX_NAME!)
}) 