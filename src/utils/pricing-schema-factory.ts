import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { PricingScheme } from '../types/pricing.js';
import { getPricingSchema } from './pricing-schema.js';
import type { ErrorObject, ValidateFunction } from 'ajv';

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

let validateFn: ValidateFunction<PricingScheme> | undefined;

/**
 * Creates a validator function for pricing JSON files if one doesn't exist
 */
async function getValidator(): Promise<ValidateFunction<PricingScheme>> {
  if (!validateFn) {
    const ajv = new Ajv2020({
      allErrors: true,
      strict: false,
      validateFormats: true,
    });

    // Add format validators
    addFormats(ajv);

    const schema = await getPricingSchema();
    validateFn = ajv.compile(schema) as ValidateFunction<PricingScheme>;
  }
  return validateFn;
}

/**
 * Creates a PricingScheme from a JSON string, validating it against the schema
 * @param json The JSON string to parse and validate
 * @returns A validated PricingScheme object
 * @throws {PricingValidationError} If the JSON is invalid or doesn't match the schema
 * @throws {SyntaxError} If the JSON is malformed
 */
export async function createPricingScheme(json: string): Promise<PricingScheme> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new SyntaxError('Invalid JSON: ' + (err instanceof Error ? err.message : String(err)));
  }

  const validate = await getValidator();
  const valid = validate(data);

  if (!valid) {
    throw new PricingValidationError('Invalid pricing JSON format', validate.errors || []);
  }

  return data as PricingScheme;
}
