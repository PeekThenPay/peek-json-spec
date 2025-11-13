# Normative Intent Definitions for Peek-Then-Pay

## Overview

Normative intent definitions provide standardized categories that define how AI systems can interact
with content within the Peek-Then-Pay ecosystem. These definitions establish clear permissions,
persistence rights, and pricing signals for different use cases, creating a common vocabulary
between publishers and AI operators.

These intents describe what type of transformation or access an AI system is requesting, not the underlying licensing relationship. Pricing determines which intents are permitted under licensing terms; intents define the action being performed.

By standardizing intent categories, we enable:

- **Clear Communication**: Publishers can express precise terms for different types of access
- **Consistent Pricing**: Different intents can carry different pricing implications
- **Legal Clarity**: Well-defined categories reduce ambiguity in licensing agreements
- **Ecosystem Interoperability**: Standard intents work across different publishers and operators

---

## Specification Compliance

This document contains both **NORMATIVE** requirements and **INFORMATIVE** guidelines. The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY",
and "OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119.html).

### Normative vs. Informative Content

If an implementation claims conformance with this specification, it MUST implement all NORMATIVE requirements in this document.

| Content Type    | RFC 2119 Keywords                          | Compliance                       | Section Marking    |
| --------------- | ------------------------------------------ | -------------------------------- | ------------------ |
| **NORMATIVE**   | MUST, MUST NOT, SHALL, SHALL NOT, REQUIRED | Mandatory for compliance         | `## NORMATIVE:`    |
| **RECOMMENDED** | SHOULD, SHOULD NOT, RECOMMENDED            | Optional but strongly encouraged | `### RECOMMENDED:` |
| **INFORMATIVE** | MAY, OPTIONAL, or descriptive text         | Guidance only, not binding       | `## INFORMATIVE:`  |

**Implementation Requirements:**

- **NORMATIVE** sections contain mandatory requirements that implementors MUST follow for
  specification compliance
- **RECOMMENDED** sections contain best practices that implementors SHOULD follow for ecosystem
  consistency
- **INFORMATIVE** sections provide examples, explanations, and design rationale that are helpful but
  not binding

---

## NORMATIVE: Intent Categories

**This section contains normative requirements for intent classification and behavior.**

The following table defines **content transformation intents** - the core operations for processing
and extracting information from publisher content. Implementations MUST support these intent
categories as defined. **Search** and **Rag Ingest** are optional features covered separately with
their own normative requirements.

| Intent        | Description                                                                  | Default Persistence                              | Default Pricing Mode             | Notes                                                                |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------- |
| **peek**      | Title, canonical URL, brief snippet/metadata                                 | transient (metadata cache OK)                    | per_request (very low / free)    | For discovery only. No reconstruction via bulk peek.                 |
| **read**      | Canonical full content (optionally cleaned)                                  | transient / ttl (no durable storage)             | per_1000_tokens (low rate)       | Scales with length; not priced per request by default.               |
| **summarize** | Abstractive/extractive summary (short/med/long)                              | derived_ttl                                      | per_1000_tokens (medium)         | Attribution required when surfaced.                                  |
| **quote**     | Verbatim snippets with citation (publisher caps e.g., ≤300–500 chars/req)    | limited verbatim retention (policy-bound)        | per_request (or per-snippet)     | Strict attribution; anti-reconstruction guardrails.                  |
| **embed**     | Numeric vectors per chunk (e.g., 768–1536–3072 dims)                         | durable_within_scope (redistribution restricted) | per_1000_tokens (industry norm)  | Bill on tokens_in; track bytes_out separately.                       |
| **translate** | Parallel text (source → target)                                              | derived_ttl (durable if licensed)                | per_1000_tokens (med→high)       | Style/brand rules may apply; attribution when public.                |
| **analyze**   | Structured annotations (sentiment, entities, topics, readability, PII, etc.) | derived_ttl                                      | per_request (bundle)             | Include spans + confidence; can combine multiple analyses.           |
| **chunk**     | Small, relevance-ranked spans from a single resource with offsets            | derived_ttl (short-lived, non-reconstructive)    | per_request (or per_1000_tokens) | RAG grounding, semantic evidence retrieval, citation-first reasoning |
| **qa**        | Retrieval-augmented answers to supplied questions (with citations)           | transient                                        | per_1000_tokens (input + output) | qa ≠ search; it synthesizes language. Auto-QA is optional extension. |

**search** identifies which resources are relevant across a corpus. **chunk** identifies which parts of a specific resource are relevant. **qa** optionally synthesizes answers, but **chunk** is the foundational evidence retrieval primitive.

Persistence categories:

- transient — may not be stored beyond immediate use
- session — cached within a single interaction
- derived_ttl — derived content allowed for temporary storage
- durable_within_scope — can be stored long-term within the licensing scope

## NORMATIVE: Preview (Peek) Response Requirements

**This section contains normative requirements for preview/peek responses.**

Any preview or peek response returned under this specification MUST comply with the following
constraints to ensure transparency and prevent abuse:

### Content Fidelity Requirements

- **Faithful excerpt**: MUST be a representative excerpt from the actual resource content (no
  alternate/SEO-only text or misleading substitutions)
- **Content integrity**: MUST accurately reflect the substance, tone, and context of the source
  material

### Size and Format Requirements

- **Token limits**: MUST NOT exceed `max_preview_length` (default: 1000 tokens) when
  `preview_unit == "tokens"`
- **Character limits**: MUST NOT exceed equivalent limits when `preview_unit == "chars"`
- **Preview identification**: Response body MUST include `"type": "peek"` field to identify content
  as preview

  These bounds prevent preview responses from being used to reconstruct substantial parts of the source content.

### Required HTTP Headers

- **Indexing control**: MUST include `X-Robots-Tag: noindex, noarchive` unless publisher explicitly
  permits indexing in manifest
- **Content negotiation**: MUST include `Vary: Accept, Authorization` when same URL can serve both
  machine and HTML representations
- **Media type**: SHOULD use `application/vnd.peek+json` for structured preview responses

**Rationale**: These requirements create shared minimum standards to prevent content cloaking,
ensure transparent preview behavior, and enable comparable implementations across the ecosystem.

### INFORMATIVE: Key Design Principles

**This section provides informative guidance about the design rationale behind intent categories.**

These intent definitions follow several important principles:

- **Search as Discovery Feature**: `search` is an optional discovery service separate from content
  transformation intents, providing query access to publisher indexes via dedicated endpoints
- **Synthetic Content Persistence**: `qa` outputs are generated answers; default persistence is
  transient to prevent silent corpus duplication
- **Length-Based Pricing**: `read` scales with content length, making per_1000_tokens the natural
  default rather than per-request pricing
- **Scoped Durability**: `embed` allows durable storage within defined scope/TTL, not indefinite
  retention in all cases
- **Approval Gates**: Extension features like `rag_ingest` require explicit approval and hybrid
  pricing (compute + storage costs)
- **Usage Context**: Content access is classified by intended use (`train`, `session`, `immediate`)
  which determines retention policies and licensing terms

---

## NORMATIVE: Usage Context Parameter

**This section contains normative requirements for usage context implementation.**

All content access requests MUST include a usage context parameter that declares the intended use
and determines retention policies and licensing terms.

For detailed information about usage contexts, pricing implications, and implementation guidance,
see the [Usage Context Guide](usage-context-guide.md).

### Usage Types

| Usage Type    | Description                                          | Retention Policy                    | Licensing Requirements                    |
| ------------- | ---------------------------------------------------- | ----------------------------------- | ----------------------------------------- |
| **immediate** | One-shot access with no retention                    | Transient use only                  | Standard intent pricing                   |
| **session**   | Ephemeral caching for multi-turn interactions        | Session-scoped retention allowed    | Session-based licensing, limited duration |
| **index**     | Persistent retrieval indexes for search systems      | Long-term index retention allowed   | Index licensing, medium-term contracts    |
| **train**     | Permanent model incorporation for fine-tuning        | Persistent retention allowed        | Training licenses, highest cost tier      |
| **distill**   | Synthetic data generation for knowledge distillation | Semi-permanent derivative retention | Distillation licenses, high cost tier     |
| **audit**     | Compliance and provenance verification               | Temporary compliance retention      | Audit licensing, often subsidized         |

### Implementation

The usage context is specified via the `X-PTP-Usage` header and affects:

- **Pricing**: Different usage types have different cost multipliers (immediate=1x, train=100-1000x)
- **Retention**: What the client is permitted to do with the received content and for how long
- **Licensing**: Additional terms, contracts, and restrictions that may apply
- **Audit**: Tracking and compliance requirements for different usage contexts

Publishers MAY restrict certain intents to specific usage contexts or apply different pricing based
on declared usage.

---

## NORMATIVE: Search Discovery Feature (Optional)

**This section contains normative requirements for publishers implementing optional search
features.**

