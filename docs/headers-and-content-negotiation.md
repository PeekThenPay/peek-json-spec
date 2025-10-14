# Headers and Content Negotiation

**NORMATIVE and RECOMMENDED specifications for HTTP headers and media types in Peek-Then-Pay**

---

## Overview

This document defines the canonical HTTP headers, media types, and content negotiation patterns for
Peek-Then-Pay implementations. These specifications ensure consistent behavior across publishers and
AI systems for content discovery, licensing verification, and forensic auditing.

---

## NORMATIVE: Media Types

### Core Media Types

| Media Type                        | Description                         | Usage Context                              |
| --------------------------------- | ----------------------------------- | ------------------------------------------ |
| `application/vnd.peek+json`       | Small preview/peek response content | Preview responses (HTTP 203)               |
| `application/vnd.peek-embed+json` | Vector embedding payloads           | Embed intent responses                     |
| `application/json`                | Standard JSON for other intents     | All other content transformation responses |

### Content Negotiation

Publishers MUST support content negotiation when the same URL can serve both human-readable (HTML)
and machine-readable (JSON) representations:

```http
GET /article HTTP/1.1
Accept: application/vnd.peek+json
```

**Response Requirements:**

- Include `Vary: Accept, Authorization` header when multiple representations exist
- Use appropriate media type based on Accept header and licensing context

---

## NORMATIVE: Standard Headers

### Required Headers

#### X-PTP-Payload-Digest

**Status**: NORMATIVE
**Usage**: All licensed content responses

```http
X-PTP-Payload-Digest: sha256:a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd
```

**Purpose**: Cryptographic integrity verification of response payload
**Format**: `sha256:<64-char-hex>` (case-insensitive)

#### X-PTP-Delivery

**Status**: NORMATIVE
**Usage**: All licensed content responses

```http
X-PTP-Delivery: eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJwdWJsaXNoZXJfaWQiOiIwMUhRMloiLCJsaWNlbnNlX2lkIjoiMDFIUTJaIiwicmVzb3VyY2VfaWQiOiJodHRwczovL2V4YW1wbGUuY29tL2FydGljbGUiLCJwYXlsb2FkX2RpZ2VzdCI6InNoYTI1NjphMWIyYzNkNCIsInByZXZpZXciOmZhbHNlLCJpc3N1ZWRfYXQiOiIyMDI1LTEwLTE0VDEyOjAwOjAwWiIsIm1vZGVsIjp7ImlkIjoiZ3B0LTQiLCJkaWdlc3QiOiJzaGEyNTY6bW9kZWwxMjM0In19.signature
```

**Purpose**: Forensic manifest for audit trails and compliance verification
**Format**: Compact JWS (JSON Web Signature)

#### X-Robots-Tag

**Status**: NORMATIVE
**Usage**: Preview responses and machine payloads (unless publisher opts out)

```http
X-Robots-Tag: noindex, noarchive
```

**Purpose**: Prevent indexing of preview content and machine-readable responses
**Default**: Required for all peek responses and full machine payloads unless publisher explicitly permits
indexing

### Recommended Headers

#### X-PTP-Preview-Size

**Status**: RECOMMENDED
**Usage**: Preview responses

```http
X-PTP-Preview-Size: 347
```

**Purpose**: Logging and monitoring of preview size compliance
**Format**: Integer (token count or character count as specified by publisher policy)

#### Vary

**Status**: NORMATIVE when applicable
**Usage**: When same URL serves multiple representations

```http
Vary: Accept, Authorization
```

**Purpose**: Indicates response varies based on Accept header and/or Authorization status

### Bot Guidance Headers (for Non-Auto-Peek Publishers)

#### X-PTP-License-Required

**Status**: RECOMMENDED
**Usage**: Responses to detected bots when auto-peek is disabled

```http
X-PTP-License-Required: true
```

**Purpose**: Signals to AI agents that licensing is available/recommended for this content

#### X-PTP-License-Endpoint

