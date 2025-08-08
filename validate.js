// ESM-compatible validation script for peek.schema.json and peek.json
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import Ajv from 'ajv';

(async () => {
  const ajv = new Ajv({ allErrors: true, strict: false });

  // Load peek.schema.json
  const peekSchema = JSON.parse(
    await readFile(resolve('packages/spec-docs/schema/peek.schema.json'), 'utf-8'),
  );
  // Load example peek.json
  const peekExample = JSON.parse(
    await readFile(resolve('packages/spec-docs/examples/peek.json'), 'utf-8'),
  );

  // Validate peek.schema.json against the official meta-schema
  if (!ajv.validateSchema(peekSchema)) {
    console.error('peek.schema.json is NOT a valid JSON Schema:', ajv.errors);
    process.exit(1);
  } else {
    console.log('peek.schema.json is a valid JSON Schema.');
  }

  // Validate peek.json against peek.schema.json
  const exampleValidate = ajv.compile(peekSchema);
  const validExample = exampleValidate(peekExample);
  if (!validExample) {
    console.error('peek.json does NOT conform to peek.schema.json:', exampleValidate.errors);
    process.exit(1);
  } else {
    console.log('peek.json conforms to peek.schema.json.');
  }
})();