Search is an **optional discovery feature** that publishers MAY choose to provide to enable content
discovery across their catalog. When implemented, publishers MUST follow these normative
requirements: Unlike the core content transformation intents, search is not called via the standard
intent mechanism (on a per-URL request) but through a dedicated search endpoint specified in the
publisher's pricing configuration.

Search returns ranked matches against a publisher-controlled index (keyword, semantic, or hybrid),
with snippets, highlights, and filters so agents can quickly identify relevant content for
subsequent intent operations (read, quote, embed, etc.). Search provides non-contentful retrieval:
small, metadata-heavy results that are safe to cache and cheap to evaluate.

### Publisher Implementation

Publishers that choose to offer search capabilities MUST:

1. Specify a `search.endpoint_url` in their pricing configuration
2. Set a `search.price_cents` per-request cost
3. Implement the search endpoint according to this specification

### Client Usage

Clients discover search availability through the publisher's pricing manifest and call the search
endpoint directly. Search results provide canonical URLs that can then be used with standard content
transformation intents.

### Normative Definition

When implemented, the search endpoint SHALL return an ordered list of results relevant to the
provided query and constraints, without delivering reconstructive content. Each result MUST include
a canonical URL and a relevance score; when snippets are returned, they SHALL be short,
non-reconstructive extracts with optional highlight spans. The response MUST disclose the retrieval
mode (keyword, vector, hybrid), the scoring function (at least by name/id), and any filters or
boosts applied.

Search responses are cacheable subject to publisher policy and MAY include facets to support
client-side refinement. When a requested retrieval mode is unavailable, the server SHALL fall back
to a supported mode and record this in diagnostics. Non-text resources MAY appear as hits but MUST
NOT include inline content; clients SHOULD use follow-up intents (read, quote, embed, etc.) for
content or vectors.

### Schema

**Schema**: [`ptp-search.schema.json`](../schema/intents/ptp-search.schema.json)

### Endpoint Discovery

The search endpoint URL is found in the publisher's pricing configuration at `search.endpoint_url`.
Clients should make HTTP requests to this endpoint with search parameters.

### Request Parameters

| param              | header                | type    | required | value                                                                           |
| ------------------ | --------------------- | ------- | -------- | ------------------------------------------------------------------------------- |
| q                  | X-PTP-Query           | string  | false    | User/agent query (natural language or keyword)                                  |
| embedding          | X-PTP-Embedding       | array   | false    | Client-provided embedding vector (requires embedding_model_id)                  |
| embedding_model_id | X-PTP-Embedding-Model | string  | false    | Model identifier for provided embedding (required if embedding present)         |
| mode               | X-PTP-Mode            | string  | true     | Retrieval strategy: "keyword", "vector", "hybrid"                               |
| top_k              | X-PTP-Top-K           | number  | false    | Number of results to return (1–100). (Default=10)                               |
| snippet_len        | X-PTP-Snippet-Length  | number  | false    | Target snippet length for each hit (50–400). (Default=160)                      |
| highlight          | X-PTP-Highlight       | boolean | false    | Include highlighted query matches. (Default=true)                               |
| time_range         | X-PTP-Time-Range      | string  | false    | Filter by publication/update window (ISO 8601 interval, e.g., "2024-01-01/.."). |

**Request Field Requirements:**

- A request MAY omit `q` and `embedding` if `mode="keyword"` (uses default corpus ranking)
- A request MUST provide `embedding` if `mode="vector"`
- A request SHOULD provide both `q` and `embedding` if `mode="hybrid"`
- If `embedding` is provided, `embedding_model_id` is REQUIRED
- The server MUST validate `embedding_model_id` against supported models declared in the PricingScheme
- If the embedding model is not supported, the server MUST either reject with HTTP 422 `UNSUPPORTED_EMBEDDING_MODEL` or fall back to keyword mode if allowed

**Note:** Unlike content transformation intents, search does NOT use the `ptp_intent` parameter
since it's called via a dedicated endpoint.

### Response Example

```json
{
  "query": "machine learning neural networks",
  "mode": "hybrid",
  "scoringId": "bm25_semantic_v2",
  "results": [
    {
      "rank": 1,
      "score": 0.92,
      "canonicalUrl": "https://example.com/articles/neural-network-fundamentals",
      "contentType": "article",
      "mediaType": "text/html"
    },
    {
      "rank": 2,
      "score": 0.87,
      "canonicalUrl": "https://research.example.com/papers/deep-learning-overview.pdf",
      "contentType": "doc",
      "mediaType": "application/pdf"
    },
    {
      "rank": 3,
      "score": 0.81,
      "canonicalUrl": "https://blog.example.com/ml-getting-started",
      "contentType": "blog",
      "mediaType": "text/html"
    }
  ]
}
```

---

## NORMATIVE: RAG Ingest Feature (Optional)

**This section contains normative requirements for publishers implementing optional RAG ingest
features.**

The rag_ingest endpoint provides a publisher-authorized export of retrieval-ready data — text
chunks, embeddings, and metadata — for long-term indexing and use in retrieval-augmented generation
(RAG) systems. When implemented, publishers MUST follow these normative requirements: Unlike the
embed intent, which returns vectors for a single document in real time, rag_ingest operates as a
batch export service over one or more resources or collections.

It's designed for persistent ingestion rather than transient analysis: publishers pre-process,
normalize, and embed their own content, then deliver a manifest pointing to the dataset's location
(typically CDN or object storage). This keeps large payloads efficient, tamper-evident, and
edge-enforceable.

### Publisher Implementation

Publishers that choose to offer RAG ingest capabilities MUST:

1. Specify a `rag_ingest.endpoint_url` in their pricing configuration
2. Set a `rag_ingest.pricing_mode` and `rag_ingest.price_cents`
3. Implement the RAG ingest endpoint according to this specification

### Client Usage

Clients discover RAG ingest availability through the publisher's pricing manifest and call the RAG
ingest endpoint directly (not via the standard intent API). RAG ingest provides licensed access to
preprocessed, embeddings-ready datasets for persistent use in retrieval systems.

### Normative Definition

The rag_ingest endpoint SHALL provide licensed agents with discovery and access to RAG-ready export
bundles generated by the publisher. Each export bundle MUST contain:

- Stable item identifiers and metadata sufficient for deduplication and delta updates
- Publisher-controlled normalization and embedding parameters (embedding_dim, dtype, model, encode)
- Optional chunk text, subject to the publisher's declared text_policy
- Provenance fields (contentHash, generatedAt, publisherVersion)
- A manifest enumerating one or more download parts, each verifiable via checksum

The endpoint MAY accept a list of URLs or a declared collection identifier as input. The response
MUST include a job identifier and SHALL return either:

- A synchronous manifest for small, single-document requests, or
- A deferred job object whose completion manifest lists downloadable bundle locations

All bundles are persistable under the associated license and priced per 1,000 tokens, per item, or
per job as declared in the publisher manifest. The server MAY paginate large exports via cursor or
deliver them as NDJSON/Parquet files referenced by signed URLs with defined expiry.

rag_ingest endpoints SHALL NOT return reconstructive full-site archives beyond licensed scope and
SHALL enforce publisher-defined caps on total items, time ranges, and budget.

### Schema

**Schema**: [`ptp-rag-ingest.schema.json`](../schema/intents/ptp-rag-ingest.schema.json)

### Endpoint Discovery

The RAG ingest endpoint URL is found in the publisher's pricing configuration at
`rag_ingest.endpoint_url`. Clients should make HTTP POST requests to this endpoint with ingest
parameters.

---

## NORMATIVE: Intent Request Parameters and Response Schemas

**This section contains normative requirements for intent parameter handling and response formats.**

Each intent MUST support the specified request parameters and return structured response data as
defined. These specifications are REQUIRED for consistent implementation across publishers and
operators.

**Note:** All "Response Example" sections in this document are INFORMATIVE and provided for
illustration purposes only. The normative requirements are specified in the parameter tables and
normative definitions.

### General Parameter Precedence Rules

Intent parameters can be supplied through multiple channels with the following precedence order
(later sources override earlier ones):

1. **Query Parameters** - Standard URL query string parameters (`?param=value&other=data`)
2. **X-PTP-Params Header** - Base64-encoded JSON object containing parameters
   (`X-PTP-Params: eyJwYXJhbSI6InZhbHVlIn0=`)
3. **Explicit Headers** - Individual HTTP headers with intent-specific prefixes

**Parameter Resolution Process:**

- Start with query parameters as the base layer
- If `X-PTP-Params` header is present, decode the base64 JSON and overlay those values
- Apply any explicit headers that match intent parameter names
- Edge service writes the final resolved parameter set into the request envelope

**Example Resolution:**

```http
GET /content?ptp_intent=read&ptp_max_tokens=1000
X-PTP-Params: eyJwdHBfaW50ZW50IjogInJlYWQiLCAicHRwX2Fzc2V0cyI6IHRydWV9Cg==
X-PTP-Max-Tokens: 2000
```

