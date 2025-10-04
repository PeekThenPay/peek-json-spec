import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv, type ErrorObject } from 'ajv';
import type { IntentPricing, PricingScheme } from '../types/pricing.js';

describe('Pricing Schema Validation', () => {
  let ajv: Ajv;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pricingSchema: any;
  let pricingExample: PricingScheme;

  beforeEach(async () => {
    // Initialize AJV with formats
    ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      validateFormats: true,
    });

    // Dynamically import and apply ajv-formats
    const addFormatsModule = await import('ajv-formats');
    const addFormats = addFormatsModule.default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (addFormats as any)(ajv);

    // Load the schema and example files
    const schemaPath = join(globalThis.process.cwd(), 'schema', 'pricing.schema.json');
    const examplePath = join(globalThis.process.cwd(), 'examples', 'pricing.json');

    pricingSchema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    pricingExample = JSON.parse(readFileSync(examplePath, 'utf8'));
  });

  describe('pricing.schema.json', () => {
    it('should be a valid JSON Schema', () => {
      // Validate that the schema itself is a valid JSON Schema
      const metaSchema = ajv.getSchema('http://json-schema.org/draft-07/schema#');
      expect(metaSchema).toBeDefined();

      const isValid = metaSchema!(pricingSchema);

      if (!isValid) {
        globalThis.console.error('Pricing schema validation errors:', metaSchema!.errors);
      }

      expect(isValid).toBe(true);
    });

    it('should have required top-level properties', () => {
      expect(pricingSchema).toHaveProperty('$schema');
      expect(pricingSchema).toHaveProperty('title');
      expect(pricingSchema).toHaveProperty('type', 'object');
      expect(pricingSchema).toHaveProperty('properties');
      expect(pricingSchema).toHaveProperty('required');
    });

    it('should define all expected pricing properties', () => {
      const expectedProperties = [
        'pricing_scheme_id',
        'pricing_digest',
        'publisher_id',
        'currency',
        'cache_ttl_seconds',
        'intents',
        'quotas',
      ];

      expectedProperties.forEach((prop) => {
        expect(pricingSchema.properties).toHaveProperty(prop);
      });
    });

    it('should have proper required fields', () => {
      const expectedRequiredFields = [
        'pricing_scheme_id',
        'pricing_digest',
        'publisher_id',
        'currency',
        'cache_ttl_seconds',
        'intents',
      ];

      expect(pricingSchema.required).toEqual(expect.arrayContaining(expectedRequiredFields));
      expect(pricingSchema.required).toHaveLength(expectedRequiredFields.length);
    });

    it('should define IntentPricing schema with correct properties', () => {
      expect(pricingSchema.$defs).toHaveProperty('IntentPricing');

      const intentPricing = pricingSchema.$defs.IntentPricing;
      expect(intentPricing.properties).toHaveProperty('intent');
      expect(intentPricing.properties).toHaveProperty('pricing_mode');
      expect(intentPricing.properties).toHaveProperty('price_cents');
      expect(intentPricing.properties).toHaveProperty('enforcement_method');

      // Check that enforcement_method is restricted to trust and tool_required
      expect(intentPricing.properties.enforcement_method.enum).toEqual(['trust', 'tool_required']);
    });

    it('should define ModelMetadata schema with correct properties', () => {
      expect(pricingSchema.$defs).toHaveProperty('ModelMetadata');

      const modelMetadata = pricingSchema.$defs.ModelMetadata;
      expect(modelMetadata.properties).toHaveProperty('id');
      expect(modelMetadata.properties).toHaveProperty('provider');
      expect(modelMetadata.properties).toHaveProperty('name');
      expect(modelMetadata.properties).toHaveProperty('version');
      expect(modelMetadata.properties).toHaveProperty('digest');
    });

    it('should define PricingQuotas schema with correct properties', () => {
      expect(pricingSchema.$defs).toHaveProperty('PricingQuotas');

      const pricingQuotas = pricingSchema.$defs.PricingQuotas;
      expect(pricingQuotas.properties).toHaveProperty('burst_rps');
      expect(pricingQuotas.properties).toHaveProperty('max_license_duration_seconds');
      expect(pricingQuotas.required).toContain('burst_rps');
    });
  });

  describe('pricing.json example', () => {
    it('should conform to pricing.schema.json', () => {
      const validate = ajv.compile(pricingSchema);
      const isValid = validate(pricingExample);

      if (!isValid) {
        globalThis.console.error('Pricing example validation errors:', validate.errors);
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
      const requiredFields = pricingSchema.required || [];

      requiredFields.forEach((field: string) => {
        expect(pricingExample).toHaveProperty(field);
      });
    });

    it('should have valid ULID format for IDs', () => {
      // ULID format: 26 characters, uppercase letters and numbers
      const ulidRegex = /^[0-9A-Z]{26}$/;

      expect(pricingExample.pricing_scheme_id).toMatch(ulidRegex);
      expect(pricingExample.publisher_id).toMatch(ulidRegex);
    });

    it('should have valid SHA256 digest format', () => {
      // SHA256 digest format: sha256: followed by 64 hex characters (case insensitive)
      const sha256Regex = /^sha256:[a-fA-F0-9]{64}$/;

      expect(pricingExample.pricing_digest).toMatch(sha256Regex);
    });

    it('should have valid currency code', () => {
      expect(typeof pricingExample.currency).toBe('string');
      expect(pricingExample.currency.length).toBeGreaterThan(0);
    });

    it('should have valid cache TTL', () => {
      expect(typeof pricingExample.cache_ttl_seconds).toBe('number');
      expect(pricingExample.cache_ttl_seconds).toBeGreaterThan(0);
      expect(pricingExample.cache_ttl_seconds).toBeLessThanOrEqual(86400); // Max 24 hours
    });

    it('should have valid intents structure', () => {
      expect(pricingExample).toHaveProperty('intents');
      expect(typeof pricingExample.intents).toBe('object');

      // Check that all intents are valid
      Object.entries(pricingExample.intents).forEach(
        ([intentName, intentData]: [string, IntentPricing]) => {
          expect(intentData).toHaveProperty('intent', intentName);
          expect(intentData).toHaveProperty('pricing_mode');
          expect(intentData).toHaveProperty('price_cents');
          expect(intentData).toHaveProperty('enforcement_method');

          // Validate pricing_mode
          expect(['per_request', 'per_1000_tokens']).toContain(intentData.pricing_mode);

          // Validate enforcement_method
          expect(['trust', 'tool_required']).toContain(intentData.enforcement_method);

          // Validate price_cents
          expect(typeof intentData.price_cents).toBe('number');
          expect(intentData.price_cents).toBeGreaterThanOrEqual(0);
        }
      );
    });

    it('should have valid quotas when present', () => {
      if (pricingExample.quotas) {
        expect(pricingExample.quotas).toHaveProperty('burst_rps');
        expect(typeof pricingExample.quotas.burst_rps).toBe('number');
        expect(pricingExample.quotas.burst_rps).toBeGreaterThan(0);

        if (pricingExample.quotas.max_license_duration_seconds) {
          expect(typeof pricingExample.quotas.max_license_duration_seconds).toBe('number');
          expect(pricingExample.quotas.max_license_duration_seconds).toBeGreaterThan(0);
        }
      }
    });

    it('should have valid model metadata when present', () => {
      Object.values(pricingExample.intents).forEach((intentData: IntentPricing) => {
        if (intentData.model) {
          expect(intentData.model).toHaveProperty('id');
          expect(intentData.model).toHaveProperty('provider');
          expect(intentData.model).toHaveProperty('name');
          expect(intentData.model).toHaveProperty('version');
          expect(intentData.model).toHaveProperty('digest');

          // Validate model ID format (type:name@version)
          expect(intentData.model.id).toMatch(/^[a-z0-9_-]+:[a-z0-9._-]+@[a-z0-9]+$/);

          // Validate digest format (case insensitive)
          expect(intentData.model.digest).toMatch(/^sha256:[a-fA-F0-9]{64}$/);
        }
      });
    });

    it('should have valid path multipliers when present', () => {
      Object.values(pricingExample.intents).forEach((intentData: IntentPricing) => {
        if (intentData.path_multipliers) {
          Object.entries(intentData.path_multipliers).forEach(
            ([path, multiplier]: [string, number]) => {
              // Path should start with /
              expect(path).toMatch(/^\/.*$/);

              // Multiplier should be a positive number
              expect(typeof multiplier).toBe('number');
              expect(multiplier).toBeGreaterThan(0);
            }
          );
        }
      });
    });

    it('should have valid path restrictions when present', () => {
      Object.values(pricingExample.intents).forEach((intentData: IntentPricing) => {
        if (intentData.path_restrictions) {
          expect(intentData.path_restrictions).toHaveProperty('type');
          expect(intentData.path_restrictions).toHaveProperty('patterns');

          expect(['allow', 'disallow']).toContain(intentData.path_restrictions.type);
          expect(Array.isArray(intentData.path_restrictions.patterns)).toBe(true);
          expect(intentData.path_restrictions.patterns.length).toBeGreaterThan(0);

          intentData.path_restrictions.patterns.forEach((pattern: unknown) => {
            expect(typeof pattern).toBe('string');
            expect((pattern as string).length).toBeGreaterThan(0);
          });
        }
      });
    });
  });

  describe('Cross-validation', () => {
    it('should have consistent schema and example structure', () => {
      // Check that the example has the required properties from the schema
      const requiredFields = pricingSchema.required || [];
      requiredFields.forEach((field: string) => {
        expect(pricingExample).toHaveProperty(field);
      });
    });

    it('should validate specific intent types in schema match example', () => {
      // Get the intent pattern from schema
      const intentsProperty = pricingSchema.properties.intents;
      const intentPattern = Object.keys(intentsProperty.patternProperties)[0];

      // Check that all intents in example match the allowed pattern
      Object.keys(pricingExample.intents).forEach((intentName: string) => {
        const regex = new RegExp(intentPattern);
        expect(intentName).toMatch(regex);
      });
    });

    it('should validate example enforcement methods are allowed by schema', () => {
      const enforcementMethods =
        pricingSchema.$defs.IntentPricing.properties.enforcement_method.enum;

      Object.values(pricingExample.intents).forEach((intentData: IntentPricing) => {
        expect(enforcementMethods).toContain(intentData.enforcement_method);
      });
    });
  });

  describe('Edge cases and validation', () => {
    it('should reject invalid ULID formats', () => {
      const invalidPricing = { ...pricingExample };
      invalidPricing.pricing_scheme_id = 'invalid-ulid-123';

      const validate = ajv.compile(pricingSchema);
      const isValid = validate(invalidPricing);

      expect(isValid).toBe(false);
    });

    it('should reject invalid SHA256 digest formats', () => {
      const invalidPricing = { ...pricingExample };
      invalidPricing.pricing_digest = 'invalid-digest';

      const validate = ajv.compile(pricingSchema);
      const isValid = validate(invalidPricing);

      expect(isValid).toBe(false);
    });

    it('should reject invalid enforcement methods', () => {
      const invalidPricing = JSON.parse(JSON.stringify(pricingExample)); // Deep clone
      invalidPricing.intents.read.enforcement_method = 'invalid_method';

      const validate = ajv.compile(pricingSchema);
      const isValid = validate(invalidPricing);

      expect(isValid).toBe(false);
    });

    it('should reject cache TTL outside allowed range', () => {
      const invalidPricing = { ...pricingExample };
      invalidPricing.cache_ttl_seconds = 100000; // > 86400 max

      const validate = ajv.compile(pricingSchema);
      const isValid = validate(invalidPricing);

      expect(isValid).toBe(false);
    });

    it('should reject negative price_cents', () => {
      const invalidPricing = JSON.parse(JSON.stringify(pricingExample)); // Deep clone
      invalidPricing.intents.read.price_cents = -1;

      const validate = ajv.compile(pricingSchema);
      const isValid = validate(invalidPricing);

      expect(isValid).toBe(false);
    });
  });
});
