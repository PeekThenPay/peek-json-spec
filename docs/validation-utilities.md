# Validation Utilities Technical Reference

This document provides technical reference for validation utilities in the
`@peekthenpay/peek-json-spec` package. These utilities help validate pricing schemes, license
structures, and other Peek-Then-Pay components against their respective JSON schemas.

## Installation

```bash
npm install @peekthenpay/peek-json-spec
# or
pnpm add @peekthenpay/peek-json-spec
```

## Pricing Schema Validation

### Validation Functions

The package provides utilities for validating pricing schemes against `pricing.schema.json`:

```typescript
import {
  createPricingScheme,
  createPricingSchemeFromFile,
  PricingValidationError,
} from '@peekthenpay/peek-json-spec/pricing-schema-factory';

// Validate pricing JSON string
try {
  const pricingScheme = await createPricingScheme(jsonString);
  console.log('Valid pricing scheme:', pricingScheme);
} catch (error) {
  if (error instanceof PricingValidationError) {
    console.error('Validation errors:', error.errors);
  }
}

// Validate pricing from file
try {
  const pricingScheme = await createPricingSchemeFromFile('./pricing.json');
} catch (error) {
  console.error('File validation failed:', error.message);
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

## Example Usage

### Basic Validation

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

## Package Utility Modules

This package provides several utility modules to help with conformance and consistency when working
with peek.json manifests and license verification:

### Factory Utilities (`src/utils/factory.ts`)

The factory module provides functions for creating and validating PeekManifest objects:

- **`createPeekManifest(data: unknown): PeekManifest`** - Creates a validated PeekManifest from
  unknown data, throwing PeekValidationError if invalid
- **`createPeekManifestFromFile(filePath: string): Promise<PeekManifest>`** - Loads and validates a
  PeekManifest from a JSON file
- **`PeekValidationError`** - Custom error class for validation failures with detailed error
  information

### Schema Utilities (`src/utils/schema.ts`)

The schema module handles loading and caching of the peek.json JSON Schema:

- **`getSchema(): Promise<JSONSchemaType<PeekManifest>>`** - Asynchronously loads the peek.json
  schema with caching
- **`getSchemaSync(): JSONSchemaType<PeekManifest>`** - Synchronously loads the peek.json schema
  (requires prior async load)
- **`SchemaError`** - Custom error class for schema-related failures

### License Utilities (`src/utils/license-utils.ts`)

The license module provides comprehensive JWT and DPoP (Demonstration of Proof-of-Possession) token
verification:

- **`createLicense(payload: object, options: CreateLicenseOptions): Promise<string>`** - Creates
  ES256-signed JWT licenses
- **`createDpopProof(options: CreateDpopProofOptions): Promise<string>`** - Creates DPoP proof
  tokens for enhanced security
- **`verifyLicense(license: string, options: VerifyLicenseOptions): Promise<object>`** - Verifies
  JWT licenses with comprehensive validation
- **`verifyDpopProof(dpopProof: string, options: VerifyDpopProofOptions): Promise<object>`** -
  Verifies DPoP proof tokens
- **`LicenseError`** - Custom error class for license verification failures

These utilities ensure consistent implementation of peek.json standards and provide robust security
features for license-based content access.

## Related Documentation

- [License API Specification](license-api.md) – API endpoints and usage
- [Usage Context Guide](usage-context-guide.md) – Usage types and pricing implications
- [Normative Intent Definitions](normative-intent-definitions.md) – Intent categories and parameters

---

_This document provides technical reference for validation utilities. For API usage and business
logic, see the License API Specification._
