import { describe, it, expect } from 'vitest';
import { PricingSchemaError } from '../pricing-schema.js';

// We'll test the actual functionality without complex mocking
// since the schema loading is straightforward
describe('pricing-schema.ts', () => {
  describe('PricingSchemaError', () => {
    it('should properly construct with message and cause', () => {
      const cause = new Error('Original error');
      const error = new PricingSchemaError('Test message', cause);

      expect(error.message).toBe('Test message');
      expect(error.name).toBe('PricingSchemaError');
      expect(error.cause).toBe(cause);
      expect(error).toBeInstanceOf(Error);
    });

    it('should construct without cause parameter', () => {
      const error = new PricingSchemaError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.name).toBe('PricingSchemaError');
      expect(error.cause).toBeUndefined();
    });
  });
});
