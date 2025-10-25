# Validation Utilities Technical Reference

This document provides technical reference for validation utilities in the
`@peekthenpay/peek-json-spec` package. These utilities help validate pricing schemes, license
structures, intent schemas, and other Peek-Then-Pay components against their respective JSON
schemas.

## Installation

```bash
npm install @peekthenpay/peek-json-spec
# or
pnpm add @peekthenpay/peek-json-spec
```

## Intent Schema Validation

### Edge-Compatible Pre-compiled Validators

The package provides **pre-compiled validators** optimized for edge runtimes (Cloudflare Workers, Vercel Edge, etc.):

```typescript
// Import pre-compiled validators directly (edge-compatible, no AJV runtime needed)
import ptpSummarizeValidator from '@peekthenpay/peek-json-spec/validators/ptp-summarize-validator.js';
import ptpAnalyzeValidator from '@peekthenpay/peek-json-spec/validators/ptp-analyze-validator.js';
import ptpEmbedValidator from '@peekthenpay/peek-json-spec/validators/ptp-embed-validator.js';

// Validate intent responses (fast, synchronous)
const isValid = ptpSummarizeValidator(responseData);
if (!isValid) {
  console.error('Validation errors:', ptpSummarizeValidator.errors);
} else {
  console.log('Valid summarize response');
}

// Validate analyze responses
const isAnalyzeValid = ptpAnalyzeValidator(analyzeData);
if (!isAnalyzeValid) {
  console.error('Analyze validation failed:', ptpAnalyzeValidator.errors);
}
```

### Performance Benefits

- **🚀 Edge Runtime Compatible** - Works in Cloudflare Workers, Vercel Edge Functions
- **⚡ Zero Cold Start** - No runtime schema compilation
- **📦 Minimal Bundle Size** - No AJV dependency at runtime
- **🔍 Full Format Validation** - URI, date-time, SHA256 patterns included

### Available Pre-compiled Validators

| Intent Type     | Validator Import             | Purpose                                                   |
| --------------- | ---------------------------- | --------------------------------------------------------- |
| `ptp-analyze`   | `ptp-analyze-validator.js`   | Structured content analysis (sentiment, entities, topics) |
| `ptp-embed`     | `ptp-embed-validator.js`     | Vector embeddings with metadata                           |
| `ptp-peek`      | `ptp-peek-validator.js`      | Content previews and discovery                            |
| `ptp-qa`        | `ptp-qa-validator.js`        | Question-answer pairs with citations                      |
| `ptp-quote`     | `ptp-quote-validator.js`     | Verbatim content excerpts                                 |
| `ptp-read`      | `ptp-read-validator.js`      | Full content with normalization                           |
| `ptp-search`    | `ptp-search-validator.js`    | Search results with ranking                               |
| `ptp-summarize` | `ptp-summarize-validator.js` | Content summarization                                     |
| `ptp-translate` | `ptp-translate-validator.js` | Language translation with alignment                       |

### Additional Core Validators

| Schema Type         | Validator Import                 | Purpose                       |
| ------------------- | -------------------------------- | ----------------------------- |
| `peek-manifest`     | `peek-validator.js`              | Peek.json manifest validation |
| `pricing`           | `pricing-validator.js`           | Pricing scheme validation     |
| `forensic-manifest` | `forensic-manifest-validator.js` | Audit trail validation        |

## Manifest and Schema Validation

### Factory Functions with Built-in Validation

The package provides factory functions that parse and validate in one step:

```typescript
import {
  createPeekManifest,
  PeekValidationError,
  createPricingScheme,
  PricingValidationError,
  validateForensicManifest,
  ForensicManifestError,
} from '@peekthenpay/peek-json-spec';

// Peek manifest validation
try {
  const manifest = createPeekManifest(jsonString);
  console.log('Valid peek manifest:', manifest);
} catch (error) {
  if (error instanceof PeekValidationError) {
    console.error('Validation errors:', error.errors);
  }
}

// Pricing scheme validation
try {
  const pricingScheme = createPricingScheme(jsonString);
  console.log('Valid pricing scheme:', pricingScheme);
} catch (error) {
  if (error instanceof PricingValidationError) {
    console.error('Validation errors:', error.errors);
  }
}

// Forensic manifest validation (for audit trails)
try {
  validateForensicManifest(manifestData);
  console.log('Valid forensic manifest');
} catch (error) {
  if (error instanceof ForensicManifestError) {
    console.error('Validation failed:', error.message);
  }
}
```

### Direct Pre-compiled Validator Usage

For maximum performance and edge compatibility, use validators directly:

```typescript
// Import specific validators
import peekValidator from '@peekthenpay/peek-json-spec/validators/peek-validator.js';
import pricingValidator from '@peekthenpay/peek-json-spec/validators/pricing-validator.js';

// Validate directly
const isPeekValid = peekValidator(peekData);
if (!isPeekValid) {
  console.error('Peek validation errors:', peekValidator.errors);
}

const isPricingValid = pricingValidator(pricingData);
if (!isPricingValid) {
  console.error('Pricing validation errors:', pricingValidator.errors);
}
```

