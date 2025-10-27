#!/usr/bin/env node

/**
 * Generate pre-compiled AJV validators with full format support
 * This creates standalone validators with URI, date, and other format validation
 */

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standalone from 'ajv/dist/standalone/index.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

// Ensure validators directory exists
mkdirSync('src/validators', { recursive: true });

console.log('Generating pre-compiled AJV validators with format support...\n');

/**
 * Generate a standalone validator with formats
 */
function generateValidator(schemaPath, outputPath, referencePaths = []) {
  try {
    console.log(`Generating ${outputPath}...`);

    // Create AJV instance with formats
    const ajv = new Ajv2020({
      allErrors: true,
      strict: false,
      validateFormats: true,
      code: { source: true },
    });

    // Add format validators (URI, date, email, etc.)
    addFormats(ajv);

    // Load referenced schemas first
    const refs = {};
    for (const refPath of referencePaths) {
      const refSchema = JSON.parse(readFileSync(refPath, 'utf8'));
      const refId = refSchema.$id || refPath.split('/').pop();
      refs[refId] = refSchema;
      ajv.addSchema(refSchema, refId);
    }

    // Load main schema
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

    // Compile the validator
    const validate = ajv.compile(schema);

    // Generate standalone code
    const moduleCode = standalone(ajv, validate);

    // Convert CommonJS to ESM format
    let esmCode = moduleCode
      .replace(/^"use strict";/, '') // Remove strict mode
      .replace(/module\.exports = ([^;]+);module\.exports\.default = \1;/, 'export default $1;'); // Convert exports

    // Collect all ajv-formats imports needed
    const formatImports = new Set();

    // Find all format requirements
    const formatMatches = [
      ...esmCode.matchAll(
        /const \w+ = require\("ajv-formats\/dist\/formats"\)\.fullFormats\.(\w+);/g
      ),
      ...esmCode.matchAll(
        /const \w+ = require\("ajv-formats\/dist\/formats"\)\.fullFormats\["([^"]+)"\];/g
      ),
    ];

    // Replace individual requires with const declarations
    esmCode = esmCode.replace(
      /const (\w+) = require\("ajv-formats\/dist\/formats"\)\.fullFormats\.(\w+);/g,
      (match, varName, formatName) => {
        formatImports.add(formatName);
        return `const ${varName} = fullFormats.${formatName};`;
      }
    );

    esmCode = esmCode.replace(
      /const (\w+) = require\("ajv-formats\/dist\/formats"\)\.fullFormats\["([^"]+)"\];/g,
      (match, varName, formatName) => {
        formatImports.add(formatName);
        return `const ${varName} = fullFormats["${formatName}"];`;
      }
    );

    // Add single import at the top if any formats were used
    if (formatImports.size > 0) {
      esmCode = 'import { fullFormats } from "ajv-formats/dist/formats.js";\n' + esmCode;
    }

    // Write to file
    writeFileSync(outputPath, esmCode);

    console.log(`✅ Generated ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to generate ${outputPath}:`);
    console.error(error.message);
    return false;
  }
}

// Generate main schema validators (no references)
const mainSchemas = [
  {
    schema: 'schema/peek.schema.json',
    output: 'src/validators/peek-validator.js',
  },
  {
    schema: 'schema/pricing.schema.json',
    output: 'src/validators/pricing-validator.js',
  },
];

for (const config of mainSchemas) {
  generateValidator(config.schema, config.output);
}

// Generate intent schema validators (with common-defs references)
const intentSchemas = [
  'ptp-analyze',
  'ptp-embed',
  'ptp-peek',
  'ptp-qa',
  'ptp-quote',
  'ptp-read',
  'ptp-search',
  'ptp-summarize',
  'ptp-translate',
];

const commonDefsPath = 'schema/intents/common-defs.schema.json';

for (const intentName of intentSchemas) {
  const schemaPath = `schema/intents/${intentName}.schema.json`;
  const outputPath = `src/validators/${intentName}-validator.js`;

  generateValidator(schemaPath, outputPath, [commonDefsPath]);
}

// Generate forensic manifest validator
generateValidator(
  'schema/forensic-manifest.schema.json',
  'src/validators/forensic-manifest-validator.js',
  [commonDefsPath]
);

console.log('\n✨ Validator generation complete with full format support!');
