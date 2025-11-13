/**
 * High-Performance JSON Schema Loader for peek-json-spec
 *
 * This module provides on-demand loading and caching of JSON Schema files optimized
 * for request/response pipelines and runtime validation scenarios.
 *
 * ## Performance Design
 * - **Lazy Loading**: Schemas loaded only when needed, not upfront
 * - **Memory Caching**: Once loaded, schemas stay in memory for fast access
 * - **Individual Access**: Load specific schemas, not bulk operations
 * - **Pipeline Optimized**: Minimal latency for validation in request handlers
 *
 * ## Schema Categories
 * 1. **Main Schemas**: peek.schema.json (manifest), pricing.schema.json (billing)
 * 2. **Intent Schemas**: ptp-*.schema.json (AI response validation)
 * 3. **Common Definitions**: shared type definitions and cross-references
 *
 * ## Usage Patterns
 * - **Request Validation**: Load intent schema on-demand for response validation
 * - **Manifest Processing**: Load peek/pricing schemas for user data validation
 * - **Testing**: Load schemas individually for focused test scenarios
 * - **Cross-References**: Automatic resolution of schema dependencies
 *
 * @example
 * ```typescript
 * // On-demand loading for request pipeline
 * const schema = await loadIntentSchema('ptp-analyze');
 * const validator = ajv.compile(schema);
 *
 * // Bulk operations only when needed (e.g., testing)
 * const commonDefs = await loadIntentSchema('common-defs');
 * ```
 */

import type { SchemaObject, ValidateFunction } from 'ajv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

/**
 * JSON Schema Draft 2020-12 type - using AJV's native SchemaObject type
 * which is designed for JSON Schema Draft 2020-12 compliance.
 *
 * @see https://json-schema.org/draft/2020-12/schema
 */
export type JSONSchema = SchemaObject;

/**
 * Node.js error with code property
 */
interface NodeError extends Error {
  code?: string;
}

/**
 * Base error class for schema loading errors
 */
export abstract class BaseSchemaError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
  }
}

/**
 * Configuration for creating a schema loader
 */
interface SchemaLoaderConfig<TError extends BaseSchemaError> {
  /** Relative path to the schema file from src/utils/ */
  schemaPath: string;
  /** Error class constructor for this schema type */
  ErrorClass: new (message: string, cause?: Error) => TError;
  /** Human-readable name for error messages (e.g., "peek.json schema", "pricing schema") */
  schemaDisplayName: string;
}

/**
 * Available intent schema types
 * These correspond to files in schema/intents/ directory
 */
export type IntentSchemaType =
  | 'common-defs'
  | 'ptp-analyze'
  | 'ptp-chunk'
  | 'ptp-embed'
  | 'ptp-peek'
  | 'ptp-qa'
  | 'ptp-quote'
  | 'ptp-read'
  | 'ptp-search'
  | 'ptp-summarize'
  | 'ptp-translate';

/**
 * Main schema types in the root schema directory
 */
export type MainSchemaType = 'peek' | 'pricing';

/**
 * Schema cache for all loaded schemas
 */
const schemaCache = new Map<string, JSONSchema>();

/**
 * Gets the base directory for schema files
 */
function getSchemaBaseDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return resolve(__dirname, '../../schema');
}

/**
 * Loads a schema file from disk with error handling
 */
async function loadSchemaFile(filePath: string, displayName: string): Promise<JSONSchema> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as JSONSchema;
  } catch (err) {
    if ((err as NodeError).code === 'ENOENT') {
      throw new Error(
        `${displayName} file not found at ${filePath}. ` +
          'Make sure the schema file is included in the package.'
      );
    }
    if (err instanceof SyntaxError) {
      throw new Error(
        `Failed to parse ${displayName} file. The schema file appears to be corrupted or contain invalid JSON: ${err.message}`
      );
    }
    throw new Error(`Unexpected error loading ${displayName}: ${err}`);
  }
}

/**
 * Loads an intent schema by type with caching
 */
export async function loadIntentSchema(type: IntentSchemaType): Promise<JSONSchema> {
  const cacheKey = `intent:${type}`;

  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  const fileName = `${type}.schema.json`;
  const filePath = join(getSchemaBaseDir(), 'intents', fileName);
  const displayName = `${type} intent schema`;

  const schema = await loadSchemaFile(filePath, displayName);
  schemaCache.set(cacheKey, schema);

  return schema;
}

/**
 * Loads a main schema by type with caching
 */
