/**
 * Interface for code index embedders.
 * This interface is implemented by both OpenAI and Ollama embedders.
 */
export interface IEmbedder {
  /**
   * Creates embeddings for the given texts.
   * @param texts Array of text strings to create embeddings for
   * @param model Optional model ID to use for embeddings
   * @param context Whether the texts are search queries or indexed documents.
   *                Some instruction-tuned embedding models require different
   *                prefixes for queries vs documents.
   * @returns Promise resolving to an EmbeddingResponse
   */
  createEmbeddings(texts: string[], model?: string, context?: "query" | "document"): Promise<EmbeddingResponse>

  /**
   * Validates the embedder configuration by testing connectivity and credentials.
   * @returns Promise resolving to validation result with success status and optional error message
   */
  validateConfiguration(): Promise<{ valid: boolean; error?: string }>

  get embedderInfo(): EmbedderInfo

  /**
   * Maximum number of input texts the embedder can send in a single request.
   * The scanner uses this to size batches so each embedding call is one request
   * instead of being internally split into serial sub-requests.
   * `Infinity` means the embedder is limited only by tokens, not input count.
   */
  readonly maxBatchInputs: number
}

export interface EmbeddingResponse {
  embeddings: number[][]
  usage?: {
    promptTokens: number
    totalTokens: number
  }
}

export type AvailableEmbedders =
  | "kilo"
  | "openai"
  | "ollama"
  | "openai-compatible"
  | "gemini"
  | "mistral"
  | "vercel-ai-gateway"
  | "bedrock"
  | "openrouter"
  | "voyage"

export interface EmbedderInfo {
  name: AvailableEmbedders
}
