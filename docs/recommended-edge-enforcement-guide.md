# Recommended Edge Enforcement Implementation Guide

**⚠️ This is a specification with recommended implementation patterns. Publishers are free to
implement enforcement using any technology stack that meets the peek.json standard requirements.**

This guide provides recommended patterns for implementing peek.json enforcement at the edge layer,
ensuring AI agents never interact directly with tool service endpoints while maintaining security,
performance, and compliance with the standard.

## 🏗️ Architecture Principles

### Edge-Centric Design

The peek.json standard is designed for modern edge computing environments where enforcement happens
at the CDN/edge worker (enforcer) layer:

```
AI Agent → Enforcer (Edge Worker) → Tool Service → Enforcer → AI Agent
    ↓           ↓             ↓           ↓           ↓
  License    Validate     Process     Format      Return
  Headers    & Route      Content     Response    Content
```

**Core Benefits:**

- **🔒 Security**: Tool endpoints never publicly accessible
- **⚡ Performance**: Geographic distribution and caching
- **🛡️ Protection**: Natural DDoS mitigation and rate limiting
- **📊 Compliance**: Centralized audit trail and quota enforcement

### Enforcer Responsibilities

- License validation (JWT tokens, quotas)
- Bot detection (integrate with professional services)
- Request routing to appropriate backends
- Response formatting for AI agents
- Usage tracking and quota updates

### Tool Service Layer

- Internal access only; never exposed directly to AI agents
- Pre-authenticated requests from enforcers
- Implementation flexibility (internal, SaaS, hybrid)
- Horizontal scaling behind edge layer

## 🤖 Bot Detection Integration

Integrate with professional bot detection services (e.g., Cloudflare Bot Management, DataDome,
PerimeterX, AWS WAF) for robust request analysis and classification. Apply peek.json policies based
on detection results and enforce licensing for detected AI agents.

## 🔐 License Validation & Quota Enforcement

- Verify JWT tokens and remaining quotas
- Real-time usage tracking and budget validation
- Enforce per-tool rate limits from peek.json
- Handle license API outages per `failover_mode`

## 🔄 Enforcement Methods

| Enforcement Method | Description                                              |
| ------------------ | -------------------------------------------------------- |
| trust              | Serve raw content with license validation                |
| tool_required      | Route to internal tool service for processing            |
| both               | Respect AI agent preference for raw or processed content |

## 📋 Response Patterns

- Success responses should include cost and licensing headers
- Error responses: 402 (Payment Required), 403 (Tool Not Allowed), 429 (Quota Exceeded)

## 📊 Monitoring and Logging

- Track usage and record analytics for audit and compliance
- Log errors and monitor for unusual patterns

---

**Remember**: This guide provides recommended patterns. The peek.json standard is
implementation-agnostic, and publishers can use any technology stack that correctly implements the
specification requirements.
