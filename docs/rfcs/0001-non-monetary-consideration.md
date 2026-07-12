# RFC 0001: Non-Monetary Consideration for Licensed Access

**Status:** Proposal (informative, non-normative)
**Date:** 2026-07-12
**Discussion:** [Propose changes via issues](https://github.com/PeekThenPay/peek-json-spec/issues)

## Summary

Peek-Then-Pay's license flow is, mechanically, a terms-acceptance system that happens to carry a
price. This RFC proposes generalizing "price" to "consideration," so publishers can condition
access to content and transformations on things other than money: verified agent identity,
attribution guarantees, usage-data reciprocity, persistence commitments, or conversion offers.
Monetary pricing becomes one consideration type among several.

Nothing in this RFC changes v2.x behavior. A zero-amount license is already valid, so
consideration-based access can be prototyped today by issuing zero-price licenses whose legal
terms carry the obligations. This RFC describes how to make the pattern first-class in a future
revision.

## Motivation

Not all publisher content has direct licensing value, and not all publisher goals are revenue.
Publishers variously want traffic, brand control, audience data, demand insight, and infrastructure
relief. A protocol that can only express "pay per unit" forces publishers with non-revenue goals
into the free tier, where they receive nothing in exchange for access. Meanwhile, competing
CDN-level models (pay-per-crawl and its descendants) are money-only by construction. Expressing
non-monetary exchange is something only a terms-level protocol can do, and it widens the set of
publishers for whom licensed access is rational.

## Taxonomy of Consideration

Three classes, distinguished by enforcement mechanics:

### 1. Preconditions (verifiable at license issuance or request time)

| Consideration           | Description                                                                                    | Verification                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Verified agent identity | Operator holds a Know-Your-Agent (KYA) credential or equivalent (e.g., Web Bot Auth signature) | Edge enforcer checks credential at request time                |
| Reporting enrollment    | Operator participates in bilateral usage reporting                                             | License server checks enrollment at issuance                   |
| Fetch discipline        | Operator commits to conditional fetching: honor `contentHash`, cache windows, and rate limits  | Edge enforcer observes behavior; violations revoke the license |

Preconditions are the cheapest class to enforce because they are checkable in-band with existing
machinery (bot identification, license validation, budget tracking).

### 2. Ongoing obligations (auditable after the fact)

| Consideration              | Description                                                                                   | Verification                                         |
| -------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Attribution and citation   | Guaranteed cited link, specified anchor form, canonical URL usage when content surfaces       | Post-hoc AEO/citation monitoring; dispute resolution |
| Brand representation rules | Quote-verbatim requirements, summary constraints; `agentGuidance` is the delivery vehicle     | Audit and dispute resolution                         |
| Persistence commitments    | No-train, TTL compliance, deletion attestation (extends existing persistence categories)      | Attestation in usage reports; audit                  |
| Usage-data reciprocity     | Operator reports where content surfaced in answers: query category, prominence, citation form | In-band via extended usage reports                   |

Usage-data reciprocity deserves emphasis: for many publishers the demand signal (what agents asked
for, what surfaced, at what prominence) is itself the payment. It is also the raw material for
editorial demand loops, including pre-publication demand assessment by CMS platforms.

### 3. Transactional exchanges (per-event value)

| Consideration        | Description                                                                                           | Verification                          |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Conversion offers    | Agent surfaces publisher-hosted conversion URLs (newsletter signup, gated download, offer redemption) | Conversion tracked via URL parameters |
| Referral commitments | Agent surfaces outbound links at an agreed rate                                                       | Referral analytics                    |

**Design constraint: no PII in the protocol.** Lead generation is in scope as an exchange of
opportunity, not of data. The response carries a publisher-hosted conversion URL; the end user's
consent and personal data are exchanged on the publisher's own property under the publisher's own
privacy flow. The protocol carries the offer and measures the conversion. It never transports an
email address. This keeps GDPR/CCPA consent brokering out of the specification entirely. The
pattern is proven in production (parameterized redemption URLs in peek `signals`).

## Proposed Specification Changes (future revision)

1. **Manifest: `access_terms` per intent.** Each supported intent may list one or more term sets,
   each naming a consideration type: `monetary`, `verified-identity`, `attribution`,
   `usage-reciprocity`, `persistence-commitment`, `conversion-offer`. A publisher can offer the
   same intent under alternative term sets (for example: pay per 1000 tokens, OR attribute and
   report). Monetary terms reference the existing pricing schema unchanged.

2. **License JWT: `obligations` claim.** An array of obligation identifiers bound into the
   license. The edge enforcer verifies preconditions at request time and records (but does not
   evaluate) auditable obligations. Compliance for auditable obligations flows through the
   existing bilateral reporting and dispute-resolution machinery, adding no new edge burden.

3. **Usage reports: reciprocity fields.** Extend the usage report schema so operators can satisfy
   usage-data reciprocity in-band: answer-surface indicators, query category, citation prominence.
   This is the highest-priority change because it doubles as the demand-signal feed for editorial
   workflows.

4. **Verification method registry.** For identity preconditions, the specification defines the
   requirement slot and references external credential ecosystems (Web Bot Auth or successors)
   rather than defining identity itself.

## Compatibility

- Fully additive. Manifests without `access_terms` behave exactly as today (pricing implies
  monetary consideration).
- Zero-price licenses remain valid and are the recommended prototyping path before any schema
  change ships.
- No changes to intent response schemas.

## Open Questions

1. Obligation identifier vocabulary: closed enum, or namespaced open set like `contentType`?
2. Should term sets be combinable (identity AND attribution) or alternatives only?
3. Revocation semantics when an auditable obligation is breached: license non-renewal, budget
   zeroing, or blocklist propagation?
4. How much reciprocity data can be required before operators balk? A minimal mandatory core with
   optional richer tiers seems likely.
5. Does `conversion-offer` need protocol support at all, or is it fully expressible today via
   `signals` and `agentGuidance`?
