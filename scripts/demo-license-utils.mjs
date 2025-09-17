#!/usr/bin/env node

// Simple script to verify license-utils functionality
import { createLicenseJwt, createDpopProof } from '../dist/utils/license-utils.js';
import { ulid } from 'ulid';
import { generateKeyPair, exportJWK } from 'jose';

async function demo() {
  console.log('🔐 License Utils Demo');
  
  // Generate test keys
  console.log('📝 Generating test key pairs...');
  const publisherKeyPair = await generateKeyPair('ES256', { extractable: true });
  const operatorKeyPair = await generateKeyPair('ES256', { extractable: true });
  
  const publisherPrivateJwk = await exportJWK(publisherKeyPair.privateKey);
  const operatorPrivateJwk = await exportJWK(operatorKeyPair.privateKey);
  
  publisherPrivateJwk.kid = 'demo-publisher-key';
  operatorPrivateJwk.kid = 'demo-operator-key';
  
  // Create license JWT
  console.log('📄 Creating license JWT...');
  const licenseJwt = await createLicenseJwt({
    publisherPrivateJwk,
    kid: 'demo-publisher-key',
    claims: {
      iss: 'https://api.fetchright.ai',
      sub: 'operator:demo',
      aud: 'publisher:demo',
      jti: ulid(),
      exp: Math.floor(Date.now() / 1000) + 3600,
      publisher_id: ulid(),
      pricing_scheme_id: 'demo-scheme',
      intents: ['read', 'summarize'],
      budget_cents: 100,
      cnf: { jkt: 'demo-thumbprint' },
    },
  });
  
  // Create DPoP proof
  console.log('🔒 Creating DPoP proof...');
  const dpopProof = await createDpopProof({
    operatorPrivateJwk,
    htm: 'GET',
    htu: 'https://api.example.com/resource',
    jti: ulid(),
  });
  
  console.log('✅ Successfully created:');
  console.log(`   License JWT: ${licenseJwt.substring(0, 50)}...`);
  console.log(`   DPoP Proof:  ${dpopProof.substring(0, 50)}...`);
  console.log('🎉 All license utilities working correctly!');
}

demo().catch(console.error);