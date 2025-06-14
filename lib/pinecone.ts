import { Pinecone } from "@pinecone-database/pinecone"

// Initialize Pinecone client
export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
}) 