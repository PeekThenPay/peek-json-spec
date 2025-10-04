import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPricingScheme,
  createPricingSchemeFromFile,
  PricingValidationError,
} from '../pricing-schema-factory.js';
import type { PricingScheme } from '../../types/pricing.js';

// Mock the pricing-schema module
vi.mock('../pricing-schema.js');

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

import { getPricingSchema } from '../pricing-schema.js';
const mockGetPricingSchema = vi.mocked(getPricingSchema);

// Global mock references
let mockReadFile: ReturnType<typeof vi.fn>;

// Setup function to initialize mocks
async function setupMocks() {
  const fs = (await vi.importMock('fs/promises')) as { readFile: ReturnType<typeof vi.fn> };
  mockReadFile = fs.readFile;
}

describe('pricing-schema-factory.ts', () => {
  const validPricingScheme: PricingScheme = {
    pricing_scheme_id: '01HZXYZ123456789ABCDEFGHIJ',
    pricing_digest: 'sha256:abc123def456789012345678901234567890123456789012345678901234567890',
    publisher_id: '01HZXYZ123456789ABCDEFGHIJ',
    currency: 'USD',
    cache_ttl_seconds: 3600,
    intents: {
      peek: {
        intent: 'peek',
        pricing_mode: 'per_request',
        price_cents: 1,
        enforcement_method: 'trust',
      },
      read: {
        intent: 'read',
        pricing_mode: 'per_1000_tokens',
        price_cents: 10,
        enforcement_method: 'tool_required',
      },
    },
    quotas: {
      burst_rps: 100,
      max_license_duration_seconds: 3600,
    },
  };

  const mockPricingSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'PeekThenPay Pricing Scheme',
    type: 'object',
    properties: {
      pricing_scheme_id: { type: 'string' },
      pricing_digest: { type: 'string' },
      publisher_id: { type: 'string' },
      currency: { type: 'string' },
      cache_ttl_seconds: { type: 'number' },
      intents: { type: 'object' },
      quotas: { type: 'object' },
    },
    required: [
      'pricing_scheme_id',
      'pricing_digest',
      'publisher_id',
      'currency',
      'cache_ttl_seconds',
      'intents',
    ],
  };

  beforeEach(async () => {
    await setupMocks();
    mockGetPricingSchema.mockResolvedValue(
      mockPricingSchema as unknown as import('json-schema').JSONSchema7
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPricingScheme', () => {
    it('should create a valid PricingScheme from JSON string', async () => {
      const json = JSON.stringify(validPricingScheme);
      const result = await createPricingScheme(json);
      expect(result).toEqual(validPricingScheme);
    });

    it('should throw SyntaxError for malformed JSON', async () => {
      const invalidJson = '{ "pricing_scheme_id": "test", invalid }';
      await expect(createPricingScheme(invalidJson)).rejects.toThrow(SyntaxError);
      await expect(createPricingScheme(invalidJson)).rejects.toThrow('Invalid JSON');
    });

    it('should throw PricingValidationError for missing required fields', async () => {
      const incompletePricing = {
        pricing_scheme_id: '01HZXYZ123456789ABCDEFGHIJ',
        // missing required fields
      };
      const json = JSON.stringify(incompletePricing);

      // Mock validation failure
      const mockValidator = Object.assign(vi.fn().mockReturnValue(false), {
        errors: [
          {
            instancePath: '',
            schemaPath: '#/required',
            keyword: 'required',
            params: { missingProperty: 'pricing_digest' },
            message: "must have required property 'pricing_digest'",
          },
        ],
      });

      // Mock the AJV compilation to return our mock validator
      const mockAjv = {
        compile: vi.fn().mockReturnValue(mockValidator),
      };

      // We need to mock the entire Ajv constructor and addFormats
      vi.doMock('ajv', () => ({
        default: vi.fn().mockImplementation(() => mockAjv),
      }));

      vi.doMock('ajv-formats', () => ({
        default: vi.fn(),
      }));

      await expect(createPricingScheme(json)).rejects.toThrow(PricingValidationError);
    });

    it('should handle empty JSON object', async () => {
      const json = '{}';

      // Mock validation failure for empty object
      const mockValidator = Object.assign(vi.fn().mockReturnValue(false), {
        errors: [
          {
            instancePath: '',
            schemaPath: '#/required',
            keyword: 'required',
            params: { missingProperty: 'pricing_scheme_id' },
            message: "must have required property 'pricing_scheme_id'",
          },
        ],
      });

      const mockAjv = {
        compile: vi.fn().mockReturnValue(mockValidator),
      };

      vi.doMock('ajv', () => ({
        default: vi.fn().mockImplementation(() => mockAjv),
      }));

      vi.doMock('ajv-formats', () => ({
        default: vi.fn(),
      }));

      await expect(createPricingScheme(json)).rejects.toThrow(PricingValidationError);
    });
  });

  describe('createPricingSchemeFromFile', () => {
    it('should create PricingScheme from file', async () => {
      const filePath = '/path/to/pricing.json';
      const fileContent = JSON.stringify(validPricingScheme);

      mockReadFile.mockResolvedValue(fileContent);

      const result = await createPricingSchemeFromFile(filePath);
      expect(result).toEqual(validPricingScheme);
      expect(mockReadFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should throw error when file cannot be read', async () => {
      const filePath = '/path/to/nonexistent.json';
      const readError = new Error('File not found');

      mockReadFile.mockRejectedValue(readError);

      await expect(createPricingSchemeFromFile(filePath)).rejects.toThrow(
        `Failed to read pricing JSON from ${filePath}: File not found`
      );
    });

    it('should propagate PricingValidationError from createPricingScheme', async () => {
      const filePath = '/path/to/invalid-pricing.json';
      const invalidContent = '{"invalid": "pricing"}';

      mockReadFile.mockResolvedValue(invalidContent);

      // Mock validation failure
      const mockValidator = Object.assign(vi.fn().mockReturnValue(false), {
        errors: [
          {
            instancePath: '',
            schemaPath: '#/required',
            keyword: 'required',
            params: { missingProperty: 'pricing_scheme_id' },
            message: "must have required property 'pricing_scheme_id'",
          },
        ],
      });

      const mockAjv = {
        compile: vi.fn().mockReturnValue(mockValidator),
      };

      vi.doMock('ajv', () => ({
        default: vi.fn().mockImplementation(() => mockAjv),
      }));

      vi.doMock('ajv-formats', () => ({
        default: vi.fn(),
      }));

      await expect(createPricingSchemeFromFile(filePath)).rejects.toThrow(PricingValidationError);
    });

    it('should handle file reading with different encodings gracefully', async () => {
      const filePath = '/path/to/pricing.json';
      const fileContent = JSON.stringify(validPricingScheme);

      mockReadFile.mockResolvedValue(fileContent);

      await createPricingSchemeFromFile(filePath);
      expect(mockReadFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });
  });

  describe('PricingValidationError', () => {
    it('should properly construct with message and errors', () => {
      const message = 'Validation failed';
      const errors = [
        {
          instancePath: '/pricing_scheme_id',
          schemaPath: '#/properties/pricing_scheme_id/pattern',
          keyword: 'pattern',
          params: { pattern: '^[0-9A-Z]{26}$' },
          message: 'must match pattern "^[0-9A-Z]{26}$"',
        },
      ] as import('ajv').ErrorObject[];

      const error = new PricingValidationError(message, errors);

      expect(error.message).toBe(message);
      expect(error.name).toBe('PricingValidationError');
      expect(error.errors).toEqual(errors);
      expect(error).toBeInstanceOf(Error);
    });

    it('should construct without errors parameter', () => {
      const message = 'Validation failed';
      const error = new PricingValidationError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('PricingValidationError');
      expect(error.errors).toBeUndefined();
    });
  });
});
