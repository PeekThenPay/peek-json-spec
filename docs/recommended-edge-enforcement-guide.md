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
- **Agent Detection**: Route identified AI agents to enforcer; humans to standard content delivery
- **Traffic Shaping**: Apply peek.json policies only to detected automated traffic

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

| Enforcement Method | Implementation           | Usage Context Applicability            |
| ------------------ | ------------------------ | -------------------------------------- |
| `trust`            | Direct content serving   | All contexts - simple budget deduction |
| `tool_required`    | Route to tooling service | Context-dependent processing required  |

**Key Point**: `enforcement_method=trust` bypasses tooling services entirely - critical for
performance and `immediate` usage context optimization.

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

- **402 Payment Required**: Insufficient budget or invalid license
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
