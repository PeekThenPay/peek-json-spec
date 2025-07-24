# Peek-Then-Pay: AI Access Policy Specification (v1.0)

The `peek.json` manifest allows content publishers to advertise and enforce page-level access policies for AI agents and crawlers. This standard provides a machine-readable declaration of licensing and pricing rules, enabling "peek-then-pay" enforcement using budgeted licenses and HTTP headers.

## Key Features

- **Page-level pricing**: Default cost per page, with support for page-specific override pricing.
- **License-based access**: AI agents acquire licenses with monthly usage limits.
- **Spend enforcement**: Publishers may return 402 responses if a page exceeds the agent's declared max spend per page.
- **Edge-compatible**: Designed for proxy/CDN enforcement (e.g. via Cloudflare Workers).

## Request Flow Summary

1. AI agent retrieves `peek.json` from the publisher.
2. Agent POSTs to the `license_issuer` endpoint to request a license with a `monthly_limit`.
3. Agent requests pages with `X-Peek-License`, `Authorization`, and `X-Max-Page-Spend` headers.
4. Publisher enforces pricing using headers and may issue 402 responses if the page cost exceeds the per-request ceiling.

## Enforcement Rules

- The default per-page cost is declared in `pricing.default_per_page`.
- A page may override this cost via the `X-Peek-Page-Cost` header.
- AI agents may proactively send an `X-Max-Page-Spend` header to avoid pages that exceed what they're willing to spend.
