# Usage Context Guide

**Defining content access patterns and retention policies for AI-era publishing**

---

## Overview

Usage context is a fundamental parameter in Peek-Then-Pay that determines how content can be
retained, processed, and monetized. Rather than treating all content access equally, the usage
context system recognizes that different AI applications have vastly different retention needs, risk
profiles, and value propositions.

This guide defines the core usage spectrum, provides implementation guidance, and establishes
pricing frameworks for publishers and operators.

---

## The Core Usage Spectrum

| Usage         | Persistence                                                   | Relative Frequency | Example Intents / Actions             | Primary Use-Case                                                                           |
| ------------- | ------------------------------------------------------------- | ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| **immediate** | No retention beyond one API call                              | ★★★★★ (≈50–60%)    | read, summarize, quote, translate, qa | One-shot access to content to fulfill a single prompt or answer.                           |
| **session**   | Ephemeral cache or short-term reuse (minutes–hours)           | ★★★★☆ (≈25–30%)    | rag_ingest, embed, read, qa           | Building short-lived context or vector stores for multi-turn chat, search, or live agents. |
| **index**     | Persistent but updatable retrieval index (days–weeks)         | ★★★☆☆ (≈10%)       | embed, rag_ingest                     | Maintaining ongoing search or assistant indexes (Perplexity, Bing, Copilot).               |
| **train**     | Permanent model incorporation                                 | ★☆☆☆☆ (<3%)        | analyze, embed                        | Fine-tuning or pre-training models on licensed content.                                    |
| **distill**   | Semi-permanent; used to generate synthetic or derivative data | ★☆☆☆☆ (<2%)        | summarize, qa, analyze                | Creating synthetic datasets for fine-tuning or model distillation.                         |
| **audit**     | Temporary, but tied to compliance processes                   | ☆☆☆☆☆ (<1%)        | analyze, qa                           | Model auditing, provenance tracing, or bias / fact checking.                               |

---

## Detailed Usage Definitions & Examples

### 🟢 immediate

**Meaning:** Used right now to produce a transient output. No caching or reuse.

**Used by:** ChatGPT browsing mode, Perplexity "view page," Gemini's live citations.

**Example:** The LLM retrieves a publisher's article, extracts 2 paragraphs, summarizes them, and
answers a user query — then discards everything.

**Publisher relevance:**

- Default lowest price tier
- High request volume, low retention risk
- Great for incremental per-request monetization

**Implementation:**

```http
X-PTP-Usage: immediate
X-PTP-Intent: read
```

---

### 🟡 session

**Meaning:** Allowed to store embeddings or text snippets in a short-lived in-memory or on-disk
cache (RAG context).

**Used by:** Agents like Perplexity, You.com, Claude's "Projects," Copilot for docs.

**Example:** Agent loads 10 pages into a session index to answer multiple related user queries for
10 minutes. The cache auto-expires afterward.

**Publisher relevance:**

- Moderate pricing (more value per call)
- Enables realistic agent workflows
- TTL-based enforcement (max_session_ttl, max_cached_tokens)

**Implementation:**

```http
X-PTP-Usage: session
X-PTP-Intent: embed
X-PTP-Session-TTL: 600
```

---

### 🟠 index

**Meaning:** Long-term index for retrieval — e.g., keeping embeddings for weeks or months.

**Used by:** Search engines, enterprise copilots, news summarizers.

**Example:** The agent indexes hundreds of articles daily, refreshing the vector store weekly to
keep retrieval results current.

**Publisher relevance:**

- Blurs into "train" territory for enforcement
- Should require a contract or premium pricing tier
- Often priced per 1K embeddings or per refresh cycle

**Implementation:**

```http
X-PTP-Usage: index
X-PTP-Intent: rag_ingest
X-PTP-Index-TTL: 604800
```

---

### 🔴 train

**Meaning:** Durable incorporation of content into model weights. Non-revocable.

**Used by:** OpenAI, Anthropic, Meta (licensed corpora); specialized fine-tuning pipelines.

**Example:** Publisher licenses 10M tokens for use in fine-tuning an alignment model. The dataset is
stored and used to update model parameters.

**Publisher relevance:**

- High-value, low-frequency
- Typically negotiated or requires an API "train" flag and audit webhook
- Pricing can be 100×–1000× above "immediate"

