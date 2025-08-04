# License Issuer API Specification (Tool-Based OAuth 2.0 Model)

This document defines the API used by AI systems to securely acquire, use, and manage licenses for accessing protected content using the Peek-Then-Pay standard with tool-based licensing. This version assumes centralized identity and billing via OAuth 2.0.

## 🔐 OAuth Server Examples

The OAuth Server in our flow can be implemented by various providers:

**SaaS License Providers:**
- **FetchRight.ai** - Turnkey AI content licensing with OAuth 2.0
- **LicenseAI** - Enterprise content licensing platform
- **ContentPass** - Publisher-focused licensing solutions

**Self-Hosted Solutions:**
- **Auth0** - Configure for AI content licensing use case
- **Keycloak** - Open-source identity and access management
- **Custom OAuth 2.0** - Built using libraries like `oauth2-server` (Node.js) or `Authlib` (Python)

**Enterprise Identity Providers:**
- **Microsoft Azure AD** - With custom scopes for content licensing
- **Google Identity Platform** - For Google Workspace integrated publishers
- **AWS Cognito** - For AWS-hosted licensing infrastructure

## 🏗️ Architecture: Edge-Centric Tool Processing

**Important**: AI systems **never directly access tool service endpoints**. All tool processing is handled by edge workers that route to internal backends based on publisher configuration.

```mermaid
graph TD
    A[AI System] --> B[Edge Worker/CDN]
    B --> C{License Valid?}
    C -->|No| D[402 Payment Required]
    C -->|Yes| E{Enforcement Method?}
    E -->|trust| F[Raw Content]
    E -->|tool_required| G[Tool Service]
    E -->|both| H{AI Preference?}
    H -->|trust| F
    H -->|tool_required| G
    G --> I[Processed Content]
    F --> J[Response to AI]
    I --> J
    
    style G fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
```

**Key Points:**
- 🔒 **Tool services are never exposed directly** to AI systems
- 🛡️ **Edge workers handle all license validation** and routing decisions
- 🔄 **AI systems interact only with edge workers** - consistent interface regardless of backend
- ⚙️ **Publishers configure tool routing** in edge worker settings, not in public peek.json

## 🌊 Overall Flow

### Two-Path Discovery Architecture

AI systems can discover and access content through two complementary paths:

```mermaid
sequenceDiagram
    participant AI as AI System
    participant Edge as CDN/Edge Worker
    participant Publisher as Content Publisher
    participant Auth as OAuth Server
    participant License as License API

    Note over AI,License: Path A: Proactive Discovery
    AI->>Publisher: GET /.well-known/peek.json
    Publisher-->>AI: Available tools & pricing
    AI->>Auth: Request OAuth token
    Auth-->>AI: Access token
    AI->>License: Request license with tools
    License-->>AI: License JWT + quotas
    AI->>Edge: GET /content with license headers
    Edge->>License: Validate & record usage
    Edge-->>AI: Content (raw or processed)

    Note over AI,License: Path B: Reactive Discovery (402 Response)
    AI->>Edge: GET /content (no license)
    Edge->>Edge: Detect bot via User-Agent
    Edge-->>AI: 402 Payment Required + peek.json
    AI->>Auth: Request OAuth token
    Auth-->>AI: Access token  
    AI->>License: Request license with tools
    License-->>AI: License JWT + quotas
    AI->>Edge: GET /content with license headers
    Edge->>License: Validate & record usage
    Edge-->>AI: Content (raw or processed)
```

---

## 🔍 Step 0: Discover Available Tools from Publisher

AI systems can discover available tools through two approaches:

### Option A: Proactive Discovery
AI systems proactively fetch the publisher's peek.json manifest before attempting content access.

```mermaid
flowchart TD
    A[AI System] --> B[GET /.well-known/peek.json from Publisher]
    B --> C{Response}
    C -->|200 OK| D[Parse Available Tools & Pricing]
    C -->|404 Not Found| E[No Peek Policy - Follow robots.txt]
    D --> F[Request License for Desired Tools]
```

### Option B: Reactive Discovery (402 Response)
AI systems attempt content access and receive peek.json in 402 Payment Required response.

```mermaid
flowchart TD
    A[AI System] --> B[GET /content from Publisher]
    B --> C[CDN/Edge Worker]
    C --> D{Bot Detection}
    D -->|Is Bot + No License| E[Return 402 Payment Required]
    D -->|Regular User| F[Serve Content Normally]
    E --> G[Response Body Contains peek.json]
    G --> H[Parse Available Tools & Pricing]
    H --> I[Request License for Desired Tools]
```

