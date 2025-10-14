/**
 * TypeScript interfaces for forensic manifest - the JWS payload structure for audit trails
 */

import { ModelMetadata, ContentType } from './common.js';

export interface ForensicManifest {
  /** Schema version for future evolution compatibility */
  schema_version: string;

  /** Unique manifest identifier (ULID format) for replay resistance and auditing */
  manifest_id: string;

  /** Publisher identifier in ULID format */
  publisher_id: string;

  /** License identifier in ULID format, null for public preview responses */
  license_id: string | null;

  /** Canonical resource URL being served (full URL with scheme) */
  resource_url: string;

  /** Content type classification for resource categorization */
  resource_type?: ContentType;

  /** SHA256 digest of the response payload in format sha256:<hex>, must match X-PTP-Payload-Digest header */
  payload_digest: string;

  /** true for preview content, false for full licensed content */
  preview: boolean;

  /** RFC 3339 / ISO 8601 datetime when this manifest was issued (MUST be UTC) */
  issued_at: string;

  /** RFC 3339 / ISO 8601 datetime when this content/license expires (MUST be UTC) */
  expires_at?: string;

  /** Time-to-live for this specific content response in seconds (for cache management) */
  content_ttl_seconds?: number;

  /** JWS signer identification */
  signer?: {
    /** Key ID used to sign this manifest (for JWS header kid reference) */
    kid: string;
    /** Signer entity identifier (publisher, CDN, enforcement service, etc.) */
    entity: string;
  };

  /** Processing model information for audit trails when content transformation was applied */
  model?: ModelMetadata;
}

/**
 * Clock skew tolerance constants for issued_at validation
 */
export const FORENSIC_MANIFEST_CONSTANTS = {
  /** Maximum acceptable clock skew in seconds (5 minutes) */
  MAX_CLOCK_SKEW_SECONDS: 300,
  /** Current schema version */
  CURRENT_SCHEMA_VERSION: '1.0',
  /** Canonical digest algorithm */
  CANONICAL_DIGEST_ALGORITHM: 'sha256',
} as const;