### Schema Access

```typescript
import { getPricingSchema } from '@peekthenpay/peek-json-spec/pricing-schema';

const schema = await getPricingSchema();
// Use with your preferred JSON Schema validator
```

### Error Handling

```typescript
import { PricingValidationError } from '@peekthenpay/peek-json-spec/pricing-schema-factory';

try {
  const pricing = await createPricingScheme(invalidJson);
} catch (error) {
  if (error instanceof PricingValidationError) {
    // Handle validation-specific errors
    console.log('Validation failed:');
    error.errors?.forEach((err) => {
      console.log(`- ${err.instancePath}: ${err.message}`);
    });
  } else if (error instanceof SyntaxError) {
    // Handle JSON parsing errors
    console.log('Invalid JSON format:', error.message);
  }
}
```

## Implementation Guidelines

### For License Servers

- **Always validate** incoming pricing configurations against `pricing.schema.json`
- **Ensure consistency** in pricing digest calculation for caching
- **Support both pricing modes**: per-request and per-token pricing models
- **Validate permissions** using the intent:usage format validation

### For AI Agents

- **Validate received data** before processing pricing information
- **Cache effectively** using `pricing_scheme_id` and `cache_ttl_seconds`
- **Handle errors gracefully** with appropriate fallbacks
- **Validate permissions** before including them in license requests

### For Publishers

- **Use validation utilities** when generating pricing configurations
- **Ensure digest accuracy** - pricing digests must match canonical JSON representation
- **Test thoroughly** - validate configurations against schema before deployment
- **Document usage contexts** - clearly specify which usage types are supported

## Schema Validation Features

### ULID Validation

- Pricing scheme IDs and publisher IDs must be valid ULIDs (26 character Base32 strings)
- Pattern: `^[0-9A-HJKMNP-TV-Z]{26}$`

### SHA256 Digest Validation

- Pricing digests must follow format: `sha256:[64-char-hex]` (case-insensitive)
- Used for pricing scheme integrity and caching

### Intent Validation

- Only valid intent types allowed: `peek`, `read`, `summarize`, `quote`, `embed`, `qa`, `translate`,
  `analyze`
- Each intent must specify supported usage contexts

### Usage Context Validation

- Valid usage types: `immediate`, `session`, `index`, `train`, `distill`, `audit`
- Each usage context specifies pricing and retention policies

### Permission String Validation

- Format: `"${IntentType}:${UsageType}"`
- Examples: `"read:immediate"`, `"summarize:session"`, `"embed:train"`

## Complete Validation Examples

### Comprehensive Workflow

```typescript
import {
  validatePeekManifest,
  validatePricingConfig,
  validateIntentResponse,
} from '@peekthenpay/peek-json-spec';

// 1. Validate publisher manifest
const manifest = {
  version: '1.0',
  publisher: {
    name: 'Example Publisher',
    domain: 'example.com',
    publisher_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T1X',
  },
  content: {
    discovery: {
      robots_txt: true,
      sitemap: true,
    },
    pricing: {
      url: 'https://example.com/.well-known/peek-pricing.json',
    },
  },
};

const manifestResult = validatePeekManifest(manifest);
if (!manifestResult.valid) {
  console.error('Manifest validation failed:', manifestResult.errors);
  return;
}

// 2. Validate pricing configuration
const pricingConfig = {
  pricing_scheme_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T2Y',
  pricing_digest: 'sha256:a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
  publisher_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T1X',
  currency: 'USD',
  cache_ttl_seconds: 3600,
  intents: {
    read: {
      intent: 'read',
      pricing_mode: 'per_request',
      enforcement_method: 'trust',
      usage: {
        immediate: { price_cents: 1 },
        session: { price_cents: 2, max_ttl_seconds: 3600 },
      },
    },
  },
};

const pricingResult = validatePricingConfig(pricingConfig);
if (!pricingResult.valid) {
  console.error('Pricing validation failed:', pricingResult.errors);
  return;
}

// 3. Validate AI response data
const aiResponse = {
  summary: 'Article discusses climate change impacts on coastal regions',
  key_points: ['Rising sea levels', 'Increased storm intensity', 'Ecosystem disruption'],
  metadata: {
    source_url: 'https://example.com/article',
    timestamp: new Date().toISOString(),
    confidence: 0.95,
  },
};

const intentResult = await validateIntentResponse('ptp-summarize', aiResponse);
if (!intentResult.valid) {
  console.error('Intent validation failed:', intentResult.errors);
  return;
}

console.log('✅ All validations passed - system ready for production');
```

### Individual Validation Examples

#### Pricing Validation

```typescript
import { createPricingScheme } from '@peekthenpay/peek-json-spec/pricing-schema-factory';

const pricingData = {
  pricing_scheme_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T2Y',
  pricing_digest: 'sha256:a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
  publisher_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T1X',
  currency: 'USD',
  cache_ttl_seconds: 3600,
  intents: {
    read: {
      intent: 'read',
      pricing_mode: 'per_request',
      enforcement_method: 'trust',
      usage: {
        immediate: { price_cents: 1 },
        session: { price_cents: 2, max_ttl_seconds: 3600 },
      },
    },
  },
};

try {
  const validScheme = await createPricingScheme(JSON.stringify(pricingData));
  console.log('✅ Pricing scheme is valid');
} catch (error) {
  console.error('❌ Validation failed:', error.message);
}
```