export async function loadMainSchema(type: MainSchemaType): Promise<JSONSchema> {
  const cacheKey = `main:${type}`;

  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  const fileName = `${type}.schema.json`;
  const filePath = join(getSchemaBaseDir(), fileName);
  const displayName = `${type} schema`;

  const schema = await loadSchemaFile(filePath, displayName);
  schemaCache.set(cacheKey, schema);

  return schema;
}

/**
 * Gets synchronous access to a cached intent schema
 * Only use if you're sure the schema has been loaded previously
 */
export function getIntentSchemaSync(type: IntentSchemaType): JSONSchema {
  const cacheKey = `intent:${type}`;

  if (!schemaCache.has(cacheKey)) {
    throw new Error(`${type} intent schema not loaded. Call loadIntentSchema('${type}') first.`);
  }

  return schemaCache.get(cacheKey)!;
}

/**
 * Gets synchronous access to a cached main schema
 * Only use if you're sure the schema has been loaded previously
 */
export function getMainSchemaSync(type: MainSchemaType): JSONSchema {
  const cacheKey = `main:${type}`;

  if (!schemaCache.has(cacheKey)) {
    throw new Error(`${type} schema not loaded. Call loadMainSchema('${type}') first.`);
  }

  return schemaCache.get(cacheKey)!;
}

/**
 * Clears all cached schemas (useful for testing)
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}

/**
 * Gets information about currently cached schemas (useful for debugging)
 */
export function getCacheInfo(): { size: number; keys: string[] } {
  return {
    size: schemaCache.size,
    keys: Array.from(schemaCache.keys()),
  };
}

/**
 * Creates a schema loader with caching, error handling, and TypeScript support
 *
 * @example
 * ```typescript
 * const { loadSchema, loadSchemaSync } = createSchemaLoader({
 *   schemaPath: '../../schema/peek.schema.json',
 *   ErrorClass: SchemaError,
 *   schemaDisplayName: 'peek.json schema'
 * });
 * ```
 */
export function createSchemaLoader<TError extends BaseSchemaError>({
  schemaPath,
  ErrorClass,
  schemaDisplayName,
}: SchemaLoaderConfig<TError>): {
  loadSchema: () => Promise<JSONSchema>;
  loadSchemaSync: () => JSONSchema;
} {
  let _cachedSchema: JSONSchema | undefined;

  /**
   * Loads the schema asynchronously with caching
   */
  async function loadSchema(): Promise<JSONSchema> {
    if (_cachedSchema) return _cachedSchema;

    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const resolvedPath = resolve(__dirname, schemaPath);

      let schemaContent: string;
      try {
        schemaContent = await readFile(resolvedPath, 'utf-8');
      } catch (err) {
        throw new ErrorClass(
          `Failed to read ${schemaDisplayName} file at ${resolvedPath}. ` +
            'Make sure the schema file is included in the package.',
          err instanceof Error ? err : undefined
        );
      }

      try {
        _cachedSchema = JSON.parse(schemaContent) as JSONSchema;
      } catch (err) {
        throw new ErrorClass(
          `Failed to parse ${schemaDisplayName} file. The schema file appears to be corrupted or contain invalid JSON.`,
          err instanceof Error ? err : undefined
        );
      }

      return _cachedSchema;
    } catch (err) {
      // If it's already the expected error type, rethrow it
      if (err instanceof ErrorClass) throw err;

      // Otherwise wrap unexpected errors
      throw new ErrorClass(
        `Unexpected error while loading ${schemaDisplayName}`,
        err instanceof Error ? err : undefined
      );
    }
  }

  /**
   * Synchronous access to the cached schema
   * Only use if you're sure the schema has been loaded previously
   */
  function loadSchemaSync(): JSONSchema {
    if (!_cachedSchema) {
      throw new Error(
        `${schemaDisplayName} not loaded. Call the async loader first or use synchronous file loading if blocking is acceptable.`
      );
    }
    return _cachedSchema;
  }

  return {
    loadSchema,
    loadSchemaSync,
  };
}

/**
 * Validates that a schema is a valid JSON Schema
 * This is used to catch schema definition errors during development/testing
 *
 * @param schema The schema object to validate
 * @param schemaName Human-readable name for error messages
 * @returns true if valid, throws Error if invalid
 */