**402 Response Example:**
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-Peek-Policy-URL: https://example.com/.well-known/peek.json

{
  "error": "license_required",
  "message": "This content requires a valid license for AI access",
  "peek_policy": {
    "version": "1.0",
    "meta": {
      "site_name": "TechNews Daily",
      "publisher": "TechNews Corp",
      "domains": ["technews.com"]
    },
    "license": {
      "license_issuer": "https://api.technews.com/peek/license",
      "terms_url": "https://technews.com/legal/ai-terms",
      "tools": {
        "read_resource": {
          "allowed": true,
          "enforcement_method": "trust",
          "pricing": {"default_per_page": 0.01}
        },
        "summarize_resource": {
          "allowed": true,
          "enforcement_method": "both",
          "pricing": {"default_per_page": 0.03}
        }
      }
    }
  }
}
```

**Note**: Tool discovery happens directly with the publisher, not through the License API. The License API only handles account management, billing, and license issuance based on pricing information that publishers define in their peek.json files.

---

## 🔐 Step 1: OAuth 2.0 Authentication

All license-related endpoints require a valid OAuth 2.0 access token.

### POST /oauth/token

**Request (client credentials grant):**

```x-www-form-urlencoded
grant_type=client_credentials
&client_id=my-llm-agent
&client_secret=supersecret123
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Use the `access_token` as a Bearer token in all subsequent API requests.

---

## 💳 Step 2: Register Payment Method

### POST /api/payment-method

Registers a reusable payment method using a token from a secure billing provider (e.g., Stripe, Paddle).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "payment_method_token": "tok_stripe_abc123"
}
```

**Response:**
```json
{
  "payment_method_id": "pm_abc123"
}
```

---

## 🧾 Step 3: Request License for a Domain

Acquires a license to access content on a specific domain with specified tools.

```mermaid
flowchart TD
    A[AI System] --> B[POST /api/peek-license/domain]
    B --> C{License Request}
    C -->|Valid| D[Create License]
    C -->|Invalid Payment| E[Payment Error]
    C -->|Invalid Tools| F[Tool Error]
    D --> G[Generate JWT]
    G --> H[Return License + Quotas]
    E --> I[Fix Payment Method]
    F --> J[Review Available Tools]
    I --> B
    J --> B
```

### POST /api/peek-license/{domain}

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "monthly_limit": 50.00,
  "payment_method_id": "pm_abc123",
  "tools": ["peek_resource", "summarize_resource", "rag_query", "generate_embeddings"],
  "tool_limits": {
    "summarize_resource": 100,
    "rag_query": 200,
    "generate_embeddings": 500
  }
}
```

**Response:**
```json
{
  "license_id": "lic_001122",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "spend_remaining": 50.00,
  "licensed_tools": ["peek_resource", "summarize_resource", "rag_query", "generate_embeddings"],
  "tool_quotas": {
    "peek_resource": "unlimited",
    "summarize_resource": 100,
    "rag_query": 200,
    "generate_embeddings": 500
  }
}
```

---

## 📄 Step 4: Licensed Content Access (CDN/Edge Processing)

AI systems send licensed content requests with complete intent declaration. The CDN/Edge worker handles license validation, tool processing, and usage recording.

```mermaid
flowchart TD
    A[AI System] --> B[GET /content with license headers]
    B --> C[CDN/Edge Worker]
    C --> D{Validate JWT & Tool}
    D -->|Invalid| E[401 Unauthorized]
    D -->|Valid| F{Check Tool Permission & Budget}
    F -->|Not Licensed| G[403 Forbidden]
    F -->|Licensed| H{Enforcement Method}
    
    H -->|trust| I[Serve Raw Content]
    H -->|tool_required| J[Call Tool Service API]
    H -->|both - AI chose raw| I
    H -->|both - AI chose processed| J
    
    I --> K[Record Usage for read_resource]
    J --> L[Record Usage for specific tool]
    K --> M[Return Raw Content]
    L --> N[Return Processed Content]
```

### Complete Request Format

**GET https://example.com/articles/ai-ethics**

