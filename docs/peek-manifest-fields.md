# peek.json Field Reference

## Reference for peek.schema.json (AI Content Licensing Manifest)

> **📋 Document Status**: This document provides **NORMATIVE** field definitions for the peek.json
> manifest format. All field specifications are binding requirements for compliance with the
> peek.schema.json schema.

This document is the authoritative field reference for the `peek.json` manifest format, as defined
by the `peek.schema.json`. It does not cover additional schemas (e.g., pricing schema, license API,
intent schemas). For comprehensive information about usage contexts and intent-based permissions,
see the [Usage Context Guide](usage-context-guide.md) and
[Normative Intent Definitions](normative-intent-definitions.md).

## Overview

The `peek.json` manifest enables publishers to declare AI access policies for their content in a
structured, machine-readable format. The manifest works in conjunction with the usage-based pricing
system and intent-specific permissions to provide fine-grained control over content access. This
reference describes all fields supported by the current schema.

## Root Object

- `version` (string) – Schema version (e.g. "1.0").
- `meta` (object) – Site metadata.
- `enforcement` (object) – Edge enforcement and bot detection settings.
- `license` (object) – License configuration and API endpoints.

## `meta`

- `site_name` (string) – Human-readable name of the website or publication (e.g., "TechNews Daily").
- `publisher` (string) – Name of the company or organization that owns and publishes the site.
- `publisher_id` (string) – Globally unique identifier for the publisher on the license server.
- `domains` (array[string]) – List of domains and subdomains covered by this manifest. Wildcards
  supported (e.g., "\*.example.com").
- `categories` (array[string]) – High-level content types (e.g. "news", "reviews").
- `last_updated` (date) – Last update date (YYYY-MM-DD).

## `enforcement`

Edge enforcement settings for CDN/worker integration.

- `rate_limit_per_ip` (integer, default: 100) – Requests per hour allowed per IP address for
  unlicensed traffic.
- `grace_period_seconds` (integer, default: 300) – Grace period when license API is unavailable
  before applying failover mode.
- `failover_mode` (enum: "deny" | "allow" | "cache_only", default: "deny") – Behavior when license
  API is unavailable:
  - "deny" – Reject all requests (most secure)
  - "allow" – Permit all requests (most available)
  - "cache_only" – Serve only cached responses (balanced approach)
- `bypass_paths` (array[string]) – Paths that bypass license requirements (e.g., ["/robots.txt",
  "/sitemap.xml", "/.well-known/*"]).

## `license`

- `license_issuer` (string/uri) – API endpoint to acquire a license with intent-usage permissions
  and inspect remaining spend.
- `terms_url` (string/uri) – Link to legal terms and conditions for content licensing.
- `content_hints` (object, optional) – Efficiency hints for AI systems:
  - `average_page_size_kb` (number) – Typical page size in kilobytes to help with quota planning.
  - `content_types` (array[string]) – Available content types (e.g., "text/html",
    "application/json").
  - `update_frequency` (string) – How often content changes ("hourly", "daily", "weekly",
    "monthly").
  - `cache_duration` (number) – Suggested cache duration in seconds for immediate usage context.

## Example Structure

```json
{
  "version": "1.0",
  "meta": {
    "site_name": "TechNews Daily",
    "publisher": "TechNews Corp",
    "publisher_id": "technews.com",
    "domains": ["technews.com", "www.technews.com", "blog.technews.com"],
    "categories": ["technology", "news", "reviews"],
    "last_updated": "2025-08-01"
  },
  "enforcement": {
    "rate_limit_per_ip": 50,
    "grace_period_seconds": 300,
    "failover_mode": "deny",
    "bypass_paths": ["/robots.txt", "/sitemap.xml", "/.well-known/*", "/favicon.ico"]
  },
  "license": {
    "license_issuer": "https://api.technews.com/peek/license",
    "terms_url": "https://technews.com/legal/ai-terms",
    "content_hints": {
      "average_page_size_kb": 45,
      "content_types": ["text/html", "application/json"],
      "update_frequency": "daily",
      "cache_duration": 3600
    }
  }
}
```

---

## Related Documentation

- [Usage Context Guide](usage-context-guide.md) – Comprehensive guide to usage types and pricing
- [Normative Intent Definitions](normative-intent-definitions.md) – Standard intent categories and
  parameters
- [License API](license-api.md) – License request/response specifications
- [Tool Service API](tool-service-api.md) – Content transformation API

---

_This document is the reference for the peek.json manifest only. For pricing schemas, license API,
and intent specifications, see their respective documentation._
