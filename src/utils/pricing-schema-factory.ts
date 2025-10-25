import type { PricingScheme } from '../types/pricing.js';
import type { ErrorObject } from 'ajv';
// Import pre-compiled validator with full format validation
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Pre-compiled validator without types
import validatorFn from '../validators/pricing-validator.js';

// Type assertion for pre-compiled validator
const validator = validatorFn as ((data: unknown) => boolean) & { errors?: ErrorObject[] | null };

/**
 * Error thrown when pricing JSON validation fails
 */
export class PricingValidationError extends Error {
  constructor(
    message: string,
    public errors?: ErrorObject<string, Record<string, string | number | boolean | null>, unknown>[]
  ) {
    super(message);
    this.name = 'PricingValidationError';
  }
}

/**
 * Creates a PricingScheme from a JSON string, validating it against the schema
 * @param json The JSON string to parse and validate
 * @returns A validated PricingScheme object
 * @throws {PricingValidationError} If the JSON is invalid or doesn't match the schema
 * @throws {SyntaxError} If the JSON is malformed
 */
export function createPricingScheme(json: string): PricingScheme {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new SyntaxError('Invalid JSON: ' + (err instanceof Error ? err.message : String(err)));
  }

  const isValid = validator(data);

  if (!isValid) {
    throw new PricingValidationError('Invalid pricing JSON format', validator.errors || []);
  }

  return data as PricingScheme;
}
