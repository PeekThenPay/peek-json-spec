import { JWTPayload } from 'jose';
import { IntentType, ISO8601, ULID } from './common.js';

/**
 * Immutable license object - embedded in JWT and never modified after creation
 */
export interface License {
  /** License identifier (ULID) */
  id: ULID;
  /** Publisher identifier (ULID) */
  publisher_id: ULID;
  /** Pricing scheme identifier used for this license */
  pricing_scheme_id: string;
  /** Pricing scheme type - either "default" or "custom" */
  pricing_scheme_type: 'default' | 'custom';
  /** Licensee identifier (operator account ID) */
  licensee_id: ULID;
  /** Array of intents this license grants access to */
  intents: IntentType[];
  /** Budget reserved for this license (immutable, in US cents) */
  budget_cents: number;
  /** License issue timestamp (ISO8601) */
  issued_at: ISO8601;
  /** License expiration timestamp (ISO8601) */
  expires_at: ISO8601;
  /** Request metadata from license creation */
  metadata: Record<string, string>;
}

/**
 * License payload for JWT embedding
 * Contains the same information as License but structured for JWT claims
 */
export interface LicensePayload extends JWTPayload {
  /** JWT issuer */
  iss: string; // e.g., "https://api.fetchright.ai"
  /** Subject (operator account ID) */
  sub: ULID; // (e.g., "operator:01J...")
  /** Audience (publisher ID) */
  aud: ULID;
  /** Expiration time (Unix timestamp) */
  exp: number;
  /** Issued at time (Unix timestamp) */
  iat: number;
  /** Token binding (DPoP / JKT per RFC 7638/9449) */
  cnf: { jkt: string };
  /** JWT ID (license ID) */
  jti: ULID;

  /** Pricing scheme identifier */
  pricing_scheme_id: string;
  /** Pricing scheme type - either "default" or "custom" */
  pricing_scheme_type: 'default' | 'custom';
  /** Array of intents this license grants access to */
  intents: IntentType[];
  /** Budget reserved for this license (in US cents) */
  budget_cents: number;
  /** Request metadata */
  metadata: Record<string, string>;
}

/**
 * Individual license usage result - represents actual usage of a license
 * This is what gets uploaded when publishers/operators report usage
 */
export interface LicenseUsageResult {
  /** Unique reservation/usage ID */
  reservation_id: ULID;
  /** Who reported this usage data */
  reported_by: 'operator' | 'publisher';
  /** License that was used */
  license_id: ULID;
  /** Intent that was used */
  intent: IntentType;
  /** Cost for this usage event (in US cents) */
  amount_cents: number;
  /** Path/resource that was accessed */
  path: string;
  /** When the request was initiated */
  request_time: ISO8601;
  /** When the request was resolved/completed */
  resolve_time: ISO8601;
  /** Whether the usage was successful */
  success: boolean;
  /** Number of tokens used for the request */
  tokens_used?: number;
  /** Reason for failure if not successful */
  failure_reason?: string;
  /** Additional metadata about this usage */
  metadata?: Record<string, string>;
}
