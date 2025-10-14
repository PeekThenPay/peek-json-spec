/**
 * Tests for forensic-manifest-factory.ts
 */

import { describe, it, expect } from 'vitest';
import {
  createForensicManifest,
  createPreviewForensicManifest,
  createLicensedForensicManifest,
  validateForensicManifest,
  isValidPayloadDigest,
  ForensicManifestError,
} from '../forensic-manifest-factory.js';

describe('forensic-manifest-factory.ts', () => {
  const validParams = {
    publisher_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T1X',
    license_id: '01HQ2Z3Y4K5M6N7P8Q9R0S1T2Y',
    resource_url: 'https://example.com/article',
    payload_digest: 'sha256:f933170deedab22606e857712501415cbedcef68143df05583c6e23b8c0dd7bb',
    preview: false,
    content_ttl_seconds: 3600,
    model: {
      id: 'gpt-4',
      provider: 'openai',
      name: 'gpt-4',
      version: '2024-01-01',
      digest: 'sha256:7ac5170dd6cc43d9c01a042f12b62598a301201cef596610a87c23474de63065',
    },
  };

  describe('createForensicManifest', () => {
    it('should create a valid forensic manifest', () => {
      const manifest = createForensicManifest(validParams);

      expect(manifest.publisher_id).toBe(validParams.publisher_id);
      expect(manifest.license_id).toBe(validParams.license_id);
      expect(manifest.resource_url).toBe(validParams.resource_url);
      expect(manifest.payload_digest).toBe(validParams.payload_digest);
      expect(manifest.preview).toBe(validParams.preview);
      expect(manifest.content_ttl_seconds).toBe(validParams.content_ttl_seconds);
      expect(manifest.model).toEqual(validParams.model);
      expect(manifest.issued_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should use custom issued_at when provided', () => {
      const customTime = '2025-10-14T12:00:00Z';
      const manifest = createForensicManifest({
        ...validParams,
        issued_at: customTime,
      });

      expect(manifest.issued_at).toBe(customTime);
    });

    it('should handle null license_id for preview content', () => {
      const manifest = createForensicManifest({
        ...validParams,
        license_id: null,
        preview: true,
      });

      expect(manifest.license_id).toBeNull();
      expect(manifest.preview).toBe(true);
    });

    it('should exclude optional fields when not provided', () => {
      const minimalParams = {
        publisher_id: validParams.publisher_id,
        license_id: validParams.license_id,
        resource_url: validParams.resource_url,
        payload_digest: validParams.payload_digest,
        preview: validParams.preview,
      };
      const manifest = createForensicManifest(minimalParams);

      expect(manifest.content_ttl_seconds).toBeUndefined();
      expect(manifest.model).toBeUndefined();
    });

    it('should use custom clock function for timestamp generation', () => {
      const fixedTime = new Date('2024-01-01T00:00:00.000Z');
      const mockClock = () => fixedTime;

      const manifest = createForensicManifest({
        ...validParams,
        clock: mockClock,
      });

      expect(manifest.issued_at).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should generate different timestamps with different clock functions', () => {
      const time1 = new Date('2024-01-01T00:00:00.000Z');
      const time2 = new Date('2024-06-15T12:30:45.123Z');

      const manifest1 = createForensicManifest({
        ...validParams,
        clock: () => time1,
      });

      const manifest2 = createForensicManifest({
        ...validParams,
        clock: () => time2,
      });

      expect(manifest1.issued_at).toBe('2024-01-01T00:00:00.000Z');
      expect(manifest2.issued_at).toBe('2024-06-15T12:30:45.123Z');
      expect(manifest1.issued_at).not.toBe(manifest2.issued_at);
    });
  });

  describe('createPreviewForensicManifest', () => {
    it('should create a preview manifest with correct defaults', () => {
      const manifest = createPreviewForensicManifest({
        publisher_id: validParams.publisher_id,
        resource_url: validParams.resource_url,
        payload_digest: validParams.payload_digest,
      });

      expect(manifest.preview).toBe(true);
      expect(manifest.license_id).toBeNull();
      expect(manifest.content_ttl_seconds).toBe(300); // Default 5 minutes
    });

    it('should allow custom TTL for previews', () => {
      const manifest = createPreviewForensicManifest({
        publisher_id: validParams.publisher_id,
        resource_url: validParams.resource_url,
        payload_digest: validParams.payload_digest,
        content_ttl_seconds: 600,
      });

      expect(manifest.content_ttl_seconds).toBe(600);
    });
  });

  describe('createLicensedForensicManifest', () => {
    it('should create a licensed manifest with correct defaults', () => {
      const manifest = createLicensedForensicManifest({
        publisher_id: validParams.publisher_id,
        license_id: validParams.license_id,
        resource_url: validParams.resource_url,
        payload_digest: validParams.payload_digest,
      });

      expect(manifest.preview).toBe(false);
      expect(manifest.license_id).toBe(validParams.license_id);
      expect(manifest.content_ttl_seconds).toBe(3600); // Default 1 hour
    });

    it('should include model information when provided', () => {
      const manifest = createLicensedForensicManifest({
        publisher_id: validParams.publisher_id,
        license_id: validParams.license_id,
        resource_url: validParams.resource_url,
        payload_digest: validParams.payload_digest,
        model: validParams.model,
      });

      expect(manifest.model).toEqual(validParams.model);
    });
  });

  describe('validation utilities', () => {
    describe('isValidPayloadDigest', () => {
      it('should validate correct SHA256 digests', () => {
        expect(
          isValidPayloadDigest(
            'sha256:a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd'
          )
        ).toBe(true);
        expect(
          isValidPayloadDigest(
            'sha256:A1B2C3D4E5F6789012345678901234567890123456789012345678901234ABCD'
          )
        ).toBe(true);
      });

      it('should reject invalid digests', () => {
        expect(isValidPayloadDigest('sha256:invalid')).toBe(false);
        expect(
          isValidPayloadDigest(
            'md5:a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd'
          )
        ).toBe(false);
        expect(
          isValidPayloadDigest('a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd')
        ).toBe(false);
      });
    });
  });

  describe('validateForensicManifest', () => {
    it('should validate a correct manifest without errors', () => {
      const manifest = createForensicManifest(validParams);
      expect(() => validateForensicManifest(manifest)).not.toThrow();
    });

    it('should throw for invalid publisher_id', () => {
      const manifest = createForensicManifest({
        ...validParams,
        publisher_id: 'invalid-id',
      });

      expect(() => validateForensicManifest(manifest)).toThrow(ForensicManifestError);
      expect(() => validateForensicManifest(manifest)).toThrow('Invalid publisher_id format');
    });

    it('should throw for invalid license_id', () => {
      const manifest = createForensicManifest({
        ...validParams,
        license_id: 'invalid-license',
      });

      expect(() => validateForensicManifest(manifest)).toThrow(ForensicManifestError);
      expect(() => validateForensicManifest(manifest)).toThrow('Invalid license_id format');
    });

    it('should accept null license_id', () => {
      const manifest = createForensicManifest({
        ...validParams,
        license_id: null,
      });

      expect(() => validateForensicManifest(manifest)).not.toThrow();
    });

    it('should throw for invalid payload_digest', () => {
      const manifest = createForensicManifest({
        ...validParams,
        payload_digest: 'invalid-digest',
      });

      expect(() => validateForensicManifest(manifest)).toThrow(ForensicManifestError);
      expect(() => validateForensicManifest(manifest)).toThrow('Invalid payload_digest format');
    });

    it('should throw for invalid resource_url URL', () => {
      const manifest = createForensicManifest({
        ...validParams,
        resource_url: 'not-a-url',
      });

      expect(() => validateForensicManifest(manifest)).toThrow(ForensicManifestError);
      expect(() => validateForensicManifest(manifest)).toThrow('Invalid resource_url URL');
    });

    it('should throw for invalid issued_at date', () => {
      const manifest = createForensicManifest({
        ...validParams,
        issued_at: 'not-a-date',
      });

      expect(() => validateForensicManifest(manifest)).toThrow(ForensicManifestError);
      expect(() => validateForensicManifest(manifest)).toThrow('Invalid issued_at date');
    });

    it('should throw for invalid model digest', () => {
      const manifest = createForensicManifest({
        ...validParams,
        model: {
          id: 'gpt-4',
          provider: 'openai',
          name: 'gpt-4',
          version: '2024-01-01',
          digest: 'invalid-digest',
        },
      });

      expect(() => validateForensicManifest(manifest)).toThrow(ForensicManifestError);
      expect(() => validateForensicManifest(manifest)).toThrow('Invalid model digest format');
    });
  });
});
