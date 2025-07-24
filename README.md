# Peek-Then-Pay

Peek-Then-Pay is a JSON-based standard that allows content publishers to define transparent, machine-readable access and pricing policies for AI crawlers and LLM agents.

This repository defines the `peek.json` manifest format and associated license acquisition flow, enabling AI agents to "peek" at content and pay only for what they access—enforced at the page level.

## 🔍 Key Concepts

- **Page-level pricing**: Each page has a default cost, with optional overrides.
- **Budgeted licenses**: AI agents acquire licenses with a specified `monthly_limit`.
- **HTTP enforcement**: Publishers use headers and 402 responses to enforce max page spend.
- **Edge-ready**: Designed for CDNs, reverse proxies, and modern caching strategies.

## 📄 `peek.json` Overview

The `peek.json` file is served from the site root and includes:

- **`meta`** – Publisher and site metadata.
- **`license`** – License acquisition endpoint, legal terms, and page pricing rules.

Example:
```json
{
  "version": "1.0",
  "meta": {
    "site_name": "GadgetReviews.com",
    "publisher": "TechVerse Media Inc.",
    "categories": ["reviews", "news", "buying_guides"],
    "last_updated": "2025-07-25"
  },
  "license": {
    "license_issuer": "https://gadgetreviews.com/api/peek-license",
    "terms_url": "https://gadgetreviews.com/.well-known/peek-license.json",
    "pricing": {
      "default_per_page": 0.015,
      "max_per_page": 0.10,
      "currency": "USD",
      "override_mechanism": "both",
      "override_header_name": "X-Peek-Page-Cost"
    }
  }
}
```

## 🚦 License Flow

1. Agent POSTs to `license_issuer` with `monthly_limit`.
2. Agent receives a license ID and JWT.
3. Agent requests content using:
   - `X-Peek-License`
   - `Authorization: Bearer <jwt>`
   - `X-Max-Page-Spend` (optional)
4. Publisher responds:
   - ✅ `200 OK` if page cost is within max spend.
   - ❌ `402 Payment Required` with `X-Required-Page-Spend` if page is too expensive.

## 📚 Documentation

- [`overview.md`](./overview.md) – Conceptual overview
- [`field-reference.md`](./field-reference.md) – Field-by-field spec
- [`license-api.md`](./license-api.md) – License acquisition API contract
