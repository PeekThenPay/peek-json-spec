/**
 * Peek Schema Tests
 *
 * Simple tests to ensure:
 * 1. The peek-schema.ts file properly loads peek.schema.json
 * 2. The peek.schema.json file is a valid JSON schema
 */

import { describe, it, expect } from 'vitest';
import { getSchema } from '../peek-schema.js';

describe('peek-schema.ts', () => {
  it('should load the peek.schema.json file successfully', async () => {
    const schema = await getSchema();

    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
    expect(schema).not.toBeNull();
  });

  it('should load a valid JSON Schema Draft 2020-12', async () => {
    const schema = await getSchema();

    // Check basic JSON Schema properties
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.type).toBe('object');
    expect(schema.title).toBeDefined();
    expect(schema.description).toBeDefined();
  });

  it('should have required properties defined', async () => {
    const schema = await getSchema();

    expect(schema.required).toEqual(
      expect.arrayContaining(['version', 'meta', 'license', 'enforcement'])
    );
    expect(schema.properties).toBeDefined();
    expect(schema.properties.version).toBeDefined();
    expect(schema.properties.meta).toBeDefined();
    expect(schema.properties.license).toBeDefined();
    expect(schema.properties.enforcement).toBeDefined();
  });

  it('should have format constraints for validation', async () => {
    const schema = await getSchema();

    // Check that format constraints exist (this is what we've been trying to test!)
    const metaProps = schema.properties?.meta?.properties;
    expect(metaProps?.last_updated?.format).toBe('date');

    const licenseProps = schema.properties?.license?.properties;
    expect(licenseProps?.license_issuer?.format).toBe('uri');
    expect(licenseProps?.terms_url?.format).toBe('uri');
  });

  it('should be cacheable (subsequent calls should work)', async () => {
    const schema1 = await getSchema();
    const schema2 = await getSchema();

    expect(schema1).toEqual(schema2);
  });
});
