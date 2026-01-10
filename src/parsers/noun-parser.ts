/**
 * Noun Parser Module
 *
 * Parses noun field definitions from the SaaS DSL syntax into structured types.
 * Handles both simple field types and relationship operators.
 *
 * @module parsers/noun-parser
 */

import type { RelationRecord, ParsedRelation } from './relationship-parser'
import { parseRelationshipOperator } from './relationship-parser'

/**
 * Parsed field type information for non-relation fields.
 *
 * @example
 * ```ts
 * // Input: 'string' -> { type: 'string', optional: false }
 * // Input: 'markdown?' -> { type: 'markdown', optional: true }
 * ```
 */
export interface ParsedFieldType {
  /** The base field type (string, number, boolean, markdown, etc.) */
  type: string
  /** Whether the field is optional (marked with ?) */
  optional: boolean
}

/**
 * Result of parsing a field definition - either a simple type or a relation.
 */
export type FieldDefinition = ParsedFieldType | ParsedRelation

/**
 * Schema of a noun after parsing all its field definitions.
 * Maps field names to their parsed definitions.
 */
export type NounSchema = Record<string, FieldDefinition>

/**
 * Raw noun definitions from the DSL before parsing.
 * Field values can be simple strings ('string', 'number?') or arrays for many relations (['->Product']).
 */
export type RawNounDefinitions = Record<string, Record<string, string | string[]>>

/**
 * Parsed noun definitions after processing all fields.
 */
export type ParsedNounDefinitions = Record<string, NounSchema>

/**
 * Parse a single field definition string into a structured type.
 *
 * Handles three cases:
 * 1. Simple types: 'string', 'number', 'boolean', 'markdown'
 * 2. Optional types: 'string?', 'markdown?'
 * 3. Relation operators: '->Customer', '<-Order', '~>Product', '<~Category'
 *
 * @param fieldType - The field type string or array (for many relations)
 * @param nounName - The noun this field belongs to (for relation tracking)
 * @param fieldName - The name of this field (for relation tracking)
 * @param relations - Array to push parsed relations into
 * @returns Parsed field definition
 *
 * @example
 * ```ts
 * // Simple type
 * parseFieldDefinition('string', 'User', 'name', [])
 * // => { type: 'string', optional: false }
 *
 * // Optional type
 * parseFieldDefinition('markdown?', 'Post', 'content', [])
 * // => { type: 'markdown', optional: true }
 *
 * // Forward relation
 * parseFieldDefinition('->Customer', 'Order', 'customer', relations)
 * // => { type: 'relation', target: 'Customer', direction: 'forward', cardinality: 'one' }
 *
 * // Many relation (array syntax)
 * parseFieldDefinition(['<-Order'], 'Customer', 'orders', relations)
 * // => { type: 'relation', target: 'Order', direction: 'reverse', cardinality: 'many' }
 * ```
 */
export function parseFieldDefinition(
  fieldType: string | string[],
  nounName: string,
  fieldName: string,
  relations: RelationRecord[]
): FieldDefinition {
  // Handle array types (many relations)
  if (Array.isArray(fieldType)) {
    const innerType = fieldType[0]
    return parseRelationshipOperator(innerType, nounName, fieldName, 'many', relations)
  }

  // Check for relation operators
  if (
    fieldType.startsWith('->') ||
    fieldType.startsWith('<-') ||
    fieldType.startsWith('~>') ||
    fieldType.startsWith('<~')
  ) {
    return parseRelationshipOperator(fieldType, nounName, fieldName, 'one', relations)
  }

  // Simple type with optional marker
  const optional = fieldType.endsWith('?')
  const type = optional ? fieldType.slice(0, -1) : fieldType

  return { type, optional }
}

/**
 * Parse all noun definitions from the DSL into structured schemas.
 *
 * @param definitions - Raw noun definitions from $.nouns()
 * @param relations - Array to collect all parsed relations
 * @returns Object mapping noun names to their parsed schemas
 *
 * @example
 * ```ts
 * const relations: RelationRecord[] = []
 * const parsed = parseNounDefinitions({
 *   Customer: { name: 'string', email: 'string' },
 *   Order: { total: 'number', customer: '->Customer' }
 * }, relations)
 *
 * // parsed.Customer.name === { type: 'string', optional: false }
 * // parsed.Order.customer === { type: 'relation', target: 'Customer', ... }
 * // relations contains the Order->Customer relationship
 * ```
 */
export function parseNounDefinitions(
  definitions: RawNounDefinitions,
  relations: RelationRecord[]
): ParsedNounDefinitions {
  const parsed: ParsedNounDefinitions = {}

  for (const [nounName, fields] of Object.entries(definitions)) {
    parsed[nounName] = {}
    for (const [fieldName, fieldType] of Object.entries(fields)) {
      parsed[nounName][fieldName] = parseFieldDefinition(fieldType, nounName, fieldName, relations)
    }
  }

  return parsed
}

/**
 * Validation result for noun definitions.
 */
export interface NounValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** Validation error messages */
  errors: string[]
  /** Validation warnings */
  warnings: string[]
}

/**
 * Validate noun definitions for common issues.
 *
 * Checks:
 * - Noun names are PascalCase
 * - Field names are camelCase
 * - Field types are valid
 * - Relation targets exist
 *
 * @param definitions - Parsed noun definitions to validate
 * @param nounNames - Optional list of valid noun names for relation validation
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```ts
 * const result = validateNounDefinitions(parsed, ['Customer', 'Order', 'Product'])
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 * ```
 */
export function validateNounDefinitions(
  definitions: ParsedNounDefinitions,
  nounNames?: string[]
): NounValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const knownNouns = nounNames || Object.keys(definitions)

  for (const [nounName, fields] of Object.entries(definitions)) {
    // Check noun naming convention (PascalCase)
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(nounName)) {
      errors.push(`Noun "${nounName}" should be PascalCase (e.g., "Customer", "OrderItem")`)
    }

    for (const [fieldName, field] of Object.entries(fields)) {
      // Check field naming convention (camelCase)
      if (!/^[a-z][a-zA-Z0-9]*$/.test(fieldName)) {
        warnings.push(`Field "${nounName}.${fieldName}" should be camelCase (e.g., "firstName", "createdAt")`)
      }

      // Check relation targets
      if ('target' in field && field.type === 'relation') {
        if (!knownNouns.includes(field.target)) {
          errors.push(
            `Relation target "${field.target}" in "${nounName}.${fieldName}" is not a known noun. ` +
              `Known nouns: ${knownNouns.join(', ')}`
          )
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
