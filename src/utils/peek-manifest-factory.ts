import type { PeekManifest } from '../types/peek-manifest.js';
import type { ErrorObject } from 'ajv';
// Import pre-compiled validator with full format validation
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Pre-compiled validator without types
import validatorFn from '../validators/peek-validator.js';

// Type assertion for pre-compiled validator
const validator = validatorFn as ((data: unknown) => boolean) & { errors?: ErrorObject[] | null };

/**
 * Error thrown when peek.json validation fails
 */
export class PeekValidationError extends Error {
  constructor(
    message: string,
    public errors?: ErrorObject<string, Record<string, string | number | boolean | null>, unknown>[]
  ) {
    super(message);
    this.name = 'PeekValidationError';
  }
}

/**
 * Creates a PeekManifest from a JSON string, validating it against the schema
 * @param json The JSON string to parse and validate
 * @returns A validated PeekManifest object
 * @throws {PeekValidationError} If the JSON is invalid or doesn't match the schema
 * @throws {SyntaxError} If the JSON is malformed
 */
export function createPeekManifest(json: string): PeekManifest {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new SyntaxError('Invalid JSON: ' + (err instanceof Error ? err.message : String(err)));
  }

  const isValid = validator(data);

  if (!isValid) {
    throw new PeekValidationError('Invalid peek.json format', validator.errors || []);
  }

  return data as PeekManifest;
}
