# License Issuer API Specification (OAuth 2.0 Model)

This document defines the API used by AI agents to securely acquire, use, and manage licenses for accessing protected content using the Peek-Then-Pay standard. This version assumes centralized identity and billing via OAuth 2.0.

---

## 🔐 Step 0: OAuth 2.0 Authentication

All license-related endpoints require a valid OAuth 2.0 access token.

### POST /oauth/token

**Request (client credentials grant):**

```x-www-form-urlencoded
grant_type=client_credentials
&client_id=my-llm-agent
&client_secret=supersecret123
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Use the `access_token` as a Bearer token in all subsequent API requests.

---

## 💳 Step 1: Register Payment Method

### POST /api/payment-method

Registers a reusable payment method using a token from a secure billing provider (e.g., Stripe, Paddle).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "payment_method_token": "tok_stripe_abc123"
}
```

**Response:**
```json
{
  "payment_method_id": "pm_abc123"
}
```

---

## 🧾 Step 2: Request License for a Domain

### POST /api/peek-license/{domain}

Acquires a license to access content on a specific domain.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "monthly_limit": 50.00,
  "payment_method_id": "pm_abc123"
}
```

**Response:**
```json
{
  "license_id": "lic_001122",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "spend_remaining": 50.00
}
```

---

## 📄 Step 3: Request Content Page (via Worker)

Agents send a licensed content request to `example.com`.

**GET https://example.com/articles/ai-ethics**

**Headers:**
```
X-Peek-License: lic_001122
Authorization: Bearer <jwt>
X-Max-Page-Spend: 0.03
```

If the page is too expensive:

```http
HTTP/1.1 402 Payment Required
X-Required-Page-Spend: 0.07
```

---

## 📉 Step 4: Record Usage

### POST /api/peek-license/{domain}/{license_id}/record

Cloudflare Worker reports page access for metering and deduction.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Body:**
```json
{
  "url": "/articles/ai-ethics",
  "page_cost": 0.03
}
```

**Response:**
```json
{
  "spend_remaining": 49.97,
  "pages_fetched": 1,
  "total_spent": 0.03,
  "notifications_sent": []
}
```

---

## 🔐 JWT License Structure (suggested)

```json
{
  "sub": "lic_001122",
  "scope": "example.com",
  "monthly_limit": 50.00,
  "exp": 1722120000
}
```

The Cloudflare Worker should verify the JWT signature and ensure:
- `scope` matches the current domain
- `exp` has not passed
