// TypeScript interfaces for peek.json manifest

export interface PeekManifest {
  version: string;
  meta: {
    site_name: string;
    publisher: string;
    publisher_id: string;
    domains: string[];
    categories: string[];
    last_updated: string; // ISO date string
  };
  enforcement: {
    rate_limit_per_ip?: number;
    grace_period_seconds?: number;
    failover_mode: 'deny' | 'allow' | 'cache_only';
    bypass_paths?: string[];
  };
  license: {
    license_issuer: string;
    terms_url?: string;
  };
  content_hints?: {
    average_page_size_kb?: number;
    content_types?: string[];
    update_frequency?: string;
    cache_duration?: number;
  };
}
