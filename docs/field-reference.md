# 📘 peek.json Field Reference

This document defines each field in the `peek.json` AI access manifest, including types, purposes, and recommendations.

---

## 🔹 `peek_then_pay.version`
- **Type:** `string`
- **Description:** Declares schema version compliance (e.g. `"0.2"`)

---

## 🔹 `meta`

Metadata describing the publisher and content scope.

| Field | Type | Description |
|-------|------|-------------|
| `site_name` | string | Public-facing name of the website |
| `publisher` | string | Legal or organizational owner |
| `categories` | array of strings | Content types — see recommended values below |
| `last_updated` | string (ISO date) | Last update to this manifest |

**🔖 Recommended Categories:**
```
news, product_reviews, commerce, finance, health, travel,
reference, howto, forums, documentation, entertainment,
opinion, academic
```
Use `custom:` prefix for niche categories (e.g. `custom:beauty_tools`).

---

## 🔹 `intents`

Defines policy blocks by intended use case.

### Intent Block Structure
Each key is an intent name (e.g. `rag`, `summarization`):

| Field | Type | Description |
|-------|------|-------------|
| `allowed` | boolean | Whether this intent is permitted |
| `peek_max_tokens` | integer | Max tokens available before licensing is required |
| `peek_fields` | array of strings | Sections that may be accessed (e.g. `title`, `intro`) |
| `license_required` | boolean | Whether full use of this intent requires licensing |

### Standard Intents
```
training         → Model pretraining/fine-tuning  
rag              → Retrieval-Augmented Generation  
summarization    → TL;DR-style content generation  
citation         → Source linking and quoting  
agent_action     → AI-driven decisions (e.g. buying, recommending)  
metadata_only    → Link graph and non-content metadata  
```

Additional intents may be declared with custom keys (e.g. `custom:embedding_index`).

---

## 🔹 `license`

Specifies licensing requirements and automation endpoints for AI agents.

| Field | Type | Description |
|-------|------|-------------|
| `required_for_full` | boolean | Is a license required for full access? |
| `terms_url` | string (URI) | Link to a machine-readable `.well-known/peek-license.json` |
| `pricing_api` | string (URI) | Optional URL to dynamically negotiate or purchase a license |
| `token_header` | string | Header name for submitting license credentials (e.g. `"X-Peek-License"`) |
| `validation_endpoint` | string (URI) | Optional endpoint to verify submitted tokens in real-time |

**🔁 Workflow:**
1. Agent peeks content.
2. If more access is needed and `license_required = true`, the agent:
   - Checks `terms_url` for license terms
   - Optionally calls `pricing_api` to request or purchase access
   - Uses `token_header` to include license proof in future requests

---

## 🔹 `crawler_rules`

Optional guidance for AI crawler behavior.

| Field | Type | Description |
|-------|------|-------------|
| `allowed_user_agents` | array of strings | Permitted User-Agent strings (e.g. `"GPTBot"`) |
| `rate_limit_per_day` | integer | Max daily requests per agent or IP |
| `usage_logging_required` | boolean | Whether telemetry is required |
| `required_headers` | array of strings | Headers that must be present on all requests |

---

## 🔹 `capabilities`

Signals about content structure, markup, or watermarking.

| Field | Type | Description |
|-------|------|-------------|
| `structured_format` | enum | One of `"HTML"`, `"JSON"`, `"schema.org"` |
| `has_schema_annotations` | boolean | Whether content uses structured markup |
| `watermarking` | boolean | Whether AI watermarking is embedded |

---

## ✅ Example
```json
{
  "peek_then_pay": {
    "version": "0.2",
    "meta": {
      "site_name": "EduDocs",
      "publisher": "EduDocs Inc.",
      "categories": ["documentation", "academic"],
      "last_updated": "2025-07-23"
    },
    "intents": {
      "summarization": {
        "allowed": true,
        "peek_max_tokens": 300,
        "peek_fields": ["title", "intro"],
        "license_required": true
      }
    },
    "license": {
      "required_for_full": true,
      "terms_url": "https://edudocs.com/.well-known/peek-license.json",
      "pricing_api": "https://edudocs.com/api/license",
      "token_header": "X-Peek-License",
      "validation_endpoint": "https://edudocs.com/api/license/validate"
    }
  }
}
