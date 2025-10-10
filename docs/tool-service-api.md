# Tool Service API Guide

**Internal content processing services for `enforcement_method=tool_required` intents**

| Tool services provide content transformation behind edge en | Intent     | Typical Input Tokens | Output Tokens                                        | Processing Pattern | Cache TTL                   | Usage Context Fit |
| ----------------------------------------------------------- | ---------- | -------------------- | ---------------------------------------------------- | ------------------ | --------------------------- | ----------------- |
| `read`                                                      | N/A        | N/A                  | **Bypass tool service** (`enforcement_method=trust`) | N/A                | All contexts                |
| `summarize`                                                 | 1000-5000  | 100-500              | Synchronous LLM processing                           | 1-24 hours         | `immediate`, `session`      |
| `quote`                                                     | 500-2000   | 50-200               | Text extraction + formatting                         | 1-24 hours         | `immediate`, `session`      |
| `embed`                                                     | 500-2000   | Vector array         | Synchronous embedding model                          | 24 hours-7 days    | `session`, `index`          |
| `rag_ingest`                                                | 2000-10000 | 100-1000             | **Asynchronous** chunking + embedding                | 7-30 days          | `session`, `index`          |
| `analyze`                                                   | 2000-8000  | 500-2000             | Complex LLM analysis                                 | 30+ days           | `train`, `distill`, `audit` |
| `translate`                                                 | 1000-5000  | 1000-5000            | Language model processing                            | 1-24 hours         | `immediate`, `session`      |

**Cache TTL Strategy:**

- **Short TTL** (`immediate`, `session`): Content changes frequently, aggressive cache invalidation
- **Medium TTL** (`index`): Balance between cost savings and content freshness
- **Long TTL** (`train`, `distill`, `audit`): Static content analysis, maximum cost
  optimizationThese services are never exposed directly to AI agents - all access is routed through
  enforcers that handle license validation, budget management, and usage reporting.

## Key Architectural Constraints

- **Internal Only**: Never exposed to public internet or AI agents directly
- **Transformation Focus**: Only handle content processing - usage context irrelevant
- **Token Reporting**: Report input/output token usage to enforcer (not costs or budgets)
- **No License Logic**: Enforcers handle all JWT validation, budget tracking, and billing
- **Flexible Integration**: REST endpoints or MCP (Model Context Protocol) support
- **Enforcer Configuration**: Static tool mapping or dynamic MCP discovery

## Architecture Flow

```mermaid
flowchart TD
    enforcer[Edge Enforcer]
    tooling[Tool Service]

    enforcer -- "POST /process<br/>(content, intent, ULID)" --> tooling
    tooling -- "Response + token_usage<br/>(input_tokens, output_tokens)" --> enforcer

    %% Styling
    classDef enforcerStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef toolStyle fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class enforcer enforcerStyle
    class tooling toolStyle
```

### Enforcement Method Integration

- **`enforcement_method=trust`**: Bypasses tool services entirely - direct content serving
- **`enforcement_method=tool_required`**: Routes through tool service for processing
- **No hybrid modes**: Clear binary decision based on intent configuration

## Request/Response Interface

### Tool Service Request (from Enforcer)

**REST API Pattern:**

```typescript
POST /process
{
  content_url: "https://example.com/article",
  intent: "summarize",
  reservation_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV", // ULID for tracking
  parameters?: {
    output_format: "json",
    max_length?: 500,
    // Intent-specific parameters only
  }
}
```

**MCP (Model Context Protocol) Pattern:**

```typescript
// Tool discovery via MCP
GET /mcp/tools -> ["summarize", "embed", "rag_ingest", ...]

// Tool execution via MCP
{
  method: "tools/call",
  params: {
    name: "summarize",
    arguments: {
      content_url: "https://example.com/article",
      reservation_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      max_length: 500
    }
  }
}
```

### Tool Service Response (to Enforcer)

**REST API Response:**

```typescript
HTTP/1.1 200 OK
{
  content: "...", // Processed content
  token_usage: {
    input_tokens: 1500,
    output_tokens: 300
  },
  processing_time_ms: 1200,
  reservation_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV" // Echo back for correlation
}
```

**MCP Response:**

```typescript
{
  content: [{
    type: "text",
    text: "..." // Processed content
  }],
  _meta: {
    token_usage: {
      input_tokens: 1500,
      output_tokens: 300
    },
    processing_time_ms: 1200,
    reservation_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV"
  }
}
```

### What Tool Services DO NOT Handle

