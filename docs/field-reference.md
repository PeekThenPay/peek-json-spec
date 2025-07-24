# Field Reference for `peek.json`
## MCP Server Configuration for AI Content Licensing

This document provides a complete field reference for the `peek.json` manifest format, which serves as the natural evolution of the robots.txt standard for MCP-compatible AI content licensing.

### Historical Context: robots.txt → peek.json

| Aspect | robots.txt (1994-2025) | peek.json (2025+) |
|--------|------------------------|-------------------|
| **Location** | `/robots.txt` | `/.well-known/peek.json` |
| **Format** | Plain text | Structured JSON |
| **Control** | Binary allow/disallow | Tool-based permissions |
| **Granularity** | Path-based | Tool + content-type based |
| **Monetization** | None | Fair pricing per use case |
| **Enforcement** | Honor system | Technical + economic |

### robots.txt Limitations Addressed

**robots.txt**: `User-agent: GPTBot\nDisallow: /` 
*→ "Go away, no nuance"*

**peek.json**: Nuanced engagement with fair compensation
```json
{
  "tools": {
    "peek_resource": {"allowed": true, "license_required": false},
    "quote_resource": {"allowed": true, "restrictions": {"attribution_required": true}},
    "summarize_resource": {"allowed": true, "pricing": {"default_per_page": 0.02}},
    "train_on_resource": {"allowed": false}
  }
}
```

## Root Object

- `version` (string) – Schema version (e.g. "1.0").
- `meta` (object) – Site metadata.
- `license` (object) – License configuration and tool-based pricing rules.

## `meta`

- `site_name` (string) – Human-readable name of the site.
- `publisher` (string) – Name of the publishing organization.
- `categories` (array[string]) – High-level content types (e.g. "news", "reviews").
- `last_updated` (date) – Last update date (YYYY-MM-DD).

## `license`

- `license_issuer` (string/uri) – API endpoint to acquire a license and inspect remaining spend.
- `transform_api` (string/uri) – Base endpoint for content transformation services that provides standardized output for each tool.
- `terms_url` (string/uri) – Link to legal terms and conditions for content licensing.

### `global_pricing` (object) - Optional

Global pricing settings that apply to all tools unless overridden.

- `currency` (string, default: "USD") – Currency used for all pricing.
- `override_mechanism` (enum: "header", "402-response", "both") – Mechanism(s) by which a page may declare a price override from the tool's default pricing.
- `override_header_name` (string, default: "X-Peek-Page-Cost") – Header used by the server to signal an overridden per-page cost.

### `tools` (object) - Required

Pricing and licensing configuration for each supported MCP tool. Each tool key can be one of the predefined tools or a custom tool name following the `custom_` prefix convention.

#### Predefined Tool Keys
- `peek_resource` – Short, free previews
- `quote_resource` – Small quoted excerpts  
- `get_metadata` – Non-content metadata
- `summarize_resource` – AI-generated summaries
- `generate_embeddings` – Content vectorization
- `rag_query` – Retrieval-augmented generation
- `full_access` – Complete document access
- `index_resource` – Search engine indexing
- `train_on_resource` – Model training data

#### Custom Tool Names
Custom tools must follow the naming pattern `custom_[name]` where `[name]` consists of lowercase letters and underscores only. Examples:
- `custom_extract_citations` – Extract academic citations
- `custom_legal_analysis` – Legal document analysis
- `custom_sentiment_score` – Sentiment analysis scoring

This naming convention ensures clarity between standard MCP tools and publisher-specific extensions.

#### Tool Configuration

Each tool object supports the following properties:

- `allowed` (boolean) – **Required.** Whether this tool is permitted for the content.
- `license_required` (boolean) – Whether a license is required for this tool (default: true if pricing is specified).
- `pricing` (object) – Pricing configuration for this specific tool.
  - `default_per_page` (number) – The default price (in specified currency) for any page accessed with this tool.
  - `max_per_page` (number) – Maximum allowable price for any single page with this tool, regardless of override.
  - `free_quota` (integer, minimum: 0) – Number of free page accesses allowed per month for this tool.
- `output_formats` (array[string]) – Supported output formats for this tool. Values: `"plaintext"`, `"html"`, `"markdown"`, `"json"`, `"embeddings"`.
- `transform_service` (string/uri) – Optional endpoint for content transformation specific to this tool (deprecated - use global `transform_api` instead).
- `restrictions` (object) – Additional restrictions for this tool.
  - `rate_limit` (object) – Rate limiting configuration.
    - `requests_per_hour` (integer, minimum: 1) – Maximum requests per hour.
    - `requests_per_day` (integer, minimum: 1) – Maximum requests per day.
  - `attribution_required` (boolean) – Whether attribution is required when using content for this tool.
  - `commercial_use` (boolean) – Whether commercial use is permitted for this tool.

## Example Structure

```json
{
  "version": "1.0",
  "meta": { ... },
  "license": {
    "license_issuer": "https://api.example.com/peek/license",
    "transform_api": "https://api.example.com/peek/transform",
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
