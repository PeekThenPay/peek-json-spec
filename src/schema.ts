// TypeScript wrapper for peek.schema.json
import { JSONSchema7 } from 'json-schema';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

let _schema: JSONSchema7 | undefined;

/**
 * Custom error class for schema-related errors
 */
export class SchemaError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'SchemaError';
  }
}

/**
 * Get the peek.json schema. The schema is loaded lazily on first access
 * and cached for subsequent calls.
 * @throws {SchemaError} if the schema file cannot be read or parsed
 */
export async function getSchema(): Promise<JSONSchema7> {
  if (_schema) return _schema;

  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const schemaPath = resolve(__dirname, '../schema/peek.schema.json');

    let schemaContent: string;
    try {
      schemaContent = await readFile(schemaPath, 'utf-8');
    } catch (err) {
      throw new SchemaError(
        `Failed to read schema file at ${schemaPath}. ` +
          'Make sure the schema file is included in the package.',
        err instanceof Error ? err : undefined
      );
    }

    try {
      _schema = JSON.parse(schemaContent) as JSONSchema7;
    } catch (err) {
      throw new SchemaError(
        'Failed to parse schema file. The schema file appears to be corrupted or contain invalid JSON.',
        err instanceof Error ? err : undefined
      );
    }

    return _schema;
  } catch (err) {
    // If it's already a SchemaError, rethrow it
    if (err instanceof SchemaError) throw err;

    // Otherwise wrap it in a SchemaError
    throw new SchemaError(
      'Unexpected error while loading schema',
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Synchronous access to the schema. Only use this if you're sure the schema
 * has been loaded previously via getSchema().
 * @throws {Error} if the schema hasn't been loaded yet
 */
export function getSchemaSync(): JSONSchema7 {
  if (!_schema) {
    throw new Error(
      'Schema not loaded. Call getSchema() first or use synchronous file loading if blocking is acceptable.'
    );
  }
  return _schema;
}

export { type JSONSchema7 as PeekSchema };
export default getSchema;