- ❌ License validation or JWT processing
- ❌ Budget management or cost calculations
- ❌ Agent identity or quota enforcement
- ❌ Usage context or retention policies (irrelevant to transformation)
- ❌ Usage reporting to license server (enforcer's responsibility)
- ❌ Reservation ID generation (provided by enforcer)

## Processing Flow & Budget Integration

### Synchronous Processing (with Caching)

```mermaid
sequenceDiagram
  participant Agent as AI Agent
  participant Enforcer as Edge Enforcer
  participant Cache as Cache Store
  participant Service as Tool Service
  participant License as License Server

  Agent->>Enforcer: Request + JWT license
  Enforcer->>Enforcer: Check content ETag/Last-Modified
  Enforcer->>Cache: Check cached result for content+intent+params

  alt Cache Hit (Content Unchanged)
    Cache-->>Enforcer: Cached result + original token_usage
    Enforcer->>Enforcer: Generate new ULID, minimal cost
  else Cache Miss or Content Changed
    Enforcer->>Enforcer: Generate ULID, reserve budget
    Enforcer->>Service: POST /process (content, ULID)
    Service->>Service: Process content
    Service-->>Enforcer: Content + token_usage + ULID
    Enforcer->>Cache: Store result + ETag + token_usage
  end

  Enforcer->>Enforcer: Calculate cost, commit budget
  Enforcer-->>Agent: Content + reservation_id (ULID)
  Enforcer->>License: POST /usage (reservation_id, cost/cache_hit)
  Agent->>License: POST /usage (reservation_id, metrics)
```

### Asynchronous Processing (`rag_ingest`, etc.)

```mermaid
sequenceDiagram
  participant Agent as AI Agent
  participant Enforcer as Edge Enforcer
  participant Service as Tool Service
  participant License as License Server

  Agent->>Enforcer: Request + JWT license
  Enforcer->>Enforcer: Generate ULID, reserve budget
  Enforcer->>Service: POST /process (content, ULID, webhook_url)
  Enforcer-->>Agent: 202 Accepted + reservation_id (ULID)
  Service->>Service: Async processing
  Service->>Enforcer: Webhook: completion + token_usage + ULID
  Enforcer->>Enforcer: Calculate cost, commit/release budget
  Enforcer->>Agent: Completion notification + reservation_id
  Enforcer->>License: POST /usage (reservation_id, final_cost)
  Agent->>License: POST /usage (reservation_id, completion_metrics)
```

## Intent Processing Patterns

### Token Usage by Intent Type

| Intent       | Typical Input Tokens | Output Tokens | Processing Pattern                                   | Usage Context Fit           |
| ------------ | -------------------- | ------------- | ---------------------------------------------------- | --------------------------- |
| `read`       | N/A                  | N/A           | **Bypass tool service** (`enforcement_method=trust`) | All contexts                |
| `summarize`  | 1000-5000            | 100-500       | Synchronous LLM processing                           | `immediate`, `session`      |
| `quote`      | 1000-3000            | 50-200        | Text extraction + formatting                         | `immediate`, `session`      |
| `embed`      | 500-2000             | Vector array  | Synchronous embedding model                          | `session`, `index`          |
| `rag_ingest` | 2000-10000           | 100-1000      | **Asynchronous** chunking + embedding                | `session`, `index`          |
| `analyze`    | 2000-8000            | 500-2000      | Complex LLM analysis                                 | `train`, `distill`, `audit` |
| `translate`  | 1000-5000            | 1000-5000     | Language model processing                            | `immediate`, `session`      |

### Error Handling & Timeouts

```typescript
// Tool service error response
HTTP/1.1 500 Internal Server Error
{
  error: "processing_failed",
  message: "Content extraction failed",
  reservation_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  partial_token_usage?: {
    input_tokens: 1500,
    output_tokens: 0
  }
}
```

**Critical**: Even on errors, report any token usage consumed for accurate billing.

## Implementation Guidelines

### Enforcer Configuration

**Static Configuration (REST):**

```typescript
// Enforcer config for tool routing
{
  tool_services: {
    "summarize": "https://internal.tools/summarize",
    "embed": "https://internal.tools/embed",
    "rag_ingest": "https://saas-provider.com/rag",
    "analyze": "https://internal.tools/analyze"
  }
}
```

**Dynamic Discovery (MCP):**

```typescript
// Enforcer discovers available tools
{
  mcp_endpoint: "https://internal.tools/mcp",
  // Enforcer queries /mcp/tools for available intents
  // Routes based on dynamic tool discovery
}
```

### Deployment Options

- **Publisher-Managed**: Internal services behind private networks
- **SaaS Integration**: Third-party services (OpenAI, Anthropic, etc.) with API key management
- **Hybrid**: Mix of internal and external services based on intent type
- **MCP-Based**: Dynamic tool discovery and execution via Model Context Protocol

### Performance Requirements

- **Synchronous intents**: < 30 second response time
- **Asynchronous intents**: Webhook callback within 5 minutes of completion
- **Token reporting**: Must be accurate for billing - measure actual consumption
- **MCP compatibility**: Support both REST endpoints and MCP tool discovery/execution

### Security Considerations

- **No public exposure**: Tool services should only accept enforcer requests
- **Pre-authenticated**: Enforcer handles all authentication/authorization
- **Content isolation**: Process each request independently without cross-contamination
- **MCP security**: Proper authentication for MCP tool discovery and execution

### Caching & Cost Optimization

**Content Change Detection:**

```typescript
// Enforcer checks content freshness before calling tooling
const content_headers = await HEAD(content_url);
const cache_key = `${intent}:${content_url}:${JSON.stringify(parameters)}`;
const cached_etag = await getCache(cache_key + ':etag');

if (content_headers.etag === cached_etag) {
  // Content unchanged - return cached result
  const cached_response = await getCache(cache_key);
  return {
    ...cached_response,
    reservation_id: generateULID(), // New ULID for billing
  };
}
```

**Cache Strategy:**

- **Cache Key**: `intent:content_url:parameters_hash`
- **Cache Validation**: ETag or Last-Modified header comparison
- **Cache Duration**: Based on usage context - `immediate` (short), `index` (longer)
- **Cost Savings**: Avoid redundant tooling calls for unchanged content
- **Fresh Reservation IDs**: Generate new ULIDs even for cached responses for billing accuracy

## Related Documentation

- **[Edge Enforcement Guide](recommended-edge-enforcement-guide.md)** – Complete enforcer
  implementation patterns
- **[License API](license-api.md)** – Bilateral reporting and budget management
- **[Usage Context Guide](usage-context-guide.md)** – Understanding usage types and pricing
  implications
- **[Normative Intent Definitions](normative-intent-definitions.md)** – Standard intent
  specifications
