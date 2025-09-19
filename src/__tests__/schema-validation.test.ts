import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv, type ErrorObject } from 'ajv';

describe('Schema Validation', () => {
  let ajv: Ajv;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let peekSchema: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let peekExample: any;

  beforeEach(async () => {
    // Initialize AJV with formats
    ajv = new Ajv({ allErrors: true, verbose: true });

    // Dynamically import and apply ajv-formats
    const addFormatsModule = await import('ajv-formats');
    const addFormats = addFormatsModule.default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (addFormats as any)(ajv);

    // Load the schema and example files
    const schemaPath = join(globalThis.process.cwd(), 'schema', 'peek.schema.json');
    const examplePath = join(globalThis.process.cwd(), 'examples', 'peek.json');

    peekSchema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    peekExample = JSON.parse(readFileSync(examplePath, 'utf8'));
  });

  describe('peek.schema.json', () => {
    it('should be a valid JSON Schema', () => {
      // Validate that the schema itself is a valid JSON Schema
      const metaSchema = ajv.getSchema('http://json-schema.org/draft-07/schema#');
      expect(metaSchema).toBeDefined();

      const isValid = metaSchema!(peekSchema);

      if (!isValid) {
        globalThis.console.error('Schema validation errors:', metaSchema!.errors);
      }

      expect(isValid).toBe(true);
    });

    it('should have required top-level properties', () => {
      expect(peekSchema).toHaveProperty('$schema');
      expect(peekSchema).toHaveProperty('title');
      expect(peekSchema).toHaveProperty('type', 'object');
      expect(peekSchema).toHaveProperty('properties');
      expect(peekSchema).toHaveProperty('required');
    });

    it('should define all expected peek.json properties', () => {
      const expectedProperties = ['version', 'meta', 'enforcement', 'license'];

      expectedProperties.forEach((prop) => {
        expect(peekSchema.properties).toHaveProperty(prop);
      });
    });
  });

  describe('peek.json example', () => {
    it('should conform to peek.schema.json', () => {
      const validate = ajv.compile(peekSchema);
      const isValid = validate(peekExample);

      if (!isValid) {
        globalThis.console.error('Example validation errors:', validate.errors);
        // Pretty print the errors for better debugging
        validate.errors?.forEach((error: ErrorObject) => {
          globalThis.console.error(`  ${error.instancePath || 'root'}: ${error.message}`);
          if (error.data !== undefined) {
            globalThis.console.error(`    Data: ${JSON.stringify(error.data)}`);
          }
        });
      }

      expect(isValid).toBe(true);
    });

    it('should have all required fields', () => {
      const requiredFields = peekSchema.required || [];

      requiredFields.forEach((field: string) => {
        expect(peekExample).toHaveProperty(field);
      });
    });

    it('should have valid version format', () => {
      // Allow simpler version formats like "1.0" as well as semver
      expect(peekExample.version).toMatch(/^\d+\.\d+(\.\d+)?$/);
    });

    it('should have valid URLs', () => {
      if (peekExample.license?.terms_url) {
        expect(() => new globalThis.URL(peekExample.license.terms_url)).not.toThrow();
      }

      if (peekExample.license?.license_issuer) {
        expect(() => new globalThis.URL(peekExample.license.license_issuer)).not.toThrow();
      }
    });

    it('should have valid supported_intents', () => {
      const supportedIntents = peekExample.license?.supported_intents;
      if (supportedIntents) {
        expect(Array.isArray(supportedIntents)).toBe(true);
        expect(supportedIntents.length).toBeGreaterThan(0);

        // Each intent should be a non-empty string
        supportedIntents.forEach((intent: unknown) => {
          expect(typeof intent).toBe('string');
          expect((intent as string).length).toBeGreaterThan(0);
        });
      }
    });

    it('should have valid meta section', () => {
      expect(peekExample).toHaveProperty('meta');
      expect(peekExample.meta).toHaveProperty('site_name');
      expect(peekExample.meta).toHaveProperty('publisher');
      expect(typeof peekExample.meta.site_name).toBe('string');
      expect(typeof peekExample.meta.publisher).toBe('string');
    });

    it('should have valid enforcement section', () => {
      expect(peekExample).toHaveProperty('enforcement');
      if (peekExample.enforcement.rate_limit_per_ip) {
        expect(typeof peekExample.enforcement.rate_limit_per_ip).toBe('number');
      }
    });
  });

  describe('Cross-validation', () => {
    it('should have consistent schema and example structure', () => {
      // Check that the example has the required properties from the schema
      const requiredFields = peekSchema.required || [];
      requiredFields.forEach((field: string) => {
        expect(peekExample).toHaveProperty(field);
      });
    });
  });
});