Resolves to:

```json
{
  "ptp_intent": "read", // Same in query and X-PTP-Params
  "ptp_max_tokens": 2000, // Explicit header overrides query
  "ptp_assets": true // From X-PTP-Params (not in query)
}
```

---

### peek

**What Peek is For** A tiny, cacheable discovery object: title + canonical URL + a very short
abstract and a few high-signal fields so agents can decide whether to escalate to read, search,
summarize, etc.

**Schema**: [`ptp-peek.schema.json`](../schema/intents/ptp-peek.schema.json)

**Request Parameters:** None

**Response Example:**

```json
{
  "type": "peek",
  "canonicalUrl": "https://example.com/articles/ai-content-licensing",
  "title": "The Future of AI Content Licensing: A Publisher's Perspective",
  "snippet": "As AI systems increasingly consume web content for training and inference, publishers are seeking new models for fair compensation and control over their intellectual property.",
  "language": "en-US",
  "contentType": "article",
  "mediaType": "text/html",
  "signals": {
    "tokenCountEstimate": 2847
  },
  "tags": ["artificial-intelligence", "content-licensing", "publishing", "intellectual-property"],
  "peekManifestUrl": "https://example.com/.well-known/peek.json"
}
```

**Additional Response Examples for Non-Text Media:**

_PDF Document:_

```json
{
  "type": "peek",
  "canonicalUrl": "https://example.com/reports/ai-industry-analysis-2025.pdf",
  "title": "AI Industry Analysis Report 2025",
  "snippet": "Comprehensive analysis of artificial intelligence market trends, key players, and future projections for the global AI industry in 2025.",
  "language": "en-US",
  "contentType": "doc",
  "mediaType": "application/pdf",
  "metadata": {
    "pageCount": 47,
    "fileSize": 2847291,
    "author": "Research Analytics Corp"
  },
  "signals": {
    "tokenCountEstimate": 15420
  },
  "tags": ["artificial-intelligence", "market-analysis", "industry-report"],
  "peekManifestUrl": "https://example.com/.well-known/peek.json"
}
```

_Image:_

```json
{
  "type": "peek",
  "canonicalUrl": "https://example.com/images/datacenter-architecture.jpg",
  "title": "Modern AI Datacenter Architecture Diagram",
  "snippet": "Detailed architectural diagram showing the layout of a state-of-the-art AI training datacenter with GPU clusters, networking infrastructure, and cooling systems.",
  "contentType": "other",
  "mediaType": "image/jpeg",
  "metadata": {
    "dimensions": {
      "width": 2048,
      "height": 1536
    },
    "fileSize": 387264
  },
  "tags": ["datacenter", "architecture", "ai-infrastructure"],
  "peekManifestUrl": "https://example.com/.well-known/peek.json"
}
```

_Video:_

```json
{
  "type": "peek",
  "canonicalUrl": "https://example.com/videos/ai-model-training-process.mp4",
  "title": "Large Language Model Training Process Explained",
  "snippet": "Educational video demonstrating the step-by-step process of training large language models, from data preparation to model deployment.",
  "language": "en-US",
  "contentType": "video",
  "mediaType": "video/mp4",
  "metadata": {
    "duration": 847.5,
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "fileSize": 125847392
  },
  "signals": {
    "tokenCountEstimate": 3420
  },
  "tags": ["machine-learning", "tutorial", "ai-training"],
  "peekManifestUrl": "https://example.com/.well-known/peek.json"
}
```

### read

**What Read is For** Return the canonical full content of a resource in a predictable form. It’s
transient (usually metered per_1000_tokens) and should make provenance + normalization explicit so
agents can trust and cache their own transforms. When normalization is not applied, the `content`
property SHALL contain the entire textual representation of the resource, excluding only non-textual
assets (images, scripts, style sheets, advertising markup) and data outside the primary content body
that is not presented to a human reader as part of the canonical page experience.

**Schema**: [`ptp-read.schema.json`](../schema/intents/ptp-read.schema.json)

**Request Parameters:**

| param      | header       | type    | required | value                                            |
| ---------- | ------------ | ------- | -------- | ------------------------------------------------ |
| ptp_intent | X-PTP-Intent | string  | true     | "read"                                           |
| ptp_assets | X-PTP-Assets | boolean | false    | boolean to include assets[] list (default=false) |

**Response Example:**

```json
{
  "canonicalUrl": "https://example.com/articles/ai-content-licensing",
  "language": "en-US",
  "contentType": "article",
  "mediaType": "text/html",
  "content": "# The Future of AI Content Licensing\n\nAs AI systems increasingly consume web content for training and inference, publishers are seeking new models for fair compensation and control over their intellectual property.\n\n## Current Challenges\n\nThe traditional web was built for human consumption, with content discovery through search engines and direct navigation. However, AI systems operate differently...",
  "normalization": {
    "htmlStripped": true,
    "boilerplateRemoved": true,
    "adsRemoved": true,
    "canonicalizedWhitespace": true,
    "deduplicated": false
  },
  "provenance": {
    "contentHash": "sha256:a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    "etag": "\"abc123-def456\"",
    "lastModified": "2025-10-07T14:30:00Z"
  },
  "length": {
    "inputTokens": 3204,
    "outputTokens": 2847,
    "truncated": true,
    "truncateReason": "budget_limit"
  },
  "assets": [
    {
      "rel": "image",
      "href": "https://example.com/images/ai-licensing-diagram.png",
      "mime": "image/png",
      "title": "AI Content Licensing Flow Diagram"
    },
    {
      "rel": "table",
      "href": "https://example.com/data/pricing-comparison.csv",
      "mime": "text/csv",
      "title": "Publisher Pricing Models Comparison"
    }
  ]
}
```

### summarize

**What Summarize is For** The summarize intent provides a machine-usable abstract of a resource — a
condensed representation of its semantic content without reproducing the full text. It’s designed
for agents, LLMs, and search systems that need context or topical understanding of a resource before
reading or embedding it in full.

Unlike peek, which is limited to lightweight discovery (title + snippet), and unlike read, which
returns the complete canonical text, summarize transforms the source content into a concise,
bounded, derived work that captures meaning but not expression.

It may be generated through:

- deterministic compression models (extractive or abstractive),
- publisher-authored summaries, or
- AI-assisted transformations declared in provenance.

summarize is not archival — summaries are transient, context-specific representations that should
not be treated as replacements for the original text. However, they are safe to cache, index, or
retain for analytical or search purposes, depending on the publisher’s policy.

**Normative Definition** The summarize intent returns a compressed semantic abstraction of the
resource. It MUST preserve factual meaning while omitting detail and expression, and it MUST not
exceed the length declared or implied by ptp_len. If the publisher cannot safely summarize (e.g.,
content too short, or non-text resource), the enforcer SHOULD return a 406 with error.code =
PTP_UNSUPPORTED_SUMMARY. The summary SHALL be derived from the latest canonical version referenced
by canonicalUrl and SHALL include a provenance block describing how and when it was generated.

**Schema**: [`ptp-summarize.schema.json`](../schema/intents/ptp-summarize.schema.json)

**Request Parameters:**

| param          | header           | type    | required | value                                                                                                                                  |
| -------------- | ---------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| ptp_intent     | X-PTP-Intent     | string  | true     | "summarize"                                                                                                                            |
| ptp_max_tokens | X-PTP-Max-Tokens | number  | false    | Hard ceiling for output tokens. Server truncates gracefully and flags in length.truncated=true                                         |
| ptp_len        | X-PTP-Length     | string  | false    | Desired length/compression level of the summary. short ≈ 1–2 sentences; medium ≈ 1 paragraph; long ≈ multi-paragraph. (Default=medium) |
| ptp_format     | X-PTP-Format     | string  | false    | One of "plain, markdown, bullets, outline, json" (Default=plain)                                                                       |
| ptp_topics     | X-PTP-Topics     | boolean | false    | If true, include a topics[] array in response (Default=false)                                                                          |
| ptp_prov       | X-PTP-Provenance | boolean | false    | If true, include provenance block (sourceUrl, hash, spans). (Default=true)                                                             |

**Response Example:**

