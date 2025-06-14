# RAG Integration Setup Guide - Pinecone Hosted Embeddings

## Overview

Your Personal Librarian now includes a complete RAG (Retrieval-Augmented Generation) pipeline that provides personalized AI responses based on your uploaded documents, using **Pinecone's hosted `llama-text-embed-v2` model** for embeddings.

## Features Implemented

✅ **LangChain Integration**: Text chunking pipeline
✅ **Pinecone Hosted Embeddings**: Using `llama-text-embed-v2` model (no OpenAI needed for embeddings!)
✅ **Pinecone Vector Database**: Scalable vector search with user namespaces
✅ **GPT-4.1-mini**: Advanced language model for response generation (still uses OpenAI)
✅ **Personalized Memory**: Each user has isolated document context
✅ **Auto-Embedding**: Conversations are re-embedded for improved context

## Architecture

```
User Uploads Document → LangChain Text Splitter → Pinecone llama-text-embed-v2 → Pinecone Storage
                                                                                    ↓
User Asks Question → Pinecone Inference API → Pinecone Search → Context Retrieval → GPT-4 Response
```

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# AI/RAG Configuration
OPENAI_API_KEY=your_openai_api_key_here  # Only needed for GPT-4 responses
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=librarian-index
```

### 2. OpenAI API Setup (GPT-4 Only)

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add it to your `.env.local` file
4. Ensure you have credits in your OpenAI account

**Note**: We only use OpenAI for GPT-4 text generation, not embeddings!

### 3. Pinecone Setup

1. Go to [Pinecone](https://www.pinecone.io/)
2. Create a free account
3. Copy your API key to `.env.local`
4. The index will be created automatically with the hosted model

**Index Configuration** (handled automatically):
- **Index Name**: `librarian-index`
- **Model**: `llama-text-embed-v2` (hosted by Pinecone)
- **Dimensions**: `4096` (automatic with hosted model)
- **Metric**: `cosine`
- **Cloud**: `aws`
- **Region**: `us-east-1`

### 4. Automatic Index Creation

The system will automatically create the Pinecone index with the hosted model when first used:

```typescript
// Automatic index creation with hosted model
await pinecone.createIndex({
  name: 'librarian-index',
  dimension: 4096, // llama-text-embed-v2 dimension
  metric: 'cosine',
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1'
    }
  },
  waitUntilReady: true
})
```

## Usage

### Document Processing

```typescript
import { processAndEmbedDocumentAction } from "@/actions/rag"

// Process and embed a document using Pinecone's hosted model
const result = await processAndEmbedDocumentAction(
  documentContent,
  userId,
  documentId,
  fileName
)
```

### RAG Query

```typescript
import { ragQueryAction } from "@/actions/rag"

// Ask a question with RAG
const result = await ragQueryAction({
  userId: "user123",
  query: "What are my main goals?",
  conversationHistory: [
    { role: "user", content: "Previous question" },
    { role: "assistant", content: "Previous answer" }
  ]
})
```

### Direct Embedding

```typescript
import { embedAndStoreTextAction } from "@/actions/rag"

// Embed any text using Pinecone's hosted model
const result = await embedAndStoreTextAction(
  text,
  userId,
  documentId,
  source
)
```

## How It Works

### 1. Document Upload Flow

1. User uploads a document (PDF, text)
2. Content is extracted and cleaned
3. LangChain `RecursiveCharacterTextSplitter` breaks it into 1000-character chunks with 200-character overlap
4. **Pinecone's hosted `llama-text-embed-v2` generates embeddings** for each chunk
5. Chunks are stored in Pinecone under user-specific namespace `user_{userId}`
6. Document summary is generated using GPT-4 and stored in the database

### 2. Query Flow

1. User asks a question in chat
2. **Pinecone's inference API embeds the question** using `llama-text-embed-v2`
3. Pinecone searches for top-K most similar chunks in user's namespace
4. Relevant chunks (score > 0.7) are retrieved
5. GPT-4.1-mini generates response using retrieved context
6. Response is saved to database and optionally re-embedded

### 3. Personalization

- Each user has isolated namespace in Pinecone
- Only their documents are searched
- Conversation history provides additional context
- Responses are personalized based on user's specific documents

## API Functions Available

### Core RAG Functions

- `embedAndStoreTextAction()` - Embed and store text chunks using Pinecone
- `searchSimilarChunksAction()` - Find similar content using Pinecone inference
- `ragQueryAction()` - Complete RAG query with LLM response
- `processAndEmbedDocumentAction()` - Process entire documents
- `generatePersonalizedInsightAction()` - Generate insights from user data

### Pinecone Management Functions

- `createIndexWithHostedModelAction()` - Create index with llama-text-embed-v2
- `checkIndexStatusAction()` - Check if index exists and is ready
- `deleteIndexAction()` - Clean up index if needed
- `deleteUserChunksAction()` - Clean up user data
- `getIndexStatsAction()` - Monitor Pinecone usage

## Integration with Dashboard

The chat interface now automatically uses Pinecone RAG:

1. Every chat message triggers Pinecone similarity search
2. Sources are displayed with responses
3. Conversations are stored in the database
4. Failed RAG queries fall back to helpful messages

## Performance Considerations

- **Embedding Model**: Using Pinecone's hosted `llama-text-embed-v2` for optimal performance
- **Chunk Size**: 1000 characters with 200 overlap for optimal retrieval
- **Search Threshold**: Score > 0.7 filters out irrelevant results
- **Context Limit**: Truncated for GPT-4 token limits
- **Hosting**: Embeddings run on Pinecone's infrastructure (faster, more reliable)

## Cost Estimation

For 100 documents (~500 pages):
- **Pinecone Embeddings**: Included in Pinecone pricing
- **OpenAI GPT-4 queries**: ~$0.10 per conversation
- **Pinecone Storage**: Free tier supports 100k vectors

**Major Cost Savings**: No separate OpenAI embedding costs!

## Troubleshooting

### Common Issues

1. **"No context found"**: User hasn't uploaded documents yet
2. **Pinecone connection errors**: Check API key
3. **Index creation failed**: Check Pinecone account limits
4. **OpenAI quota exceeded**: Check account credits (only affects GPT-4 responses)
5. **Low similarity scores**: Documents may not contain relevant information

### Debug Tools

```typescript
// Check Pinecone index status
const status = await checkIndexStatusAction()

// Create index manually if needed
const createResult = await createIndexWithHostedModelAction()

// Check user's stored chunks
const results = await searchSimilarChunksAction("test", userId, 10)

// Test complete RAG pipeline
const testResult = await testRAGSetupAction(userId)
```

## Security

- User data is isolated in Pinecone namespaces
- No cross-user data leakage
- API keys are server-side only
- All operations require user authentication
- Embeddings processed on Pinecone's secure infrastructure

## Migration from OpenAI Embeddings

If you had the previous OpenAI embedding setup:

1. Remove `OPENAI_API_KEY` from embeddings (keep for GPT-4)
2. Existing embeddings will continue to work
3. New embeddings will use Pinecone's hosted model
4. Consider re-embedding existing documents for consistency

## Next Steps

1. Add your Pinecone API key to `.env.local`
2. Keep your OpenAI API key for GPT-4 responses
3. The system will automatically create the index with hosted embeddings
4. Upload some personal documents
5. Start asking questions!

The system will automatically handle all embedding operations using Pinecone's optimized infrastructure while maintaining the same powerful RAG capabilities. 