**Required Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Peek-License: lic_001122
X-Peek-Tool: summarize_resource
```

**Optional Headers for Enhanced Control:**
```http
X-Max-Page-Spend: 0.05
X-Output-Format: json
X-Prefer-Processing: tool_required
X-Attribution-Required: true
```

### Header Definitions

- **`Authorization: Bearer <jwt>`** - License JWT token from license API
- **`X-Peek-License: <license_id>`** - License identifier for tracking and validation
- **`X-Peek-Tool: <tool_name>`** - Declares intended use (read_resource, summarize_resource, etc.)
- **`X-Max-Page-Spend: <amount>`** - Maximum willing to pay for this specific page
- **`X-Output-Format: <format>`** - Preferred response format (json, markdown, plaintext)
- **`X-Prefer-Processing: <method>`** - Preference when enforcement_method is "both"
- **`X-Attribution-Required: <boolean>`** - Whether attribution metadata should be included

### CDN/Edge Worker Response Handling

**Option 1: Raw Content (trust or read_resource)**
```http
HTTP/1.1 200 OK
Content-Type: text/html
X-Peek-Cost: 0.01
X-Peek-Tool-Used: read_resource
X-Peek-License-Remaining: 49.99

<!DOCTYPE html>
<html>
<head><title>AI Ethics in 2025</title></head>
<body>
  <article>
    <h1>AI Ethics in 2025: A New Framework</h1>
    <p>As artificial intelligence continues to evolve...</p>
  </article>
</body>
</html>
```

**Option 2: Processed Content (tool_required)**
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Peek-Cost: 0.03
X-Peek-Tool-Used: summarize_resource
X-Peek-License-Remaining: 49.97
X-Peek-Processing: tool_required

{
  "summary": "## Key Points\n\n- AI ethics frameworks are evolving\n- New regulations proposed for 2025\n- Industry adoption challenges remain",
  "format": "markdown",
  "confidence_score": 0.95,
  "source_url": "https://example.com/articles/ai-ethics",
  "attribution": "AI Ethics in 2025: A New Framework, Example News, 2025-08-01"
}
```

### CDN/Edge Worker Internal Processing

The CDN/Edge worker performs the following operations for each licensed request:

```mermaid
sequenceDiagram
    participant AI as AI System
    participant Edge as CDN/Edge Worker
    participant Cache as Edge Cache
    participant License as License API
    participant Tool as Tool Service
    participant Origin as Origin Server

    AI->>Edge: GET /content with license headers
    
    Edge->>Edge: Parse headers (Authorization, X-Peek-Tool, etc.)
    Edge->>Cache: Check cached peek.json
    
    alt peek.json not cached
        Edge->>Origin: GET /.well-known/peek.json
        Origin-->>Edge: peek.json config
        Edge->>Cache: Cache peek.json (TTL: 1 hour)
    end
    
    Edge->>Edge: Validate tool is allowed & check enforcement_method
    
    Edge->>License: POST /validate JWT + tool + domain
    License-->>Edge: {valid: true, remaining_budget: 49.97}
    
    alt enforcement_method: "trust" OR tool: "read_resource"
        Edge->>Origin: GET /content (proxied request)
        Origin-->>Edge: Raw HTML content
        Edge->>License: POST /record usage
        Edge-->>AI: Raw content + cost headers
        
    else enforcement_method: "tool_required"
        Edge->>Tool: POST internal backend with content URL
        Tool->>Tool: Process content (pre-authenticated)
        Tool-->>Edge: Processed content (JSON)
        Edge->>License: POST /record usage
        Edge-->>AI: Processed content + cost headers
        
    else enforcement_method: "both"
        Edge->>Edge: Check X-Prefer-Processing header
        
        alt AI prefers tool_required OR no preference
            Edge->>Tool: POST internal backend
            Tool-->>Edge: Processed content
            Edge->>License: POST /record usage
            Edge-->>AI: Processed content
        else AI prefers trust
            Edge->>Origin: GET /content
            Origin-->>Edge: Raw content
            Edge->>License: POST /record usage
            Edge-->>AI: Raw content
        end
    end
```

### Error Scenarios

**Budget Exceeded:**
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": "insufficient_budget",
  "message": "Remaining budget ($0.01) insufficient for this page ($0.03)",
  "required_amount": 0.03,
  "remaining_budget": 0.01,
  "top_up_url": "https://api.technews.com/peek/license/lic_001122/topup"
}
```

**Tool Not Licensed:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "tool_not_licensed",
  "message": "Your license does not include access to 'train_on_resource'",
  "licensed_tools": ["peek_resource", "summarize_resource", "rag_query"],
  "upgrade_url": "https://api.technews.com/peek/license/lic_001122/upgrade"
}
```

**Service Endpoint Unavailable:**
```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json
Retry-After: 300

{
  "error": "service_unavailable",
  "message": "Tool service temporarily unavailable",
  "fallback": "trust",
  "fallback_available": true
}
```

