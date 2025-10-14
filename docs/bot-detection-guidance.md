# Bot Detection Guidance

**RECOMMENDED guidance for implementing automated preview (auto-peek) behavior**

---

## Overview

This document provides recommended conservative algorithms for auto-peek behavior when publishers
choose to implement automated preview generation for detected AI agents. These are **guidance
recommendations** - the specification does not mandate specific bot detection vendors or algorithms.

**Important**: Publishers are not required to implement auto-peek. This guidance applies only when
publishers choose to provide automated previews based on bot detection.

---

## RECOMMENDED: Non-Auto-Peek Publisher Guidance

**For publishers who choose NOT to implement auto-peek but want to encourage responsible bot
behavior and license acquisition.**

### Encouraging License Acquisition Without Auto-Peek

Publishers who choose NOT to enable auto-peek SHOULD still implement the following
practices to encourage responsible AI agent behavior:

#### Required Headers for Bot Requests

When detecting AI agents (even without auto-peek), publishers SHOULD include licensing guidance
headers:

```http
HTTP/1.1 200 OK
Content-Type: text/html
X-PTP-License-Required: true
X-PTP-License-Endpoint: https://api.example.com/pricing?publisher_id=01HQ2Z3Y4K5M6N7P8Q9R0S1T1X
X-PTP-Supported-Intents: read,summarize,embed,quote
Link: </.well-known/peek.json>; rel="peek-manifest"
Vary: User-Agent, Authorization

<!DOCTYPE html>
<html>
<head>
  <link rel="peek-manifest" href="/.well-known/peek.json" type="application/json">
  <!-- Regular HTML content -->
</head>
<!-- ... -->
```

#### Bot Detection Without Auto-Peek

Even without serving auto-previews, publishers benefit from bot detection for:

- **Analytics**: Track AI agent traffic separately from human visitors
- **Rate limiting**: Apply appropriate limits to automated traffic
- **License promotion**: Include licensing headers specifically for detected bots
- **Compliance monitoring**: Monitor bot behavior patterns

#### Recommended Bot Response Pattern

```typescript
function handleBotWithoutAutoPreview(request: Request): Response {
  const isBot = detectBot(request);

  if (isBot) {
    // Serve regular content but with licensing headers
    const content = getRegularHTMLContent(request);

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'X-PTP-License-Required': 'true',
        'X-PTP-License-Endpoint':
          'https://api.example.com/pricing?publisher_id=01HQ2Z3Y4K5M6N7P8Q9R0S1T1X',
        'X-PTP-Supported-Intents': 'read,summarize,embed,quote',
        Link: '</.well-known/peek.json>; rel="peek-manifest"',
        Vary: 'User-Agent, Authorization',
        // Optional: Include usage tracking
        'X-PTP-Request-Id': generateRequestId(),
      },
    });
  }

  // Regular human traffic
  return serveNormalContent(request);
}
```

#### Machine-Readable Licensing Information

**RECOMMENDED: Consistent Peek-Then-Pay Discovery Signal**

All publishers participating in Peek-Then-Pay SHOULD include standardized structured data to ensure AI agents can discover licensing requirements even when ignoring HTTP headers:

```html
<head>
  <!-- Schema.org Compliant: WebPage with CreativeWork licensing -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "url": "https://example.com/articles/show-me-something",
      "isPartOf": {
        "@type": "WebSite",
        "url": "https://example.com"
      },
      "mainEntity": {
        "@type": "CreativeWork",
        "@id": "https://example.com/articles/show-me-something#creativework",
        "headline": "Article Title (optional)",
        "identifier": {
          "@type": "PropertyValue",
          "propertyID": "publisher_item_id",
          "value": "article-123"
        },
        "license": "https://api.example.com/pricing?publisher_id=01HQ2Z3Y4K5M6N7P8Q9R0S1T1X",
        "potentialAction": {
          "@type": "ObtainAction",
          "name": "Obtain Peek-Then-Pay License",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://api.example.com/pricing?publisher_id=01HQ2Z3Y4K5M6N7P8Q9R0S1T1X",
            "httpMethod": "GET",
            "encodingType": "application/json",
            "contentType": "application/json"
          }
        },
        "publisher": {
          "@type": "Organization",
          "name": "Example Publisher",
          "url": "https://example.com",
          "identifier": {
            "@type": "PropertyValue",
            "propertyID": "publisher_id",
            "value": "01HQ2Z3Y4K5M6N7P8Q9R0S1T1X"
          }
        },
        "isAccessibleForFree": false
      }
    }
  </script>

  <!-- Discovery link relations: absolute URLs recommended -->
  <link
    rel="peek-manifest"
    href="https://example.com/.well-known/peek.json"
    type="application/json"
  />
  <link
    rel="license"
    href="https://api.example.com/pricing?publisher_id=01HQ2Z3Y4K5M6N7P8Q9R0S1T1X"
  />

  <!-- Optional: Additional signaling -->
  <meta name="ai-licensing" content="peek-then-pay-required" />
</head>
```

