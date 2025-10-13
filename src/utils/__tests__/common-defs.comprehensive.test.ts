/**
 * Comprehensive Common Definitions Schema Validation Tests
 *
 * This test suite provides thorough validation of the common-defs.schema.json
 * file and its integration with intent-specific schemas. It comprehensively tests:
 * - Base provenance schema validation with all fields (required and optional)
 * - Intent-specific provenance extensions for analyze and embed operations
 * - Model metadata validation with proper format validation
 * - Cross-reference resolution between schemas
 * - Edge cases and validation error conditions
 *
 * These tests ensure that shared schema definitions work correctly across
 * all intent schemas, that provenance tracking is properly validated,
 * and that model metadata follows the required format patterns.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { BaseProvenance, ModelMetadata } from '../../types/common.js';

describe('Common Definitions Schema Comprehensive Validation', () => {
  let ajv: Ajv2020;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let commonDefsSchema: any;

  beforeEach(() => {
    // Load the common definitions schema first
    const schemaPath = join(
      globalThis.process.cwd(),
      'schema',
      'intents',
      'common-defs.schema.json'
    );
    commonDefsSchema = JSON.parse(readFileSync(schemaPath, 'utf8'));

    // Use AJV 2020-12 with proper loadSchema function for cross-references
    ajv = new Ajv2020({
      allErrors: true,
      verbose: true,
      strict: false,
      loadSchema: async (uri: string) => {
        // Handle relative references to common-defs.schema.json
        if (uri === 'common-defs.schema.json' || uri.endsWith('common-defs.schema.json')) {
          // Return the schema we already loaded, don't add it again
          return commonDefsSchema;
        }
        throw new Error(`Cannot load schema: ${uri}`);
      },
    });

    // Add format support
    addFormats(ajv);

    // Add the common definitions schema with its actual ID
    ajv.addSchema(commonDefsSchema);
  });

  describe('baseProvenance definition', () => {
    it('should validate minimal provenance with only contentHash', () => {
      const validator = ajv.compile({
        type: 'object',
        properties: {
          provenance: { $ref: '#/$defs/baseProvenance' },
        },
        $defs: commonDefsSchema.$defs,
      });

      const minimalProvenance: BaseProvenance = {
        contentHash: 'sha256:abc123',
      };

      expect(validator({ provenance: minimalProvenance })).toBe(true);
    });

    it('should validate full provenance with all enhanced fields', () => {
      const validator = ajv.compile({
        type: 'object',
        properties: {
          provenance: { $ref: '#/$defs/baseProvenance' },
        },
        $defs: commonDefsSchema.$defs,
      });

      const fullProvenance: BaseProvenance = {
        contentHash: 'sha256:abc123def456',
        generatedAt: '2024-01-15T10:30:00Z',
        sourceUrl: 'https://example.com/article',
        sourceTitle: 'Sample Article Title',
        sourceAuthor: 'Jane Doe',
        rights: '© 2024 Example Corp',
        attribution: 'Source: Example Corp',
        license: 'CC-BY-4.0',
        algorithm: 'text-summarization-v2',
        confidence: 0.95,
      };

      expect(validator({ provenance: fullProvenance })).toBe(true);
    });

    it('should reject invalid confidence values', () => {
      const validator = ajv.compile({
        type: 'object',
        properties: {
          provenance: { $ref: '#/$defs/baseProvenance' },
        },
        $defs: commonDefsSchema.$defs,
      });

      const invalidProvenance = {
        contentHash: 'sha256:abc123',
        confidence: 1.5, // Invalid: > 1
      };

      const isValid = validator({ provenance: invalidProvenance });
      expect(isValid).toBe(false);
      expect(validator.errors).toBeDefined();
      expect(validator.errors![0].message).toContain('<= 1');
    });
  });

  describe('intent-specific provenance extensions', () => {
    it('should validate analyze provenance with model and tasks', async () => {
      const analyzeSchema = JSON.parse(
        readFileSync(
          join(globalThis.process.cwd(), 'schema', 'intents', 'ptp-analyze.schema.json'),
          'utf8'
        )
      );

      // Compile with async loading for cross-references
      const validator = await ajv.compileAsync(analyzeSchema);

      const validResponse = {
        canonicalUrl: 'https://example.com/test',
        language: 'en',
        contentType: 'article',
        mediaType: 'text/html',
        normalization: { htmlStripped: true },
        provenance: {
          contentHash: 'sha256:abc123',
          generatedAt: '2024-01-15T10:30:00Z',
          tasks: ['sentiment', 'entities'],
          model: {
            id: 'analyzer:test@v1',
            provider: 'test',
            name: 'test-analyzer',
            version: 'v1',
            digest: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          },
        },
        analysis: {},
        length: { inputTokens: 100, outputTokens: 50 },
      };

      expect(validator(validResponse)).toBe(true);
      expect(validator.errors).toBeNull();
    });

    it('should validate embed provenance with model and vector metadata', async () => {
      const embedSchema = JSON.parse(
        readFileSync(
          join(globalThis.process.cwd(), 'schema', 'intents', 'ptp-embed.schema.json'),
          'utf8'
        )
      );

      // Compile with async loading for cross-references
      const validator = await ajv.compileAsync(embedSchema);

      const validResponse = {
        canonicalUrl: 'https://example.com/test',
        language: 'en',
        contentType: 'article',
        mediaType: 'text/html',
        normalization: { htmlStripped: true },
        provenance: {
          contentHash: 'sha256:abc123',
          generatedAt: '2024-01-15T10:30:00Z',
          model: {
            id: 'embed:test@v1',
            provider: 'test',
            name: 'test-embedder',
            version: 'v1',
            digest: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          },
          vectorDimensions: 768,
          chunkingMethod: 'chunks',
          chunkSize: 512,
          chunkOverlap: 50,
          chunkUnit: 'token',
        },
        embeddingMetadata: {
          dtype: 'f32',
          encode: 'array',
          num_items: 1,
        },
        length: { inputTokens: 100, outputTokens: 0 },
        embeddings: [
          {
            index: 0,
            embedding: [0.1, 0.2, 0.3],
            meta: { span: { start: 0, end: 100, unit: 'token' } },
          },
        ],
      };

      expect(validator(validResponse)).toBe(true);
      expect(validator.errors).toBeNull();
    });
  });

  describe('modelMetadata definition', () => {
    it('should validate complete model metadata', () => {
      const validator = ajv.compile({
        type: 'object',
        properties: {
          model: { $ref: '#/$defs/modelMetadata' },
        },
        $defs: commonDefsSchema.$defs,
      });

      const modelData: ModelMetadata = {
        id: 'sum:gpt-4.1-mini@v2',
        provider: 'openai',
        name: 'gpt-4.1-mini',
        version: 'v2',
        digest: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      };

      expect(validator({ model: modelData })).toBe(true);
    });

    it('should reject invalid model ID format', () => {
      const validator = ajv.compile({
        type: 'object',
        properties: {
          model: { $ref: '#/$defs/modelMetadata' },
        },
        $defs: commonDefsSchema.$defs,
      });

      const invalidModel = {
        id: 'invalid-format', // Missing type:name@version format
        provider: 'openai',
        name: 'gpt-4',
        version: 'v1',
        digest: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      };

      const isValid = validator({ model: invalidModel });
      expect(isValid).toBe(false);
      expect(validator.errors).toBeDefined();
      expect(validator.errors![0].message).toContain('pattern');
    });
  });
});