export function validateSchemaIsValid(schema: JSONSchema, schemaName: string): boolean {
  // Basic structural validation
  if (!schema || typeof schema !== 'object') {
    throw new Error(`${schemaName} is not a valid object`);
  }

  // Must have $schema property for JSON Schema
  if (!schema.$schema) {
    throw new Error(`${schemaName} missing required $schema property`);
  }

  // Must have type property
  if (!schema.type) {
    throw new Error(`${schemaName} missing required type property`);
  }

  // For more thorough validation, you would use a JSON Schema meta-validator here
  // This is a basic check to catch obvious schema errors
  return true;
}

/**
 * Creates an AJV loadSchema function that can resolve cross-references between intent schemas
 * This is optimized for request/response validation pipelines with minimal latency overhead.
 *
 * @example
 * ```typescript
 * // Setup once per application lifecycle
 * const ajv = new Ajv2020({
 *   loadSchema: createAjvLoadSchemaFunction()
 * });
 *
 * // Use in request handlers - schemas load on-demand and cache automatically
 * const validator = ajv.compile({ $ref: 'ptp-analyze.schema.json' });
 * ```
 */
export function createAjvLoadSchemaFunction() {
  return async (uri: string): Promise<JSONSchema> => {
    // Handle references to common-defs.schema.json
    if (uri === 'common-defs.schema.json' || uri.endsWith('common-defs.schema.json')) {
      return await loadIntentSchema('common-defs');
    }

    // Handle other intent schema references
    const intentMatch = uri.match(/^(?:.*\/)?([A-Za-z0-9_-]+)\.schema\.json$/);
    if (intentMatch) {
      const schemaName = intentMatch[1];

      // Check if it's a known intent schema
      try {
        return await loadIntentSchema(schemaName as IntentSchemaType);
      } catch {
        // If not a known intent schema, it might be a main schema
        if (schemaName === 'peek' || schemaName === 'pricing') {
          return await loadMainSchema(schemaName as MainSchemaType);
        }
      }
    }

    throw new Error(`Cannot load schema: ${uri}. Schema not found or not supported.`);
  };
}

/**
 * Creates a compiled AJV validator for intent response validation in request handlers
 *
 * This function provides complete validation including cross-references and format validation.
 * It returns a function that can validate data and provides detailed error information.
 *
 * @param intentType The type of intent response to validate
 * @returns Promise resolving to compiled AJV validator function with error details
 *
 * @example
 * ```typescript
 * // In request handler
 * const validate = await createIntentValidator('ptp-analyze');
 * const isValid = validate(responseData);
 * if (!isValid) {
 *   console.error('Validation errors:', validate.errors);
 *   throw new ValidationError('Invalid response format', validate.errors);
 * }
 * ```
 */
export async function createIntentValidator(
  intentType: IntentSchemaType
): Promise<ValidateFunction> {
  // Dynamic import to avoid dependency issues during module loading
  const [{ default: Ajv2020 }, addFormats] = await Promise.all([
    import('ajv/dist/2020.js'),
    import('ajv-formats'),
  ]);

  const schema = await loadIntentSchema(intentType);

  // Create AJV instance with cross-reference support and format validation
  const ajv = new Ajv2020({
    strict: false, // Allow flexibility for schema variations
    allErrors: true, // Collect all validation errors, not just the first
    verbose: true, // Include schema path information in errors
    loadSchema: createAjvLoadSchemaFunction(), // Handle cross-references
  });

  // Add format validation (uri, date-time, etc.)
  addFormats.default(ajv);

  // Compile the schema with cross-reference resolution
  return await ajv.compileAsync(schema);
}

/**
 * Validates data against an intent schema and returns detailed results
 *
 * This is the highest-level convenience function for intent validation.
 * It handles all the complexity and gives you a clean success/failure result.
 *
 * @param intentType The type of intent response schema to validate against
 * @param data The data to validate
 * @returns Promise resolving to validation result with detailed error information
 *
 * @example
 * ```typescript
 * // In request handler - simple success/failure
 * const result = await validateIntentResponse('ptp-analyze', responseData);
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 *   throw new ValidationError('Invalid response format', result.errors);
 * }
 *
 * // Use the validated data with confidence
 * console.log('Valid response:', result.data);
 * ```
 */
export async function validateIntentResponse(
  intentType: IntentSchemaType,
  data: unknown
): Promise<{
  valid: boolean;
  data: unknown;
  errors: unknown[] | null;
  schema: JSONSchema;
}> {
  const validator = await createIntentValidator(intentType);
  const schema = await loadIntentSchema(intentType);

  const isValid = validator(data);

  return {
    valid: isValid,
    data: data,
    errors: isValid ? null : validator.errors || [],
    schema: schema,
  };
}
