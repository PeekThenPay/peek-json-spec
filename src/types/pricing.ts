import { IntentType } from './common.js';

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
  /** Quotas for rate limiting and per-request limits */
  quotas?: PricingQuotas;
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
  /** Price in US cents (interpreted based on pricing_mode) */
  price_cents: number;
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
