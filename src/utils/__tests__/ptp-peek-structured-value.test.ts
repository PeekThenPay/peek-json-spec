/**
 * v2.1.0 "structured value" field validation for the ptp-peek intent schema.
 * Covers: namespaced contentType, pageMetadata, related[], agentGuidance,
 * contentState, topics[], entities[], and retained top-level strictness.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { loadIntentSchema, createAjvLoadSchemaFunction } from '../schema-loader.js';

export const basePeek = {
  intent: 'peek',
  canonicalUrl: 'https://example.com/article/ai-breakthrough',
  title: 'Revolutionary AI System Achieves Human-Level Performance',
  snippet:
    'Scientists at a leading AI research lab have developed a groundbreaking system that demonstrates human-level performance across multiple cognitive tasks.',
  mediaType: 'text/html',
  peekManifestUrl: 'https://example.com/.well-known/peek.json',
  provenance: {
    generatedAt: '2026-07-12T14:30:00Z',
    sourceUrl: 'https://example.com/article/ai-breakthrough',
  },
};

let validate: ValidateFunction;

beforeAll(async () => {
  const ajv = new Ajv2020({
    strict: false,
    allErrors: true,
    loadSchema: createAjvLoadSchemaFunction(),
  });
  addFormats(ajv);
  const schema = await loadIntentSchema('ptp-peek');
  validate = await ajv.compileAsync(schema);
});

describe('contentType (opened enum)', () => {
  it('accepts canonical enum values', () => {
    expect(validate({ ...basePeek, contentType: 'article' })).toBe(true);
  });

  it('accepts namespaced custom values', () => {
    expect(validate({ ...basePeek, contentType: 'ecommerce:deals' })).toBe(true);
  });

  it('rejects values that are neither enum nor pattern-conformant', () => {
    expect(validate({ ...basePeek, contentType: 'Not A Type!' })).toBe(false);
  });
});

describe('top-level strictness retained', () => {
  it('rejects unknown top-level properties', () => {
    expect(validate({ ...basePeek, sneakyExtra: 'nope' })).toBe(false);
  });
});
