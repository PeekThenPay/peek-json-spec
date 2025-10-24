/**
 * Efficient Schema Loader for Edge Runtime Compatibility
 *
 * This module provides two approaches:
 * 1. Individual static schema imports (tree-shakable)
 * 2. Lazy loading functions that only import what's needed
 *
 * Users can choose the approach that best fits their use case:
 * - Import specific schemas directly for minimal bundle size
 * - Use loader functions for dynamic schema access
 */

import type { SchemaObject } from 'ajv';

/**
 * JSON Schema type
 */
export type JSONSchema = SchemaObject;

/**
 * Intent schema types
 */
export type IntentSchemaType =
  | 'common-defs'
  | 'ptp-analyze'
  | 'ptp-embed'
  | 'ptp-peek'
  | 'ptp-qa'
  | 'ptp-quote'
  | 'ptp-read'
  | 'ptp-search'
  | 'ptp-summarize'
  | 'ptp-translate';

/**
 * Main schema types
 */
export type MainSchemaType = 'peek' | 'pricing' | 'forensic-manifest';

/**
 * Schema cache for lazy-loaded schemas
 */
const schemaCache = new Map<string, JSONSchema>();

/**
 * Lazy load an intent schema (only imports when first requested)
 * This enables tree shaking - unused schemas won't be in the bundle
 */
export async function getIntentSchema(type: IntentSchemaType): Promise<JSONSchema> {
  const cacheKey = `intent:${type}`;

  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  let schema: JSONSchema;

  switch (type) {
    case 'common-defs':
      schema = (await import('../../schema/intents/common-defs.schema.json')).default as JSONSchema;
      break;
    case 'ptp-analyze':
      schema = (await import('../../schema/intents/ptp-analyze.schema.json')).default as JSONSchema;
      break;
    case 'ptp-embed':
      schema = (await import('../../schema/intents/ptp-embed.schema.json')).default as JSONSchema;
      break;
    case 'ptp-peek':
      schema = (await import('../../schema/intents/ptp-peek.schema.json')).default as JSONSchema;
      break;
    case 'ptp-qa':
      schema = (await import('../../schema/intents/ptp-qa.schema.json')).default as JSONSchema;
      break;
    case 'ptp-quote':
      schema = (await import('../../schema/intents/ptp-quote.schema.json')).default as JSONSchema;
      break;
    case 'ptp-read':
      schema = (await import('../../schema/intents/ptp-read.schema.json')).default as JSONSchema;
      break;
    case 'ptp-search':
      schema = (await import('../../schema/intents/ptp-search.schema.json')).default as JSONSchema;
      break;
    case 'ptp-summarize':
      schema = (await import('../../schema/intents/ptp-summarize.schema.json'))
        .default as JSONSchema;
      break;
    case 'ptp-translate':
      schema = (await import('../../schema/intents/ptp-translate.schema.json'))
        .default as JSONSchema;
      break;
    default:
      throw new Error(`Unknown intent schema type: ${type}`);
  }

  schemaCache.set(cacheKey, schema);
  return schema;
}

/**
 * Lazy load a main schema (only imports when first requested)
 */
export async function getMainSchema(type: MainSchemaType): Promise<JSONSchema> {
  const cacheKey = `main:${type}`;

  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  let schema: JSONSchema;

  switch (type) {
    case 'peek':
      schema = (await import('../../schema/peek.schema.json')).default as JSONSchema;
      break;
    case 'pricing':
      schema = (await import('../../schema/pricing.schema.json')).default as JSONSchema;
      break;
    case 'forensic-manifest':
      schema = (await import('../../schema/forensic-manifest.schema.json')).default as JSONSchema;
      break;
    default:
      throw new Error(`Unknown main schema type: ${type}`);
  }

  schemaCache.set(cacheKey, schema);
  return schema;
}

/**
 * Get any schema by name with lazy loading
 */
export async function getSchema(name: IntentSchemaType | MainSchemaType): Promise<JSONSchema> {
  // Try as main schema first
  const mainSchemas: MainSchemaType[] = ['peek', 'pricing', 'forensic-manifest'];
  if (mainSchemas.includes(name as MainSchemaType)) {
    return getMainSchema(name as MainSchemaType);
  }

  // Otherwise treat as intent schema
  return getIntentSchema(name as IntentSchemaType);
}

/**
 * Clear schema cache (useful for testing)
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}

/**
 * Get cache information for debugging
 */
export function getCacheInfo(): { size: number; keys: string[] } {
  return {
    size: schemaCache.size,
    keys: Array.from(schemaCache.keys()),
  };
}

// Export individual static schema loaders for users who want minimal bundles
export * as staticSchemas from './static-schema-imports.js';
