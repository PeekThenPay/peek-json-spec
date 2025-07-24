# Peek-Then-Pay: AI Access Policy Specification (v1.0)
## The Natural Evolution of robots.txt for the AI Era

The `peek.json` manifest evolves the 31-year-old robots.txt standard to enable fair, equitable engagement between content publishers and AI systems. Where robots.txt provided binary allow/disallow controls for search crawlers, peek.json provides nuanced, value-based access policies for MCP clients and LLMs.

## From robots.txt to peek.json: A Historical Perspective

**1994**: robots.txt enabled websites to communicate with search engine crawlers
```
User-agent: *
Disallow: /private/
```

**2025**: peek.json enables websites to engage fairly with AI systems
```json
{
  "tools": {
    "peek_resource": {"allowed": true, "license_required": false},
    "summarize_resource": {"allowed": true, "pricing": {"default_per_page": 0.02}},
    "train_on_resource": {"allowed": false}
  }
}
```

## Key Features: Building on robots.txt Principles

- **Tool-based access control**: Fine-grained permissions beyond binary allow/disallow
- **Fair value exchange**: Publishers get compensated for high-value AI use cases
- **Transparent discovery**: Machine-readable policies like robots.txt, but richer
- **Respectful protocols**: MCP clients honor publisher preferences and budgets
- **Edge-compatible**: Designed for modern CDN/proxy enforcement infrastructure

## Tool-Based Request Flow

1. **Discovery**: MCP client retrieves `/.well-known/peek.json` (like checking `/robots.txt`)
2. **Tool Selection**: Client identifies desired use case (peek_resource, summarize_resource, train_on_resource, etc.)
3. **License Acquisition**: Client POSTs to `license_issuer` with specific tools and budgets
4. **Content Access**: Client requests content with tool headers and license JWT
5. **Fair Enforcement**: Publisher serves content or returns tool-specific error codes

## Enforcement Philosophy: Respectful AI Engagement

**Cooperative, not Adversarial**: Unlike robots.txt which relies on good faith compliance, peek.json provides economic incentives for respectful behavior:

- **Free tiers** for basic discovery and previews (like allowing search indexing)
- **Paid tiers** for value-generating activities (training, commercial use)
- **Technical enforcement** via license validation and quota tracking
- **Legal framework** with clear terms and attribution requirements

This creates a sustainable ecosystem where AI development can flourish while fairly compensating content creators—the same balance robots.txt helped achieve for search engines and websites.
