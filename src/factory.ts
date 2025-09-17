import { readFile } from 'fs/promises';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { PeekManifest } from './types/peek-manifest.js';
import { getSchema } from './schema.js';
import { ErrorObject, ValidateFunction } from 'ajv';

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
    const ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
    });

    // Add format validators
    addFormats(ajv);

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

/**
 * Creates a PeekManifest from a file, validating it against the schema
 * @param filePath Path to the peek.json file
 * @returns A validated PeekManifest object
 * @throws {PeekValidationError} If the JSON is invalid or doesn't match the schema
 * @throws {Error} If the file cannot be read
 */
export async function createPeekManifestFromFile(filePath: string): Promise<PeekManifest> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return await createPeekManifest(content);
  } catch (err) {
    if (err instanceof PeekValidationError) {
      throw err;
    }
    throw new Error(
      `Failed to read peek.json from ${filePath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
