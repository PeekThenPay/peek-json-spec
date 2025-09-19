import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPeekManifest, createPeekManifestFromFile, PeekValidationError } from '../factory.js';
import type { PeekManifest } from '../../types/peek-manifest.js';

// Mock the schema module
vi.mock('../schema.js');

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

import { getSchema } from '../schema.js';
const mockGetSchema = vi.mocked(getSchema);

// Global mock references
let mockReadFile: ReturnType<typeof vi.fn>;

// Setup function to initialize mocks
async function setupMocks() {
  const fs = (await vi.importMock('fs/promises')) as { readFile: ReturnType<typeof vi.fn> };
  mockReadFile = fs.readFile;
}

describe('factory.ts', () => {
  const validPeekManifest: PeekManifest = {
    version: '1.0.0',
    meta: {
      site_name: 'Test Site',
      publisher: 'Test Publisher',
      publisher_id: 'test-pub-123',
      domains: ['example.com'],
      categories: ['news'],
      last_updated: '2024-01-01',
    },
    enforcement: {
      rate_limit_per_ip: 100,
      grace_period_seconds: 300,
      failover_mode: 'cache_only',
      bypass_paths: ['/robots.txt'],
    },
    license: {
      license_issuer: 'https://license.example.com',
      terms_url: 'https://example.com/terms',
      supported_intents: ['peek', 'read'],
    },
  };

  const mockSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object' as const,
    properties: {
      version: { type: 'string' as const },
      meta: {
        type: 'object' as const,
        properties: {
          site_name: { type: 'string' as const },
          publisher: { type: 'string' as const },
          publisher_id: { type: 'string' as const },
          domains: { type: 'array' as const },
          categories: { type: 'array' as const },
          last_updated: { type: 'string' as const },
        },
        required: [
          'site_name',
          'publisher',
          'publisher_id',
          'domains',
          'categories',
          'last_updated',
        ],
      },
      enforcement: {
        type: 'object' as const,
        properties: {
          failover_mode: { type: 'string' as const, enum: ['deny', 'allow', 'cache_only'] },
        },
        required: ['failover_mode'],
      },
      license: {
        type: 'object' as const,
        properties: {
          license_issuer: { type: 'string' as const },
        },
        required: ['license_issuer'],
      },
    },
    required: ['version', 'meta', 'enforcement', 'license'],
  };

  beforeEach(async () => {
    await setupMocks();
    vi.clearAllMocks();
    mockGetSchema.mockResolvedValue(mockSchema);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PeekValidationError', () => {
    it('should create error with message only', () => {
      const error = new PeekValidationError('Test validation error');

      expect(error.name).toBe('PeekValidationError');
      expect(error.message).toBe('Test validation error');
      expect(error.errors).toBeUndefined();
    });

    it('should create error with validation errors', () => {
      const validationErrors = [
        {
          instancePath: '/version',
          message: 'should be string',
          keyword: 'type',
          schemaPath: '#/properties/version/type',
          params: { type: 'string' },
        },
      ];
      const error = new PeekValidationError('Validation failed', validationErrors);

      expect(error.name).toBe('PeekValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(validationErrors);
    });

    it('should be instanceof Error', () => {
      const error = new PeekValidationError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PeekValidationError);
    });

    it('should handle empty errors array', () => {
      const error = new PeekValidationError('Validation failed', []);
      expect(error.errors).toEqual([]);
    });

    it('should handle multiple validation errors', () => {
      const validationErrors = [
        {
          instancePath: '/version',
          message: 'should be string',
          keyword: 'type',
          schemaPath: '#/properties/version/type',
          params: { type: 'string' },
        },
        {
          instancePath: '/meta/site_name',
          message: 'is required',
          keyword: 'required',
          schemaPath: '#/properties/meta/required',
          params: { missingProperty: 'site_name' },
        },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = new PeekValidationError('Multiple validation errors', validationErrors as any);

      expect(error.errors).toHaveLength(2);
      expect(error.errors).toEqual(validationErrors);
    });
  });

  describe('createPeekManifest()', () => {
    it('should successfully create and validate a manifest', async () => {
      const jsonString = JSON.stringify(validPeekManifest);
      const result = await createPeekManifest(jsonString);

      expect(result).toEqual(validPeekManifest);
      expect(mockGetSchema).toHaveBeenCalledTimes(1);
    });

    it('should throw PeekValidationError for invalid manifest', async () => {
      const invalidManifest = {
        version: 123, // Should be string
        meta: {
          site_name: 'Test Site',
          // Missing required fields
        },
      };
      const jsonString = JSON.stringify(invalidManifest);

      await expect(createPeekManifest(jsonString)).rejects.toThrow(PeekValidationError);
    });

    it('should throw PeekValidationError with validation details', async () => {
      const invalidManifest = {
        version: 123,
        meta: {},
        enforcement: {},
        license: {},
      };
      const jsonString = JSON.stringify(invalidManifest);

      try {
        await createPeekManifest(jsonString);
        expect.fail('Should have thrown PeekValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(PeekValidationError);
        expect((error as PeekValidationError).errors).toBeDefined();
        expect((error as PeekValidationError).errors!.length).toBeGreaterThan(0);
      }
    });

    it('should handle missing required sections', async () => {
      const manifestWithoutLicense = {
        version: '1.0.0',
        meta: validPeekManifest.meta,
        enforcement: validPeekManifest.enforcement,
      };
      const jsonString = JSON.stringify(manifestWithoutLicense);

      await expect(createPeekManifest(jsonString)).rejects.toThrow(PeekValidationError);
    });

    it('should handle valid minimal manifest', async () => {
      const minimalManifest = {
        version: '1.0.0',
        meta: {
          site_name: 'Test Site',
          publisher: 'Test Publisher',
          publisher_id: 'test-123',
          domains: ['test.com'],
          categories: ['news'],
          last_updated: '2024-01-01',
        },
        enforcement: {
          failover_mode: 'cache_only' as const,
        },
        license: {
          license_issuer: 'https://license.test.com',
        },
      };
      const jsonString = JSON.stringify(minimalManifest);

      const result = await createPeekManifest(jsonString);
      expect(result.version).toBe('1.0.0');
      expect(result.meta.site_name).toBe('Test Site');
    });

    it('should handle complex nested validation errors', async () => {
      const complexInvalidManifest = {
        version: '1.0.0',
        meta: validPeekManifest.meta,
        enforcement: {
          failover_mode: 'invalid_mode', // Invalid enum value
        },
        license: {
          // Missing required license_issuer
        },
      };
      const jsonString = JSON.stringify(complexInvalidManifest);

      await expect(createPeekManifest(jsonString)).rejects.toThrow(PeekValidationError);
    });

    it('should throw SyntaxError for malformed JSON', async () => {
      const malformedJson = '{ invalid json content';

      await expect(createPeekManifest(malformedJson)).rejects.toThrow(SyntaxError);

      await expect(createPeekManifest(malformedJson)).rejects.toThrow('Invalid JSON:');
    });

    it('should handle different JSON syntax errors', async () => {
      // Missing closing brace
      await expect(createPeekManifest('{"version": "1.0"')).rejects.toThrow(SyntaxError);

      // Invalid trailing comma
      await expect(createPeekManifest('{"version": "1.0",}')).rejects.toThrow(SyntaxError);

      // Unescaped quotes
      await expect(createPeekManifest('{"version": "test"string"}')).rejects.toThrow(SyntaxError);
    });

    it('should handle edge cases', async () => {
      // Test with null
      await expect(createPeekManifest('null')).rejects.toThrow(PeekValidationError);

      // Test with string instead of object
      await expect(createPeekManifest('"not an object"')).rejects.toThrow(PeekValidationError);

      // Test with array instead of object
      await expect(createPeekManifest('[]')).rejects.toThrow(PeekValidationError);

      // Test with empty object
      await expect(createPeekManifest('{}')).rejects.toThrow(PeekValidationError);
    });

    it('should handle very large valid manifest', async () => {
      const largeManifest = {
        ...validPeekManifest,
        meta: {
          ...validPeekManifest.meta,
          domains: Array(100).fill('test.com'),
          categories: Array(50).fill('news'),
        },
      };
      const jsonString = JSON.stringify(largeManifest);

      const result = await createPeekManifest(jsonString);
      expect(result.meta.domains).toHaveLength(100);
      expect(result.meta.categories).toHaveLength(50);
    });

    it('should validate with cached schema on subsequent calls', async () => {
      const jsonString = JSON.stringify(validPeekManifest);

      // Clear the mock call count first
      mockGetSchema.mockClear();

      // First call
      await createPeekManifest(jsonString);
      const firstCallCount = mockGetSchema.mock.calls.length;

      // Second call should use cached validator
      const result = await createPeekManifest(jsonString);
      const secondCallCount = mockGetSchema.mock.calls.length;

      expect(result).toEqual(validPeekManifest);
      expect(secondCallCount).toBe(firstCallCount); // No additional calls due to caching
    });
  });

  describe('createPeekManifestFromFile()', () => {
    it('should successfully load and validate manifest from file', async () => {
      const fileContent = JSON.stringify(validPeekManifest);
      mockReadFile.mockResolvedValueOnce(fileContent);

      const result = await createPeekManifestFromFile('/path/to/manifest.json');

      expect(result).toEqual(validPeekManifest);
      expect(mockReadFile).toHaveBeenCalledWith('/path/to/manifest.json', 'utf-8');
    });

    it('should throw error when file cannot be read', async () => {
      const fileError = new Error('ENOENT: no such file or directory');
      mockReadFile.mockRejectedValueOnce(fileError);

      await expect(createPeekManifestFromFile('/nonexistent/file.json')).rejects.toThrow(
        'Failed to read peek.json from /nonexistent/file.json'
      );
    });

    it('should preserve PeekValidationError from createPeekManifest', async () => {
      const invalidManifest = { version: 123 };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidManifest));

      await expect(createPeekManifestFromFile('/path/to/invalid.json')).rejects.toThrow(
        PeekValidationError
      );
    });

    it('should handle file read errors properly', async () => {
      const readError = new Error('Permission denied');
      mockReadFile.mockRejectedValueOnce(readError);

      const error = await createPeekManifestFromFile('/restricted/file.json').catch((e) => e);

      expect(error.message).toContain('Failed to read peek.json from /restricted/file.json');
      expect(error.message).toContain('Permission denied');
    });

    it('should handle non-Error exceptions', async () => {
      mockReadFile.mockRejectedValueOnce('string error');

      const error = await createPeekManifestFromFile('/path/to/file.json').catch((e) => e);

      expect(error.message).toContain('Failed to read peek.json from /path/to/file.json');
      expect(error.message).toContain('string error');
    });

    it('should handle different file paths', async () => {
      const fileContent = JSON.stringify(validPeekManifest);
      mockReadFile.mockResolvedValue(fileContent);

      // Test absolute path
      await createPeekManifestFromFile('/absolute/path/peek.json');
      expect(mockReadFile).toHaveBeenCalledWith('/absolute/path/peek.json', 'utf-8');

      // Test relative path
      await createPeekManifestFromFile('./relative/peek.json');
      expect(mockReadFile).toHaveBeenCalledWith('./relative/peek.json', 'utf-8');

      // Test path with spaces
      await createPeekManifestFromFile('/path with spaces/peek.json');
      expect(mockReadFile).toHaveBeenCalledWith('/path with spaces/peek.json', 'utf-8');
    });

    it('should handle empty file', async () => {
      mockReadFile.mockResolvedValueOnce('');

      await expect(createPeekManifestFromFile('/path/to/empty.json')).rejects.toThrow(
        'Failed to read peek.json from /path/to/empty.json'
      );
    });

    it('should handle file with invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('{ invalid json');

      await expect(createPeekManifestFromFile('/path/to/invalid.json')).rejects.toThrow(
        'Failed to read peek.json from /path/to/invalid.json'
      );
    });

    it('should handle large files', async () => {
      const largeManifest = {
        ...validPeekManifest,
        meta: {
          ...validPeekManifest.meta,
          domains: Array(1000).fill('example.com'),
        },
      };
      const largeContent = JSON.stringify(largeManifest);
      mockReadFile.mockResolvedValueOnce(largeContent);

      const result = await createPeekManifestFromFile('/path/to/large.json');
      expect(result.meta.domains).toHaveLength(1000);
    });
  });
});