### Advanced Validation with Custom Error Handling

```typescript
import {
  createPricingScheme,
  PricingValidationError,
} from '@peekthenpay/peek-json-spec/pricing-schema-factory';

async function validatePricingWithDetails(jsonString: string) {
  try {
    const scheme = await createPricingScheme(jsonString);
    return { success: true, scheme };
  } catch (error) {
    if (error instanceof PricingValidationError) {
      const details = error.errors?.map((err) => ({
        path: err.instancePath,
        message: err.message,
        data: err.data,
      }));
      return { success: false, errors: details };
    }
    return { success: false, error: error.message };
  }
}
```

## Manifest Schema Validation

### Peek Manifest Validation

Validate publisher manifest configurations using the built-in utilities:

```typescript
import { validatePeekManifest } from '@peekthenpay/peek-json-spec';

const manifest = {
  version: '1.0',
  publisher: {
    name: 'Example Publisher',
    domain: 'example.com',
    publisher_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T1X',
  },
  content: {
    discovery: {
      robots_txt: true,
      sitemap: true,
    },
    pricing: {
      url: 'https://example.com/.well-known/peek-pricing.json',
    },
  },
};

const result = validatePeekManifest(manifest);
if (!result.valid) {
  console.error('Manifest validation failed:', result.errors);
} else {
  console.log('✅ Manifest is valid');
}
```

### Factory-Based Manifest Creation

For more comprehensive validation with detailed error handling:

```typescript
import { createPeekManifest, PeekValidationError } from '@peekthenpay/peek-json-spec/factory';

try {
  const manifest = createPeekManifest(manifestData);
  console.log('✅ Manifest created successfully');
} catch (error) {
  if (error instanceof PeekValidationError) {
    console.error('Validation errors:');
    error.errors?.forEach((err) => {
      console.log(`- ${err.instancePath}: ${err.message}`);
    });
  }
}
```

## Package Utility Modules

This package provides several utility modules to help with conformance and consistency when working
with peek.json manifests and license verification:

### Peek Manifest Factory (`src/utils/peek-manifest-factory.ts`)

The peek manifest factory module provides functions for creating and validating PeekManifest
objects:

- **`createPeekManifest(json: string): Promise<PeekManifest>`** - Creates a validated PeekManifest
  from a JSON string, throwing PeekValidationError if invalid
- **`PeekValidationError`** - Custom error class for validation failures with detailed error
  information

> **Note**: File-based validation functions have been removed to ensure edge runtime compatibility.
> In Node.js environments, use `fs.readFile()` to load file content and pass it to `createPeekManifest()`.

### Peek Schema Utilities (`src/utils/peek-schema.ts`)

The schema module handles loading and caching of the peek.json JSON Schema:

- **`getSchema(): Promise<JSONSchema202012>`** - Asynchronously loads the peek.json schema with
  caching
- **`getSchemaSync(): JSONSchema202012`** - Synchronously loads the peek.json schema (requires prior
  async load)
- **`SchemaError`** - Custom error class for schema-related failures

### Pricing Schema Utilities (`src/utils/pricing-schema.ts`)

The pricing schema module provides schema loading and validation:

- **`getPricingSchema(): Promise<JSONSchema202012>`** - Asynchronously loads the pricing schema with
  caching
- **`getPricingSchemaSync(): JSONSchema202012`** - Synchronously loads the pricing schema (requires
  prior async load)
- **`PricingSchemaError`** - Custom error class for pricing schema failures

### License Utilities (`src/utils/license-utils.ts`)

The license module provides comprehensive JWT and DPoP (Demonstration of Proof-of-Possession) token
creation and verification:

- **`createLicenseJwt(options: CreateLicenseOptions): Promise<string>`** - Creates ES256-signed JWT
  licenses with operator key binding
- **`createDpopProof(options: CreateDpopOptions): Promise<string>`** - Creates DPoP proof tokens for
  enhanced security
- **`verifyLicenseAndDpop(options: VerifyOptions): Promise<VerifiedResult>`** - Verifies JWT
  licenses and DPoP proofs with comprehensive validation
- **`CreateLicenseOptions`** - Interface for license creation parameters
- **`CreateDpopOptions`** - Interface for DPoP proof creation parameters
- **`VerifyOptions`** - Interface for verification parameters
- **`VerifiedResult`** - Interface for verification results

These utilities ensure consistent implementation of peek.json standards and provide robust security
features for license-based content access.

## Related Documentation

- [License API Specification](license-api.md) – API endpoints and usage
- [Usage Context Guide](usage-context-guide.md) – Usage types and pricing implications
- [Normative Intent Definitions](normative-intent-definitions.md) – Intent categories and parameters

---

_This document provides technical reference for validation utilities. For API usage and business
logic, see the License API Specification._