**Schema.org Compliance:**

This JSON-LD uses **standard Schema.org vocabulary** with proper semantic structure:

- **[`WebPage`](https://schema.org/WebPage)** - Main page with URL and site relationship
- **[`WebSite`](https://schema.org/WebSite)** - Parent site context via `isPartOf`
- **[`CreativeWork`](https://schema.org/CreativeWork)** - Content with licensing requirements
- **[`ObtainAction`](https://schema.org/ObtainAction)** - Machine-discoverable licensing action
- **[`EntryPoint`](https://schema.org/EntryPoint)** - API endpoint specification for licensing
- **[`Organization`](https://schema.org/Organization)** - Publisher entity with structured identifier
- **[`PropertyValue`](https://schema.org/PropertyValue)** - Structured identifiers for publisher and content

**Key Schema.org Features:**

- **`isAccessibleForFree: false`** - Clearly signals licensing is required
- **`potentialAction`** - Allows AI agents to programmatically discover licensing endpoints
- **Structured identifiers** - Publisher ID and content ID as PropertyValue objects
- **Absolute URLs** - Full URLs for better discoverability and validation

**Universal Implementation Across Content Types:**

This structured data pattern works consistently across:

- **News articles** - Same schema structure
- **Blog posts** - Same schema structure
- **Documentation** - Same schema structure
- **Media files** - Same schema structure
- **Datasets** - Same schema structure

**Key Benefits:**

1. **Header-independent discovery** - Works even when HTTP headers are ignored
2. **Search engine compatibility** - Uses standard Schema.org vocabulary
3. **Consistent signaling** - Same pattern across all participating publishers
4. **Clear attribution** - Identifies publisher participation in Peek-Then-Pay OSS
5. **Fallback mechanism** - Ensures licensing discovery when auto-peek is disabled
6. **SEO friendly** - Valid structured data improves search engine understanding

#### Rate Limiting and Monitoring

Publishers should apply appropriate rate limiting even without auto-peek:

- **Stricter limits for unlicensed bots**: Lower rate limits for detected AI agents without licenses
- **License holder exemptions**: Higher or no rate limits for properly licensed agents
- **Monitoring dashboards**: Track bot behavior, license adoption rates
- **Appeal mechanisms**: Provide clear paths for legitimate bots to request higher limits

### Benefits of This Approach

1. **Encourages responsible behavior**: Bots learn about licensing requirements
2. **Maintains content access**: Regular content remains available while promoting licensing
3. **Analytics value**: Better understanding of AI agent traffic patterns
4. **Future flexibility**: Easy to enable auto-peek later if desired
5. **Compliance readiness**: Demonstrates good-faith effort to work with AI systems

---

## RECOMMENDED: Conservative Auto-Peek Algorithm

### Multi-Signal Detection

Auto-peek implementation SHOULD require **at least 2 independent signals** before automatically
serving preview content:

#### Signal Categories

| Signal Type                 | Examples                                        | Reliability | Implementation                        |
| --------------------------- | ----------------------------------------------- | ----------- | ------------------------------------- |
| **Enterprise Bot Scores**   | Cloudflare Bot Management, DataDome, PerimeterX | High        | `bot_score < 30` (low = likely bot)   |
| **Bot Classification Tags** | CF: `cf.bot_management.score`, DM: `bot_type`   | High        | Explicit "bot" or "good_bot" tags     |
| **User-Agent Patterns**     | Known AI agent strings, API client patterns     | Medium      | Pattern matching against known agents |
| **Behavioral Signals**      | Request rate, session patterns, header analysis | Medium      | Algorithmic analysis                  |
| **Network Signals**         | ASN classification, IP reputation               | Low         | Datacenter/cloud provider detection   |

### Recommended Algorithm

```typescript
function shouldAutoPreview(request: Request): boolean {
  const signals = analyzeRequest(request);

  // Require HIGH confidence from enterprise solution
  const hasEnterpriseSignal = signals.enterprise_bot_score < 30; // Low score = bot

  // Plus at least ONE additional signal
  const hasSecondarySignal =
    signals.explicit_bot_tag || signals.known_agent_pattern || signals.behavioral_bot_indicators;

  // AND not on allowlist
  const isAllowlisted = checkAllowlist(request.ip, request.userAgent);

  return hasEnterpriseSignal && hasSecondarySignal && !isAllowlisted;
}
```

### Allowlist Recommendations

Maintain explicit allowlists for:

- **Search engines**: Googlebot, Bingbot, etc. (serve normal HTML)
- **Social crawlers**: FacebookBot, TwitterBot, LinkedInBot
- **Monitoring services**: Pingdom, StatusCake, etc.
- **Known good agents**: Specific AI agents with established relationships

### Score Band Guidelines

| Bot Score Range | Classification | Action                    | Monitoring          |
| --------------- | -------------- | ------------------------- | ------------------- |
| 0-10            | Definite bot   | Auto-peek eligible        | Standard logging    |
| 11-30           | Likely bot     | Requires secondary signal | Enhanced monitoring |
| 31-70           | Uncertain      | No auto-peek (serve HTML) | Flag for review     |
| 71-100          | Likely human   | No auto-peek (serve HTML) | Standard logging    |

---

## RECOMMENDED: Monitoring and Appeals Process

### Monitor Mode Implementation

Before enabling auto-peek in production:

1. **Monitor Mode Period**: Run detection for `monitor_mode_days` (recommended: 30 days)
2. **Log Only**: Record what _would_ receive auto-peek without actually serving it
3. **Analysis**: Review logs for false positives/negatives
4. **Tuning**: Adjust thresholds based on monitoring results

### Appeals Process

Publishers implementing auto-peek SHOULD provide:

- **Public appeals form** (declared in `appeals_url` manifest field)
- **Allowlist requests** for legitimate AI agents
- **Response timeframe** (recommended: 5-10 business days)
- **Clear criteria** for allowlist inclusion

### Monitoring Requirements

```typescript
interface AutoPeekMetrics {
  total_requests: number;
  auto_peek_served: number;
  bot_score_distribution: Record<string, number>;
  false_positive_reports: number;
  appeals_received: number;
  appeals_approved: number;
}
```

---

## RECOMMENDED: Implementation Patterns

### Enterprise Integration Examples

#### Cloudflare Enterprise

```javascript
// Cloudflare Worker example
export default {
  async fetch(request, env) {
    const botScore = request.cf.botManagement.score;
    const botTag = request.cf.botManagement.staticResource;

    if (botScore < 30 && !botTag && hasSecondarySignal(request)) {
      return serveAutoPreview(request);
    }

    return serveNormalContent(request);
  },
};
```

#### DataDome Integration

```typescript
// Express.js middleware example
app.use((req, res, next) => {
  const datadomeSignals = req.headers['x-datadome-signals'];
  const botType = parseDataDomeSignals(datadomeSignals);

  if (botType === 'bot' && hasSecondarySignal(req)) {
    return serveAutoPreview(req, res);
  }

  next();
});
```

### Hybrid Approach

```typescript
function getBotConfidence(request: Request): number {
  let confidence = 0;

  // Enterprise signal (high weight)
  if (request.enterprise_bot_score < 30) confidence += 60;

  // Secondary signals (medium weight)
  if (request.known_user_agent) confidence += 25;
  if (request.behavioral_indicators) confidence += 15;

  // Negative signals
  if (request.has_cookies) confidence -= 20;
  if (request.javascript_execution) confidence -= 30;

  return Math.max(0, Math.min(100, confidence));
}
```

---

## RECOMMENDED: Security Considerations

### Prevent Abuse

- **Rate limiting**: Apply strict rate limits to auto-peek responses
- **Size limits**: Enforce `max_preview_length` strictly
- **Content consistency**: Ensure previews are faithful excerpts
- **No cloaking**: Never serve different content to circumvent detection

### Privacy and Compliance

- **Logging**: Log bot detection decisions for audit purposes
- **Data retention**: Follow appropriate data retention policies for bot signals
- **GDPR compliance**: Handle EU traffic appropriately with bot detection
- **Transparency**: Document bot detection criteria in privacy policies

### False Positive Mitigation

```typescript
// Example: Conservative fallback for uncertain cases
function handleUncertainBot(request: Request): Response {
  const confidence = getBotConfidence(request);

  if (confidence > 80) {
    return serveAutoPreview(request);
  } else if (confidence < 40) {
    return serveNormalHTML(request);
  } else {
    // Uncertain case - err on side of normal content
    return serveNormalHTML(request);
  }
}
```

---

## Important Disclaimers

1. **No Mandate**: This specification does not require publishers to implement auto-peek or use any
   specific bot detection vendor
2. **Vendor Agnostic**: These patterns work with any enterprise bot detection solution - Cloudflare,
   DataDome, PerimeterX, Akamai, etc.
3. **Publisher Choice**: Publishers maintain full control over their auto-peek policies and
   implementation
4. **Legal Compliance**: Publishers must ensure their bot detection and auto-peek implementation
   complies with applicable laws and regulations
5. **Monitoring Required**: All auto-peek implementations should include comprehensive monitoring
   and appeals processes

---

## Related Documentation

- [Peek Manifest Fields](peek-manifest-fields.md) – `auto_peek_policy` configuration options
- [Headers and Content Negotiation](headers-and-content-negotiation.md) – Preview response
  requirements
- [Normative Intent Definitions](normative-intent-definitions.md) – Preview content constraints
- [Recommended Edge Enforcement Guide](recommended-edge-enforcement-guide.md) – Edge implementation
  patterns

---

_This document provides recommended guidance only. Publishers implementing auto-peek must make their
own technical and business decisions about bot detection accuracy, legal compliance, and user
experience._
