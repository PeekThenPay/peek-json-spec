# Peek-Then-Pay (peek.json Specification)

**Usage-based pricing and bilateral reporting for AI-era content licensing**

> **📋 Specification Status**: This document provides an **INFORMATIVE** overview of the
> Peek-Then-Pay system. For **NORMATIVE** implementation requirements, see the document index below.

## 📚 Document Index

| Document                                                                   | Status           | Purpose                                                            |
| -------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| **[README.md](README.md)**                                                 | 🔵 Informative   | Overview, architecture, and rationale                              |
| **[Normative Intent Definitions](./docs/normative-intent-definitions.md)** | 🔴 **Normative** | **REQUIRED**: Core intent categories, JWT security, usage contexts |
| **[peek.json Field Reference](./docs/peek-manifest-fields.md)**            | 🔴 **Normative** | **REQUIRED**: Manifest field definitions and schema compliance     |
| **[Edge Enforcement Guide](./docs/recommended-edge-enforcement-guide.md)** | 🟡 Recommended   | **BEST PRACTICES**: Implementation patterns and architecture       |
| **[Tool Service API](./docs/tool-service-api.md)**                         | 🟡 Recommended   | **GUIDELINES**: Service integration patterns                       |
| **[License API](./docs/license-api.md)**                                   | 🔵 Informative   | API examples and usage patterns                                    |
| **[Usage Context Guide](./docs/usage-context-guide.md)**                   | 🔵 Informative   | Context explanations and examples                                  |

**Legend:**

- 🔴 **Normative** = MUST implement for compliance (uses RFC 2119 keywords)
- 🟡 **Recommended** = SHOULD implement for consistency
- 🔵 **Informative** = MAY reference for guidance

## The Problem & Solution

Current AI-content relationships are binary: publishers either allow unlimited crawling or block AI
agents entirely with paywalls. This binary approach creates problems:

- **Publishers lose AI visibility**: Blocked content doesn't appear in AI-powered search and
  recommendations
- **No access control granularity**: Publishers can't differentiate between free discovery content
  and premium monetized content
- **Agents can't make informed decisions**: No way to preview content value before committing to
  licensing costs

**Peek-Then-Pay provides the missing "movie preview" model**: when AI agents encounter license-gated
content, they receive a **preview/peek** of the content along with clear licensing terms, enabling
informed access decisions.

This allows publishers to:

1. **Control monetization boundaries** - decide what content should be freely discoverable vs.
   license-gated
2. **Maintain AI discoverability** - provide previews so content still appears in AI search and
   recommendations
3. **Enable informed licensing** - agents can evaluate content value before paying for full access

### Core Innovation: Intent-Based Pricing for Pre-Transformed Content

Raw content pricing is difficult - what's a webpage "worth" and for what purpose? Peek-Then-Pay
solves this by combining **intent-specific transformations** with **usage-based pricing**:

| Usage Context | Frequency | What Agents Get                   | Value Proposition                        |
| ------------- | --------- | --------------------------------- | ---------------------------------------- |
| `immediate`   | ~60%      | Clean summaries, translations     | Clear, actionable results vs. raw HTML   |
| `session`     | ~25%      | Structured Q&A, embeddings        | Ready-to-use context for multi-turn chat |
| `index`       | ~10%      | Publisher embeddings, metadata    | Pre-computed vectors vs. DIY processing  |
| `train`       | <3%       | Training-ready datasets           | Curated, clean data for fine-tuning      |
| `distill`     | <2%       | Knowledge graphs, structured data | Semantic understanding vs. raw text      |
| `audit`       | <1%       | Provenance, attribution data      | Compliance-ready content access          |

### Economic Benefits for Both Sides

**For AI Systems:**

- **Clear value pricing** - pay for specific transformations (summarization, embeddings) rather than
  ambiguous "content access"
- **CPU/time savings** - receive pre-processed, clean data instead of raw HTML parsing and
  transformation
- **Access to publisher investments** - leverage embeddings and preprocessing publishers already
  create for their own AI features

**For Publishers:**

- **Monetize existing AI investments** - publishers already create embeddings for on-site
  search/chat; licensed access distributes costs across multiple AI systems
- **Shared infrastructure costs** - one embedding computation serves multiple licensed AI agents vs.
  each agent computing separately
- **Value-aligned pricing** - charge based on what agents actually receive (structured data,
  embeddings) rather than arbitrary "page access"

### Architecture Overview

```
AI Agent → Bot Detection → Edge Enforcer → [Tool Service] → Content + tracking_id
   ↓              ↓             ↓              ↓                    ↓
License JWT   Classify      Validate       Transform           Bilateral Usage
              Traffic       Budget         (optional)          Reporting
```

**Key Components:**

- **Edge Enforcement**: Publishers validate licenses and manage budgets at CDN/edge layer
- **Bilateral Reporting**: Both enforcer and agent report usage for accuracy and dispute resolution
- **Composable Tooling**: Optional content transformation via REST or MCP protocols
- **Usage Context Pricing**: Different retention policies enable fair, nuanced pricing models

**The "Peek" Mechanism**: When AI agents request license-gated content, they receive:

- **Content preview/snippet** - enough to understand value proposition
- **[`peek.json` manifest](docs/peek-manifest-fields.md)** - available licensing terms and pricing
- **Informed choice** - agents can decide whether full content access justifies the licensing cost

This ensures publishers maintain AI discoverability while enabling fair monetization of premium
content access.

The specification provides standardized contracts across discrete boundaries to maintain and

## Specification Components

- **[`peek.json` manifest](docs/peek-manifest-fields.md)** — Publisher content discovery and terms
- **[`pricing.schema.json`](schema/pricing.schema.json)** — Usage-based pricing configuration
- **[License API](docs/license-api.md)** — JWT licensing with bilateral usage reporting
- **[Edge Enforcement Guide](docs/recommended-edge-enforcement-guide.md)** — Publisher
  implementation patterns
- **[Tool Service API](docs/tool-service-api.md)** — Content transformation services (REST/MCP)
- **[Usage Context Guide](docs/usage-context-guide.md)** — Retention policies and pricing
  implications
- **[Normative Intent Definitions](docs/normative-intent-definitions.md)** — Standard AI interaction
  patterns

**Standard Intents**: `read`, `quote`, `summarize`, `embed`, `translate`, `analyze`, `qa`, `search`,
`rag_ingest`

For historical context, see [From robots.txt to peek.json](docs/robots-to-peek.md).

Peek-Then-Pay addresses this gap by defining an **open standard** for discovery
([`peek.json`](docs/peek-manifest-fields.md)), licensing ([License API](docs/license-api.md)),
enforcement ([Edge Enforcement Guide](docs/recommended-edge-enforcement-guide.md)), and tooling
([Tool Service Guide](docs/tool-service-api.md)). It doesn’t replace existing solutions—it provides
a **cohesive starting point** that connects them into a framework that is fair, extensible, and
mutually beneficial.

For historical context and the evolution from robots.txt to peek.json, see
[From robots.txt to peek.json](docs/robots-to-peek.md).

---

## How It Works

1. **Content Discovery** — Publishers serve `/.well-known/peek.json` manifests defining licensing
   terms
2. **Peek Response** — License-gated content returns 402 Payment Required + content preview +
   licensing options
3. **Informed Licensing** — Agents evaluate preview, choose appropriate usage context, acquire JWT
   license
4. **Edge Enforcement** — Publishers validate licenses and manage usage-based budgets at CDN/edge
   layer
5. **Bilateral Reporting** — Both enforcers and agents report usage for billing accuracy and dispute
   resolution
6. **Composable Tooling** — Optional content transformation via publisher or third-party services

---

## For Publishers

- **Stay in Control** — Enforce access policies directly at your domain edge (via Workers/CDNs),
  without ceding content to third-party proxies.
- **Simple Monetization** — Define pricing once, and rely on a central License Server to manage
  payments and operator accounts.
- **AI-Ready by Default** — Provide optional transforms (summarization, search, ingestion) so your
  content is consistently represented in AI systems.
- **Extend Your Reach** — Smaller publishers gain visibility in a shared marketplace, surfacing in
  AI discovery where they might otherwise be missed.
- **Brand Integrity** — Ensure that when your content is summarized, ingested, or used in AI
  contexts, it reflects your voice and standards.

---

## For LLMs & Agents

- **Unified Access** — Discover participating publishers automatically through `peek.json`
  manifests.
- **One Integration, Many Publishers** — Acquire licenses and handle payments centrally, without
  negotiating with thousands of sites individually.
- **Lower Compute Costs** — Use publisher-provided search, summarization, and transforms to avoid
  expensive, repeated crawling and context building.
- **Structured Contracts** — Operate within a clear legal and technical framework, reducing risk and
  improving compliance.
- **Extensible Tooling** — Access publisher-defined tools (via REST or MCP) for specialized use
  cases (training ingestion, semantic search, etc.).

---

## Key Components

- **Publisher**: Hosts `peek.json`, implements edge enforcement, provides optional tooling services
- **License Server**: Centralized JWT licensing, usage-based pricing, bilateral usage reporting
- **Edge Enforcer**: Publisher-hosted CDN/worker that validates licenses and manages local budgets
- **Bot Detection**: Professional services (Cloudflare Enterprise, etc.) for AI traffic
  classification
- **Tool Services**: Configurable content transformation via REST or MCP protocols

**Implementation Flexibility**: Publishers choose build vs. buy for each component while maintaining
interoperability through standardized APIs and JWT licensing.

For technical implementation details, see [Validation Utilities](docs/validation-utilities.md).

---

## A Starting Point

Peek-Then-Pay is not a finished solution to every challenge—it is a **starting point**. By defining
standards for discovery, licensing, enforcement, and tooling, it creates the groundwork for a fair
and extensible ecosystem.

This project is open source and community-driven. By working together, publishers, operators, and
developers can evolve it into a standard that ensures the web remains both **sustainable for
creators** and **usable for AI systems**.

---

## Contributing

Contributions are welcome:

- Propose changes to the specification
- Improve documentation and examples
- Build reference implementations
- Develop publisher or operator tooling

Together, we can make Peek-Then-Pay the **contract of trust** between publishers and the AI systems
that depend on their content.