```json
{
  "canonicalUrl": "https://example.com/articles/ai-content-licensing",
  "language": "en-US",
  "contentType": "article",
  "mediaType": "text/html",
  "summary": "Publishers are developing new licensing models to ensure fair compensation when AI systems use their content for training and inference. The traditional web crawling model breaks down when content is consumed at scale by autonomous agents, creating a need for structured licensing frameworks that balance publisher control with AI system access requirements.",
  "lengthClass": "medium",
  "format": "plain",
  "topics": [
    {
      "topic": "AI content licensing",
      "confidence": 0.95,
      "relevance": 0.98
    },
    {
      "topic": "publisher compensation",
      "confidence": 0.88,
      "relevance": 0.85
    },
    {
      "topic": "web crawling",
      "confidence": 0.79,
      "relevance": 0.72
    }
  ],
  "keywords": [
    "licensing",
    "AI systems",
    "content creators",
    "compensation",
    "automation",
    "publishing"
  ],
  "provenance": {
    "contentHash": "sha256:f7e6d5c4b3a2918273645819203746582039475610293847561029384756102938",
    "generatedAt": "2025-10-08T15:45:00Z",
    "method": "abstractive",
    "model": {
      "id": "sum:gpt-4@turbo",
      "provider": "openai",
      "name": "gpt-4",
      "version": "turbo",
      "digest": "sha256:a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
    },
    "sourceUrl": "https://example.com/articles/ai-content-licensing",
    "sourceTitle": "The Future of AI Content Licensing: A Publisher's Perspective",
    "sourceAuthor": "Dr. Sarah Chen",
    "attribution": "Source: Tech Ethics Quarterly"
  },
  "length": {
    "inputTokens": 2847,
    "outputTokens": 127,
    "totalTokens": 2974,
    "truncated": false
  }
}
```

### quote

**What Quote is For** Return one or more verbatim snippets from the source, with clear attribution
and precise spans, suitable for citation, previews, or linking. Unlike read (full text) or summarize
(derived text), quote is bounded (short, verbatim) and designed to be non-reconstructive.

**Normative Definition** The quote intent SHALL return one or more short, verbatim excerpts from a
canonical resource in response to a declared query, selector, or byte span. Each quote MUST be
bounded in length, MUST preserve the original text exactly as rendered to a human reader, and MUST
include attribution metadata sufficient to identify the source (title and canonical URL at minimum).

A quote response SHALL NOT exceed the maximum per-snippet and cumulative character limits defined by
publisher policy. Returned text MUST be non-transformative, non-derivative, and suitable for factual
verification or citation display.

Publishers MAY reject quote requests for unsupported media types or for sequential requests
attempting to reconstruct the original content.

The quote intent provides a verifiable evidence interface for AI agents and retrieval
systems—enabling transparent citation and fair-use alignment without exposing the full text of the
underlying resource.

**Schema**: [`ptp-quote.schema.json`](../schema/intents/ptp-quote.schema.json)

**Request Parameters:**

| param      | header           | type                                       | required    | value                                                                                                         |
| ---------- | ---------------- | ------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| ptp_intent | X-PTP-Intent     | string                                     | true        | "quote"                                                                                                       |
| ptp_query  | X-PTP-Query      | string                                     | (see notes) | Text to find (first match unless otherwise specified). Exact match; server may fall back to fuzzy if allowed. |
| ptp_sel    | X-PTP-Selector   | CSS selector / element id                  | (see notes) | Selects a DOM region or section to quote verbatim.                                                            |
| ptp_spans  | X-PTP-Spans      | UTF-8 offsets (start-end), comma-separated | (see notes) | Direct byte or character ranges for quoting; must map to visible text spans.                                  |
| ptp_len    | X-PTP-Length     | number                                     | false       | Max characters per snippet (hard cap). (Default=300)                                                          |
| ptp_count  | X-PTP-Count      | number                                     | false       | Max number of snippets to return (Default=1)                                                                  |
| ptp_prov   | X-PTP-Provenance | boolean                                    | false       | If true, include provenance block (sourceUrl, hash, spans). (Default=true)                                    |

**Note**: At least one of `ptp_query`, `ptp_sel`, or `ptp_spans` must be provided. If none are
present → 400 PTP_MISSING_LOCATOR

**Response Example:**

```json
{
  "canonicalUrl": "https://example.com/article/ai-ethics",
  "language": "en-US",
  "contentType": "article",
  "mediaType": "text/html",
  "quotes": [
    {
      "text": "AI systems must be designed with transparency and accountability as core principles.",
      "contextBefore": "As we move into an era of ubiquitous AI,",
      "contextAfter": "This requires both technical and regulatory frameworks.",
      "span": {
        "start": 1247,
        "end": 1335,
        "unit": "utf8",
        "selector": "#main-content > p:nth-child(3)"
      },
      "citation": {
        "title": "The Future of AI Ethics in Technology",
        "author": "Dr. Sarah Chen",
        "publisher": "Tech Ethics Quarterly",
        "publishedAt": "2024-03-15T14:30:00Z",
        "url": "https://example.com/article/ai-ethics"
      }
    }
  ],
  "normalization": {
    "htmlStripped": true,
    "boilerplateRemoved": true,
    "canonicalizedWhitespace": true,
    "deduplicated": false
  },
  "provenance": {
    "contentHash": "sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
  },
  "limits": {
    "maxCharsPerQuote": 300,
    "maxQuotesReturned": 1,
    "cumulativeCharsReturned": 88
  }
}
```

### embed

**What Embed is For** Return numeric vector representations (embeddings) of a resource (or its
chunks/regions) for similarity search, clustering, reranking, or downstream RAG indexes. Unlike read
(text) or summarize (derived text), embed delivers machine vectors with strict modality + provenance
and clear retention rights.

Embeddings MUST NOT be used to reconstruct original text through inversion or generative approximation techniques.

**Normative Definition** The embed intent SHALL return one or more numeric vector representations
derived from the canonical content of a resource or from specified subsections thereof. Each vector
MUST correspond deterministically to a defined input text span, region, or media object and SHALL be
accompanied by metadata sufficient to identify its origin (offsets, selectors, or asset references).

The embedding vectors MUST be numeric arrays of fixed dimension (embedding_dim), expressed as IEEE
754 floating-point (f32 or f16) or quantized integer (q8) values. When ptp_encode=base64, vectors
SHALL be encoded in little-endian byte order and accompanied by explicit dtype, embedding_dim, and
num_items fields.

An embed response SHALL include a language tag and mediaType identifying the original resource, a
model or method identifier describing the embedding generator, and a provenance block linking each
vector back to the source content hash and canonical URL.

Publishers MAY apply server-side chunking, normalization, or dimensionality reduction, provided that
such transformations are disclosed in the response metadata.

The embed intent is transformative and persistent: licensees MAY retain embeddings for indexing,
retrieval, or downstream model use, subject to publisher licensing terms. Raw source content MUST
NOT be returned or reconstructable from embedding data.

Non-text media (e.g., image, audio, video) MAY be embedded via modality-specific encoders, provided
the resulting vector conforms to the numeric schema. Unsupported media types SHALL yield 406
PTP_UNSUPPORTED_MEDIA_TYPE.

**Schema**: [`ptp-embed.schema.json`](../schema/intents/ptp-embed.schema.json)

**Request Parameters:**

| param          | header           | type                                       | required    | value                                                                                                                             |
| -------------- | ---------------- | ------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| ptp_intent     | X-PTP-Intent     | string                                     | true        | "embed"                                                                                                                           |
| ptp_mode       | X-PTP-Mode       | string                                     | false       | Vectorize whole doc ("doc"), server-chunked regions ("chunks"), or caller-specified spans/selector ("selection"). (Default="doc") |
| ptp_media      | X-PTP-Media      | string                                     | false       | Force modality when resource is multimodal: "auto", "text", "image", "audio", "video". (Default="auto")                           |
| ptp_chunk_size | X-PTP-Chunk-Size | number                                     | false       | Target chunk size when ptp_mode=chunks. Unit clarified by ptp_unit. (Default=publisher default)                                   |
| ptp_overlap    | X-PTP-Overlap    | number                                     | false       | Overlap between chunks (same unit as size). (Default=0)                                                                           |
| ptp_unit       | X-PTP-Unit       | string                                     | false       | Measurement used for size/overlap: "char", "utf8", "token". (Default="token")                                                     |
| ptp_spans      | X-PTP-Spans      | UTF-8 offsets (start-end), comma-separated | (see notes) | UTF-8 (or ptp_unit) ranges for surgical embedding.                                                                                |
| ptp_sel        | X-PTP-Selector   | CSS selector / element id                  | (see notes) | DOM region to embed verbatim.                                                                                                     |
| ptp_dtype      | X-PTP-Data-Type  | string                                     | false       | Output numeric precision: "f32", "f16", "q8". (Default="f32")                                                                     |
| ptp_norm       | X-PTP-Normalize  | boolean                                    | false       | Normalize vectors to unit length. (Default=true)                                                                                  |
| ptp_encode     | X-PTP-Encoding   | string                                     | false       | Return format: "array" (raw number arrays) or "base64" (base64-packed binary for large payloads). (Default="array")               |
| ptp_meta       | X-PTP-Metadata   | boolean                                    | false       | Include metadata about embeddings. (Default=true)                                                                                 |
| ptp_max_items  | X-PTP-Max-Items  | number                                     | false       | Upper bound on number of vectors returned. (Default=publisher cap)                                                                |

