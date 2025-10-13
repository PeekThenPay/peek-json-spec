/**
 * Simplified Pricing Schema Tests
 *
 * Focused tests for pricing schema loading and validation.
 * Tests the real pricing.schema.json file to ensure it loads correctly.
 */

import { describe, test, expect } from 'vitest';
import { getPricingSchema, getPricingSchemaSync } from '../pricing-schema.js';

describe('pricing-schema.ts', () => {
  describe('Schema loading', () => {
    test('should load pricing schema successfully', async () => {
      const schema = await getPricingSchema();

      expect(schema).toBeDefined();
      expect(typeof schema).toBe('object');
      expect(schema).not.toBeNull();
    });

    test('should be valid JSON Schema Draft 2020-12', async () => {
      const schema = await getPricingSchema();

      // Check for JSON Schema Draft 2020-12 properties
      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });

    test('should have required pricing schema properties', async () => {
      const schema = await getPricingSchema();

      // Check for expected pricing schema structure
      expect(schema.properties).toBeDefined();
      expect(schema.required).toBeDefined();

      // Verify it's a proper schema object
      expect(Array.isArray(schema.required)).toBe(true);
    });

    test('should cache the schema for synchronous access', async () => {
      // Load schema first
      await getPricingSchema();

      // Should now be available synchronously
      const syncSchema = getPricingSchemaSync();
      expect(syncSchema).toBeDefined();
      expect(typeof syncSchema).toBe('object');
    });

    test('should have same schema content for async and sync access', async () => {
      const asyncSchema = await getPricingSchema();
      const syncSchema = getPricingSchemaSync();

      expect(asyncSchema).toEqual(syncSchema);
    });
  });
});
