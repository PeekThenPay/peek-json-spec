# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-07-12

### 🚀 Added

- **Namespaced contentType values**: `contentType` now accepts custom lowercase-kebab
  namespaced values (e.g., `ecommerce:deals`) alongside the canonical enum, mirroring
  `mediaType`'s anyOf pattern
- **`pageMetadata` in peek**: the existing typed `articleMetadata`/`productMetadata` defs are
  now reachable from peek responses
- **`related[]`**: typed discovery-graph links (url/title/relationship), max 10, with
  same-publisher domain guidance
- **`agentGuidance`**: publisher instructions on using the response (max 500 chars), with
  normative anti-reconstruction and untrusted-data constraints
- **`contentState`**: editorial lifecycle enum (draft/scheduled/published/archived/retracted);
  absent means published. Pre-publication access semantics reserved as a planned extension
- **Document-level context model**: `topics[]` (contextTopic: label/scheme/id/score, max 10)
  and `entities[]` (contextEntity: name/type/id/url/salience, max 25); span-level data
  remains exclusive to the analyze intent
- Live production regression fixture (offers.com peek, captured 2026-07-12)

### 🔧 Changed

- Normative docs: peek body identification corrected from `"type": "peek"` to
  `"intent": "peek"` (matching the schema and shipped validators)
- Test files are no longer compiled into `dist/` (they shipped, unimported, in the published
  package — dead Node-only code in an edge-consumed package)

### 📋 Compatibility

- Additive: all new fields optional; peek top level remains `additionalProperties: false`.
  Responses emitting new fields require 2.1.0 validators — upgrade consumers before producers.

## [2.0.0] - 2026 (backfilled stub)

- Corpus features upgraded to usage-based pricing (breaking); chunk intent (v1.1.0) and
  subsequent schema updates. See git history for details — this entry backfills a changelog
  gap between 1.0.3 and 2.1.0.

## [1.0.3] - 2025-10-27

### 🐛 Fixed

- **JSON Import Attributes**: Added `with { type: "json" }` to all JSON schema imports for strict ESM compliance
  - Updated all 13 schema imports in `static-schema-imports.ts` with proper import attributes
  - Fixed "Module needs an import attribute of type: json" error in strict ESM environments
  - Updated TypeScript config module target from "ES2022" to "ESNext" to support import attributes
- **ESM Standards Compliance**: Full adherence to ESM specification requirements

### 🔧 Changed

- Updated `tsconfig.json` module setting to "ESNext" for import attributes support
- Enhanced JSON schema imports with proper type declarations

### ✅ Verified

- All 193 tests passing with import attributes
- JSON schema loading working correctly in strict ESM mode
- Edge runtime compatibility confirmed

## [1.0.2] - 2025-10-27

### 🐛 Fixed

- **ESM Import Extension**: Added `.js` extension to ajv-formats import for proper ESM compliance
  - Fixed import from `"ajv-formats/dist/formats"` to `"ajv-formats/dist/formats.js"`
  - Resolves "Cannot find module" error in Node.js ESM strict mode
  - All 12 pre-compiled validators now use correct ESM import syntax
- Enhanced validator generator script for proper ESM import paths

### ✅ Verified

- All 193 tests passing with corrected import paths
- ESM module resolution working in Node.js environments
- Edge runtime compatibility maintained

## [1.0.1] - 2025-10-25

### 🐛 Fixed

- **ESM Module Export Issue**: Converted pre-compiled validators from CommonJS to proper ESM format
  - Fixed `module.exports` to `export default` in all 12 validators
  - Converted `require()` calls to clean ESM imports for ajv-formats
  - Resolved "module import/export issue" reported in v1.0.0
  - All validators now have proper `import { fullFormats } from "ajv-formats/dist/formats"`
- Enhanced validator generation script with improved ESM conversion logic
- Maintains full edge runtime compatibility with correct module format

## [1.0.0] - 2025-10-25

### 🚀 Added

- Pre-compiled AJV validators for all 12 schemas with full format validation support
- Edge runtime compatibility for serverless deployment (Cloudflare Pages, Vercel Edge Functions)
- Empty permissions array support in license validation for flexible licensing workflows
- JWT `typ` header compliance (RFC 7519) for license tokens
- Comprehensive edge compatibility documentation in README.md
- Updated validation-utilities.md with edge-focused examples

### 🔧 Changed

- **BREAKING**: Simplified factory functions to synchronous direct imports
  - `peek-manifest-factory.ts` now uses pre-compiled validators
  - `pricing-schema-factory.ts` simplified to direct validation
  - `forensic-manifest-factory.ts` aligned with consistent factory pattern
- Model metadata validation relaxed (name, version, vendor, description now flexible strings)
- License permissions validation now accepts empty arrays (`[]`)
- Build pipeline updated to generate validators before TypeScript compilation

### 🗑️ Removed

- `schemas-lazy.ts` module (replaced by pre-compiled validators)
- Node.js file system dependencies for edge compatibility
- Problematic `$id` URL references in intent schemas

### 🐛 Fixed

- Schema reference resolution issues with common-defs.schema.json
- Factory pattern inconsistencies across validation modules
- Linting errors with proper eslint-disable patterns
- Test coverage exclusions for generated validator files

### 🔐 Security

- Added proper JWT headers with `typ: 'JWT'` for license tokens
- Maintained `typ: 'dpop+jwt'` for DPoP proofs per RFC 9449
- Improved token type identification and security

### ⚡ Performance

- Zero cold start overhead with pre-compiled validators
- Eliminated runtime schema compilation
- Tree-shakable validator imports for optimized bundles
