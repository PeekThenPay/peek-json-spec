# Edge Enforcement Implementation Guide

**Implementation patterns for peek.json enforcement at the edge layer**

> **📋 Document Status**: This document provides **RECOMMENDED** implementation patterns and best
> practices. These are not normative requirements but represent proven approaches for implementing
> the Peek-Then-Pay specification. For normative requirements, see
> [Normative Intent Definitions](./normative-intent-definitions.md).

This guide provides recommended patterns for implementing usage-based pricing enforcement with
bilateral reporting, bot detection, and composable tooling services.

## Architecture Overview

### Edge-First Enforcement Model

```
AI Agent → Bot Detection → Edge Enforcer → [Tooling Service] → Response + reservation_id
   ↓             ↓              ↓              ↓                      ↓
License JWT   Classify       Validate       Process              Content + ID
              Request        Budget         Content             (if required)
```

### Critical Design Principles

1. **Enforcer Authority**: Edge enforcer is the sole budget authority and license validator
2. **Bilateral Reporting**: Both enforcer and agent report usage via `reservation_id` coordination
3. **Composable Tooling**: Configurable services report token usage, not budgets
4. **Bot Detection Integration**: Professional services (Cloudflare Enterprise, etc.) handle
   detection
5. **Async Budget Management**: Reservation-based model for async operations (`rag_ingest`, etc.)

### Component Responsibilities

#### Edge Enforcer (Cloudflare Worker, etc.)

- **License Validation**: JWT verification, permission checking, budget validation
- **Budget Management**: Local quota tracking, reservation/commitment for async operations
- **Usage Reporting**: Reports actual costs with `reservation_id` to license server
- **Response Coordination**: Includes `reservation_id` in all agent responses for bilateral tracking

#### Bot Detection Service (External SaaS)

- **Traffic Classification**: Identify AI agents vs. human traffic
- **Professional Integration**: Cloudflare Enterprise, DataDome, PerimeterX, AWS WAF
- **Routing Decision**: Route detected bots to enforcer, humans to standard content

#### Tooling Services (Configurable)

- **Token Reporting**: Report input/output token usage to enforcer (not costs)
- **Flexible Deployment**: Publisher-provided, third-party SaaS, or hybrid solutions via REST or MCP
  protocols
- **No Budget Logic**: Focus on computation, not financial or licensing concerns

## License Validation Flow

### 1. Bot Detection & Routing

- **Professional Services**: Integrate Cloudflare Enterprise, DataDome, PerimeterX for bot
  classification
