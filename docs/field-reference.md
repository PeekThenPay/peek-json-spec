# peek.json Field Reference
## Complete Specification for AI Content Licensing

This document provides a complete field reference for the `peek.json` manifest format - the standard for AI content licensing with tool-based access control.

## Overview

The `peek.json` manifest enables publishers to define granular AI access policies through structured JSON, moving beyond simple binary controls to nuanced, value-based licensing.

## Root Object

- `version` (string) – Schema version (e.g. "1.0").
- `meta` (object) – Site metadata.
- `enforcement` (object) – Edge enforcement and bot detection settings.
- `license` (object) – License configuration and tool-based pricing rules.

## `meta`

- `site_name` (string) – Human-readable name of the specific website or publication (e.g., "TechNews Daily", "The New York Times").
- `publisher` (string) – Name of the company or organization that owns and publishes the site (e.g., "TechNews Corp", "The New York Times Company").
  - `domains` (array[string]) – List of domains and subdomains covered by this manifest. Use wildcards for subdomain patterns (e.g., "*.example.com" covers all subdomains).
  - Examples: 
    - `["example.com", "www.example.com"]` – Specific domains only
    - `["*.example.com"]` – All subdomains of example.com
    - `["example.com", "*.example.com", "example.org"]` – Mixed specific and wildcard patterns
- `categories` (array[string]) – High-level content types (e.g. "news", "reviews").
- `last_updated` (date) – Last update date (YYYY-MM-DD).

## `enforcement`

Edge enforcement settings for CDN/worker integration.

- `rate_limit_per_ip` (integer, default: 100) – Requests per hour allowed per IP address for unlicensed traffic.
- `grace_period_seconds` (integer, default: 300) – Grace period when license API is unavailable before applying failover mode.
- `failover_mode` (enum: "deny" | "allow" | "cache_only", default: "deny") – Behavior when license API is unavailable:
  - `"deny"` – Reject all requests (most secure)
  - `"allow"` – Permit all requests (most available)
  - `"cache_only"` – Serve only cached responses (balanced approach)
- `bypass_paths` (array[string]) – Paths that bypass license requirements (e.g., `["/robots.txt", "/sitemap.xml", "/.well-known/*"]`).

## `license`

- `license_issuer` (string/uri) – API endpoint to acquire a license and inspect remaining spend.
- `terms_url` (string/uri) – Link to legal terms and conditions for content licensing.
- `content_hints` (object) – Optional efficiency hints for AI systems.
  - `average_page_size_kb` (number) – Typical page size in kilobytes to help with quota planning.
  - `content_types` (array[string]) – Available content types (e.g., "text/html", "application/json").
  - `update_frequency` (string) – How often content changes ("hourly", "daily", "weekly").
  - `cache_duration` (number) – Suggested cache duration in seconds.
- `path_rules` (array[object]) – Optional path-specific overrides.
  - `path_pattern` (string) – Glob pattern for matching paths (e.g., "/premium/*", "/api/v1/*").
  - `pricing_multiplier` (number) – Multiply base tool prices by this factor for matching paths.
  - `tools` (object) – Override specific tool configurations for this path pattern.

### `global_pricing` (object) - Optional

Global pricing settings that apply to all tools unless overridden.

- `currency` (string, default: "USD") – Currency used for all pricing.
- `override_mechanism` (enum: "header", "402-response", "both") – Mechanism(s) by which a page may declare a price override from the tool's default pricing.
- `override_header_name` (string, default: "X-Peek-Page-Cost") – Header used by the server to signal an overridden per-page cost.

### `tools` (object) - Required

Pricing and licensing configuration for each supported tool. Each tool key can be one of the predefined tools or a custom tool name following the `custom_` prefix convention.

Predefined tool keys include:
- `peek_resource` – Short, free previews (typically trust-based)
- `quote_resource` – Small quoted excerpts (typically trust-based with attribution)
- `get_metadata` – Non-content metadata (typically service-controlled)
- `summarize_resource` – AI-generated summaries (trust-based OR service-controlled)
- `generate_embeddings` – Content vectorization (trust-based OR service-controlled)
- `rag_query` – Retrieval-augmented generation (trust-based OR service-controlled)
- `read_resource` – Complete content access (always trust-based, no transformation)
- `index_resource` – Search engine indexing (typically trust-based)
- `train_on_resource` – Model training data (typically trust-based with strict licensing)

