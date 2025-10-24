/**
 * Pricing Schema Loader - AI Usage Pricing Validation
 *
 * This module provides TypeScript utilities for loading and validating PeekThenPay pricing schemes.
 *
 * ## Purpose
 * The pricing.schema.json defines the structure of pricing configuration files that specify
 * how much AI agents should pay for different types of content usage. It includes:
 *
 * - Intent-based pricing (analyze, embed, quote, read, summarize, translate, etc.)
 * - Usage context pricing (commercial vs non-commercial, attribution requirements)
 * - Enforcement methods and access controls
 * - Pricing tiers and volume discounts
 * - Billing and payment processing integration
 *
 * ## Usage Context
 * - **Publishers**: Create pricing schemes that define AI usage costs
 * - **AI Agents**: Parse pricing to make informed access decisions
 * - **Billing Systems**: Process payments based on validated pricing schemes
 * - **Tools**: Validate user-created pricing configurations
 *
 * ## Business Model Integration
 * peek.json manifest → references pricing scheme → this schema validates → AI agent pays → content access
 *
 * @example
 * ```typescript
 * import { getPricingSchema } from './pricing-schema.js';
 *
 * // Load pricing schema for validation
 * const schema = await getPricingSchema();
 *
 * // Validate a pricing scheme
 * const ajv = new Ajv();
 * const validate = ajv.compile(schema);
 * const isValid = validate(pricingSchemeData);
 * ```
 */

import type { SchemaObject } from 'ajv';

/**
 * JSON Schema Draft 2020-12 type - using AJV's native SchemaObject type
 * which is designed for JSON Schema Draft 2020-12 compliance.
 *
 * @see https://json-schema.org/draft/2020-12/schema
 */
export type JSONSchema202012 = SchemaObject;
import { pricingSchema } from './static-schema-imports.js';

/**
 * Custom error class for pricing schema-related errors
 */
export class PricingSchemaError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PricingSchemaError';
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * Loads the pricing schema (now synchronous since schemas are statically imported)
 *
 * This function returns the JSON Schema that defines the structure of pricing
 * configuration files used in the PeekThenPay billing system.
 *
 * Note: This function is now synchronous for edge compatibility, but maintains
 * the async interface for backward compatibility.
 *
 * @returns Promise resolving to the pricing JSONSchema202012 object
 * @throws {PricingSchemaError} if the schema cannot be accessed
 *
 * @example
 * ```typescript
 * import { getPricingSchema } from './utils/pricing-schema.js';
 * import Ajv from 'ajv';
 *
 * const schema = await getPricingSchema();
 * const ajv = new Ajv();
 * const validate = ajv.compile(schema);
 *
 * // Validate a pricing scheme
 * const isValid = validate(pricingData);
 * if (!isValid) {
 *   console.error('Pricing validation errors:', validate.errors);
 * }
 * ```
 */
export async function getPricingSchema(): Promise<JSONSchema202012> {
  try {
    return pricingSchema as JSONSchema202012;
  } catch (error) {
    throw new PricingSchemaError(
      'Failed to load pricing schema',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Synchronous access to the pricing schema
 *
 * Since pricing schema is statically imported, this function is always available.
 *
 * @returns The pricing JSONSchema202012 object
 * @throws {PricingSchemaError} if the schema cannot be accessed
 *
 * @example
 * ```typescript
 * const schema = getPricingSchemaSync();
 * ```
 */
export function getPricingSchemaSync(): JSONSchema202012 {
  try {
    return pricingSchema as JSONSchema202012;
  } catch (error) {
    throw new PricingSchemaError(
      'Failed to access pricing schema',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Type alias for the pricing schema
 * Represents the JSONSchema202012 structure that validates pricing configuration files
 */
export { type JSONSchema202012 as PricingSchema };

/**
 * Default export for convenient importing
 */
export default getPricingSchema;
