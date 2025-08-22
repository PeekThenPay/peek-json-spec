// Main entry point for @peekthenpay/peek-json-spec

// Export all types
export * from './types/peek-manifest.js';
export * from './types/license-api.js';
export * from './types/tool-service.js';

// Export schema utilities
export { getSchema, getSchemaSync, type PeekSchema } from './schema.js';

// Export factory functions and validation error
export { createPeekManifest, createPeekManifestFromFile, PeekValidationError } from './factory.js';
