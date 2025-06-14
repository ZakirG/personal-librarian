// Export all RAG functionality
export * from "./embedding-actions"
export * from "./rag-service"
export * from "./pinecone-setup"
export * from "./test-rag-setup"

// Re-export key functions for easy access
export {
  embedAndStoreTextAction,
  searchSimilarChunksAction,
  deleteUserChunksAction,
  getIndexStatsAction
} from "./embedding-actions"

export {
  ragQueryAction,
  processAndEmbedDocumentAction,
  generatePersonalizedInsightAction
} from "./rag-service"

export {
  createIndexWithHostedModelAction,
  checkIndexStatusAction,
  deleteIndexAction
} from "./pinecone-setup"

export {
  testRAGSetupAction,
  checkRAGEnvironmentAction,
  cleanupTestDataAction
} from "./test-rag-setup" 