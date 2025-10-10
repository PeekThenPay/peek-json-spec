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
