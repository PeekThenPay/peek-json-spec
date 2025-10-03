import { readFile } from 'fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { PricingScheme } from '../types/pricing.js';
import { getPricingSchema } from './pricing-schema.js';
import { ErrorObject, ValidateFunction } from 'ajv';

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
    const ajv = new Ajv({
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

/**
 * Creates a PricingScheme from a file, validating it against the schema
 * @param filePath Path to the pricing JSON file
 * @returns A validated PricingScheme object
 * @throws {PricingValidationError} If the JSON is invalid or doesn't match the schema
 * @throws {Error} If the file cannot be read
 */
export async function createPricingSchemeFromFile(filePath: string): Promise<PricingScheme> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return await createPricingScheme(content);
  } catch (err) {
    if (err instanceof PricingValidationError) {
      throw err;
    }
    throw new Error(
      `Failed to read pricing JSON from ${filePath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