**Note**: When `ptp_mode="selection"`, at least one of `ptp_spans` or `ptp_sel` must be provided. If
neither is present → 400 PTP_MISSING_SELECTION.

**Response Example:**

```json
{
  "canonicalUrl": "https://example.com/research/machine-learning-basics",
  "language": "en-US",
  "contentType": "article",
  "mediaType": "text/html",
  "model": {
    "id": "text-embedding:text-embedding-3-large@v1",
    "provider": "openai",
    "name": "text-embedding-3-large",
    "version": "v1",
    "digest": "sha256:abc123def456789012345678901234567890123456789012345678901234567890"
  },
  "normalization": {
    "htmlStripped": true,
    "boilerplateRemoved": true,
    "canonicalizedWhitespace": true,
    "deduplicated": false
  },
  "embeddingMetadata": {
    "embedding_dim": 3072,
    "dtype": "f32",
    "normalized": true,
    "encode": "array",
    "num_items": 2
  },
  "chunking": {
    "mode": "chunks",
    "unit": "token",
    "chunk_size": 512,
    "overlap": 50
  },
  "provenance": {
    "contentHash": "sha256:d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
    "generatedAt": "2024-10-08T15:30:45Z"
  },
  "length": {
    "inputTokens": 1024,
    "outputTokens": 0,
    "totalTokens": 1024,
    "truncated": false,
    "truncateReason": "none"
  },
  "embeddings": [
    {
      "index": 0,
      "embedding": [
        0.123,
        -0.456,
        0.789,
        0.234,
        -0.567,
        0.89,
        "... (3066 more floats for total 3072 dimensions)"
      ],
      "meta": {
        "span": {
          "start": 0,
          "end": 512,
          "unit": "token"
        },
        "textHash": "sha256:a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        "sectionId": "introduction"
      }
    },
    {
      "index": 1,
      "embedding": [
        -0.321,
        0.654,
        -0.987,
        0.432,
        0.765,
        -0.21,
        "... (3066 more floats for total 3072 dimensions)"
      ],
      "meta": {
        "span": {
          "start": 462,
          "end": 974,
          "unit": "token"
        },
        "textHash": "sha256:b2c3d4e5f6a7890123456789012345678901bcdef2345678901bcdef2345678",
        "sectionId": "methodology"
      }
    }
  ]
}
```

### translate

**What Translate is For** The translate intent returns a target-language rendering of a textual
resource (or selected regions), preserving meaning and—when requested—lightweight structure (links,
code blocks, inline markup). Unlike summarize (compression) or read (verbatim source), translate is
a transformative, bidirectional mapping from source language → target language, suitable for
display, RAG indexing in another language, or multilingual search.

Persistence: translated text may be retained (per license). Provenance: must declare model/method
(mt, human, postedit) and glossary/memory usage. Scope: text resources only; non-text media requires
an extracted text layer or selection.

**Normative Definition** The translate intent SHALL return a target-language rendering of the
specified source text while preserving factual meaning and respecting declared preservation hints.
The response MUST identify both the detected/source language and the target language as BCP-47 tags,
and MUST include provenance describing the translation method (mt, human, or postedit) and
model/engine when applicable.

When ptp_preserve is specified, publishers SHALL avoid altering the protected classes (e.g., code
spans, URLs, named entities) beyond necessary re-wrapping in the requested ptp_fmt. If ptp_align=1,
the response SHALL include alignment mappings between source and target spans at the declared unit
(character or token).

Translations are transformative and MAY be retained per license terms. If the requested selection
cannot be translated (e.g., binary media without text), the server SHALL return a 406 error with an
explanatory code. Token accounting MUST include both input (source) and output (generated target)
tokens.

**Schema**: [`ptp-translate.schema.json`](../schema/intents/ptp-translate.schema.json)

**Request Parameters:**

