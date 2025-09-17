import { describe, it, expect } from 'vitest';
import { getSchema, getSchemaSync, SchemaError } from '../schema.js';

describe('schema.ts - Basic Functionality', () => {
  describe('SchemaError', () => {
    it('should create error with message only', () => {
      const error = new SchemaError('Test message');

      expect(error.name).toBe('SchemaError');
      expect(error.message).toBe('Test message');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with message and cause', () => {
      const cause = new Error('Original error');
      const error = new SchemaError('Test message', cause);

      expect(error.name).toBe('SchemaError');
      expect(error.message).toBe('Test message');
      expect(error.cause).toBe(cause);
    });

    it('should be instanceof Error', () => {
      const error = new SchemaError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SchemaError);
    });
  });

  describe('getSchema', () => {
    it('should load and return a valid schema', async () => {
      const schema = await getSchema();

      expect(schema).toBeDefined();
      expect(typeof schema).toBe('object');
      expect(schema).toHaveProperty('type');
      expect(schema).toHaveProperty('properties');
    });

    it('should cache schema after first load (same reference)', async () => {
      const schema1 = await getSchema();
      const schema2 = await getSchema();

      expect(schema1).toBe(schema2); // Same reference indicates caching
    });

    it('should return schema that contains expected properties', async () => {
      const schema = await getSchema();

      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(typeof schema.properties).toBe('object');
    });
  });

  describe('getSchemaSync', () => {
    it('should return cached schema when available', async () => {
      // Ensure schema is loaded first
      const asyncSchema = await getSchema();

      // Now getSchemaSync should work
      const syncSchema = getSchemaSync();

      expect(syncSchema).toBe(asyncSchema); // Same reference
      expect(syncSchema).toBeDefined();
    });

    it('should return valid schema structure when called after getSchema', async () => {
      await getSchema(); // Load schema

      const schema = getSchemaSync();

      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });
  });
});
