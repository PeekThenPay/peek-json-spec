/**
 * Peek.json Schema Loader - Main Manifest Validation
 *
 * This module provides TypeScript utilities for loading and validating peek.json manifest files.
 *
 * ## Purpose
 * The peek.json schema defines the structure of AI licensing manifest files that publishers
 * create to control how AI systems can access their content. It includes:
 *
 * - Publisher metadata (site info, contact details, categories)
 * - License terms and pricing references
 * - Content access enforcement rules
 * - AI agent identification requirements
 *
 * ## Usage Context
 * - **Publishers**: Create peek.json files using this schema for validation
 * - **AI Agents**: Parse and validate peek.json files before accessing content
 * - **Tools**: Validate user-created manifest files before publication
 * - **Tests**: Ensure example manifests conform to the specification
 *
 * ## Schema Validation Chain
 * peek.json manifest → this schema → valid content licensing rules → AI agent compliance
 *
 * @example
 * ```typescript
 * import { getSchema } from './peek-schema.js';
 *
 * // Load schema for validation
 * const schema = await getSchema();
 *
 * // Use with AJV or other validator
 * const ajv = new Ajv();
 * const validate = ajv.compile(schema);
 * const isValid = validate(userPeekJsonData);
 * ```
 */

import type { SchemaObject } from 'ajv';

/**
 * JSON Schema Draft 2020-12 type - using AJV's native SchemaObject type
 * which is designed for JSON Schema Draft 2020-12 compliance.
 *
 * @see https://json-schema.org/draft/2020-12/schema
 */
export type JSONSchema202012 = SchemaObject;
import { BaseSchemaError, createSchemaLoader } from './schema-loader.js';

/**
 * Custom error class for peek.json schema-related errors
 */
export class SchemaError extends BaseSchemaError {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message, cause);
    this.name = 'SchemaError';
  }
}

// Create schema loader using the shared utility
const { loadSchema, loadSchemaSync } = createSchemaLoader({
  schemaPath: '../../schema/peek.schema.json',
  ErrorClass: SchemaError,
  schemaDisplayName: 'peek.json schema',
});

/**
 * Loads the peek.json schema asynchronously with caching
 *
 * The schema is loaded lazily on first access and cached for subsequent calls.
 * This function loads the JSON Schema that defines the structure of peek.json
 * manifest files used by publishers to control AI access to their content.
 *
 * @returns Promise resolving to the peek.json JSONSchema202012 object
 * @throws {SchemaError} if the schema file cannot be read, parsed, or is invalid
 *
 * @example
 * ```typescript
 * import { getSchema } from './utils/peek-schema.js';
 * import Ajv from 'ajv';
 *
 * const schema = await getSchema();
 * const ajv = new Ajv();
 * const validate = ajv.compile(schema);
 *
 * // Validate a peek.json manifest
 * const isValid = validate(peekJsonData);
 * if (!isValid) {
 *   console.error('Validation errors:', validate.errors);
 * }
 * ```
 */
export async function getSchema(): Promise<JSONSchema202012> {
  return loadSchema();
}

/**
 * Synchronous access to the cached peek.json schema
 *
 * Only use this function if you're certain the schema has been loaded previously
 * via getSchema(). This is useful in scenarios where you need synchronous access
 * and can guarantee the schema is already in memory.
 *
 * @returns The cached peek.json JSONSchema202012 object
 * @throws {Error} if the schema hasn't been loaded yet
 *
 * @example
 * ```typescript
 * // Load schema first
 * await getSchema();
 *
 * // Then access synchronously
 * const schema = getSchemaSync();
 * ```
 */
export function getSchemaSync(): JSONSchema202012 {
  return loadSchemaSync();
}

/**
 * Type alias for the peek.json schema
 * Represents the JSONSchema202012 structure that validates peek.json manifest files
 */
export { type JSONSchema202012 as PeekSchema };

/**
 * Default export for convenient importing
 */
export default getSchema;