| param        | header           | type                                       | required    | value                                                                                                                                |
| ------------ | ---------------- | ------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ptp_intent   | X-PTP-Intent     | string                                     | true        | "translate"                                                                                                                          |
| ptp_tgt      | X-PTP-Target     | string                                     | true        | Target language for translation: BCP-47 (e.g., "es", "de-CH").                                                                       |
| ptp_fmt      | X-PTP-Format     | string                                     | false       | Output textual format: "plain", "markdown", "html", "json". (html preserves basic inline tags.) (Default="plain")                    |
| ptp_mode     | X-PTP-Mode       | string                                     | false       | Translation scope: "doc" (whole document), "selection" (DOM selection/spans), "segments" (caller-provided segments). (Default="doc") |
| ptp_sel      | X-PTP-Selector   | CSS selector / element id                  | (see notes) | Region(s) to translate (post-normalization).                                                                                         |
| ptp_spans    | X-PTP-Spans      | UTF-8 offsets (start-end), comma-separated | (see notes) | Byte/char ranges to translate.                                                                                                       |
| ptp_segments | X-PTP-Segments   | base64url(JSON array of strings)           | (see notes) | Caller-supplied source segments to translate.                                                                                        |
| ptp_preserve | X-PTP-Preserve   | CSV string                                 | false       | W3C ITS-style "do-not-touch" hints from: "links", "code", "entities", "quotes", "casing". (e.g., don't translate code/URLs)          |
| ptp_prov     | X-PTP-Provenance | boolean                                    | false       | Include provenance block. (Default=true)                                                                                             |

**Note**: When `ptp_mode="selection"`, at least one of `ptp_sel` or `ptp_spans` must be provided.
When `ptp_mode="segments"`, `ptp_segments` must be provided.

**Response Example:**

```json
{
  "canonicalUrl": "https://example.com/blog/ai-innovation-trends",
  "contentType": "article",
  "mediaType": "text/html",
  "normalization": {
    "htmlStripped": true,
    "boilerplateRemoved": true,
    "canonicalizedWhitespace": true,
    "deduplicated": false
  },
  "languages": {
    "source": "en-US",
    "detected": false,
    "target": "es-ES"
  },
  "format": "markdown",
  "segments": [
    {
      "index": 0,
      "source": "Artificial Intelligence is transforming industries at an unprecedented pace.",
      "target": "La Inteligencia Artificial está transformando las industrias a un ritmo sin precedentes.",
      "confidence": 0.94,
      "preserved": ["entities"],
      "alignment": {
        "unit": "char",
        "pairs": [
          { "src": [0, 20], "tgt": [0, 23] },
          { "src": [21, 33], "tgt": [24, 36] },
          { "src": [34, 46], "tgt": [37, 65] }
        ]
      }
    },
    {
      "index": 1,
      "source": "Companies must adapt to leverage these powerful `machine learning` capabilities.",
      "target": "Las empresas deben adaptarse para aprovechar estas poderosas capacidades de `machine learning`.",
      "confidence": 0.89,
      "preserved": ["code"],
      "alignment": {
        "unit": "char",
        "pairs": [
          { "src": [0, 9], "tgt": [0, 12] },
          { "src": [10, 24], "tgt": [13, 32] },
          { "src": [48, 65], "tgt": [81, 98] }
        ]
      }
    }
  ],
  "provenance": {
    "contentHash": "sha256:e8f7d6c5b4a3920183746582047561029384756102938475610293847561029",
    "generatedAt": "2025-10-08T16:15:30Z",
    "method": "mt",
    "model": {
      "id": "translator:opus-mt-en-es@v2",
      "provider": "huggingface",
      "name": "opus-mt-en-es",
      "version": "v2",
      "digest": "sha256:def456789012345678901234567890123456789012345678901234567890abcd"
    },
    "glossary": "https://example.com/glossaries/tech-terms-en-es",
    "memory": "tm_tech_2024"
  },
  "length": {
    "inputTokens": 142,
    "outputTokens": 158,
    "totalTokens": 300,
    "truncated": false,
    "truncateReason": "none"
  }
}
```

### analyze

**What Analyze is For** Return structured annotations about a resource (or a selected region):
topics, entities, sentiment, keyphrases, categories, toxicity/readability, etc. It’s a transform
intent (not content delivery) that yields machine-usable JSON for ranking, routing, moderation,
personalization, or analytics.

**Normative Definition** The analyze intent SHALL return deterministic, machine-readable annotations
about the specified resource or selection. Requested tasks in ptp_tasks MUST be enumerated in the
response with explicit confidence scores and (where applicable) offsets/locators. Any server-side
normalization applied to text prior to analysis (HTML stripping, boilerplate removal, whitespace
canonicalization, deduplication) SHALL be disclosed in a normalization block. Analysis MAY be
persisted (per license) and MUST NOT include reconstructive amounts of source text beyond minimal
spans necessary for localization. For non-text resources, analyze SHALL operate only on an available
text layer (e.g., transcript, OCR). Unsupported media MUST return 406 with an explanatory code.

Returned spans MUST be minimal and MUST NOT exceed reconstructive limits.

**Schema**: [`ptp-analyze.schema.json`](../schema/intents/ptp-analyze.schema.json)

**Request Parameters:**

| param        | header               | type                                       | required    | value                                                                                                                                                                                                        |
| ------------ | -------------------- | ------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ptp_intent   | X-PTP-Intent         | string                                     | true        | "analyze"                                                                                                                                                                                                    |
| ptp_tasks    | X-PTP-Tasks          | CSV string                                 | false       | Which analyzers to run from: "language", "topics", "entities", "sentiment", "keyphrases", "categories", "toxicity", "readability", "pii", "style". (Default="language,topics,entities,sentiment,keyphrases") |
| ptp_mode     | X-PTP-Mode           | string                                     | false       | Analysis scope: "doc" (whole document) or "selection" (selected region). (Default="doc")                                                                                                                     |
| ptp_sel      | X-PTP-Selector       | CSS selector / element id                  | (see notes) | DOM region to analyze.                                                                                                                                                                                       |
| ptp_spans    | X-PTP-Spans          | UTF-8 offsets (start-end), comma-separated | (see notes) | Byte/char ranges to analyze.                                                                                                                                                                                 |
| ptp_conf_min | X-PTP-Confidence-Min | number                                     | false       | Confidence floor for results (0–1). (Default=0.5)                                                                                                                                                            |
| ptp_top_k    | X-PTP-Top-K          | number                                     | false       | Max items per list (topics, entities, phrases). (Default=10)                                                                                                                                                 |
| ptp_prov     | X-PTP-Provenance     | boolean                                    | false       | Include provenance block. (Default=true)                                                                                                                                                                     |

**Note**: When `ptp_mode="selection"`, at least one of `ptp_sel` or `ptp_spans` must be provided.

**Response Example:**

```json
{
  "canonicalUrl": "https://example.com/news/climate-change-report-2024",
  "language": "en-US",
  "contentType": "news",
  "mediaType": "text/html",
  "model": {
    "id": "analyzer:multi-task-nlp@v2.1",
    "provider": "huggingface",
    "name": "multi-task-nlp",
    "version": "v2.1",
    "digest": "sha256:f1e2d3c4b5a6789012345678901234567890123456789012345678901234567890"
  },
  "normalization": {
    "htmlStripped": true,
    "boilerplateRemoved": true,
    "canonicalizedWhitespace": true,
    "deduplicated": false
  },
  "provenance": {
    "contentHash": "sha256:c4d5e6f7a8b9012345678901234567890123456789012345678901234567890abc",
    "generatedAt": "2025-10-09T11:20:15Z",
    "tasks": ["language", "topics", "entities", "sentiment", "keyphrases"]
  },
  "analysis": {
    "language": {
      "detected": "en-US",
      "confidence": 0.98
    },
    "topics": [
      {
        "topic": "climate change",
        "confidence": 0.94,
        "relevance": 0.97
      },
      {
        "topic": "environmental policy",
        "confidence": 0.87,
        "relevance": 0.82
      },
      {
        "topic": "carbon emissions",
        "confidence": 0.91,
        "relevance": 0.89
      }
    ],
    "entities": [
      {
        "text": "IPCC",
        "type": "ORG",
        "confidence": 0.96,
        "offset": 234,
        "length": 4
      },
      {
        "text": "Paris Agreement",
        "type": "EVENT",
        "confidence": 0.92,
        "offset": 456,
        "length": 15
      },
      {
        "text": "2024",
        "type": "DATE",
        "confidence": 0.99,
        "offset": 12,
        "length": 4
      }
    ],
    "sentiment": {
      "overall": "neutral",
      "confidence": 0.78,
      "scores": {
        "positive": 0.15,
        "neutral": 0.72,
        "negative": 0.13
      }
    },
    "keyphrases": [
      {
        "phrase": "global temperature rise",
        "confidence": 0.88,
        "relevance": 0.91
      },
      {
        "phrase": "renewable energy transition",
        "confidence": 0.85,
        "relevance": 0.87
      },
      {
        "phrase": "carbon neutrality targets",
        "confidence": 0.82,
        "relevance": 0.84
      }
    ]
  },
  "length": {
    "inputTokens": 1847,
    "outputTokens": 245,
    "totalTokens": 2092,
    "truncated": false,
    "truncateReason": "none"
  }
}
```

### qa

**What QA is For** The qa intent answers one or more specific questions based on the content of a
given resource (or small set of resources) — without reconstructing the full content itself. It’s
meant for agentic comprehension, not data extraction or training.

**Normative Definition** The qa intent SHALL return one or more structured answers derived from the
referenced resource(s), each with an associated confidence score and provenance. The response MUST
include the question(s) posed, their corresponding answers, and—when requested—citations identifying
the portions of the source content used to justify each answer.

The qa response MUST NOT include reconstructive text beyond limited answer spans and quotes. When
multiple sources or documents are used, each answer MUST identify its contributing source(s).

If the model cannot answer a question above the configured confidence threshold, it SHALL return
"unanswered": true for that entry rather than hallucinated content.

qa responses are transformative and MAY be retained under the license terms.

**Schema**: [`ptp-qa.schema.json`](../schema/intents/ptp-qa.schema.json)

**Request Parameters:**

| param          | header               | type                                       | required | value                                                     |
| -------------- | -------------------- | ------------------------------------------ | -------- | --------------------------------------------------------- |
| ptp_intent     | X-PTP-Intent         | string                                     | true     | "qa"                                                      |
| q              | X-PTP-Query          | string or base64url(JSON array of strings) | true     | One or more questions.                                    |
| mode           | X-PTP-Mode           | string                                     | false    | "single" \| "multi". (Default="single")                   |
| max_answers    | X-PTP-Max-Answers    | number                                     | false    | Max answers to return per question (1–10). (Default=3)    |
| confidence_min | X-PTP-Confidence-Min | number                                     | false    | Minimum answer confidence to include (0–1). (Default=0.5) |
| citations      | X-PTP-Citations      | boolean                                    | false    | Include source references/offsets. (Default=true)         |
| quote_spans    | X-PTP-Quote-Spans    | boolean                                    | false    | Return short evidence snippets. (Default=true)            |

**Response Example:**

```json
{
  "canonicalUrl": "https://example.com/articles/renewable-energy-guide",
  "language": "en",
  "contentType": "article",
  "mediaType": "text/html",
  "model": {
    "id": "qa:gpt-4o-mini@v1",
    "provider": "openai",
    "name": "gpt-4o-mini",
    "version": "v1",
    "digest": "sha256:abc123def456789012345678901234567890123456789012345678901234567890"
  },
  "qa_pairs": [
    {
      "index": 0,
      "question": "What are the main types of renewable energy?",
      "answer": "The main types of renewable energy include solar power, wind power, hydroelectric power, geothermal energy, and biomass energy.",
      "confidence": 0.92,
      "answerType": "factual",
      "sources": [
        {
          "canonicalUrl": "https://example.com/articles/renewable-energy-guide",
          "span": {
            "start": 245,
            "end": 387,
            "unit": "char"
          },
          "quote": "Solar, wind, hydro, geothermal, and biomass are considered the five primary forms of renewable energy sources."
        }
      ]
    },
    {
      "index": 1,
      "question": "How does solar energy work?",
      "answer": "Solar energy works by converting sunlight into electricity using photovoltaic cells in solar panels, which generate direct current that is then converted to alternating current for use in homes and businesses.",
      "confidence": 0.88,
      "answerType": "analytical",
      "sources": [
        {
          "canonicalUrl": "https://example.com/articles/renewable-energy-guide",
          "span": {
            "start": 1245,
            "end": 1456,
            "unit": "char"
          },
          "quote": "Photovoltaic cells capture photons from sunlight and convert them into electrical energy through the photovoltaic effect."
        }
      ]
    }
  ],
  "provenance": {
    "contentHash": "sha256:def789abc012345678901234567890123456789012345678901234567890abcdef",
    "generatedAt": "2024-01-15T10:30:45Z"
  },
  "length": {
    "inputTokens": 1247,
    "outputTokens": 198,
    "totalTokens": 1445,
    "truncated": false,
    "truncateReason": "none"
  }
}
```

---

### chunk (Chunk Retrieval)

**What Chunk Retrieval is For** The chunk intent returns small, relevance-ranked spans of text extracted from a single resource. It is the foundational mechanism for evidence-first AI — providing precise, verifiable excerpts without synthesis or interpretation.

Chunk retrieval is the primary mechanism for evidence-first AI. **search** tells the model where to look; **chunk** tells it what matters inside the resource. It is lower-level and less interpretive than **qa**.

**Normative Definition** The chunk intent SHALL operate ONLY over a single `canonicalUrl` and MUST NOT synthesize new answers or generate paraphrased content. It MUST return spans of text with start/end offsets, and MUST include ranking information (rank, score, scoringId) for each span.

The response MUST include optional short quotes (bounded length, typically ≤300 chars) and MUST protect against reconstructing full documents following the same anti-reconstruction rules as peek and quote intents. The server MAY use keyword, vector, or hybrid ranking internally but MUST report which ranking mode was used via the `mode` field.

Each chunk MUST include:

- **rank**: Integer position in relevance order (1-indexed)
- **score**: Numeric relevance score
- **span**: Object with `start`, `end`, and `unit` (char or token) identifying the location in the source document
- **quote** (optional): Short verbatim excerpt (≤300 chars) from the span
- **section** (optional): Section heading or structural context if available

The response MUST include the `query` if provided by the client, and MUST report the retrieval `mode` used (keyword, vector, or hybrid). Chunks MUST NOT exceed maximum size limits that would enable document reconstruction, and the server SHALL enforce the same safety constraints as quote intent.

**Schema**: [`ptp-chunk.schema.json`](../schema/intents/ptp-chunk.schema.json)

**Request Parameters:**

| param              | header                 | type    | required | value                                                                   |
| ------------------ | ---------------------- | ------- | -------- | ----------------------------------------------------------------------- |
| ptp_intent         | X-PTP-Intent           | string  | true     | "chunk"                                                                 |
| q                  | X-PTP-Query            | string  | false    | Natural language query for semantic or hybrid retrieval                 |
| embedding          | X-PTP-Embedding        | array   | false    | Client-provided embedding vector (requires embedding_model_id)          |
| embedding_model_id | X-PTP-Embedding-Model  | string  | false    | Model identifier for provided embedding (required if embedding present) |
| mode               | X-PTP-Mode             | string  | true     | Retrieval strategy: "keyword", "vector", or "hybrid"                    |
| top_k              | X-PTP-Top-K            | number  | false    | Number of chunks to return (1–20). Default=5                            |
| max_chunk_length   | X-PTP-Max-Chunk-Length | number  | false    | Maximum length per chunk in tokens. Default=300                         |
| include_quotes     | X-PTP-Include-Quotes   | boolean | false    | Whether to include short verbatim quotes. Default=true                  |
| include_sections   | X-PTP-Include-Sections | boolean | false    | Whether to include section metadata. Default=false                      |

**Request Field Requirements:**

- A request MAY omit `embedding` if `mode="keyword"`
- A request MUST provide `embedding` if `mode="vector"`
- A request SHOULD provide both `q` and `embedding` if `mode="hybrid"`
- If `embedding` is provided, `embedding_model_id` is REQUIRED
- The server MUST validate `embedding_model_id` against supported models declared in the PricingScheme
- If the embedding model is not supported, the server MUST either:
  - Reject the request with HTTP 422 and error code `UNSUPPORTED_EMBEDDING_MODEL`, or
  - Fall back to keyword-only mode if the publisher's PricingScheme indicates fallback is allowed

**Response Example:**

```json
{
  "canonicalUrl": "https://example.com/articles/renewable-energy-guide",
  "language": "en",
  "contentType": "article",
  "mediaType": "text/html",
  "query": "how solar panels convert sunlight to electricity",
  "mode": "hybrid",
  "scoringId": "bm25_e5_hybrid_v2",
  "chunks": [
    {
      "rank": 1,
      "score": 0.94,
      "span": {
        "start": 1245,
        "end": 1456,
        "unit": "char"
      },
      "quote": "Photovoltaic cells capture photons from sunlight and convert them into electrical energy through the photovoltaic effect. When sunlight strikes the cell, electrons are knocked loose from atoms in the semiconductor material.",
      "section": "How Solar Panels Work"
    },
    {
      "rank": 2,
      "score": 0.87,
      "span": {
        "start": 2103,
        "end": 2289,
        "unit": "char"
      },
      "quote": "The direct current (DC) generated by solar panels must be converted to alternating current (AC) by an inverter before it can be used in homes and businesses.",
      "section": "Power Conversion and Grid Integration"
    },
    {
      "rank": 3,
      "score": 0.81,
      "span": {
        "start": 3456,
        "end": 3598,
        "unit": "char"
      },
      "quote": "Modern solar panels typically achieve 15-22% efficiency in converting sunlight to electricity, with premium panels reaching up to 24%.",
      "section": "Efficiency and Performance"
    }
  ],
  "provenance": {
    "contentHash": "sha256:abc123def456789012345678901234567890123456789012345678901234567890",
    "generatedAt": "2024-01-15T10:30:45Z"
  },
  "length": {
    "inputTokens": 1547,
    "outputTokens": 142,
    "totalTokens": 1689,
    "truncated": false
  }
}
```

**Usage Context Semantics for Chunk:**

Chunk retrieval returns factual evidence only. Any synthesis (answers, paraphrases) occurs on the client side and MUST be accounted for under the usage context attached to the license.

- **immediate** — chunks may be used transiently for a single response
- **session** — MAY cache chunks for the duration of a conversation/session
- **index** — MAY store derived metadata (vector index entries, relevance signals) but NOT the text itself
- **train / distill** — MUST require explicit training rights; chunk intent by itself does not grant training usage

**Embedding Model Compatibility (Normative):**

When a client provides an embedding vector in a chunk request:

1. The request MUST include `embedding_model_id`
2. The publisher MUST compare `embedding_model_id` against supported models declared in the active PricingScheme
3. If no supported embedding model matches, the server MUST either:
   - Reject with HTTP 422 `UNSUPPORTED_EMBEDDING_MODEL`, or
   - Fall back to keyword mode if allowed by PricingScheme
4. **Cross-model comparison is invalid**: Embeddings MUST ONLY be compared against embeddings produced by the SAME embedding model family and version

---

## NORMATIVE: Embedding Model Compatibility and PricingScheme Requirements

**This section contains normative requirements for embedding model compatibility validation and publisher-client alignment.**

### Embedding Model Compatibility Rules

When a client provides an embedding vector in a **search**, **chunk**, or **qa** request, the following normative requirements apply:

1. **Model ID Required**: The request MUST include an `embedding_model_id` field identifying the embedding model used to generate the vector
2. **Publisher Validation**: The publisher MUST compare `embedding_model_id` against the embedding models it supports, as declared in the active PricingScheme
3. **Rejection or Fallback**: If no supported embedding model matches, the server MUST either:
   - Reject the request with HTTP 422 status and error code `UNSUPPORTED_EMBEDDING_MODEL`, or
   - Fall back to keyword-only mode if the publisher's PricingScheme explicitly indicates fallback is allowed
4. **Same-Model Comparison Only**: Embeddings MUST ONLY be compared against embeddings produced by the SAME embedding model family and version. Cross-model or cross-version vector comparison is invalid and SHALL NOT be performed

### PricingScheme Embedding Model Declarations

Publishers declare which embedding models they support via the PricingScheme schema. Clients MUST align with these declarations when providing embeddings.

#### Single Embedding Model Support

If the PricingScheme includes an `embed` intent with model metadata:

```json
{
  "intents": {
    "embed": {
      "intent": "embed",
      "pricing_mode": "per_1000_tokens",
      "usage": { ... },
      "enforcement_method": "trust",
      "model": {
        "id": "embedding:text-embedding-3-small@20241001",
        "provider": "openai",
        "name": "text-embedding-3-small",
        "version": "20241001",
        "digest": "sha256:abc123..."
      }
    }
  }
}
```

Then `intents.embed.model` identifies the embedding model used internally by the publisher when the client does NOT provide an embedding. Client-provided embeddings MUST match this `model.id` unless the publisher also declares `embedding_models` (see below).

#### Multiple Embedding Model Support

Publishers MAY declare support for multiple embedding models via an optional top-level `embedding_models` property in the PricingScheme:

```json
{
  "pricing_scheme_id": "01HZXXX...",
  "publisher_id": "01HYYY...",
  "currency": "USD",
  "cache_ttl_seconds": 3600,
  "intents": { ... },
  "embedding_models": {
    "models": [
      {
        "id": "embedding:text-embedding-3-small@20241001",
        "provider": "openai",
        "name": "text-embedding-3-small",
        "version": "20241001",
        "digest": "sha256:abc123..."
      },
      {
        "id": "embedding:text-embedding-3-large@20241001",
        "provider": "openai",
        "name": "text-embedding-3-large",
        "version": "20241001",
        "digest": "sha256:def456..."
      },
      {
        "id": "embedding:bge-large-en-v1.5@20240315",
        "provider": "baai",
        "name": "bge-large-en-v1.5",
        "version": "20240315",
        "digest": "sha256:789ghi..."
      }
    ]
  }
}
```

**Resolution Rules:**

- If `embedding_models` exists → client-provided embeddings MUST match one of the models in `embedding_models.models[]`
- If `embedding_models` does NOT exist → client-provided embeddings MUST match `intents.embed.model.id`
- If neither exists → the publisher does not support client-provided embeddings and MUST reject requests containing `embedding` field with error code `CLIENT_EMBEDDINGS_NOT_SUPPORTED`

### Request Validation Requirements

For any request containing an `embedding` field (search, chunk, or qa):

1. **Required Fields**:
   - MUST include `embedding_model_id`
   - MUST include `mode` field indicating retrieval strategy
2. **Mode Constraints**:
   - `mode="keyword"`: MAY omit `embedding`
   - `mode="vector"`: MUST provide `embedding`
   - `mode="hybrid"`: SHOULD provide both `query` and `embedding`
3. **Compatibility Check**: Server MUST validate `embedding_model_id` against declared supported models
4. **Error Handling**: Server MUST return structured error with appropriate error code if validation fails

### Error Codes

| Error Code                        | HTTP Status | Description                                                              |
| --------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `UNSUPPORTED_EMBEDDING_MODEL`     | 422         | The provided embedding_model_id is not supported by this publisher       |
| `CLIENT_EMBEDDINGS_NOT_SUPPORTED` | 422         | Publisher does not accept client-provided embeddings                     |
| `EMBEDDING_MODEL_ID_REQUIRED`     | 400         | Request includes embedding but missing required embedding_model_id field |
| `EMBEDDING_REQUIRED_FOR_MODE`     | 400         | Request mode="vector" requires embedding field                           |

---

## NORMATIVE: Implementation and Enforcement

**This section contains normative requirements for license enforcement and JWT security
implementation.**

### License Enforcer and License Service Collaboration

The **Edge Enforcer** (deployed at the publisher's edge) works in collaboration with the **License
Server** to manage intent handling and track usage:

- **Intent Validation**: Verify that requested intents match those granted in the license
- **Local Budget Management**: Maintain license usage locally using self-contained JWT assertions to
  avoid latency and connectivity dependencies during request processing
- **Autonomous Operation**: Edge Enforcer operates independently without requiring real-time License
  Server connectivity for budget validation
- **Usage Tracking**: Monitor how content is accessed under different intent categories with local
  budget accounting
- **Compliance Reporting**: Generate detailed usage reports for billing and audit purposes
- **Real-time Enforcement**: Block or allow requests based on intent permissions and usage limits
- **Usage Reconciliation**: Bilateral reporting with both Edge Enforcer and AI Agent/Operator
  reporting usage to License Server

### JWT License Architecture Requirements

Implementations SHALL use **assertion-only JWT licenses** designed for distributed, low-latency
enforcement:

- **Self-Contained Operation**: License Servers MUST embed all necessary budget, permissions, and
  validation information within the JWT payload. Edge Enforcers MUST NOT require real-time License
  Server connectivity for authorization decisions
- **Autonomous Enforcement**: Edge Enforcers SHALL validate and enforce licenses independently
  without contacting the License Server during request processing
- **Local Budget Management**: Edge Enforcers MUST maintain license usage state locally to enable
  sub-millisecond authorization decisions without network dependencies
- **Disconnect Resilience**: Edge Enforcers SHALL continue operating when License Server
  connectivity is interrupted, using locally cached budget information
- **Asynchronous Reconciliation**: Both Edge Enforcers and AI Operators MUST report usage to the
  License Server via bilateral reporting for audit and billing reconciliation

### JWT License Security Requirements

License Servers and Edge Enforcers SHALL implement the following cryptographic security
requirements:

- **Digital Signatures**: License Servers MUST sign JWTs using ES256 (ECDSA P-256 with SHA-256).
  Edge Enforcers MUST validate signatures using publisher public keys
- **Tampering Protection**: Edge Enforcers MUST reject any JWT where signature validation fails,
  indicating tampering with license claims, budgets, or permissions
- **Time-Bounded Validity**: License Servers MUST include `exp`, `iat`, and optionally `nbf` claims.
  Edge Enforcers MUST validate token expiration with configurable clock skew tolerance
- **Issuer Verification**: Edge Enforcers MUST validate the JWT `iss` claim against expected License
  Server identifiers before accepting licenses
- **Audience Validation**: Edge Enforcers MUST validate the JWT `aud` claim to ensure licenses are
  bound to the correct publisher domain
- **Token Binding via DPoP**: License Servers MUST include `cnf.jkt` claim containing SHA-256
  thumbprint of operator's public key. AI Operators MUST provide DPoP proof with `typ: "dpop+jwt"`
  header containing their public key. Edge Enforcers MUST verify token binding by matching `cnf.jkt`
  to the thumbprint of the DPoP proof's embedded public key
- **DPoP Validation**: Edge Enforcers MUST validate DPoP proofs include correct HTTP method (`htm`),
  target URL (`htu`), timestamp (`iat`), and unique identifier (`jti`). Edge Enforcers MUST reject
  stale DPoP proofs beyond configurable age limits
- **Replay Protection**: Edge Enforcers MUST track both license JTIs and DPoP JTIs to prevent replay
  attacks within their respective validity windows
- **Key Management**: License Servers MUST use `kid` header for key identification. Edge Enforcers
  MUST support key rotation via JWKS endpoint discovery without service interruption

### For Publishers

- **Intent-Based Pricing**: Define specific pricing models for each supported intent type
- **Access Control**: Configure which intents are available for different content types
- **Usage Monitoring**: Track how AI systems interact with content under different intents
- **Brand Protection**: Maintain control over how content is transformed and used

### For AI Operators

- **Precise Intent Selection**: Request only the specific intents needed for the use case
- **Compliance Demonstration**: Show adherence to publisher usage requirements through intent-based
  access
- **Cost Optimization**: Use intent categories to access only the data transformations actually
  needed
- **Legal Clarity**: Operate within clearly defined permissions for each type of content interaction

---

## INFORMATIVE: Technical Considerations

**This section provides informative guidance on technical implementation approaches.**

### Intent Verification and Enforcement

- **Cryptographic Validation**: JWT licenses specify which intents are granted for specific content
  access
- **Real-time Monitoring**: Edge Enforcer tracks actual usage patterns against declared intents
- **Audit Trails**: Comprehensive logging of intent-based access for compliance verification
- **Usage Reconciliation**: Bilateral reporting with both Edge Enforcer and AI Agent/Operator
  reporting usage to License Server

### Contract and Legal Framework

- **Clear Permissions**: Each intent category defines specific allowed uses of content
- **Attribution Requirements**: Certain intents (like `quote`) require proper source attribution
- **Persistence Rights**: Intent definitions specify what data can be retained and for how long
- **Compliance Verification**: Intent-based access provides demonstrable adherence to publisher
  terms

---

## INFORMATIVE: Conclusion

**This section provides informative summary of the specification's purpose and benefits.**

Normative intent definitions provide the foundational vocabulary for controlled AI-content
interactions within the Peek-Then-Pay ecosystem. These standardized categories serve two critical
purposes:

### For Publishers: Enhanced Control and Brand Protection

Intent categories enable publishers to maintain granular control over how their content enters the
AI ecosystem:

- **Selective Access**: Define different pricing and permissions for different types of content use
- **Brand Integrity**: Control how content is transformed, summarized, or represented in AI systems
- **Revenue Optimization**: Price different intent types according to their value and computational
  requirements
- **Usage Transparency**: Monitor and audit exactly how AI systems interact with published content

### For AI Operators: Cost-Effective Compliance

Intent-based licensing provides AI systems with clear, legally compliant pathways to content
acquisition:

- **Precise Data Access**: Request only the specific data transformations needed for the use case
- **Cost Efficiency**: Pay for the exact level of content processing required, not broad access
  rights
- **Legal Certainty**: Operate within clearly defined permissions that demonstrate compliance with
  publisher requirements
- **Reduced Integration Complexity**: Use standardized intent categories across multiple publishers
  rather than negotiating individual agreements

By establishing this common vocabulary, normative intent definitions create the foundation for a
sustainable AI ecosystem where content creators maintain control while AI systems gain efficient,
compliant access to the data they need.

### Evidence-First AI: Search, Chunk, and QA Integration

Chunk retrieval is the lowest-level semantic evidence mechanism. **search** finds URLs; **chunk** finds spans within a URL; **qa** optionally synthesizes answers from these spans. When embeddings are provided by the client, they MUST correspond to a publisher-supported embedding model as declared in the active PricingScheme. Otherwise, the request MUST be rejected or downgraded to keyword mode.

This three-tier architecture enables evidence-first AI workflows:

1. **Discovery** (`search`): Identify relevant resources across a corpus using keyword, vector, or hybrid search
2. **Evidence Retrieval** (`chunk`): Extract precise, verifiable spans from identified resources with relevance ranking
3. **Synthesis** (`qa`, optional): Generate answers from extracted evidence with explicit citations

The embedding model compatibility requirements ensure that vector-based retrieval maintains semantic consistency. Cross-model comparison is explicitly prohibited because embeddings from different models occupy incompatible vector spaces. Publishers declare their supported embedding models via the PricingScheme, and clients MUST align their embedding generation with these declarations to ensure valid similarity comparisons.