- **Agent Detection**: Route identified AI agents to enforcer; humans (and whitelisted search crawlers) to standard content delivery
- **Traffic Shaping**: Apply peek.json policies only to detected automated traffic
- **Non-Auto-Peek Publishers**: Even when `allow_auto_peek: false`, include
  [bot guidance headers](headers-and-content-negotiation.md#bot-guidance-headers-for-non-auto-peek-publishers)
  to encourage license acquisition

### 2. License & Budget Validation

```typescript
// Enforcer validation sequence
const validation = {
  jwt_valid: await validateJWT(request.headers.authorization),
  permissions: extractPermissions(jwt),
  budget_check: await checkLocalBudget(permissions, estimated_cost),
  reservation_id: generateULID(), // ULID for reservation tracking
};
```

### 3. Usage Context & Enforcement Methods

| Enforcement Method | Implementation           | Purpose & Use Cases                                                                                                                                                                                                                 |
| ------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trust`            | Direct content serving   | **Two scenarios**: (1) **AI Agent Processing** - agents receive raw content and run their own transformation pipelines, (2) **Publisher Flexibility** - publishers can license intents without implementing transformation services |
| `tool_required`    | Route to tooling service | Publisher-controlled content transformation before delivery to AI agents                                                                                                                                                            |

## Unlicensed Request Handling (NORMATIVE)

Edge enforcers MUST handle unlicensed requests with the following logic:

### HTTP 203 - Preview Response

**When to return HTTP 203:**

- Bot detected (not whitelisted) + No `X-PTP-Intent` header + license provided
- Publisher allows preview content (peek enabled)

**Requirements:**

- Response MUST conform to `ptp-peek.schema.json`
- MUST include `peekManifestUrl` for licensing discovery
- MUST comply with [normative preview constraints](normative-intent-definitions.md#normative-preview-response-requirements)
- SHOULD include bot guidance headers for licensing negotiation

**Example:**

```http
HTTP/1.1 203 Non-Authoritative Information
Content-Type: application/vnd.peek+json
X-PTP-License-Endpoint: https://api.example.com/pricing?publisher_id=01HQ2Z3Y4K5M6N7P8Q9R0S1T1X
X-PTP-License-Required: true
X-PTP-Supported-Intents: read,summarize,embed

{
  "type": "peek",
  "canonicalUrl": "https://example.com/article",
  "title": "AI Content Licensing Guide",
  "snippet": "This article explores new models for AI content licensing...",
  "mediaType": "text/html",
  "peekManifestUrl": "https://example.com/.well-known/peek.json"
}
```

### HTTP 403 - Invalid License

**When to return HTTP 403:**

- Request includes `X-PTP-Intent` header and/or license token
- Provided license is invalid, expired, or insufficient for requested intent

**Requirements:**

- SHOULD include bot guidance headers for re-licensing
- If peek is enabled, SHOULD include preview content conforming to `ptp-peek.schema.json`
- Error context SHOULD indicate license issue and re-licensing path

**Example with preview (when peek enabled):**

```http
HTTP/1.1 403 Forbidden
Content-Type: application/vnd.peek+json
X-PTP-License-Endpoint: https://api.example.com/pricing?publisher_id=01HQ2Z3Y4K5M6N7P8Q9R0S1T1X
X-PTP-License-Required: true
X-PTP-Supported-Intents: read,summarize,embed

{
  "type": "peek",
  "canonicalUrl": "https://example.com/article",
  "title": "AI Content Licensing Guide",
  "snippet": "This article explores new models for AI content licensing...",
  "mediaType": "text/html",
  "peekManifestUrl": "https://example.com/.well-known/peek.json",
  "error": "invalid_license",
  "message": "Provided intent 'read' not supported by current license"
}
```

**Example without preview (when peek disabled):**

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json
X-PTP-License-Endpoint: https://api.example.com/pricing?publisher_id=01HQ2Z3Y4K5M6N7P8Q9R0S1T1X
X-PTP-License-Required: true
X-PTP-Supported-Intents: read,summarize,embed

{
  "error": "insufficient_budget",
  "message": "License budget available '$0.10' insufficient for intent 'read' estimated cost '$0.14'"
}
```

**Supported Error Types:**

- `invalid_license` - Intent not supported or usage not allowed by license
  - Example: "Provided intent 'read' not supported by current license"
  - Example: "Provided usage 'train' not allowed by current license"
- `insufficient_budget` - License budget insufficient for requested operation
  - Example: "License budget available '$0.10' insufficient for intent 'read' estimated cost '$0.14'"
- `license_expired` - License has expired
  - Example: "License expired at '2025-10-14T11:50:00-05:00'"

## Budget Management Implementation

### Synchronous Operations

```typescript
// Reserve → Process → Commit → Respond
const reservation_id = generateULID(); // ULID format
const reservation = await reserveBudget(reservation_id, estimated_cost);
const result = await processContent(content, intent);
const actual_cost = calculateCost(result.tokens);
await commitBudget(reservation_id, actual_cost);
return { content: result, reservation_id };
```

### Asynchronous Operations (`rag_ingest`, etc.)

```typescript
// Reserve → Initiate → Callback → Commit/Release
const reservation_id = generateULID(); // ULID format for async tracking
const reservation = await reserveBudget(reservation_id, estimated_cost);
const job = await initiateAsync(content, intent, reservation_id);
// Later: webhook/polling completion with same ULID
await handleAsyncCompletion(reservation_id, actual_tokens);
```

## Bilateral Usage Reporting

### Enforcer Reporting (Required)

```typescript
POST /usage {
  reservation_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV", // ULID format
  permission: "summarize:immediate",
  actual_cost: 0.05,
  tokens_in: 1500,
  tokens_out: 300,
  processing_time_ms: 1200
}
```

### Agent Reporting (Required)

```typescript
POST /usage {
  reservation_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV", // Same ULID from enforcer response
  client_success: true,
  latency_ms: 1850,
  content_received: true,
  quality_score: 0.95
}
```

## Response Headers & Error Codes

### Success Response Headers

```http
HTTP/1.1 200 OK
X-Peek-Reservation-ID: 01ARZ3NDEKTSV4RRFFQ69G5FAV
X-Peek-Cost: 0.05
X-Peek-Tokens-Used: 1800
X-Peek-Budget-Remaining: 4.95
Content-Type: application/json
```

### Standard Error Responses

- **203 Non-Authoritative Information**: Preview content provided, full access requires license
- **403 Forbidden**: Permission denied for requested intent:usage combination
- **429 Too Many Requests**: Rate limiting or quota exceeded
- **503 Service Unavailable**: Tooling service failure (check `failover_mode`)

## Monitoring & Compliance

### Required Metrics

- **Budget Accuracy**: Enforcer vs. agent reported costs correlation
- **Reservation Lifecycle**: Track reservation → commitment/release patterns
- **Async Completion Rates**: Monitor webhook/polling success for async operations
- **Permission Usage Patterns**: Intent:usage combination frequencies

### Audit Trail Requirements

- **Bilateral Reports**: Both enforcer and agent reports for every transaction
- **Reservation Tracking**: Complete lifecycle from creation to resolution
- **Token Attribution**: Link tooling service token reports to final billing

## Related Documentation

- **[License API](license-api.md)** – Complete API specification with workflow diagrams
- **[Usage Context Guide](usage-context-guide.md)** – Usage types, retention policies, and pricing
  implications
- **[Validation Utilities](validation-utilities.md)** – Technical reference for implementation
- **[Normative Intent Definitions](normative-intent-definitions.md)** – Standard intent categories

---

**Implementation Note**: This guide provides recommended patterns for robust production deployment.
The peek.json standard is implementation-agnostic - publishers can use any technology stack that
correctly implements the specification requirements, bilateral reporting, and usage-based pricing
model.
