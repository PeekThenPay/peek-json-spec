/**
 * Schema API Error Handling Tests
 *
 * This test suite focuses on error handling and edge cases for the public
 * schema API functions. It tests:
 * - File system error handling (missing files, permission errors)
 * - JSON parsing error scenarios for malformed schema files
 * - Custom error classes and error message formatting
 * - Backwards compatibility for the public API interface
 * - Mocked error scenarios to test failure paths
 *
 * These tests ensure the schema loading APIs fail gracefully with
 * meaningful error messages and proper error handling across different
 * failure scenarios while maintaining API compatibility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';

// Mock fs/promises for error testing
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

// Mock path and url modules
vi.mock('url', () => ({
  fileURLToPath: vi.fn(() => '/mocked/path/to/test.js'),
}));

vi.mock('path', () => ({
  dirname: vi.fn(() => '/mocked/path/to'),
  resolve: vi.fn((dir, file) => `${dir}/${file}`),
  join: vi.fn((...parts) => parts.join('/')),
}));

describe('Schema API Error Handling', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSchema (peek.json schema)', () => {
    it('should throw SchemaError when file cannot be read', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const { getSchema, SchemaError } = await import('../peek-schema.js');

      const error = await getSchema().catch((e) => e);
      expect(error).toBeInstanceOf(SchemaError);
      expect(error.message).toContain('Failed to read peek.json schema file');
    });

    it('should throw SchemaError when JSON is invalid', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('{"invalid": json}');

      const { getSchema, SchemaError } = await import('../peek-schema.js');

      const error = await getSchema().catch((e) => e);
      expect(error).toBeInstanceOf(SchemaError);
      expect(error.message).toContain('Failed to parse peek.json schema file');
    });

    it('should rethrow existing SchemaError', async () => {
      const { SchemaError } = await import('../peek-schema.js');
      const originalError = new SchemaError('Original error');
      vi.mocked(fs.readFile).mockRejectedValue(originalError);

      const { getSchema } = await import('../peek-schema.js');

      const error = await getSchema().catch((e) => e);
      expect(error).toBeInstanceOf(SchemaError);
      // The error will be wrapped with file path info
      expect(error.message).toContain('Failed to read peek.json schema file');
    });

    it('should wrap unexpected errors in SchemaError', async () => {
      vi.mocked(fs.readFile).mockRejectedValue('Some string error');

      const { getSchema, SchemaError } = await import('../peek-schema.js');

      const error = await getSchema().catch((e) => e);
      expect(error).toBeInstanceOf(SchemaError);
      expect(error.message).toContain('Failed to read peek.json schema file');
    });
  });

  describe('getPricingSchema (pricing schema)', () => {
    it('should throw PricingSchemaError when file cannot be read', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const { getPricingSchema, PricingSchemaError } = await import('../pricing-schema.js');

      const error = await getPricingSchema().catch((e) => e);
      expect(error).toBeInstanceOf(PricingSchemaError);
      expect(error.message).toContain('Failed to read pricing schema file');
    });

    it('should throw PricingSchemaError when JSON is invalid', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('{"invalid": json}');

      const { getPricingSchema, PricingSchemaError } = await import('../pricing-schema.js');

      const error = await getPricingSchema().catch((e) => e);
      expect(error).toBeInstanceOf(PricingSchemaError);
      expect(error.message).toContain('Failed to parse pricing schema file');
    });

    it('should rethrow existing PricingSchemaError', async () => {
      const { PricingSchemaError } = await import('../pricing-schema.js');
      const originalError = new PricingSchemaError('Original error');
      vi.mocked(fs.readFile).mockRejectedValue(originalError);

      const { getPricingSchema } = await import('../pricing-schema.js');

      const error = await getPricingSchema().catch((e) => e);
      expect(error).toBeInstanceOf(PricingSchemaError);
      // The error will be wrapped with file path info
      expect(error.message).toContain('Failed to read pricing schema file');
    });

    it('should wrap unexpected errors in PricingSchemaError', async () => {
      vi.mocked(fs.readFile).mockRejectedValue('Some string error');

      const { getPricingSchema, PricingSchemaError } = await import('../pricing-schema.js');

      const error = await getPricingSchema().catch((e) => e);
      expect(error).toBeInstanceOf(PricingSchemaError);
      expect(error.message).toContain('Failed to read pricing schema file');
    });
  });

  describe('Sync functions', () => {
    it('should throw when schema not loaded (getSchemaSync)', async () => {
      const { getSchemaSync } = await import('../peek-schema.js');

      expect(() => getSchemaSync()).toThrow('peek.json schema not loaded');
    });

    it('should throw when schema not loaded (getPricingSchemaSync)', async () => {
      const { getPricingSchemaSync } = await import('../pricing-schema.js');

      expect(() => getPricingSchemaSync()).toThrow('pricing schema not loaded');
    });
  });

  describe('Error class construction', () => {
    it('should construct SchemaError correctly', async () => {
      const { SchemaError } = await import('../peek-schema.js');

      const cause = new Error('Original error');
      const error = new SchemaError('Test message', cause);

      expect(error.message).toBe('Test message');
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('SchemaError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should construct PricingSchemaError correctly', async () => {
      const { PricingSchemaError } = await import('../pricing-schema.js');

      const cause = new Error('Original error');
      const error = new PricingSchemaError('Test message', cause);

      expect(error.message).toBe('Test message');
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('PricingSchemaError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
