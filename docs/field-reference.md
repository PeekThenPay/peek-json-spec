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
- `domains` (array[string]) – List of domains and subdomains covered by this manifest. Use wildcards for subdomain patterns (e.g., "*.example.com" covers all subdomains of example.com).
  - Examples: 
    - `["example.com", "www.example.com"]` – Specific domains only
    - `["*.example.com"]` – All subdomains of example.com
    - `["example.com", "*.example.com", "example.org"]` – Mixed specific and wildcard patterns
- `categories` (array[string]) – High-level content types (e.g. "news", "reviews").
- `last_updated` (date) – Last update date (YYYY-MM-DD).

## `enforcement`

Edge enforcement settings designed for CDN/worker integration (e.g., peek-enforcer).

- `rate_limit_per_ip` (integer, default: 100) – Requests per hour allowed per IP address for unlicensed traffic. Helps prevent abuse while allowing some organic access.
- `grace_period_seconds` (integer, default: 300) – Grace period when license API is unavailable before applying failover mode. Provides stability during temporary outages.
- `failover_mode` (enum: "deny" | "allow" | "cache_only", default: "deny") – Behavior when license API is unavailable:
  - `"deny"` – Reject all requests (most secure)
  - `"allow"` – Permit all requests (most available)  
  - `"cache_only"` – Serve only cached responses (balanced approach)
- `bypass_paths` (array[string]) – Paths that bypass license requirements entirely. Useful for essential files.
  - Examples: `["/robots.txt", "/sitemap.xml", "/.well-known/*", "/favicon.ico", "/health"]`

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

#### Predefined Tool Keys

**Intent-based Access Control:**
- `peek_resource` – Short, free previews (typically trust-based)
- `quote_resource` – Small quoted excerpts (typically trust-based with attribution)
- `get_metadata` – Non-content metadata (typically service-controlled)
- `read_resource` – Complete content access (always trust-based, no transformation)

**Processing Intent Declarations:**
- `summarize_resource` – AI-generated summaries (trust-based OR service-controlled)
- `generate_embeddings` – Content vectorization (trust-based OR service-controlled) 
- `rag_query` – Retrieval-augmented generation (trust-based OR service-controlled)
- `index_resource` – Search engine indexing (typically trust-based)
- `train_on_resource` – Model training data (typically trust-based with strict licensing)

#### Custom Tool Names
Custom tools must follow the naming pattern `custom_[name]` where `[name]` consists of lowercase letters and underscores only. Examples:
- `custom_extract_citations` – Extract academic citations
- `custom_legal_analysis` – Legal document analysis
- `custom_sentiment_score` – Sentiment analysis scoring

This naming convention ensures clarity between standard tool names and publisher-specific extensions.

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
- `license_required` (boolean) – Whether a license is required for this tool (default: true if pricing is specified).
- `enforcement_method` (enum) – How the publisher controls this tool's usage:
  - `"trust"` – Publisher provides raw content and trusts AI system to use it for declared intent
  - `"tool_required"` – Publisher only provides processed content via tool-specific API
  - `"both"` – AI system can choose either raw content access or tool API (default)
- `service_endpoint` (string/uri) – API endpoint for this specific tool (required if enforcement_method includes "tool_required")
- `pricing` (object) – Pricing configuration for this specific tool.
  - `default_per_page` (number) – The default price (in specified currency) for any page accessed with this tool.
  - `max_per_page` (number) – Maximum allowable price for any single page with this tool, regardless of override.
  - `free_quota` (integer, minimum: 0) – Number of free page accesses allowed per month for this tool.
  - `volume_discounts` (array[object]) – Optional volume-based pricing tiers.
    - `min_requests` (integer) – Minimum requests per month for this tier.
    - `price_per_page` (number) – Discounted price per page at this volume.
  - `time_based_pricing` (object) – Optional time-of-day pricing variations.
    - `peak_hours` (array[string]) – Hours with higher pricing (e.g., ["09:00-17:00"]).
    - `peak_multiplier` (number) – Price multiplier during peak hours.
- `output_formats` (array[string]) – Supported output formats for this tool. Values: `"plaintext"`, `"html"`, `"markdown"`, `"json"`, `"embeddings"`.
- `restrictions` (object) – Additional restrictions for this tool.
  - `rate_limit` (object) – Rate limiting configuration.
    - `requests_per_hour` (integer, minimum: 1) – Maximum requests per hour.
    - `requests_per_day` (integer, minimum: 1) – Maximum requests per day.
    - `burst_limit` (integer) – Maximum requests in a short burst (e.g., per minute).
  - `attribution_required` (boolean) – Whether attribution is required when using content for this tool.
  - `commercial_use` (boolean) – Whether commercial use is permitted for this tool.
  - `geographic_restrictions` (array[string]) – ISO country codes where this tool is restricted (e.g., ["CN", "RU"]).
  - `batch_support` (object) – Support for bulk operations.
    - `max_batch_size` (integer) – Maximum number of URLs that can be processed in a single batch request.
    - `batch_endpoint` (string/uri) – Endpoint for batch processing requests.

## Example Structure

```json
{
  "version": "1.0",
  "meta": { ... },
  "license": {
    "license_issuer": "https://api.example.com/peek/license",
    "terms_url": "https://example.com/legal/ai-terms",
    "global_pricing": {
      "currency": "USD",
      "override_mechanism": "both"
    },
    "tools": {
      "peek_resource": {
        "allowed": true,
        "license_required": false
      },
      "summarize_resource": {
        "allowed": true,
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
