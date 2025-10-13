/**
 * Simplified Pricing Schema Factory Tests
 *
 * Focused tests for pricing schema factory functionality.
 * Tests real-world scenarios with the actual schema.
 */

import { describe, test, expect } from 'vitest';
import {
  createPricingScheme,
  createPricingSchemeFromFile,
  PricingValidationError,
} from '../pricing-schema-factory.js';

describe('pricing-schema-factory.ts', () => {
  describe('Basic functionality', () => {
    test('should create pricing scheme from valid JSON string', async () => {
      const validPricing = JSON.stringify({
        pricing_scheme_id: '01HPF2Q8QYWGM7GF1XMHW9Z2K3',
        pricing_digest: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        publisher_id: '01HPF2Q8QYWGM7GF1XMHW9Z2K4',
        currency: 'USD',
        cache_ttl_seconds: 3600,
        intents: {
          read: {
            intent: 'read',
            pricing_mode: 'per_request',
            usage: {
              immediate: {
                price_cents: 100,
              },
            },
            enforcement_method: 'trust',
          },
        },
      });

      const result = await createPricingScheme(validPricing);

      expect(result).toBeDefined();
      expect(result.pricing_scheme_id).toBe('01HPF2Q8QYWGM7GF1XMHW9Z2K3');
      expect(result.currency).toBe('USD');
      expect(result.cache_ttl_seconds).toBe(3600);
    });

    test('should reject invalid JSON', async () => {
      const invalidJson = '{ invalid json }';

      await expect(createPricingScheme(invalidJson)).rejects.toThrow(SyntaxError);
    });

    test('should reject pricing schemes missing required fields', async () => {
      const incompletePricing = JSON.stringify({
        currency: 'USD',
        // Missing required fields: pricing_scheme_id, pricing_digest, publisher_id, cache_ttl_seconds, intents
      });

      await expect(createPricingScheme(incompletePricing)).rejects.toThrow(PricingValidationError);
    });
  });

  describe('Error handling', () => {
    test('should handle file not found errors', async () => {
      const nonExistentPath = '/path/that/does/not/exist.json';

      await expect(createPricingSchemeFromFile(nonExistentPath)).rejects.toThrow();
    });

    test('should provide validation error details', async () => {
      const invalidPricing = JSON.stringify({
        pricing_scheme_id: 123, // Should be string with specific pattern
        currency: 'USD',
      });

      try {
        await createPricingScheme(invalidPricing);
        expect.fail('Should have thrown PricingValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(PricingValidationError);
        expect((error as PricingValidationError).errors).toBeDefined();
      }
    });
  });

  describe('Format validation with real schema', () => {
    test('should accept valid pricing schemes', async () => {
      const validPricing = JSON.stringify({
        pricing_scheme_id: '01HPF2Q8QYWGM7GF1XMHW9Z2K5',
        pricing_digest: 'sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        publisher_id: '01HPF2Q8QYWGM7GF1XMHW9Z2K6',
        currency: 'USD',
        cache_ttl_seconds: 1800,
        intents: {
          read: {
            intent: 'read',
            pricing_mode: 'per_request',
            usage: {
              immediate: {
                price_cents: 100,
              },
            },
            enforcement_method: 'trust',
          },
          analyze: {
            intent: 'analyze',
            pricing_mode: 'per_request',
            usage: {
              session: {
                price_cents: 500,
              },
            },
            enforcement_method: 'trust',
          },
        },
      });

      const result = await createPricingScheme(validPricing);
      expect(result).toBeDefined();
      expect(result.intents?.read?.usage?.immediate?.price_cents).toBe(100);
      expect(result.intents?.analyze?.usage?.session?.price_cents).toBe(500);
    });
  });
});
