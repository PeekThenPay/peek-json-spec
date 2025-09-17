import { ULID } from 'ulid';
import { PricingScheme } from './pricing.js';
import { IntentType, ISO8601 } from '../index.js';

export interface PricingRequest {
  publisher_id: string;
  account_id: string;
}

export interface PricingResponse {
  scope: {
    publisher_id: ULID;
    account_id?: ULID;
  };
  is_custom: boolean;
  pricing_scheme: PricingScheme;
}

export interface LicenseRequest {
  publisher_id: ULID;
  /** The pricing schema ID that the operator received from pricing discovery */
  pricing_scheme_id: string;
  /** Array of intents this license grants access to */
  intents: IntentType[];
  /** Budget reservation in US cents for this license */
  budget_cents: number;
  /** License duration in seconds (optional, defaults to system config) */
  duration_seconds?: number;
  /** Request-specific metadata (e.g., client info, session tracking) */
  metadata?: Record<string, string>;
}

export interface LicenseResponse {
  license_id: ULID;
  license_jwt: string;
  expires_at: ISO8601;
}
