// license-jwt.ts
// Env-agnostic (Node + Cloudflare Workers) utilities for assertion-only licenses + DPoP
// Requires: npm i jose
//
// Works with jose v6.x without Node/DOM-specific key types.

import {
  SignJWT,
  jwtVerify,
  compactVerify,
  importJWK,
  calculateJwkThumbprint,
  decodeProtectedHeader,
  type JWTPayload,
  type JWK,
  type JWTVerifyOptions,
} from 'jose';
import { LicensePayload, ULID } from '../index.js';

type LicenseClaimsInput = LicensePayload; // keep tight typing

export interface CreateLicenseOptions {
  // ES256 private JWK (publisher’s signing key) with d + x + y + crv=P-256
  publisherPrivateJwk: JWK & { alg?: 'ES256'; kid?: string };
  kid: string;
  claims: LicenseClaimsInput; // must include iss + exp, and cnf.jkt
}

/** Create a short-lived license JWT (ES256), bound to operator key via cnf.jkt. */
export async function createLicenseJwt(opts: CreateLicenseOptions): Promise<string> {
  const { publisherPrivateJwk, kid, claims } = opts;

  if (publisherPrivateJwk.kty !== 'EC' || publisherPrivateJwk.crv !== 'P-256') {
    throw new Error('publisherPrivateJwk must be EC P-256 (ES256).');
  }
  if (!claims?.cnf?.jkt) {
    throw new Error('claims.cnf.jkt (operator JWK thumbprint) is required.');
  }
  if (!claims.jti) throw new Error('claims.jti is required.');
  if (!Array.isArray(claims.permissions) || claims.permissions.length === 0) {
    throw new Error('claims.permissions must be a non-empty array.');
  }
  if (typeof claims.budget_cents !== 'number' || claims.budget_cents <= 0) {
    throw new Error('claims.budget_cents must be a positive number.');
  }

  const key = await importJWK({ ...publisherPrivateJwk, alg: 'ES256', kid }, 'ES256');
  const now = Math.floor(Date.now() / 1000);
  const notBefore = typeof claims.nbf === 'number' ? claims.nbf : now;

  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'ES256', kid })
    .setIssuer(claims.iss)
    .setIssuedAt(now)
    .setNotBefore(notBefore - 30) // small skew tolerance
    .setExpirationTime(claims.exp)
    .sign(key);
}

// --------------------------- DPoP creation ---------------------------

export interface CreateDpopOptions {
  operatorPrivateJwk: JWK & { alg?: 'ES256'; kid?: string }; // EC P-256 keypair
  htm: string; // HTTP method (GET/POST/...)
  htu: string; // Absolute URL
  jti: ULID; // proof id
  iat?: number; // default now
  nonce?: string; // optional server-provided nonce
}

/** Create a DPoP proof (compact JWS) with header { typ:"dpop+jwt", jwk: <public> }. */
export async function createDpopProof(opts: CreateDpopOptions): Promise<string> {
  const { operatorPrivateJwk, htm, htu, jti, nonce } = opts;
  const iat = opts.iat ?? Math.floor(Date.now() / 1000);

  if (operatorPrivateJwk.kty !== 'EC' || operatorPrivateJwk.crv !== 'P-256') {
    throw new Error('operatorPrivateJwk must be EC P-256 (ES256).');
  }
  // Enforce TLS (except localhost dev)
  if (!/^https:|^http:\/\/localhost/.test(htu)) {
    throw new Error('DPoP htu must be https (or localhost for dev).');
  }

  const key = await importJWK({ ...operatorPrivateJwk, alg: 'ES256' }, 'ES256');

  const pubJwk: JWK = {
    kty: operatorPrivateJwk.kty,
    crv: operatorPrivateJwk.crv,
    x: operatorPrivateJwk.x,
    y: operatorPrivateJwk.y,
    kid: operatorPrivateJwk.kid,
  };

  const payload: Record<string, unknown> = {
    htm: htm.toUpperCase(),
    htu: normalizeHtu(htu),
    iat,
    jti,
    ...(nonce ? { nonce } : null),
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk: pubJwk })
    .sign(key);
}

// --------------------------- Verification ---------------------------

export interface ReplayGuard {
  /** Return true if jti has already been seen (replay). Implement with DO/Redis/etc. */
  seen: (kind: 'license' | 'dpop', jti: string, expSeconds: number) => Promise<boolean>;
}

