/**
 * TypeScript interfaces for peek.json manifest - the AI Content Licensing Manifest format
 */
export interface PeekManifest {
  /** Schema version (e.g., "1.0") */
  version: string;

  /** Site metadata */
  meta: {
    /** Human-readable name of the website or publication */
    site_name: string;
    /** Name of the company or organization that owns and publishes the site */
    publisher: string;
    /** Globally unique identifier for the publisher on the license server */
    publisher_id: string;
    /** List of domains and subdomains covered by this manifest. Wildcards supported (e.g., "*.example.com") */
    domains: string[];
    /** High-level content types (e.g., "news", "reviews") */
    categories: string[];
    /** Last update date in ISO format (YYYY-MM-DD) */
    last_updated: string;
  };

  /** Edge enforcement settings for CDN/worker integration */
  enforcement: {
    /** Requests per hour allowed per IP address for unlicensed traffic. Default: 100 */
    rate_limit_per_ip?: number;
    /** Grace period in seconds when license API is unavailable before applying failover mode. Default: 300 */
    grace_period_seconds?: number;
    /**
     * Behavior when license API is unavailable:
     * - "deny" – Reject all requests (most secure)
     * - "allow" – Permit all requests (most available)
     * - "cache_only" – Serve only cached responses (balanced approach)
     */
    failover_mode: 'deny' | 'allow' | 'cache_only';
    /** Paths that bypass license requirements (e.g., ["/robots.txt", "/sitemap.xml", "/.well-known/*"]) */
    bypass_paths?: string[];
  };

  /** License configuration and API endpoints */
  license: {
    /** API endpoint to acquire a license and inspect remaining spend */
    license_issuer: string;
    /** Link to legal terms and conditions for content licensing */
    terms_url?: string;
  };

  /** Efficiency hints for AI systems */
  content_hints?: {
    /** Typical page size in kilobytes to help with quota planning */
    average_page_size_kb?: number;
    /** Available content types (e.g., "text/html", "application/json") */
    content_types?: string[];
    /** How often content changes ("hourly", "daily", "weekly", "monthly") */
    update_frequency?: string;
    /** Suggested cache duration in seconds */
    cache_duration?: number;
  };
}
