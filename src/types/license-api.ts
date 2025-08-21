// TypeScript interfaces for License API (Peek-Then-Pay)

export interface AccountRequest {
  name: string;
  contact_email: string;
  default_payment_method?: {
    provider: string;
    token: string;
    expires_at?: string;
  };
}

export interface AccountResponse {
  account_id: string;
  status: 'active' | 'inactive' | 'suspended';
  default_payment_method?: {
    provider: string;
    expires_at?: string;
    valid?: boolean;
  };
}

export interface PricingRequest {
  publisher_id: string;
  account_id: string;
}

export interface PricingResponse {
  pricing_scheme_id: string;
  publisher_id: string;
  intents: Record<string, Pricing>;
}

export interface Pricing {
  /**
   * The intent name (e.g., 'read_resource', 'summarize_resource', etc.)
   */
  intent: string;
  /**
   * The price for using this intent (per credit, request, etc.)
   */
  price: number;
  /**
   * Whether a license is required for this intent
   */
  license_required: boolean;
  /**
   * The enforcement method for this intent:
   * - 'trust': AI agent receives raw content
   * - 'tool_required': enforcer must use publisher's tool service
   * - 'both': AI agent can choose
   */
  enforcement_method: 'trust' | 'tool_required' | 'both';
  /**
   * Optional path-based multipliers for pricing
   */
  path_multipliers?: Record<string, number>;
}

export interface LicenseRequest {
  ai_agent_account_id: string;
  publisher_id: string;
  pricing_scheme_id: string;
  intents: string[]; // intent names from PricingResponse
  budget: number; // total budget to reserve for this license
  payment_method?: {
    provider: string;
    token: string;
    expires_at?: string;
  }; // If not provided, use default_payment_method from account. If neither is valid, error.
}

/**
 * JWT payload for issued license assertion
 */
export interface LicenseJWTPayload {
  iss: string; // issuer (license server)
  aud: string; // audience (publisher domain)
  sub: string; // subject (ai_agent_account_id)
  exp: string; // expiration ISO string
  publisher_id: string;
  ai_agent_account_id: string;
  tools: Pricing[]; // intents supported by this license
  budget: number; // total reserved budget for this license
  license_id: string;
  pricing_scheme_id: string; // pricing scheme used for this license
}

export interface LicenseResponse {
  /**
   * The signed JWT license token (assertion-only, contains all license details)
   */
  license_token: string;
  /**
   * ISO datetime string when the license expires
   */
  expires: string;
  /**
   * Unique license ID (should match JWT payload)
   */
  license_id: string;
  /**
   * Pricing scheme ID used for this license (for cache validation)
   */
  pricing_scheme_id: string;
}

/**
 * Usage report event for a single request
 */
export interface UsageReportEvent {
  license_token: string;
  intent: string;
  tool_used: boolean; // true if tool service was used, false if raw payload returned
  success: boolean;
  failure_reason?: string;
  budget_before: number;
  cost_deducted: number; // zero if not successful
  budget_after: number;
  path: string;
}

/**
 * Usage report request, supports bulk reporting
 */
export interface UsageReportRequest {
  events: UsageReportEvent[];
}

/**
 * Usage report response
 */
export interface UsageReportResponse {
  success: boolean;
  processed: number; // number of events processed
  errors?: string[];
}

export interface ErrorResponse {
  error: string;
  message: string;
  update_payment_url?: string;
}