export interface VerifyOptions {
  licenseJwt: string;
  dpopJwt: string;
  publisherJwks: { keys: JWK[] }; // public JWKS from publisher
  expectedIssuer: string | RegExp;
  expectedAudience: string | RegExp;
  method: string;
  url: string;
  replay: ReplayGuard;
  clockSkewSec?: number; // default 60
  maxDpopAgeSec?: number; // default 120
}

export interface VerifiedResult {
  claims: LicensePayload;
  operatorPublicJwk: JWK;
  operatorJkt: string; // base64url thumbprint
  alg: string; // license alg (e.g., ES256)
}

/** Verify license JWT (with publisher JWK) + DPoP (compact JWS), and bind via cnf.jkt. */
export async function verifyLicenseAndDpop(opts: VerifyOptions): Promise<VerifiedResult> {
  const {
    licenseJwt,
    dpopJwt,
    publisherJwks,
    expectedIssuer,
    expectedAudience,
    method,
    url,
    replay,
  } = opts;

  const clockSkewSec = opts.clockSkewSec ?? 60;
  const maxDpopAgeSec = opts.maxDpopAgeSec ?? 120;

  // --- Verify LICENSE JWT using the matching JWK by kid (no CryptoKey/KeyObject types needed)
  const { kid: licenseKid, alg: licAlg } = decodeProtectedHeader(licenseJwt);
  if (!licenseKid) throw new Error("License missing 'kid' in protected header.");

  const jwk = publisherJwks.keys.find((k) => k.kid === licenseKid);
  if (!jwk) throw new Error(`Unknown license kid: ${licenseKid}`);

  const verifyKey = await importJWK(jwk, 'ES256');

  // Use the first overload which accepts a CryptoKey directly
  const verifyOptions: JWTVerifyOptions = {
    algorithms: ['ES256'],
    clockTolerance: clockSkewSec,
  };

  // Only add issuer/audience if they are strings, not RegExp
  if (typeof expectedIssuer === 'string') {
    verifyOptions.issuer = expectedIssuer;
  }
  if (typeof expectedAudience === 'string') {
    verifyOptions.audience = expectedAudience;
  }

  const { payload, protectedHeader } = await jwtVerify(licenseJwt, verifyKey, verifyOptions);

  assertLicenseClaims(payload);
  const claims = payload as LicensePayload;

  // Manual validation for RegExp cases
  if (expectedIssuer instanceof RegExp && !expectedIssuer.test(claims.iss)) {
    throw new Error(`Invalid issuer: ${claims.iss}`);
  }
  if (expectedAudience instanceof RegExp && !expectedAudience.test(claims.aud)) {
    throw new Error(`Invalid audience: ${claims.aud}`);
  }

  // LICENSE replay guard
  const licExp = claims.exp ?? Math.floor(Date.now() / 1000) + 3600;
  if (await replay.seen('license', claims.jti, licExp)) {
    throw new Error('License jti replay detected.');
  }

  // --- Verify DPoP compact JWS
  const dpopHeader = decodeProtectedHeader(dpopJwt);
  if (dpopHeader.typ !== 'dpop+jwt') throw new Error(`Invalid DPoP typ: ${dpopHeader.typ}`);
  if (dpopHeader.alg !== 'ES256') throw new Error(`Unsupported DPoP alg: ${dpopHeader.alg}`);
  if (!dpopHeader.jwk) throw new Error("DPoP header missing 'jwk'.");

  const operatorPublicJwk = dpopHeader.jwk as JWK;
  if (operatorPublicJwk.kty !== 'EC' || operatorPublicJwk.crv !== 'P-256') {
    throw new Error('DPoP jwk must be EC P-256 public key.');
  }

  const opKey = await importJWK(operatorPublicJwk, 'ES256');
  const verified = await compactVerify(dpopJwt, opKey); // verifies signature only

  // Decode payload (compactVerify returns Uint8Array)
  const dpopPayload = JSON.parse(utf8(verified.payload));

  const now = Math.floor(Date.now() / 1000);
  const dIat = numberOrThrow(dpopPayload.iat, 'DPoP iat');
  const dJti = stringOrThrow(dpopPayload.jti, 'DPoP jti');
  const dHtm = stringOrThrow(dpopPayload.htm, 'DPoP htm').toUpperCase();
  const dHtu = normalizeHtu(stringOrThrow(dpopPayload.htu, 'DPoP htu'));

  if (Math.abs(now - dIat) > maxDpopAgeSec + clockSkewSec) throw new Error('Stale DPoP proof.');
  if (dHtm !== method.toUpperCase()) throw new Error(`DPoP htm mismatch (got ${dHtm}).`);
  if (dHtu !== normalizeHtu(url)) throw new Error(`DPoP htu mismatch (got ${dHtu}).`);
  if (!/^https:|^http:\/\/localhost/.test(dHtu))
    throw new Error('DPoP htu must be https (or localhost dev).');

  // DPoP replay guard
  const dExp = dIat + maxDpopAgeSec + clockSkewSec;
  if (await replay.seen('dpop', dJti, dExp)) throw new Error('DPoP jti replay detected.');

  // --- Token binding: cnf.jkt must equal thumbprint(DPoP.header.jwk)
  const jkt = await calculateJwkThumbprint(operatorPublicJwk, 'sha256');
  if (claims.cnf.jkt !== jkt)
    throw new Error('Token binding mismatch (cnf.jkt != thumbprint(DPoP.jwk)).');

  return {
    claims,
    operatorPublicJwk,
    operatorJkt: jkt,
    alg: (protectedHeader.alg || licAlg || 'ES256') as string,
  };
}

