import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { PeekManifest } from '../types/peek-manifest.js';
import { getSchema } from './peek-schema.js';
import type { ErrorObject, ValidateFunction } from 'ajv';

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

let validateFn: ValidateFunction<PeekManifest> | undefined;

/**
 * Creates a validator function for peek.json files if one doesn't exist
 */
async function getValidator(): Promise<ValidateFunction<PeekManifest>> {
  if (!validateFn) {
    const ajv = new Ajv2020({
      validateFormats: true,
      allErrors: true,
      coerceTypes: false,
      useDefaults: true,
    });
    addFormats(ajv, { mode: 'full' });

    const schema = await getSchema();
    validateFn = ajv.compile(schema) as ValidateFunction<PeekManifest>;
  }
  return validateFn;
}

/**
 * Creates a PeekManifest from a JSON string, validating it against the schema
 * @param json The JSON string to parse and validate
 * @returns A validated PeekManifest object
 * @throws {PeekValidationError} If the JSON is invalid or doesn't match the schema
 * @throws {SyntaxError} If the JSON is malformed
 */
export async function createPeekManifest(json: string): Promise<PeekManifest> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new SyntaxError('Invalid JSON: ' + (err instanceof Error ? err.message : String(err)));
  }

  const validate = await getValidator();
  const valid = validate(data);

  if (!valid) {
    throw new PeekValidationError('Invalid peek.json format', validate.errors || []);
  }

  return data as PeekManifest;
}