**Implementation:**

```http
X-PTP-Usage: train
X-PTP-Intent: read
X-PTP-Training-Purpose: fine_tuning
```

---

### 🟣 distill

**Meaning:** Used to generate synthetic data or derived models (knowledge distillation).

**Used by:** Model builders creating smaller "student" models from curated corpora.

**Example:** The LLM reads articles, produces Q&A pairs or summaries, then uses those as training
examples for a compact model.

**Publisher relevance:**

- Should be explicit; intermediate between "train" and "immediate"
- Often priced like training but flagged differently in license
- Creates derivative works that may compete with original content

**Implementation:**

```http
X-PTP-Usage: distill
X-PTP-Intent: qa
X-PTP-Derivative-Purpose: synthetic_qa
```

---

### 🔵 audit

**Meaning:** Used for model validation, compliance, or watermark / provenance detection.

**Used by:** AI labs and watchdog orgs verifying model alignment, verifying whether a model
memorized text.

**Example:** Compliance team retrieves original licensed content to compare with model output and
confirm non-infringement.

**Publisher relevance:**

- Edge case; low volume, sometimes free or reverse-paid (publishers may want it)
- Should be explicitly whitelisted
- Often supports publisher interests in compliance and attribution

**Implementation:**

```http
X-PTP-Usage: audit
X-PTP-Intent: read
X-PTP-Audit-Purpose: memorization_check
```

---

## Suggested Pricing Hierarchy

| Usage         | Pricing multiplier | Example baseline 1¢ → | Comment                            |
| ------------- | ------------------ | --------------------- | ---------------------------------- |
| **immediate** | ×1                 | $0.01                 | baseline micro-call                |
| **session**   | ×2                 | $0.02                 | ephemeral caching rights           |
| **index**     | ×5                 | $0.05                 | persistent index, medium retention |
| **train**     | ×100–×1000         | $1.00–$10.00          | durable, contractual               |
| **distill**   | ×50                | $0.50                 | synthetic derivative creation      |
| **audit**     | ×0–×1              | free–$0.01            | often subsidized                   |

---

## Implementation Guidance

### For Publishers

1. **Define Usage Policies:** Specify which usage contexts you support in your pricing manifest
2. **Set Pricing Tiers:** Use multipliers to reflect the value and risk of different usage patterns
3. **Implement Enforcement:** Validate usage context and apply appropriate retention policies
4. **Monitor Compliance:** Track usage patterns and audit for policy violations

### For Operators

1. **Declare Usage Honestly:** Specify the actual intended use, not just the cheapest option
2. **Respect Retention Limits:** Honor the persistence rules for each usage context
3. **Budget Appropriately:** Factor usage context into cost calculations
4. **Plan for Audits:** Maintain records to demonstrate compliance with usage terms

---

## Pricing Configuration Structure

Publishers configure usage-based pricing in their pricing manifests using the following structure:

### Intent Pricing with Usage Context

```json
{
  "intents": {
    "read": {
      "intent": "read",
      "pricing_mode": "per_request",
      "enforcement_method": "trust",
      "usage": {
        "immediate": { "price_cents": 1 },
        "session": { "price_cents": 2, "max_ttl_seconds": 86400 },
        "index": { "price_cents": 5, "requires_contract": true },
        "train": { "price_cents": 500, "requires_contract": true },
        "distill": { "price_cents": 250, "requires_contract": true },
        "audit": { "price_cents": 0 }
      }
    }
  }
}
```

### Usage Pricing Options

Each usage context can specify:

- **`price_cents`** (required): Base price in cents according to the intent's pricing_mode
- **`max_ttl_seconds`** (optional): Maximum retention time for cached content
- **`requires_contract`** (optional): Whether separate agreements are needed (defaults to false)

**Note:** The presence of a usage type in the `usage` object indicates it is allowed. Omitting a
usage type means it is not supported for that intent.

---

## Future Extensions

The usage context system is designed to be extensible. Future usage types might include:

- **research** - Academic and non-commercial research use
- **public_service** - Government and NGO applications
- **educational** - Classroom and learning management systems
- **archive** - Long-term preservation with limited access

Publishers can define custom usage types and pricing in their manifests, enabling new business
models as the ecosystem evolves.
