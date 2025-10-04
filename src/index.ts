// Export license utilities
export {
  createLicenseJwt,
  createDpopProof,
  verifyLicenseAndDpop,
  CreateLicenseOptions,
  CreateDpopOptions,
  ReplayGuard,
  VerifyOptions,
  VerifiedResult,
} from './utils/license-utils.js';
// Barrel file for all Peek types
export * from './types/common.js';
export * from './types/license-api.js';
export * from './types/license.js';
export * from './types/peek-manifest.js';
export * from './types/pricing.js';

// Export schema utilities
export { getSchema, getSchemaSync, type PeekSchema } from './utils/schema.js';
export {
  getPricingSchema,
  getPricingSchemaSync,
  type PricingSchema,
  PricingSchemaError,
} from './utils/pricing-schema.js';

// Export factory functions and validation errors
export {
  createPeekManifest,
  createPeekManifestFromFile,
  PeekValidationError,
} from './utils/peek-manifest-factory.js';

export {
  createPricingScheme,
  createPricingSchemeFromFile,
  PricingValidationError,
} from './utils/pricing-schema-factory.js';
