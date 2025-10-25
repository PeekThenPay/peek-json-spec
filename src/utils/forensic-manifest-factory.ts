/**
 * Forensic Manifest Factory - Utilities for creating X-PTP-Delivery header payloads
 *
 * This module provides utilities for creating forensic manifest objects that get
 * signed and included in the X-PTP-Delivery header for audit trails and compliance.
 */

import { ulid } from 'ulid';
import type { ForensicManifest } from '../types/forensic-manifest.js';
import { FORENSIC_MANIFEST_CONSTANTS } from '../types/forensic-manifest.js';
import type { ModelMetadata, ContentType } from '../types/common.js';
import type { ErrorObject } from 'ajv';
// Import pre-compiled validator with full format validation
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Pre-compiled validator without types
import validatorFn from '../validators/forensic-manifest-validator.js';

// Type assertion for pre-compiled validator
const validator = validatorFn as ((data: unknown) => boolean) & { errors?: ErrorObject[] | null };

/**
 * Error thrown when forensic manifest validation fails
 */
export class ForensicManifestValidationError extends Error {
  constructor(
    message: string,
    public errors?: ErrorObject<string, Record<string, string | number | boolean | null>, unknown>[]
  ) {
    super(message);
    this.name = 'ForensicManifestValidationError';
  }
}

/**
 * Parameters for creating a forensic manifest
 */
export interface CreateForensicManifestParams {
  /** Unique manifest identifier (ULID format), auto-generated if not provided */
  manifest_id?: string;

  /** Publisher identifier (ULID format) */
  publisher_id: string;

  /** License identifier (ULID format), null for preview responses */
  license_id: string | null;

  /** Canonical URL of the resource being served */
  resource_url: string;

  /** Content type classification for resource categorization */
  resource_type?: ContentType;

  /** SHA256 digest of the response payload (must match X-PTP-Payload-Digest header) */
  payload_digest: string;

  /** Whether this is preview content (true) or full licensed content (false) */
  preview: boolean;

  /** Content TTL in seconds (optional, for cache management) */
  content_ttl_seconds?: number;

  /** RFC 3339 / ISO 8601 datetime when this content/license expires (MUST be UTC) */
  expires_at?: string;

  /** JWS signer identification */
  signer?: {
    kid: string;
    entity: string;
  };

  /** Processing model info (optional, for tool_required enforcement) */
  model?: ModelMetadata;

  /** Override issued_at timestamp (defaults to current time) */
  issued_at?: string;

  /** Clock function for generating timestamps (defaults to () => new Date()) */
  clock?: () => Date;
}

/**
 * Creates a forensic manifest object for inclusion in X-PTP-Delivery header
 *
 * @param params - Parameters for the forensic manifest
 * @param params.clock - Optional clock function for timestamp generation (defaults to () => new Date())
 * @returns A forensic manifest object ready to be signed and included in JWS
 *
 * @example
 * ```typescript
 * // For full licensed content
 * const manifest = createForensicManifest({
 *   publisher_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T1X',
 *   license_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T2Y',
 *   resource_url: 'https://example.com/article',
 *   payload_digest: 'sha256:a1b2c3d4e5f6...',
 *   preview: false,
 *   content_ttl_seconds: 3600,
 *   model: {
 *     id: 'gpt-4',
 *     digest: 'sha256:model123...'
 *   }
 * });
 *
 * // For preview content
 * const previewManifest = createForensicManifest({
 *   publisher_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T1X',
 *   license_id: null,
 *   resource_url: 'https://example.com/article',
 *   payload_digest: 'sha256:preview789...',
 *   preview: true,
 *   content_ttl_seconds: 300
 * });
 *
 * // For testing with consistent timestamps
 * const testManifest = createForensicManifest({
 *   publisher_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T1X',
 *   license_id: null,
 *   resource_url: 'https://example.com/test',
 *   payload_digest: 'sha256:test123...',
 *   preview: true,
 *   clock: () => new Date('2024-01-01T00:00:00.000Z')
 * });
 * ```
 */
export function createForensicManifest(params: CreateForensicManifestParams): ForensicManifest {
  const clock = params.clock || (() => new Date());

  const manifest: ForensicManifest = {
    schema_version: FORENSIC_MANIFEST_CONSTANTS.CURRENT_SCHEMA_VERSION,
    manifest_id: params.manifest_id || ulid(),
    publisher_id: params.publisher_id,
    license_id: params.license_id,
    resource_url: params.resource_url,
    payload_digest: params.payload_digest,
    preview: params.preview,
    issued_at: params.issued_at || clock().toISOString(),
  };

  // Add optional fields if provided
  if (params.resource_type) {
    manifest.resource_type = params.resource_type;
  }

  if (params.content_ttl_seconds !== undefined) {
    manifest.content_ttl_seconds = params.content_ttl_seconds;
  }

  if (params.expires_at) {
    manifest.expires_at = params.expires_at;
  }

  if (params.signer) {
    manifest.signer = params.signer;
  }

  if (params.model) {
    manifest.model = params.model;
  }

  // Validate the manifest using the validation function
  validateForensicManifest(manifest);

  return manifest;
}

/**
 * Creates a forensic manifest for preview responses
 * Convenience function with preview-specific defaults
 */
export function createPreviewForensicManifest(
  params: Omit<CreateForensicManifestParams, 'preview' | 'license_id'> & {
    license_id?: null;
  }
): ForensicManifest {
  return createForensicManifest({
    ...params,
    license_id: params.license_id || null,
    preview: true,
    content_ttl_seconds: params.content_ttl_seconds || 300, // Default 5 minutes for previews
  });
}

/**
 * Creates a forensic manifest for full licensed content
 * Convenience function with licensed content defaults
 */
export function createLicensedForensicManifest(
  params: Omit<CreateForensicManifestParams, 'preview'> & {
    license_id: string; // Required for licensed content
  }
): ForensicManifest {
  return createForensicManifest({
    ...params,
    preview: false,
    content_ttl_seconds: params.content_ttl_seconds || 3600, // Default 1 hour for licensed content
  });
}

/**
 * Validates that a payload digest has the correct SHA256 format
 */
export function isValidPayloadDigest(digest: string): boolean {
  return /^sha256:[a-fA-F0-9]{64}$/.test(digest);
}

/**
 * Error thrown when forensic manifest validation fails (legacy - kept for compatibility)
 */
export class ForensicManifestError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ForensicManifestError';
  }
}

/**
 * Validates a forensic manifest object using the pre-compiled validator
 */
export function validateForensicManifest(manifest: ForensicManifest): void {
  const valid = validator(manifest);
  if (!valid && validator.errors) {
    const errorMessage = validator.errors.map((e: ErrorObject) => e.message).join(', ');
    throw new ForensicManifestError(`Forensic manifest validation failed: ${errorMessage}`);
  }
}
