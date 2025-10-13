import { describe, it, expect, beforeEach } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  loadIntentSchema,
  loadMainSchema,
  getMainSchemaSync,
  clearSchemaCache,
  getCacheInfo,
  createSchemaLoader,
  validateSchemaIsValid,
  createAjvLoadSchemaFunction,
  BaseSchemaError,
  type MainSchemaType,
  type IntentSchemaType,
  type JSONSchema,
} from '../schema-loader.js';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

describe('Schema Loader Integration Tests', () => {
  beforeEach(() => {
    clearSchemaCache();
  });

  describe('Schema Loading', () => {
    it('should load peek schema', async () => {
      const schema = await loadMainSchema('peek');

      expect(schema).toBeDefined();
      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });

    it('should load pricing schema', async () => {
      const schema = await loadMainSchema('pricing');

      expect(schema).toBeDefined();
      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.type).toBe('object');
    });

    it('should load common-defs intent schema', async () => {
      const schema = await loadIntentSchema('common-defs');

      expect(schema).toBeDefined();
      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.$id).toContain('common-defs-1.0.json');
    });
  });

  describe('Caching Behavior', () => {
    it('should cache schemas effectively', async () => {
      clearSchemaCache();
      expect(getCacheInfo().size).toBe(0);

      // Load schema twice
      const schema1 = await loadMainSchema('peek');
      const schema2 = await loadMainSchema('peek');

      // Should be same reference (cached)
      expect(schema1).toBe(schema2);
      expect(getCacheInfo().size).toBe(1);
      expect(getCacheInfo().keys).toEqual(['main:peek']);
    });

    it('should provide sync access after async load', async () => {
      await loadMainSchema('peek');

      const syncSchema = getMainSchemaSync('peek');
      expect(syncSchema).toBeDefined();
      expect(syncSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    });

    it('should throw for sync access before async load', () => {
      expect(() => getMainSchemaSync('pricing')).toThrow(
        "pricing schema not loaded. Call loadMainSchema('pricing') first."
      );
    });
  });

  describe('AJV Integration', () => {
    it('should work with AJV cross-references', async () => {
      const ajv = new Ajv2020({
        loadSchema: createAjvLoadSchemaFunction(),
      });
      addFormats(ajv);

      // Load a schema that references common-defs
      const schema = await loadMainSchema('peek');
      const validator = await ajv.compileAsync(schema);

      expect(validator).toBeDefined();
      expect(typeof validator).toBe('function');
    });

    it('should resolve ALL hyphenated schema names correctly', async () => {
      const loadSchemaFn = createAjvLoadSchemaFunction();

      // Test ALL hyphenated schema names - if they don't load, the test should fail
      const allHyphenatedSchemas = [
        'common-defs.schema.json',
        'ptp-analyze.schema.json',
        'ptp-embed.schema.json',
        'ptp-peek.schema.json',
        'ptp-qa.schema.json',
        'ptp-quote.schema.json',
        'ptp-read.schema.json',
        'ptp-search.schema.json',
        'ptp-summarize.schema.json',
        'ptp-translate.schema.json',
      ];

      // No try/catch - if any schema fails to load, the test should fail
      for (const schemaName of allHyphenatedSchemas) {
        const schema = await loadSchemaFn(schemaName);
        expect(schema).toBeDefined();
        expect(typeof schema).toBe('object');
        expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      }
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing schema files gracefully', async () => {
      await expect(loadMainSchema('nonexistent' as MainSchemaType)).rejects.toThrow();
    });

    it('should validate real schema structure', () => {
      const invalidSchema = { randomProperty: 'not-a-schema' };

      expect(() => validateSchemaIsValid(invalidSchema as JSONSchema, 'test')).toThrow(
        'test missing required $schema property'
      );
    });
  });

  describe('Custom Schema Loader Factory', () => {
    class TestError extends BaseSchemaError {}

    it('should work with relative schema paths', async () => {
      const loader = createSchemaLoader({
        schemaPath: '../../schema/peek.schema.json',
        ErrorClass: TestError,
        schemaDisplayName: 'test peek schema',
      });

      const schema = await loader.loadSchema();
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');

      // Should cache
      const schema2 = await loader.loadSchema();
      expect(schema).toBe(schema2);

      // Should provide sync access
      const syncSchema = loader.loadSchemaSync();
      expect(syncSchema).toBe(schema);
    });
  });

  describe('Intent Validator Functions', () => {
    it('should create working validators that validate our examples', async () => {
      const { createIntentValidator } = await import('../schema-loader.js');

      // Test with ptp-peek (simplest example)
      const validator = await createIntentValidator('ptp-peek');

      // Load our example
      const examplePath = join(process.cwd(), 'examples', 'intents', 'ptp-peek.json');
      const exampleContent = await readFile(examplePath, 'utf-8');
      const exampleData = JSON.parse(exampleContent);

      // Validate using the compiled validator
      const isValid = validator(exampleData);

      if (!isValid) {
        console.error('Validation errors:', validator.errors);
      }

      expect(isValid).toBe(true);
      expect(typeof validator).toBe('function');
    });

    it('should validate all our intent examples with validateIntentResponse', async () => {
      const { validateIntentResponse } = await import('../schema-loader.js');

      const intentTypes = [
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

      for (const intentType of intentTypes) {
        // Load the example
        const examplePath = join(process.cwd(), 'examples', 'intents', `${intentType}.json`);
        const exampleContent = await readFile(examplePath, 'utf-8');
        const exampleData = JSON.parse(exampleContent);

        // Validate using our high-level function
        const result = await validateIntentResponse(intentType as IntentSchemaType, exampleData);

        if (!result.valid) {
          console.error(`Validation failed for ${intentType}:`, result.errors);
        }

        expect(result.valid).toBe(true);
        expect(result.data).toBe(exampleData);
        expect(result.errors).toBeNull();
        expect(result.schema).toBeDefined();
      }
    });

    it('should detect invalid data correctly', async () => {
      const { validateIntentResponse } = await import('../schema-loader.js');

      // Test with invalid data
      const invalidData = {
        // Missing required canonicalUrl
        language: 'en',
        // Wrong contentType
        contentType: 'invalid-type',
      };

      const result = await validateIntentResponse('ptp-peek', invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).not.toBeNull();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should provide detailed error information', async () => {
      const { createIntentValidator } = await import('../schema-loader.js');

      const validator = await createIntentValidator('ptp-analyze');

      // Test with data missing required properties
      const invalidData = {
        canonicalUrl: 'https://example.com/test',
        // Missing contentType, mediaType, provenance, analysis, length
      };

      const isValid = validator(invalidData);

      expect(isValid).toBe(false);
      expect(validator.errors).toBeDefined();
      expect(Array.isArray(validator.errors)).toBe(true);
      expect(validator.errors!.length).toBeGreaterThan(0);

      // Check that errors have the expected AJV structure
      const firstError = validator.errors![0];
      expect(firstError).toHaveProperty('instancePath');
      expect(firstError).toHaveProperty('schemaPath');
      expect(firstError).toHaveProperty('keyword');
    });
  });
});
