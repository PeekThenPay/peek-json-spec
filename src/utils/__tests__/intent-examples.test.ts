/**
 * Intent Examples Validation Test Suite
 *
 * This test suite validates all intent schema examples against their respective schemas:
 * - Loads real example JSON files from examples/intents/
 * - Validates each example against its corresponding intent schema
 * - Ensures all examples are valid and comprehensive
 * - Verifies schema compliance and data integrity
 *
 * These tests ensure that our example files are not only syntactically correct
 * but also semantically valid according to the intent schema specifications.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  loadIntentSchema,
  createAjvLoadSchemaFunction,
  type IntentSchemaType,
} from '../schema-loader.js';

describe('Intent Examples Validation', () => {
  let ajv: Ajv2020;

  beforeAll(async () => {
    // Set up AJV with cross-reference support
    ajv = new Ajv2020({
      strict: false,
      allErrors: true,
      verbose: true,
      loadSchema: createAjvLoadSchemaFunction(),
    });
    addFormats(ajv);
  });

  // All intent schemas that should have examples
  const intentSchemas: Exclude<IntentSchemaType, 'common-defs'>[] = [
    'ptp-analyze',
    'ptp-embed',
    'ptp-peek',
    'ptp-qa',
    'ptp-quote',
    'ptp-read',
    'ptp-search',
    'ptp-summarize',
    'ptp-translate',
  ];

  intentSchemas.forEach((schemaName) => {
    describe(`${schemaName} example validation`, () => {
      it('should have a corresponding example file', async () => {
        const examplePath = join(process.cwd(), 'examples', 'intents', `${schemaName}.json`);

        // Verify the example file exists and is readable
        const exampleContent = await readFile(examplePath, 'utf-8');
        expect(exampleContent).toBeDefined();
        expect(exampleContent.length).toBeGreaterThan(0);
      });

      it('should be valid JSON', async () => {
        const examplePath = join(process.cwd(), 'examples', 'intents', `${schemaName}.json`);
        const exampleContent = await readFile(examplePath, 'utf-8');

        // Parse should not throw
        const exampleData = JSON.parse(exampleContent);
        expect(exampleData).toBeDefined();
        expect(typeof exampleData).toBe('object');
      });

      it('should validate against its intent schema', async () => {
        // Load the schema and example
        const schema = await loadIntentSchema(schemaName);
        const examplePath = join(process.cwd(), 'examples', 'intents', `${schemaName}.json`);
        const exampleContent = await readFile(examplePath, 'utf-8');
        const exampleData = JSON.parse(exampleContent);

        // Compile the schema with AJV (handles cross-references)
        const validator = await ajv.compileAsync(schema);

        // Validate the example
        const isValid = validator(exampleData);

        if (!isValid) {
          console.error(`Validation errors for ${schemaName}:`, validator.errors);
        }

        expect(isValid).toBe(true);
      });

      it('should have realistic and comprehensive data', async () => {
        const examplePath = join(process.cwd(), 'examples', 'intents', `${schemaName}.json`);
        const exampleContent = await readFile(examplePath, 'utf-8');
        const exampleData = JSON.parse(exampleContent);

        // Schema-specific validation - search schema doesn't require canonicalUrl
        if (schemaName !== 'ptp-search') {
          expect(exampleData.canonicalUrl).toBeDefined();
          expect(typeof exampleData.canonicalUrl).toBe('string');
          expect(exampleData.canonicalUrl).toMatch(/^https?:\/\//);
        }

        // Examples should have meaningful content sizes
        const jsonString = JSON.stringify(exampleData);
        expect(jsonString.length).toBeGreaterThan(200); // Should be substantial examples
        expect(jsonString.length).toBeLessThan(50000); // But not excessive
      });
    });
  });

  describe('All examples comprehensive test', () => {
    it('should validate all intent examples at once', async () => {
      const results: Array<{ schema: string; valid: boolean; errors?: unknown[] }> = [];

      for (const schemaName of intentSchemas) {
        try {
          // Load schema and example
          const schema = await loadIntentSchema(schemaName);
          const examplePath = join(process.cwd(), 'examples', 'intents', `${schemaName}.json`);
          const exampleContent = await readFile(examplePath, 'utf-8');
          const exampleData = JSON.parse(exampleContent);

          // Validate
          const validator = await ajv.compileAsync(schema);
          const isValid = validator(exampleData);

          results.push({
            schema: schemaName,
            valid: isValid,
            errors: validator.errors || undefined,
          });
        } catch (error) {
          results.push({
            schema: schemaName,
            valid: false,
            errors: [(error as Error).message],
          });
        }
      }

      // Report results
      const failedValidations = results.filter((r) => !r.valid);

      if (failedValidations.length > 0) {
        console.error('Failed validations:', failedValidations);
      }

      // All should pass
      expect(failedValidations).toHaveLength(0);
      expect(results).toHaveLength(intentSchemas.length);
      expect(results.every((r) => r.valid)).toBe(true);
    });

    it('should have examples for all intent schemas except common-defs', async () => {
      // Verify we have examples for each intent schema (except common-defs which is definitions only)
      const expectedExamples = intentSchemas;

      for (const schemaName of expectedExamples) {
        const examplePath = join(process.cwd(), 'examples', 'intents', `${schemaName}.json`);

        // File should exist
        await expect(readFile(examplePath, 'utf-8')).resolves.toBeDefined();
      }

      expect(expectedExamples).toHaveLength(9); // All intent schemas except common-defs
    });
  });
});
