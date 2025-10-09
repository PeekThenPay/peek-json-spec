import { IntentType, UsageType } from './common.js';

/**
 * Search configuration and pricing for a publisher.
 */
export interface SearchConfiguration {
  /** Search endpoint URL for this publisher */
  endpoint_url: string;
  /** Per-request cost in cents */
  price_cents: number;
}

/**
 * RAG ingest configuration and pricing for a publisher.
 */
export interface RagIngestConfiguration {
  /** RAG ingest endpoint URL for this publisher */
  endpoint_url: string;
  /** Pricing model: per_request (per job), per_1000_tokens, or per_item */
  pricing_mode: 'per_request' | 'per_1000_tokens' | 'per_item';
  /** Base price in cents according to pricing_mode */
  price_cents: number;
}

/**
 * Represents a pricing scheme for a publisher.
 */
export interface PricingScheme {
  /** Unique pricing scheme identifier (ULID) */
  pricing_scheme_id: string;
  /** Digest of canonical pricing JSON (sha256) */
  pricing_digest: string;
  /** Publisher identifier (ULID) */
  publisher_id: string;
  /** Currency code (e.g., 'USD') */
  currency: string;
  /** Cache TTL in seconds for this pricing scheme */
  cache_ttl_seconds: number;
  /** Map of intent name to intent pricing details */
  intents: Partial<Record<IntentType, IntentPricing>>;
  /** Search endpoint configuration and pricing */
  search?: SearchConfiguration;
  /** RAG ingest endpoint configuration and pricing */
  rag_ingest?: RagIngestConfiguration;
  /** Quotas for rate limiting and per-request limits */
  quotas?: PricingQuotas;
}

/**
 * Pricing configuration for a specific usage context.
 */
export interface UsagePricing {
  /** Price in US cents (interpreted based on intent pricing_mode) */
  price_cents: number;
  /** Maximum time-to-live in seconds for cached content (optional) */
  max_ttl_seconds?: number;
  /** Whether this usage type requires a separate contract or agreement (defaults to false) */
  requires_contract?: boolean;
}

/**
 * Pricing details for a specific intent.
 */
export interface IntentPricing {
  /** Name of the intent */
  intent: IntentType;
  /**
   * How the price_cents field should be interpreted:
   * - 'per_request': Fixed cost per request/crawl
   * - 'per_1000_tokens': Cost per 1000 tokens processed
   */
  pricing_mode: 'per_request' | 'per_1000_tokens';
  /** Usage-based pricing configuration for different usage contexts */
  usage: Partial<Record<UsageType, UsagePricing>>;
  /** Enforcement method (e.g., 'trust', 'tool_required') */
  enforcement_method: string;
  /** Path multipliers for pricing adjustments (glob patterns) */
  path_multipliers?: Record<string, number>;
  /** Path restrictions for where this intent can be used */
  path_restrictions?: {
    /** Restriction type: 'allow' permits only matching paths, 'disallow' blocks matching paths */
    type: 'allow' | 'disallow';
    /** Glob patterns for path matching */
    patterns: string[];
  };
  /** Model metadata for transform intents (optional) */
  model?: ModelMetadata;
}

/**
 * Model metadata for transform intents (e.g., summarization, embedding).
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
 * Quotas for rate limiting and license duration limits.
 */
export interface PricingQuotas {
  /** Maximum burst requests per second */
  burst_rps: number;
  /** Maximum license duration in seconds (defaults to system config if not set) */
  max_license_duration_seconds?: number;
}