If the tool is not licensed:

```http
HTTP/1.1 403 Forbidden
X-Error: tool_not_licensed
X-Available-Tools: peek_resource,rag_query,generate_embeddings
```

If the page is too expensive for the tool:

```http
HTTP/1.1 402 Payment Required
X-Required-Page-Spend: 0.07
X-Tool: summarize_resource
```

---

## 🔄 Step 4b: Service-Controlled Processing (Edge Worker Routing)

When publishers use `"tool_required"` or `"both"` enforcement, edge workers route requests to tool services based on the requested tool.

```mermaid
flowchart TD
    A[AI System] --> B[Request via Edge Worker]
    B --> C[Edge Worker]
    C --> D{License Valid?}
    D -->|Invalid| E[402 Payment Required]
    D -->|Valid| F{Tool & Quota Check}
    F -->|Not Allowed| G[403 Forbidden]
    F -->|Quota Exceeded| H[429 Rate Limited]
    F -->|Allowed| I[Route to Tool Service]
    I --> J[Tool Service Processing]
    J --> K[Edge Records Usage]
    K --> L[Return Processed Content]
```

**AI System Request to Edge:**

**Headers:**
```
Authorization: Bearer <jwt>
X-Peek-License: lic_001122
Content-Type: application/json
```

**Body:**
```json
{
  "url": "https://example.com/articles/ai-ethics",
  "output_format": "json"
}
```

**Response:**
```json
{
  "summary": "## Key Points\n\n- AI ethics frameworks are evolving...",
  "format": "markdown",
  "cost": 0.02,
  "tool": "summarize_resource"
}
```

---

## 📉 Step 5: Automated Usage Recording

### POST /api/peek-license/{domain}/{license_id}/record

CDN/Edge workers automatically report usage for metering and budget deduction. This happens transparently during content access.

**Called by:** CDN/Edge Worker (not directly by AI system)

**Headers:**
```
Authorization: Bearer <jwt>
X-Worker-Secret: <edge_worker_auth_token>
```

**Body for Raw Content Access:**
```json
{
  "url": "/articles/ai-ethics",
  "tool": "read_resource",
  "enforcement_method": "trust",
  "page_cost": 0.01,
  "content_length_kb": 45,
  "processing_time_ms": 120,
  "success": true,
  "client_ip": "203.0.113.1",
  "user_agent": "Mozilla/5.0 (compatible; ChatGPT)"
}
```

**Body for Tool-Required Processing:**
```json
{
  "url": "/articles/ai-ethics",
  "tool": "summarize_resource",
  "enforcement_method": "tool_required",
  "page_cost": 0.03,
  "output_format": "json",
  "processing_time_ms": 850,
  "success": true,
  "client_ip": "203.0.113.1",
  "user_agent": "Mozilla/5.0 (compatible; ChatGPT)"
}
```

**Response:**
```json
{
  "spend_remaining": 49.97,
  "pages_fetched": 1,
  "total_spent": 0.03,
  "tool_usage": {
    "summarize_resource": {
      "pages_used": 1,
      "quota_remaining": 99,
      "total_cost": 0.03
    }
  },
  "notifications_sent": []
}
```

---

## 🔐 JWT License Structure (suggested)

```mermaid
graph TD
    A[JWT Token] --> B[Decode & Verify]
    B --> C{Valid Signature?}
    C -->|No| D[Reject Request]
    C -->|Yes| E{Domain Match?}
    E -->|No| F[Reject - Wrong Domain]
    E -->|Yes| G{Token Expired?}
    G -->|Yes| H[Reject - Expired]
    G -->|No| I{Tool Allowed?}
    I -->|No| J[403 - Tool Not Licensed]
    I -->|Yes| K{Quota Available?}
    K -->|No| L[429 - Quota Exceeded]
    K -->|Yes| M[Allow Request]
```

```json
{
  "sub": "lic_001122",
  "scope": "example.com",
  "monthly_limit": 50.00,
  "tools": ["peek_resource", "summarize_resource", "rag_query", "generate_embeddings"],
  "tool_quotas": {
    "peek_resource": -1,
    "summarize_resource": 100,
    "rag_query": 200,
    "generate_embeddings": 500
  },
  "exp": 1722120000
}
```

The Cloudflare Worker should verify the JWT signature and ensure:
- `scope` matches the current domain
- `exp` has not passed
- The requested `tool` is included in the `tools` array
- The tool hasn't exceeded its quota (if applicable)
