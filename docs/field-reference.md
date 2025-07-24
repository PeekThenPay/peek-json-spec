# 📘 peek.json Field Reference

This document defines each field in the `peek.json` AI access manifest, including types, purposes, and recommendations.

---

## 🔹 `peek_then_pay.version`
- **Type:** `string`
- **Description:** Declares schema version compliance (e.g. "0.2")

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
Specifies licensing requirements and contact info.

| Field | Type | Description |
|-------|------|-------------|
| `required_for_full` | boolean | Is a license required for full access? |
| `pricing_url` | URI | Link to license options or pricing info |
| `contact_email` | email | For licensing/legal inquiries |

---

## 🔹 `crawler_rules`
Optional guidance for AI crawler behavior.

| Field | Type | Description |
|-------|------|-------------|
| `allowed_user_agents` | array of strings | Permitted User-Agent strings (e.g. `GPTBot`) |
| `rate_limit_per_day` | integer | Max daily requests per agent/IP |
| `usage_logging_required` | boolean | Should usage telemetry be reported? |
| `required_headers` | array of strings | Headers required in requests (e.g. `X-AI-Intent`) |

---

## 🔹 `capabilities`
Signals about content structure, markup, or provenance.

| Field | Type | Description |
|-------|------|-------------|
| `structured_format` | enum | One of `HTML`, `JSON`, `schema.org` |
| `has_schema_annotations` | boolean | Whether schema.org/microdata is embedded |
| `watermarking` | boolean | Whether content has AI watermarking for attribution |

---

## ✅ Example
```json
{
  "peek_then_pay": {
    "version": "0.2",
    "meta": {
      "site_name": "PCMag",
      "publisher": "Ziff Davis",
      "categories": ["product_reviews", "commerce"],
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
      "pricing_url": "https://pcmag.com/license",
      "contact_email": "legal@pcmag.com"
    }
  }
}