// ---------------------------- Helpers --------------------------------

function assertLicenseClaims(p: JWTPayload): asserts p is LicensePayload {
  if (!p || typeof p !== 'object') throw new Error('Invalid license payload.');
  const o = p as Record<string, unknown>;
  if (typeof o.sub !== 'string') throw new Error('License missing sub.');
  if (typeof o.aud !== 'string') throw new Error('License missing aud.');
  if (typeof o.iss !== 'string') throw new Error('License missing iss.');
  if (typeof o.jti !== 'string') throw new Error('License missing jti.');
  if (typeof o.exp !== 'number') throw new Error('License missing exp.');
  if (!o.cnf || typeof (o.cnf as Record<string, unknown>)?.jkt !== 'string')
    throw new Error('License missing cnf.jkt.');
  if (!Array.isArray(o.permissions) || o.permissions.length === 0)
    throw new Error('License missing permissions.');
  if (typeof o.budget_cents !== 'number' || o.budget_cents <= 0)
    throw new Error('License budget invalid.');
}

function normalizeHtu(inputUrl: string): string {
  // Use globalThis.URL for cross-environment compatibility
  const u = new globalThis.URL(inputUrl);
  const scheme = u.protocol.toLowerCase(); // includes ':'
  const host = u.hostname.toLowerCase();
  const isDefaultPort =
    (u.protocol === 'https:' && (u.port === '' || u.port === '443')) ||
    (u.protocol === 'http:' && (u.port === '' || u.port === '80'));
  const portPart = isDefaultPort ? '' : `:${u.port}`;
  return `${scheme}//${host}${portPart}${u.pathname}${u.search}`;
}

function utf8(bytes: Uint8Array): string {
  // Check for TextDecoder (available in both modern Node.js and Cloudflare Workers)
  if (typeof globalThis.TextDecoder !== 'undefined') {
    return new globalThis.TextDecoder().decode(bytes);
  }
  // Node fallback for older runtimes - use type assertion for cross-environment compatibility
  const nodeBuffer = (globalThis as Record<string, unknown>).Buffer;
  if (
    typeof nodeBuffer !== 'undefined' &&
    typeof (nodeBuffer as Record<string, unknown>).from === 'function'
  ) {
    type NodeBufferConstructor = {
      from(input: Uint8Array): { toString(encoding: string): string };
    };
    return (nodeBuffer as NodeBufferConstructor).from(bytes).toString('utf8');
  }
  // Final fallback - manual UTF-8 decoding (basic implementation)
  throw new Error('No UTF-8 decoder available in this environment');
}

function numberOrThrow(x: unknown, name: string): number {
  if (typeof x !== 'number') throw new Error(`${name} must be a number`);
  return x;
}
function stringOrThrow(x: unknown, name: string): string {
  if (typeof x !== 'string' || x.length === 0)
    throw new Error(`${name} must be a non-empty string`);
  return x;
}
