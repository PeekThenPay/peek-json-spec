/**
 * ULID string type for unique identifiers.
 * Re-exported from the ulid package.
 */
export type { ULID } from 'ulid';

/**
 * ISO8601 timestamp string type.
 */
export type ISO8601 = string;

/**
 * Digest string type (sha256, etc.).
 */
export type Digest = string;

export type IntentType =
  | 'peek' // Title, short abstract, canonical URL, key metadata
  | 'read' // Full original content (optionally cleaned)
  | 'summarize' // Abstractive/compressive summary (short, medium, long)
  | 'quote' // Verbatim snippets (≤300 chars) with attribution
  | 'embed' // Numeric vectors (768-3072 dimensions per chunk)
  | 'qa' // Structured Q&A pairs derived from source
  | 'translate' // Parallel corpora (source + translated text)
  | 'analyze'; // JSON structured annotations (sentiment, entities, etc.)

/**
 * Usage context for content access - determines retention and licensing terms.
 */
export type UsageType =
  | 'immediate' // One-shot access with no retention
  | 'session' // Ephemeral caching for multi-turn interactions
  | 'index' // Persistent retrieval indexes for search/assistant systems
  | 'train' // Permanent model incorporation for fine-tuning
  | 'distill' // Synthetic data generation for knowledge distillation
  | 'audit'; // Compliance and provenance verification

/**
 * Model metadata for AI-generated content.
 */
export interface ModelMetadata {
  /** Model identifier (e.g., 'sum:gpt-4.1-mini@v2') */
  id: string;
  /** Model provider (e.g., 'openai') */
  provider: string;
  /** Model name (e.g., 'gpt-4.1-mini') */
  name: string;
  /** Model version (e.g., 'v2') */
  version: string;
  /** Digest of model (sha256) */
  digest: string;
}

/**
 * Core provenance fields for content integrity, generation tracking, and attribution.
 */
export interface BaseProvenance {
  /** Stable hash of source content (e.g., sha256:...) */
  contentHash: string;
  /** Timestamp when the response was generated/computed */
  generatedAt?: ISO8601;
  /** Model used for content processing or generation */
  model?: ModelMetadata;
  /** Original URL where content was retrieved */
  sourceUrl?: string;
  /** Title of the original source document */
  sourceTitle?: string;
  /** Author or creator of the original content */
  sourceAuthor?: string;
  /** Copyright or rights statement for the source content */
  rights?: string;
  /** Required attribution text or format */
  attribution?: string;
  /** License identifier or URL for the source content */
  license?: string;
  /** Processing algorithm or method used for content transformation */
  algorithm?: string;
  /** Confidence score for generated or processed content */
  confidence?: number;
}

/**
 * Provenance extensions for analyze intent
 */
export interface AnalyzeProvenance extends BaseProvenance {
  /** Analysis tasks that were performed */
  tasks: string[];
  /** Required: timestamp when analysis was generated */
  generatedAt: ISO8601;
}

/**
 * Provenance extensions for embed intent
 */
export interface EmbedProvenance extends BaseProvenance {
  /** Number of dimensions in embedding vectors */
  vectorDimensions: number;
  /** How source was partitioned for embedding */
  chunkingMethod: 'doc' | 'chunks' | 'selection';
  /** Size of chunks when chunking method is 'chunks' */
  chunkSize?: number;
  /** Overlap between adjacent chunks */
  chunkOverlap?: number;
  /** Unit of measurement for chunk size */
  chunkUnit?: 'token' | 'utf8' | 'char';
  /** Required: timestamp when embeddings were generated */
  generatedAt: ISO8601;
}

/**
 * Provenance extensions for quote intent
 */
export interface QuoteProvenance extends BaseProvenance {
  /** Method used to locate quoted text */
  selectionMethod: 'query' | 'selector' | 'spans';
  /** Required: timestamp when quotes were generated */
  generatedAt: ISO8601;
}

/**
 * Provenance extensions for read intent
 */
export interface ReadProvenance extends BaseProvenance {
  /** HTTP ETag for caching */
  etag?: string;
  /** Last modification timestamp */
  lastModified?: ISO8601;
}
