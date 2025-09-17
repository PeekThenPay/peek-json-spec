/* eslint-env node */

// Comprehensive validation for CI/CD pipeline
import { resolve } from 'path';
import Ajv from 'ajv';
import { getSchema } from '../schema.js';
import { createPeekManifestFromFile, PeekValidationError } from '../factory.js';

/**
 * Type guard to check if an error is a PeekValidationError with errors array
 */
function isPeekValidationError(
  err: unknown
): err is PeekValidationError & { errors: Array<{ instancePath: string; message?: string }> } {
  return err instanceof PeekValidationError && 'errors' in err && Array.isArray(err.errors);
}

async function validateSchemaIsValid(): Promise<boolean> {
  try {
    console.log('🔍 Validating that peek.schema.json is a valid JSON Schema...');

    const ajv = new Ajv({ strict: false });
    const schema = await getSchema();

    const isValid = ajv.validateSchema(schema);
    if (!isValid) {
      console.error('❌ peek.schema.json is NOT a valid JSON Schema:');
      console.error(ajv.errors);
      return false;
    }

    console.log('✅ peek.schema.json is a valid JSON Schema');
    return true;
  } catch (err) {
    console.error('❌ Error loading schema:', err instanceof Error ? err.message : err);
    return false;
  }
}

async function validateExampleFile(): Promise<boolean> {
  try {
    console.log('🔍 Validating examples/peek.json against peek.schema.json...');

    const examplePath = resolve('examples/peek.json');
    await createPeekManifestFromFile(examplePath);

    console.log('✅ examples/peek.json is valid');
    return true;
  } catch (err) {
    console.error('❌ examples/peek.json validation failed:');
    if (isPeekValidationError(err)) {
      for (const error of err.errors) {
        console.error(`  - ${error.instancePath}: ${error.message}`);
      }
    } else {
      console.error(`  ${err instanceof Error ? err.message : err}`);
    }
    return false;
  }
}

async function main(): Promise<void> {
  console.log('🚀 Running peek.json validation suite...\n');

  const schemaValid = await validateSchemaIsValid();
  console.log('');

  const exampleValid = await validateExampleFile();
  console.log('');

  if (schemaValid && exampleValid) {
    console.log('🎉 All validations passed!');
    process.exit(0);
  } else {
    console.log('💥 Some validations failed!');
    process.exit(1);
  }
}

// Run validation suite
main().catch((err) => {
  console.error('💥 Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
