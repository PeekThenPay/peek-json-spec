/**
 * Individual Static Schema Imports (Tree-Shakable)
 *
 * Import only the schemas you need for minimal bundle size.
 * Bundlers can tree-shake unused schemas from the final bundle.
 *
 * @example
 * ```typescript
 * // Only imports the peek schema (not all 13 schemas)
 * import { peekSchema } from './static-schema-imports.js';
 *
 * // Use directly without async loading
 * const validator = ajv.compile(peekSchema);
 * ```
 */

import type { SchemaObject } from 'ajv';

// Individual schema imports - tree-shakable!
export { default as peekSchema } from '../../schema/peek.schema.json' with { type: 'json' };
export { default as pricingSchema } from '../../schema/pricing.schema.json' with { type: 'json' };
export { default as forensicManifestSchema } from '../../schema/forensic-manifest.schema.json' with { type: 'json' };

// Intent schemas
export { default as commonDefsSchema } from '../../schema/intents/common-defs.schema.json' with { type: 'json' };
export { default as ptpAnalyzeSchema } from '../../schema/intents/ptp-analyze.schema.json' with { type: 'json' };
export { default as ptpEmbedSchema } from '../../schema/intents/ptp-embed.schema.json' with { type: 'json' };
export { default as ptpPeekSchema } from '../../schema/intents/ptp-peek.schema.json' with { type: 'json' };
export { default as ptpQaSchema } from '../../schema/intents/ptp-qa.schema.json' with { type: 'json' };
export { default as ptpQuoteSchema } from '../../schema/intents/ptp-quote.schema.json' with { type: 'json' };
export { default as ptpReadSchema } from '../../schema/intents/ptp-read.schema.json' with { type: 'json' };
export { default as ptpSearchSchema } from '../../schema/intents/ptp-search.schema.json' with { type: 'json' };
export { default as ptpSummarizeSchema } from '../../schema/intents/ptp-summarize.schema.json' with { type: 'json' };
export { default as ptpTranslateSchema } from '../../schema/intents/ptp-translate.schema.json' with { type: 'json' };

/**
 * Type for all available schemas
 */
export type JSONSchema = SchemaObject;
