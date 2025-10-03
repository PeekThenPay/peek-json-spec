// TypeScript wrapper for pricing.schema.json
import type { JSONSchema7 } from 'json-schema';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

let _pricingSchema: JSONSchema7 | undefined;

/**
 * Custom error class for pricing schema-related errors
 */
export class PricingSchemaError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PricingSchemaError';
  }
}

/**
 * Get the pricing.json schema. The schema is loaded lazily on first access
 * and cached for subsequent calls.
 * @throws {PricingSchemaError} if the schema file cannot be read or parsed
 */
export async function getPricingSchema(): Promise<JSONSchema7> {
  if (_pricingSchema) return _pricingSchema;

  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const schemaPath = resolve(__dirname, '../../schema/pricing.schema.json');

    let schemaContent: string;
    try {
      schemaContent = await readFile(schemaPath, 'utf-8');
    } catch (err) {
      throw new PricingSchemaError(
        `Failed to read pricing schema file at ${schemaPath}. ` +
          'Make sure the schema file is included in the package.',
        err instanceof Error ? err : undefined
      );
    }

    try {
      _pricingSchema = JSON.parse(schemaContent) as JSONSchema7;
    } catch (err) {
      throw new PricingSchemaError(
        'Failed to parse pricing schema file. The schema file appears to be corrupted or contain invalid JSON.',
        err instanceof Error ? err : undefined
      );
    }

    return _pricingSchema;
  } catch (err) {
    // If it's already a PricingSchemaError, rethrow it
    if (err instanceof PricingSchemaError) throw err;

    // Otherwise wrap it in a PricingSchemaError
    throw new PricingSchemaError(
      'Unexpected error while loading pricing schema',
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Synchronous access to the pricing schema. Only use this if you're sure the schema
 * has been loaded previously via getPricingSchema().
 * @throws {Error} if the schema hasn't been loaded yet
 */
export function getPricingSchemaSync(): JSONSchema7 {
  if (!_pricingSchema) {
    throw new Error(
      'Pricing schema not loaded. Call getPricingSchema() first or use synchronous file loading if blocking is acceptable.'
    );
  }
  return _pricingSchema;
}

export { type JSONSchema7 as PricingSchema };
export default getPricingSchema;