**Status**: RECOMMENDED
**Usage**: Responses to detected bots

```http
X-PTP-License-Endpoint: https://api.example.com/pricing?publisher_id=01HQ2Z3Y4K5M6N7P8Q9R0S1T1X
```

**Purpose**: Provides direct link to pricing discovery endpoint with publisher_id parameter included for convenience

#### X-PTP-Supported-Intents

**Status**: RECOMMENDED
**Usage**: Responses to detected bots

```http
X-PTP-Supported-Intents: read,summarize,embed,quote
```

**Purpose**: Advertises available content transformation intents
**Format**: Comma-separated list of
supported intent names

**Use Case**: Publishers who choose `allow_auto_peek: false` can still encourage responsible bot
behavior by including these headers when bot detection identifies AI agents. This provides licensing
guidance without automatically serving preview content.

### Machine-Readable Negotiation

The "negotiation object" for AI agents consists of machine-readable licensing and capability information provided through multiple channels:

#### Primary Negotiation Sources

1. **Peek Response Body** (HTTP 203/402/403 responses conforming to `ptp-peek.schema.json`):
   - `peekManifestUrl` field provides direct link to publisher's peek.json manifest
   - Contains structured preview data and licensing metadata
   - Available in responses with `application/vnd.peek+json` media type

2. **Bot Guidance Headers** (when auto-peek is disabled):
   - `X-PTP-License-Endpoint` - Direct link to pricing discovery with publisher_id
   - `X-PTP-License-Required` - Boolean signal that licensing is available
   - `X-PTP-Supported-Intents` - Comma-separated list of available content transformation intents

#### Negotiation Flow

AI agents can discover licensing information through:

```http
GET /article HTTP/1.1
Accept: application/vnd.peek+json

# Response contains negotiation object via:
# 1. Response body with peekManifestUrl
# 2. Bot guidance headers (if applicable)
# 3. Standard manifest discovery at /.well-known/peek.json
```

**Purpose**: Provides multiple redundant paths for AI agents to discover licensing capabilities and pricing information, ensuring robust negotiation even when auto-peek policies vary across publishers.

---

## NORMATIVE: Link Relations

## NORMATIVE: Manifest Discovery

### Canonical Manifest Location

Publishers MUST serve their peek.json manifest at the canonical location:

```
/.well-known/peek.json
```

**Alternative locations**: Publishers MAY declare alternate manifest locations in robots metadata,
but the canonical `.well-known` location remains the primary discovery mechanism.

### HTML Link Relations

Publishers SHOULD include manifest discovery links in HTML responses:

```html
<link rel="peek-manifest" href="/.well-known/peek.json" type="application/json" />
```

**Purpose**: Enables discovery of peek.json manifest from any page on the site for AI agents that
encounter HTML content before finding the canonical manifest location.

**Compliance Requirement**: The `/.well-known/peek.json` location MUST be available and return valid
manifest content regardless of whether HTML link relations are provided.

---

## NORMATIVE: Preview Response Constraints

Any preview/peek response returned under this specification MUST comply with the following
constraints:

### Content Fidelity

- **Faithful excerpt**: MUST be representative content from the actual resource (no
  alternate/SEO-only text)
- **Content integrity**: MUST reflect the actual substance and context of the source material

### Size Limits

- **Token limits**: MUST NOT exceed `max_preview_length` (default: 1000) when
  `preview_unit == "tokens"`
- **Character limits**: MUST NOT exceed equivalent character limit when `preview_unit == "chars"`

### Required Headers

- **Indexing control**: MUST include `X-Robots-Tag: noindex, noarchive` unless publisher explicitly
  permits indexing
- **Content negotiation**: MUST include `Vary: Accept, Authorization` when same URL can serve both
  machine and HTML forms

### Response Format

- **Preview identification**: Response body MUST include `"type": "peek"` field to identify as
  preview content
- **Media type**: MUST use `application/vnd.peek+json` for structured preview responses

