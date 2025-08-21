/**
 * Configuration for a single tool service endpoint.
 * Used by edge enforcers to route and authenticate requests to internal or SaaS tool services.
 */
export interface ToolConfig {
  /** Provider type: internal (publisher-hosted) or SaaS (external) */
  provider: 'internal' | 'saas';
  /** Base URL for the tool service endpoint */
  baseUrl: string;
  /** Authentication configuration for the service */
  auth: {
    /** Auth type: bearer token, API key, or mutual TLS */
    type: 'bearer' | 'api-key' | 'mutual-tls';
    /** Credentials for authentication (token, key, or certs) */
    credentials: string | Record<string, string>;
  };
  /** Path to invoke for the tool service */
  path: string;
  /** HTTP method to use for requests */
  method: 'GET' | 'POST' | 'PUT';
  /** Optional request timeout in milliseconds */
  timeout?: number;
  /** Supported output formats (e.g., 'json', 'markdown') */
  supportedOutputFormats: string[];
  /** Optional logging configuration */
  logging?: {
    enabled: boolean;
    logLevel: 'info' | 'warn' | 'error' | 'debug';
  };
  /** Optional metrics configuration */
  metrics?: {
    enabled: boolean;
    endpoint?: string;
  };
  /** Optional error handling configuration */
  errorHandling?: {
    retryOnFailure: boolean;
    maxRetries?: number;
    backoffMs?: number;
  };
}

/**
 * Configuration for all tool services available to the enforcer.
 * Contains per-tool configs and optional circuit breaker settings.
 */
export interface ToolServiceConfig {
  /** Map of tool name to configuration */
  tools: Record<string, ToolConfig>;
  /** Optional circuit breaker configuration for service reliability */
  circuitBreaker?: {
    failureThreshold: number;
    recoveryTimeMs: number;
  };
}

/**
 * Response from a tool service invocation.
 * Used by edge enforcers to process results and diagnostics.
 */
export interface ToolServiceResponse {
  /** HTTP status code from the tool service */
  statusCode: number;
  /** Response headers from the tool service */
  headers: Record<string, string>;
  /** Optional response body (processed content) */
  body?: string;
  /** Optional logs for debugging or audit */
  logs?: string[];
  /** Optional metrics for performance monitoring */
  metrics?: Record<string, number>;
  /** Optional error details if the request failed */
  error?: string;
}

/**
 * Interface for edge enforcer clients to invoke tool services and check health.
 */
export interface ToolServiceClient {
  /**
   * Execute a tool request against internal or SaaS services.
   * Usage: edge worker calls this to transform content as required by enforcement.
   */
  executeToolRequest(
    toolName: string,
    request: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
    }
  ): Promise<ToolServiceResponse>;

  /**
   * Check if a tool service is healthy and ready to process requests.
   */
  healthCheck(toolName: string): Promise<boolean>;
}
