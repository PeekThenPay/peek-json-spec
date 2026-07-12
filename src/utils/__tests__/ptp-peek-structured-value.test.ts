/**
 * v2.1.0 "structured value" field validation for the ptp-peek intent schema.
 * Covers: namespaced contentType, pageMetadata, related[], agentGuidance,
 * contentState, topics[], entities[], and retained top-level strictness.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
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

describe('pageMetadata', () => {
  it('accepts typed article metadata', () => {
    expect(
      validate({
        ...basePeek,
        pageMetadata: {
          type: 'article',
          article: {
            headline: 'Revolutionary AI System Achieves Human-Level Performance',
            author: 'Dana Rivers',
            datePublished: '2026-07-10',
            publisher: { name: 'Example News' },
            wordCount: 1480,
          },
        },
      }),
    ).toBe(true);
  });

  it('rejects unknown properties inside articleMetadata (strict typed defs)', () => {
    expect(
      validate({
        ...basePeek,
        pageMetadata: { type: 'article', article: { headline: 'x', sneaky: true } },
      }),
    ).toBe(false);
  });
});

describe('related[]', () => {
  const rel = {
    url: 'https://example.com/article/ai-benchmarks',
    title: 'Benchmarks',
    relationship: 'similar',
  };

  it('accepts related resources', () => {
    expect(validate({ ...basePeek, related: [rel] })).toBe(true);
  });

  it('requires url', () => {
    expect(validate({ ...basePeek, related: [{ title: 'no url' }] })).toBe(false);
  });

  it('rejects more than 10 entries', () => {
    expect(validate({ ...basePeek, related: Array(11).fill(rel) })).toBe(false);
  });

  it('rejects unknown properties on entries', () => {
    expect(validate({ ...basePeek, related: [{ ...rel, weight: 1 }] })).toBe(false);
  });
});

describe('agentGuidance', () => {
  it('accepts publisher usage instructions', () => {
    expect(
      validate({ ...basePeek, agentGuidance: 'Offer redemption URLs are in signals.codeOffers.' }),
    ).toBe(true);
  });

  it('rejects guidance over 500 characters', () => {
    expect(validate({ ...basePeek, agentGuidance: 'x'.repeat(501) })).toBe(false);
  });
});

describe('contentState', () => {
  it.each(['draft', 'scheduled', 'published', 'archived', 'retracted'])('accepts %s', (state) => {
    expect(validate({ ...basePeek, contentState: state })).toBe(true);
  });

  it('rejects unknown states', () => {
    expect(validate({ ...basePeek, contentState: 'in-review' })).toBe(false);
  });
});

describe('topics[]', () => {
  it('accepts scheme-qualified topics', () => {
    expect(
      validate({
        ...basePeek,
        topics: [
          { label: 'Artificial Intelligence', scheme: 'wp:category', id: 'ai', score: 0.97 },
          { label: 'Technology & Computing', scheme: 'iab-3.0', id: '596' },
        ],
      }),
    ).toBe(true);
  });

  it('requires label', () => {
    expect(validate({ ...basePeek, topics: [{ scheme: 'wp:category' }] })).toBe(false);
  });

  it('rejects out-of-range scores', () => {
    expect(validate({ ...basePeek, topics: [{ label: 'AI', score: 1.5 }] })).toBe(false);
  });

  it('rejects more than 10 topics', () => {
    expect(validate({ ...basePeek, topics: Array(11).fill({ label: 'AI' }) })).toBe(false);
  });
});

describe('entities[]', () => {
  it('accepts typed, linked entities', () => {
    expect(
      validate({
        ...basePeek,
        entities: [
          {
            name: 'Example AI Labs',
            type: 'organization',
            id: 'https://www.wikidata.org/wiki/Q00000001',
            url: 'https://example.com/topics/example-ai-labs',
            salience: 0.9,
          },
          { name: 'Dana Rivers', type: 'person' },
        ],
      }),
    ).toBe(true);
  });

  it('accepts namespaced custom entity types', () => {
    expect(validate({ ...basePeek, entities: [{ name: 'Adidas', type: 'wp:brand' }] })).toBe(true);
  });

  it('requires name', () => {
    expect(validate({ ...basePeek, entities: [{ type: 'person' }] })).toBe(false);
  });

  it('rejects invalid entity types', () => {
    expect(validate({ ...basePeek, entities: [{ name: 'X', type: 'Not A Type!' }] })).toBe(false);
  });

  it('rejects out-of-range salience', () => {
    expect(validate({ ...basePeek, entities: [{ name: 'X', salience: -0.1 }] })).toBe(false);
  });

  it('rejects more than 25 entities', () => {
    expect(validate({ ...basePeek, entities: Array(26).fill({ name: 'X' }) })).toBe(false);
  });
});

describe('live production regression', () => {
  it('validates the offers.com peek captured 2026-07-12 with zero producer changes', async () => {
    const raw = await readFile(
      join(
        process.cwd(),
        'src',
        'utils',
        '__tests__',
        'fixtures',
        'offers-live-peek-2026-07-12.json',
      ),
      'utf-8',
    );
    const livePeek = JSON.parse(raw);
    const ok = validate(livePeek);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });
});