**Rationale**: Creates shared minimum standards to prevent abuse, cloaking, and ensure transparent
preview behavior across implementations.

---

## Forensic Manifest Schema

The `X-PTP-Delivery` header contains a compact JWS with the following payload structure:

```typescript
{
  "publisher_id": string,      // Publisher identifier (ULID format)
  "license_id": string | null, // License identifier (null for public preview)
  "resource_url": string,       // Canonical resource URL
  "payload_digest": string,    // sha256:<hex> matching X-PTP-Payload-Digest
  "preview": boolean,          // true for preview content, false for full content
  "issued_at": string,         // ISO 8601 datetime
  "content_ttl_seconds": number, // Content freshness TTL in seconds
  "model": {                   // Processing model info (for tool_required enforcement)
    "id": string,              // Model identifier
    "digest": string           // Model version digest
  }
}
```

**Purpose**: Standardizes audit format for comparable compliance verification across
implementations.

### Content TTL Field

The `content_ttl_seconds` field serves multiple critical purposes:

#### Cache Management

- **Edge caching**: Instructs enforcers and CDNs how long to cache this specific response
- **Client guidance**: Tells AI agents when they should refresh their copy of this content
- **Invalidation signals**: Provides automated cache expiration based on content-specific freshness
  requirements

#### Content-Aware Freshness

- **Dynamic content**: News articles might have `content_ttl_seconds: 300` (5 minutes)
- **Semi-static content**: Blog posts might have `content_ttl_seconds: 3600` (1 hour)
- **Evergreen content**: Reference docs might have `content_ttl_seconds: 86400` (24 hours)
- **Preview content**: Often shorter TTL (e.g., 300 seconds) to encourage license acquisition

#### Compliance & Auditing

- **License validity**: Indicates how long this specific licensing grant remains valid for this
  content version
- **Audit retention**: Signals how long audit logs should retain this transaction record
- **Legal compliance**: Supports time-bounded content access requirements in various jurisdictions

**Implementation Note**: The TTL is content-specific and may differ from general caching policies.
Publishers should set TTL based on content update frequency, licensing terms, and business
requirements.

---

## Implementation Examples

### Preview Response

```http
HTTP/1.1 203 Non-Authoritative Information
Content-Type: application/vnd.peek+json
X-Robots-Tag: noindex, noarchive
X-PTP-Payload-Digest: sha256:preview123...
X-PTP-Delivery: eyJhbGc...
X-PTP-Preview-Size: 347
Vary: Accept, Authorization

{
  "type": "peek",
  "canonicalUrl": "https://example.com/article",
  "title": "AI Content Licensing Guide",
  "snippet": "This article explores new models for AI content licensing and fair compensation frameworks for publishers in the age of artificial intelligence.",
  "language": "en-US",
  "contentType": "article",
  "mediaType": "text/html",
  "signals": {
    "tokenCountEstimate": 2847
  },
  "tags": ["ai-licensing", "content-policy", "publishing"],
  "peekManifestUrl": "https://example.com/.well-known/peek.json"
}
```

### Full Licensed Content Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-PTP-Payload-Digest: sha256:full123...
X-PTP-Delivery: eyJhbGc...
X-Robots-Tag: noindex, noarchive
Vary: Accept, Authorization

{
  "content": "Full article content here...",
  "metadata": {
    "canonicalUrl": "https://example.com/article",
    "title": "AI Content Licensing Guide",
    "author": "Jane Smith",
    "publishedDate": "2025-10-14T10:00:00Z"
  }
}
```

---

## Related Documentation

- [Peek Manifest Fields](peek-manifest-fields.md) – Complete manifest field reference including
  auto_peek_policy
- [Normative Intent Definitions](normative-intent-definitions.md) – Intent categories and response
  formats
- [License API](license-api.md) – License acquisition and validation
- [Recommended Edge Enforcement Guide](recommended-edge-enforcement-guide.md) – Implementation
  patterns

---

_This document contains both normative requirements (MUST) and recommended practices (SHOULD) for
interoperability and compliance._