Custom tools must follow the naming pattern `custom_[name]` (lowercase letters and underscores only).

### Enforcement Method Implications

**Trust (`"trust"`):**
- AI system receives raw content via direct HTTP access
- Publisher trusts AI system to use content only for declared intent
- Lower implementation cost for publishers (no tool service endpoints needed)
- Higher performance (direct content access)
- Example: Licensing content for summarization but letting AI system do the summarization

**Tool Required (`"tool_required"`):**
- AI system only receives processed content via tool service endpoints
- Publisher controls exactly what data is provided
- Higher implementation cost (tool service endpoints required)
- Publisher can ensure specific output formats/quality
- Example: Only providing pre-generated embeddings, not raw content

**Both (`"both"`, default):**
- AI system can choose either raw content or tool service endpoints
- Maximum flexibility for both parties
- Allows cost/performance optimization by AI systems
- Publishers can optionally provide tool service endpoints for convenience

#### Tool Configuration

Each tool object supports the following properties:

- `allowed` (boolean) – **Required.** Whether this tool is permitted for the content.
- `license_required` (boolean) – **Required.** Whether a license is required for this tool (default: true if pricing is specified).
- `enforcement_method` (enum, required) – How the publisher controls this tool's usage:
  - `"trust"` – Publisher provides raw content and trusts AI system to use it for declared intent.
  - `"tool_required"` – Publisher only provides processed content via tool-specific API.
  - `"both"` – AI system can choose either raw content access or tool API (default).
- `pricing` (object) – Pricing configuration for this specific tool.
  - `default_per_page` (number) – The default price (in specified currency) for any page accessed with this tool.
  - `max_per_page` (number) – Maximum allowable price for any single page with this tool, regardless of override.
  - `free_quota` (integer, minimum: 0) – Number of free page accesses allowed per month for this tool.
  - `volume_discounts` (array[object], optional) – Optional volume-based pricing tiers for this tool.
    - `min_requests` (integer) – Minimum requests per month for this tier.
    - `price_per_page` (number) – Discounted price per page at this volume.
  - `time_based_pricing` (object, optional) – Optional time-of-day pricing variations for this tool.
    - `peak_hours` (array[string]) – Hours with higher pricing (e.g., `["09:00-17:00"]`).
    - `peak_multiplier` (number) – Price multiplier during peak hours.
- `output_formats` (array[string]) – **Required.** Supported output formats for this tool. Values: `"plaintext"`, `"html"`, `"markdown"`, `"json"`, `"embeddings"`. Specifies the formats in which the tool can return results.
- `restrictions` (object) – Additional restrictions for this tool.
  - `rate_limit` (object) – Rate limiting configuration.
    - `requests_per_hour` (integer, minimum: 1) – Maximum requests per hour.
    - `requests_per_day` (integer, minimum: 1) – Maximum requests per day.
  - `attribution_required` (boolean) – Whether attribution is required when using content for this tool.
  - `commercial_use` (boolean) – Whether commercial use is permitted for this tool.
  - `geographic_restrictions` (array[string], optional) – ISO country codes where this tool is restricted (e.g., `["CN", "RU"]`).

## Example Structure

```json
{
  "version": "1.0",
  "meta": {
    "site_name": "Example Site",
    "publisher": "Example Publisher",
    "domains": ["example.com", "www.example.com"],
    "categories": ["news"],
    "last_updated": "2025-08-01"
  },
  "enforcement": {
    "rate_limit_per_ip": 100,
    "grace_period_seconds": 300,
    "failover_mode": "deny",
    "bypass_paths": ["/robots.txt", "/sitemap.xml"]
  },
  "license": {
    "license_issuer": "https://api.example.com/peek/license",
    "terms_url": "https://example.com/legal/ai-terms",
    "global_pricing": {
      "currency": "USD",
      "override_mechanism": "both",
      "override_header_name": "X-Peek-Page-Cost"
    },
    "tools": {
      "peek_resource": {
        "allowed": true,
        "enforcement_method": "trust",
        "license_required": false,
        "output_formats": ["plaintext", "html"]
      },
      "summarize_resource": {
        "allowed": true,
        "enforcement_method": "both",
        "pricing": {
          "default_per_page": 0.02,
          "max_per_page": 0.10
        },
        "license_required": true,
        "output_formats": ["markdown", "json"]
      }
    }
  }
}
```
