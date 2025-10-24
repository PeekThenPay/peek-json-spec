/**
 * Schema API Tests (Edge Compatible Version)
 *
 * Tests schema loading utilities with static imports (edge runtime compatible).
 * File system errors are no longer possible since schemas are statically imported.
 */

import { describe, it, expect } from 'vitest';

describe('Schema API (Edge Compatible)', () => {
  describe('getSchema (peek.json schema)', () => {
    it('should successfully load schema', async () => {
      const { getSchema } = await import('../peek-schema.js');

      const schema = await getSchema();
      expect(schema).toBeDefined();
      expect(schema.$schema).toBeDefined();
      expect(typeof schema).toBe('object');
    });

    it('should load schema synchronously', async () => {
      const { getSchemaSync } = await import('../peek-schema.js');

      const schema = getSchemaSync();
      expect(schema).toBeDefined();
      expect(schema.$schema).toBeDefined();
      expect(typeof schema).toBe('object');
    });
  });

  describe('getPricingSchema (pricing schema)', () => {
    it('should successfully load pricing schema', async () => {
      const { getPricingSchema } = await import('../pricing-schema.js');

      const schema = await getPricingSchema();
      expect(schema).toBeDefined();
      expect(schema.$schema).toBeDefined();
      expect(typeof schema).toBe('object');
    });

    it('should load pricing schema synchronously', async () => {
      const { getPricingSchemaSync } = await import('../pricing-schema.js');

      const schema = getPricingSchemaSync();
      expect(schema).toBeDefined();
      expect(schema.$schema).toBeDefined();
      expect(typeof schema).toBe('object');
    });
  });

  describe('Error class construction', () => {
    it('should construct SchemaError correctly', async () => {
      const { SchemaError } = await import('../peek-schema.js');

      const error = new SchemaError('Test message');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SchemaError);
      expect(error.name).toBe('SchemaError');
      expect(error.message).toBe('Test message');
    });

    it('should construct PricingSchemaError correctly', async () => {
      const { PricingSchemaError } = await import('../pricing-schema.js');

      const error = new PricingSchemaError('Test message');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PricingSchemaError);
      expect(error.name).toBe('PricingSchemaError');
      expect(error.message).toBe('Test message');
    });
  });
});
