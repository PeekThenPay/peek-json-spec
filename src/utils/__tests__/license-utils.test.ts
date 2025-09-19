import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createLicenseJwt,
  createDpopProof,
  verifyLicenseAndDpop,
  type CreateLicenseOptions,
  type CreateDpopOptions,
  type VerifyOptions,
  type ReplayGuard,
} from '../license-utils.js';
import { ulid } from 'ulid';
import { generateKeyPair, exportJWK, calculateJwkThumbprint, type JWK } from 'jose';
import type { IntentType, LicensePayload } from '../../index.js';

describe('license-utils', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publisherKeyPair: { privateKey: any; publicKey: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let operatorKeyPair: { privateKey: any; publicKey: any };
  let publisherPrivateJwk: JWK & { alg: 'ES256'; kid: string };
  let publisherPublicJwk: JWK & { alg: 'ES256'; kid: string };
  let operatorPrivateJwk: JWK & { alg: 'ES256'; kid: string };
  let operatorPublicJwk: JWK & { alg: 'ES256'; kid: string };

  beforeEach(async () => {
    // Generate test key pairs for publisher and operator with extractable keys
    publisherKeyPair = await generateKeyPair('ES256', { extractable: true });
    operatorKeyPair = await generateKeyPair('ES256', { extractable: true });

    publisherPrivateJwk = {
      ...(await exportJWK(publisherKeyPair.privateKey)),
      alg: 'ES256' as const,
      kid: 'publisher-key-1',
    };
    publisherPublicJwk = {
      ...(await exportJWK(publisherKeyPair.publicKey)),
      alg: 'ES256' as const,
      kid: 'publisher-key-1',
    };
    operatorPrivateJwk = {
      ...(await exportJWK(operatorKeyPair.privateKey)),
      alg: 'ES256' as const,
      kid: 'operator-key-1',
    };
    operatorPublicJwk = {
      ...(await exportJWK(operatorKeyPair.publicKey)),
      alg: 'ES256' as const,
      kid: 'operator-key-1',
    };
  });

  describe('createLicenseJwt', () => {
    it('should create a valid license JWT with required claims', async () => {
      const now = Math.floor(Date.now() / 1000);
      const claims: LicensePayload = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:01J5KQX8Y9Z0A1B2C3D4E5F6G7',
        aud: 'publisher:01J5KQX8Y9Z0A1B2C3D4E5F6G8',
        jti: ulid(),
        iat: now,
        exp: now + 3600,
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: ['read', 'summarize'] as IntentType[],
        budget_cents: 100,
        metadata: {},
        cnf: { jkt: 'test-thumbprint' },
      };

      const options: CreateLicenseOptions = {
        publisherPrivateJwk,
        kid: 'publisher-key-1',
        claims,
      };

      const jwt = await createLicenseJwt(options);
      expect(jwt).toBeDefined();
      expect(typeof jwt).toBe('string');
      expect(jwt.split('.')).toHaveLength(3); // JWT should have 3 parts
    });

    it('should throw error for invalid key type', async () => {
      const invalidJwk = { ...publisherPrivateJwk, kty: 'RSA' };
      const claims: LicensePayload = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:test',
        aud: 'publisher:test',
        jti: ulid(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: ['read'] as IntentType[],
        budget_cents: 100,
        metadata: {},
        cnf: { jkt: 'test-thumbprint' },
      };

      await expect(
        createLicenseJwt({ publisherPrivateJwk: invalidJwk, kid: 'test', claims })
      ).rejects.toThrow('publisherPrivateJwk must be EC P-256 (ES256)');
    });

    it('should throw error for missing cnf.jkt', async () => {
      const claims = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:test',
        aud: 'publisher:test',
        jti: ulid(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: ['read'] as IntentType[],
        budget_cents: 100,
        metadata: {},
        // Missing cnf.jkt
      } as unknown as LicensePayload;

      await expect(createLicenseJwt({ publisherPrivateJwk, kid: 'test', claims })).rejects.toThrow(
        'claims.cnf.jkt (operator JWK thumbprint) is required'
      );
    });

    it('should throw error for empty intents', async () => {
      const claims: LicensePayload = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:test',
        aud: 'publisher:test',
        jti: ulid(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: [], // Empty array
        budget_cents: 100,
        metadata: {},
        cnf: { jkt: 'test-thumbprint' },
      };

      await expect(createLicenseJwt({ publisherPrivateJwk, kid: 'test', claims })).rejects.toThrow(
        'claims.intents must be a non-empty array'
      );
    });

    it('should throw error for invalid budget', async () => {
      const claims: LicensePayload = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:test',
        aud: 'publisher:test',
        jti: ulid(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: ['read'] as IntentType[],
        budget_cents: -10, // Invalid negative budget
        metadata: {},
        cnf: { jkt: 'test-thumbprint' },
      };

      await expect(createLicenseJwt({ publisherPrivateJwk, kid: 'test', claims })).rejects.toThrow(
        'claims.budget_cents must be a positive number'
      );
    });
  });

  describe('createDpopProof', () => {
    it('should create a valid DPoP proof', async () => {
      const options: CreateDpopOptions = {
        operatorPrivateJwk,
        htm: 'GET',
        htu: 'https://api.example.com/resource',
        jti: ulid(),
      };

      const dpopProof = await createDpopProof(options);
      expect(dpopProof).toBeDefined();
      expect(typeof dpopProof).toBe('string');
      expect(dpopProof.split('.')).toHaveLength(3); // JWT should have 3 parts
    });

    it('should accept localhost URLs for development', async () => {
      const options: CreateDpopOptions = {
        operatorPrivateJwk,
        htm: 'POST',
        htu: 'http://localhost:3000/api/test',
        jti: ulid(),
      };

      const dpopProof = await createDpopProof(options);
      expect(dpopProof).toBeDefined();
    });

    it('should throw error for non-HTTPS URLs (except localhost)', async () => {
      const options: CreateDpopOptions = {
        operatorPrivateJwk,
        htm: 'GET',
        htu: 'http://example.com/resource', // Not HTTPS and not localhost
        jti: ulid(),
      };

      await expect(createDpopProof(options)).rejects.toThrow(
        'DPoP htu must be https (or localhost for dev)'
      );
    });

    it('should throw error for invalid key type', async () => {
      const invalidJwk = { ...operatorPrivateJwk, kty: 'RSA' };
      const options: CreateDpopOptions = {
        operatorPrivateJwk: invalidJwk,
        htm: 'GET',
        htu: 'https://api.example.com/resource',
        jti: ulid(),
      };

      await expect(createDpopProof(options)).rejects.toThrow(
        'operatorPrivateJwk must be EC P-256 (ES256)'
      );
    });

    it('should include nonce when provided', async () => {
      const options: CreateDpopOptions = {
        operatorPrivateJwk,
        htm: 'GET',
        htu: 'https://api.example.com/resource',
        jti: ulid(),
        nonce: 'server-provided-nonce',
      };

      const dpopProof = await createDpopProof(options);
      expect(dpopProof).toBeDefined();
    });
  });

  describe('verifyLicenseAndDpop', () => {
    let mockReplayGuard: ReplayGuard;
    let validLicenseJwt: string;
    let validDpopJwt: string;
    let operatorJkt: string;

    beforeEach(async () => {
      mockReplayGuard = {
        seen: vi.fn().mockResolvedValue(false), // Default: no replays detected
      };

      // Calculate operator JKT for token binding
      operatorJkt = await calculateJwkThumbprint(
        {
          kty: operatorPublicJwk.kty,
          crv: operatorPublicJwk.crv,
          x: operatorPublicJwk.x,
          y: operatorPublicJwk.y,
        },
        'sha256'
      );

      // Create valid license JWT
      const now = Math.floor(Date.now() / 1000);
      const licensePayload: LicensePayload = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:test',
        aud: 'publisher:test',
        jti: ulid(),
        iat: now,
        exp: now + 3600,
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: ['read'] as IntentType[],
        budget_cents: 100,
        metadata: {},
        cnf: { jkt: operatorJkt },
      };

      validLicenseJwt = await createLicenseJwt({
        publisherPrivateJwk,
        kid: publisherPrivateJwk.kid!,
        claims: licensePayload,
      });

      // Create valid DPoP proof
      validDpopJwt = await createDpopProof({
        operatorPrivateJwk,
        htm: 'GET',
        htu: 'https://api.example.com/resource',
        jti: ulid(),
      });
    });

    it('should successfully verify valid license and DPoP', async () => {
      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      const result = await verifyLicenseAndDpop(options);

      expect(result).toBeDefined();
      expect(result.claims).toBeDefined();
      expect(result.operatorPublicJwk).toBeDefined();
      expect(result.operatorJkt).toBe(operatorJkt);
      expect(result.alg).toBe('ES256');
    });

    it('should successfully verify with RegExp issuer', async () => {
      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: /^https:\/\/api\.fetchright\.ai$/,
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      const result = await verifyLicenseAndDpop(options);
      expect(result).toBeDefined();
    });

    it('should successfully verify with RegExp audience', async () => {
      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: /^publisher:/,
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      const result = await verifyLicenseAndDpop(options);
      expect(result).toBeDefined();
    });

    it('should throw error when replay is detected for license', async () => {
      const replayGuard: ReplayGuard = {
        seen: vi.fn().mockImplementation((kind: string) => Promise.resolve(kind === 'license')),
      };

      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: replayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow('License jti replay detected');
    });

    it('should throw error when replay is detected for DPoP', async () => {
      const replayGuard: ReplayGuard = {
        seen: vi.fn().mockImplementation((kind: string) => Promise.resolve(kind === 'dpop')),
      };

      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: replayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow('DPoP jti replay detected');
    });

    it('should throw error for missing kid in license', async () => {
      const options: VerifyOptions = {
        licenseJwt: 'eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJ0ZXN0In0.invalid', // No kid
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'test',
        expectedAudience: 'test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow(
        "License missing 'kid' in protected header"
      );
    });

    it('should throw error for unknown kid', async () => {
      // Create a license with a different kid
      const unknownKeyJwt = await createLicenseJwt({
        publisherPrivateJwk: { ...publisherPrivateJwk, kid: 'unknown-key' },
        kid: 'unknown-key',
        claims: {
          iss: 'https://api.fetchright.ai',
          sub: 'operator:test',
          aud: 'publisher:test',
          jti: ulid(),
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          pricing_scheme_id: 'scheme-123',
          pricing_scheme_type: 'default',
          intents: ['read'] as IntentType[],
          budget_cents: 100,
          metadata: {},
          cnf: { jkt: operatorJkt },
        },
      });

      const options: VerifyOptions = {
        licenseJwt: unknownKeyJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow(
        'Unknown license kid: unknown-key'
      );
    });

    it('should throw error for invalid RegExp issuer', async () => {
      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: /^https:\/\/invalid\.com$/,
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow('Invalid issuer');
    });

    it('should throw error for invalid RegExp audience', async () => {
      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: /^invalid:/,
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow('Invalid audience');
    });

    it('should throw error for invalid DPoP typ', async () => {
      // We need to manually create an invalid DPoP with wrong typ
      // This is a simplified invalid JWT for testing
      const invalidJwt = 'eyJhbGciOiJFUzI1NiIsInR5cCI6ImpXVCJ9.eyJ0ZXN0IjoiaW52YWxpZCJ9.invalid';

      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: invalidJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow();
    });

    it('should throw error for stale DPoP proof', async () => {
      // Create an old DPoP proof
      const oldDpopJwt = await createDpopProof({
        operatorPrivateJwk,
        htm: 'GET',
        htu: 'https://api.example.com/resource',
        jti: ulid(),
        iat: Math.floor(Date.now() / 1000) - 200, // 200 seconds ago (too old)
      });

      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: oldDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
        maxDpopAgeSec: 120,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow('Stale DPoP proof');
    });

    it('should throw error for DPoP HTM mismatch', async () => {
      const mismatchDpopJwt = await createDpopProof({
        operatorPrivateJwk,
        htm: 'POST', // Different method
        htu: 'https://api.example.com/resource',
        jti: ulid(),
      });

      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: mismatchDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET', // Different from DPoP
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow('DPoP htm mismatch');
    });

    it('should throw error for DPoP HTU mismatch', async () => {
      const mismatchDpopJwt = await createDpopProof({
        operatorPrivateJwk,
        htm: 'GET',
        htu: 'https://api.different.com/resource', // Different URL
        jti: ulid(),
      });

      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: mismatchDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource', // Different from DPoP
        replay: mockReplayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow('DPoP htu mismatch');
    });

    it('should throw error for token binding mismatch', async () => {
      // Create license with wrong cnf.jkt
      const wrongLicenseJwt = await createLicenseJwt({
        publisherPrivateJwk,
        kid: publisherPrivateJwk.kid!,
        claims: {
          iss: 'https://api.fetchright.ai',
          sub: 'operator:test',
          aud: 'publisher:test',
          jti: ulid(),
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          pricing_scheme_id: 'scheme-123',
          pricing_scheme_type: 'default',
          intents: ['read'] as IntentType[],
          budget_cents: 100,
          metadata: {},
          cnf: { jkt: 'wrong-thumbprint' }, // Wrong JKT
        },
      });

      const options: VerifyOptions = {
        licenseJwt: wrongLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow('Token binding mismatch');
    });
  });

  describe('helper functions', () => {
    it('should handle URL normalization correctly', async () => {
      // Test URL normalization indirectly through DPoP creation
      const testUrls = [
        'https://example.com/path',
        'http://localhost:3000/path',
        'https://api.example.com/path?query=value',
      ];

      for (const url of testUrls) {
        const dpopProof = await createDpopProof({
          operatorPrivateJwk,
          htm: 'GET',
          htu: url,
          jti: ulid(),
        });
        expect(dpopProof).toBeDefined();
      }
    });
  });

  // Additional tests for coverage improvement
  describe('createLicenseJwt - additional error cases', () => {
    it('should throw error for missing jti', async () => {
      const claims = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:test',
        aud: 'publisher:test',
        // Missing jti
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: ['read'] as IntentType[],
        budget_cents: 100,
        metadata: {},
        cnf: { jkt: 'test-thumbprint' },
      } as unknown as LicensePayload;

      await expect(
        createLicenseJwt({
          publisherPrivateJwk,
          kid: 'test',
          claims,
        })
      ).rejects.toThrow('claims.jti is required');
    });

    it('should throw error for wrong curve', async () => {
      const wrongCurveJwk = { ...publisherPrivateJwk, crv: 'P-384' };
      const claims: LicensePayload = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:test',
        aud: 'publisher:test',
        jti: ulid(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: ['read'] as IntentType[],
        budget_cents: 100,
        metadata: {},
        cnf: { jkt: 'test-thumbprint' },
      };

      await expect(
        createLicenseJwt({
          publisherPrivateJwk: wrongCurveJwk,
          kid: 'test',
          claims,
        })
      ).rejects.toThrow('publisherPrivateJwk must be EC P-256 (ES256)');
    });

    it('should throw error for zero budget', async () => {
      const claims: LicensePayload = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:test',
        aud: 'publisher:test',
        jti: ulid(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: ['read'] as IntentType[],
        budget_cents: 0, // Zero budget
        metadata: {},
        cnf: { jkt: 'test-thumbprint' },
      };

      await expect(
        createLicenseJwt({
          publisherPrivateJwk,
          kid: 'test',
          claims,
        })
      ).rejects.toThrow('claims.budget_cents must be a positive number');
    });

    it('should handle nbf claim when provided', async () => {
      const now = Math.floor(Date.now() / 1000);
      const claims: LicensePayload = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:test',
        aud: 'publisher:test',
        jti: ulid(),
        iat: now,
        exp: now + 3600,
        nbf: now + 60, // Not before 1 minute from now
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: ['read'] as IntentType[],
        budget_cents: 100,
        metadata: {},
        cnf: { jkt: 'test-thumbprint' },
      };

      const jwt = await createLicenseJwt({ publisherPrivateJwk, kid: 'test', claims });
      expect(jwt).toBeDefined();
    });
  });

  describe('createDpopProof - additional error cases', () => {
    it('should throw error for wrong curve', async () => {
      const wrongCurveJwk = { ...operatorPrivateJwk, crv: 'P-384' };
      const options: CreateDpopOptions = {
        operatorPrivateJwk: wrongCurveJwk,
        htm: 'GET',
        htu: 'https://api.example.com/resource',
        jti: ulid(),
      };

      await expect(createDpopProof(options)).rejects.toThrow(
        'operatorPrivateJwk must be EC P-256 (ES256)'
      );
    });

    it('should handle custom iat when provided', async () => {
      const customIat = Math.floor(Date.now() / 1000) - 30;
      const options: CreateDpopOptions = {
        operatorPrivateJwk,
        htm: 'GET',
        htu: 'https://api.example.com/resource',
        jti: ulid(),
        iat: customIat,
      };

      const dpopProof = await createDpopProof(options);
      expect(dpopProof).toBeDefined();
    });
  });

  describe('verifyLicenseAndDpop - additional error cases', () => {
    let validLicenseJwt: string;
    let validDpopJwt: string;
    let operatorJkt: string;
    let mockReplayGuard: ReplayGuard;

    beforeEach(async () => {
      mockReplayGuard = {
        seen: vi.fn().mockResolvedValue(false),
      };

      operatorJkt = await calculateJwkThumbprint(
        {
          kty: operatorPublicJwk.kty,
          crv: operatorPublicJwk.crv,
          x: operatorPublicJwk.x,
          y: operatorPublicJwk.y,
        },
        'sha256'
      );

      const now = Math.floor(Date.now() / 1000);
      const licensePayload: LicensePayload = {
        iss: 'https://api.fetchright.ai',
        sub: 'operator:test',
        aud: 'publisher:test',
        jti: ulid(),
        iat: now,
        exp: now + 3600,
        pricing_scheme_id: 'scheme-123',
        pricing_scheme_type: 'default',
        intents: ['read'] as IntentType[],
        budget_cents: 100,
        metadata: {},
        cnf: { jkt: operatorJkt },
      };

      validLicenseJwt = await createLicenseJwt({
        publisherPrivateJwk,
        kid: publisherPrivateJwk.kid!,
        claims: licensePayload,
      });

      validDpopJwt = await createDpopProof({
        operatorPrivateJwk,
        htm: 'GET',
        htu: 'https://api.example.com/resource',
        jti: ulid(),
      });
    });

    it('should throw error for invalid license payload', async () => {
      // Create a malformed license JWT manually
      const invalidLicenseJwt =
        'eyJhbGciOiJFUzI1NiIsImtpZCI6InRlc3QifQ.eyJpbnZhbGlkIjoidGVzdCJ9.invalid';

      const options: VerifyOptions = {
        licenseJwt: invalidLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      await expect(verifyLicenseAndDpop(options)).rejects.toThrow();
    });

    it('should handle custom clockSkewSec and maxDpopAgeSec', async () => {
      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
        clockSkewSec: 30,
        maxDpopAgeSec: 60,
      };

      const result = await verifyLicenseAndDpop(options);
      expect(result).toBeDefined();
    });

    it('should verify DPoP with HTTPS URL correctly', async () => {
      // Just verify that the verification process works with HTTPS URLs
      const options: VerifyOptions = {
        licenseJwt: validLicenseJwt,
        dpopJwt: validDpopJwt,
        publisherJwks: { keys: [publisherPublicJwk] },
        expectedIssuer: 'https://api.fetchright.ai',
        expectedAudience: 'publisher:test',
        method: 'GET',
        url: 'https://api.example.com/resource',
        replay: mockReplayGuard,
      };

      const result = await verifyLicenseAndDpop(options);
      expect(result).toBeDefined();
    });
  });
});
