# Changelog

All notable changes to this project will be documented in this file.

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
