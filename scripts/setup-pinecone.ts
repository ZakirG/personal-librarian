import { Pinecone } from "@pinecone-database/pinecone"
import * as dotenv from "dotenv"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

async function setupPinecone() {
  try {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not set in environment variables")
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    })

    const indexName = process.env.PINECONE_INDEX_NAME || "librarian-index"

    // Check if index exists
    const existingIndexes = await pinecone.listIndexes()
    const indexExists = existingIndexes.indexes?.some((index: { name: string }) => index.name === indexName) ?? false

    if (!indexExists) {
      console.log(`Creating index: ${indexName}`)
      await pinecone.createIndex({
        name: indexName,
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1"
          }
        },
        dimension: 1536, // OpenAI's text-embedding-3-small dimension
        metric: "cosine"
      })
      console.log("Index created successfully")
    } else {
      console.log(`Index ${indexName} already exists`)
    }

    // Get index stats
    const index = pinecone.Index(indexName)
    const stats = await index.describeIndexStats()
    console.log("Index stats:", stats)
  } catch (error) {
    console.error("Error setting up Pinecone:", error)
    process.exit(1)
  }
}

setupPinecone() 