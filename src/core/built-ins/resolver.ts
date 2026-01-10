/**
 * Built-in SaaS Nouns - Resolver
 *
 * Resolves built-in noun options into a final configuration.
 * Handles include/exclude lists, extensions, and verb overrides.
 *
 * @module core/built-ins/resolver
 */

import type { NounSchema, FieldDefinition } from '../../parsers/noun-parser'
import type {
  BuiltInNounName,
  BuiltInNounOptions,
  NounExtension,
  ResolvedBuiltIns,
  BuiltInNounConfig,
} from './types'
import { BUILT_IN_NOUN_NAMES, isBuiltInNoun } from './types'
import { BUILT_IN_SCHEMAS, BUILT_IN_CONFIGS, BUILT_IN_VERBS } from './schemas'

/**
 * Parse a DSL field type string into a FieldDefinition.
 *
 * @param fieldType - Field type in DSL syntax (e.g., 'string', 'number?', '->User')
 * @returns Parsed field definition
 *
 * @example
 * ```ts
 * parseFieldType('string') // { type: 'string', optional: false }
 * parseFieldType('number?') // { type: 'number', optional: true }
 * parseFieldType('->Organization') // { type: 'relation', target: 'Organization', ... }
 * ```
 */
function parseFieldType(fieldType: string): FieldDefinition {
  // Handle relation operators
  if (fieldType.startsWith('->')) {
    return {
      type: 'relation',
      target: fieldType.slice(2),
      direction: 'forward',
      cardinality: 'one',
    }
  }
  if (fieldType.startsWith('<-')) {
    return {
      type: 'relation',
      target: fieldType.slice(2),
      direction: 'reverse',
      cardinality: 'one',
    }
  }
  if (fieldType.startsWith('~>')) {
    return {
      type: 'relation',
      target: fieldType.slice(2),
      direction: 'forward',
      cardinality: 'many',
    }
  }
  if (fieldType.startsWith('<~')) {
    return {
      type: 'relation',
      target: fieldType.slice(2),
      direction: 'reverse',
      cardinality: 'many',
    }
  }

  // Handle simple types with optional marker
  const optional = fieldType.endsWith('?')
  const type = optional ? fieldType.slice(0, -1) : fieldType

  return { type, optional }
}

/**
 * Parse array field type (for many relations).
 *
 * @param fieldType - Array containing single relation string
 * @returns Parsed field definition with cardinality 'many'
 */
function parseArrayFieldType(fieldType: string[]): FieldDefinition {
  const inner = fieldType[0]
  const parsed = parseFieldType(inner)

  if ('target' in parsed && parsed.type === 'relation') {
    return { ...parsed, cardinality: 'many' }
  }

  return parsed
}

/**
 * Merge an extension into a built-in noun schema.
 *
 * @param baseSchema - The original built-in schema
 * @param extension - Extension configuration to apply
 * @returns Merged schema with extension fields
 *
 * @example
 * ```ts
 * const extendedSchema = mergeExtension(UserSchema, {
 *   fields: {
 *     avatarUrl: 'string?',
 *     department: '->Department',
 *   },
 * })
 * ```
 */
export function mergeExtension(baseSchema: NounSchema, extension: NounExtension): NounSchema {
  const merged: NounSchema = { ...baseSchema }

  if (extension.fields) {
    for (const [fieldName, fieldType] of Object.entries(extension.fields)) {
      if (Array.isArray(fieldType)) {
        merged[fieldName] = parseArrayFieldType(fieldType)
      } else {
        merged[fieldName] = parseFieldType(fieldType)
      }
    }
  }

  return merged
}

/**
 * Merge user-defined noun schema with built-in schema.
 *
 * This is the main function used when users call `$.nouns()` to extend
 * built-in nouns with additional fields.
 *
 * @param nounName - Name of the noun to extend
 * @param customSchema - Custom fields to add (DSL syntax)
 * @returns Merged schema, or empty schema if not a built-in
 *
 * @example
 * ```ts
 * const extended = mergeWithBuiltIn('User', {
 *   avatarUrl: 'string?',
 *   phoneNumber: 'string?',
 * })
 * ```
 */
export function mergeWithBuiltIn(
  nounName: string,
  customSchema: Record<string, string | string[]>
): NounSchema {
  const builtIn = BUILT_IN_SCHEMAS[nounName]
  if (!builtIn) {
    return {} as NounSchema // Not a built-in, return empty
  }

  // Start with built-in schema
  const merged: NounSchema = { ...builtIn }

  // Add custom fields (these override built-in if same name)
  for (const [fieldName, fieldType] of Object.entries(customSchema)) {
    if (Array.isArray(fieldType)) {
      merged[fieldName] = parseArrayFieldType(fieldType)
    } else {
      merged[fieldName] = parseFieldType(fieldType)
    }
  }

  return merged
}

/**
 * Resolve built-in noun options into a final configuration.
 *
 * This is the main entry point for determining which built-in nouns
 * to register and how they should be configured.
 *
 * @param options - Configuration options (include/exclude, extensions, overrides)
 * @returns Resolved configuration ready for registration
 *
 * @example
 * ```ts
 * // Include all built-ins with User extension
 * const resolved = resolveBuiltIns({
 *   extensions: {
 *     User: { fields: { avatarUrl: 'string?' } },
 *   },
 * })
 *
 * // Include only User and Organization
 * const resolved = resolveBuiltIns({
 *   include: ['User', 'Organization'],
 * })
 *
 * // Exclude Usage and Metric
 * const resolved = resolveBuiltIns({
 *   exclude: ['Usage', 'Metric'],
 * })
 * ```
 */
export function resolveBuiltIns(options: BuiltInNounOptions = {}): ResolvedBuiltIns {
  const { include, exclude, extensions = {}, verbOverrides = {} } = options

  // Validate that include and exclude are not both specified
  if (include && exclude) {
    throw new Error('Cannot specify both include and exclude options')
  }

  // Determine which nouns to include
  let nounNames: BuiltInNounName[]

  if (include) {
    // Only include specified nouns
    nounNames = include.filter(isBuiltInNoun) as BuiltInNounName[]
  } else if (exclude) {
    // Include all except excluded
    const excludeSet = new Set(exclude)
    nounNames = BUILT_IN_NOUN_NAMES.filter((name) => !excludeSet.has(name))
  } else {
    // Include all by default
    nounNames = [...BUILT_IN_NOUN_NAMES]
  }

  // Build resolved configuration
  const nouns = new Set<BuiltInNounName>(nounNames)
  const schemas: Record<string, NounSchema> = {}
  const verbs: Record<string, readonly string[]> = {}
  const uniqueFields: Record<string, Set<string>> = {}
  const validators: Record<string, BuiltInNounConfig['validate']> = {}
  const cascadeDelete: Record<string, { nouns: string[]; field: string }> = {}

  for (const nounName of nounNames) {
    const config = BUILT_IN_CONFIGS[nounName]
    if (!config) continue

    // Apply extension if provided
    const extension = extensions[nounName]
    schemas[nounName] = extension
      ? mergeExtension(config.schema, extension)
      : { ...config.schema }

    // Apply verb override or extension
    const baseVerbs = verbOverrides[nounName] ?? config.verbs
    const extensionVerbs = extension?.verbs ?? []
    verbs[nounName] = [...baseVerbs, ...extensionVerbs]

    // Collect unique fields
    const uniqueSet = new Set(config.uniqueFields || [])
    if (extension?.uniqueFields) {
      for (const field of extension.uniqueFields) {
        uniqueSet.add(field)
      }
    }
    uniqueFields[nounName] = uniqueSet

    // Collect validators (combine built-in and extension)
    if (config.validate || extension?.validate) {
      validators[nounName] = (data, operation) => {
        // Run built-in validation first
        if (config.validate) {
          const error = config.validate(data, operation)
          if (error) return error
        }
        // Then run extension validation
        if (extension?.validate) {
          const error = extension.validate(data, operation)
          if (error) return error
        }
        return undefined
      }
    }

    // Collect cascade delete config
    if (config.cascadeDelete && config.cascadeDeleteField) {
      cascadeDelete[nounName] = {
        nouns: [...config.cascadeDelete],
        field: config.cascadeDeleteField,
      }
    }
  }

  return {
    nouns,
    schemas,
    verbs,
    uniqueFields,
    validators,
    cascadeDelete,
  }
}

/**
 * Get the default verbs for a built-in noun.
 *
 * @param nounName - Name of the built-in noun
 * @returns Array of default verb names, or empty array if not found
 *
 * @example
 * ```ts
 * getBuiltInVerbs('User') // ['invite', 'verify', 'deactivate']
 * getBuiltInVerbs('Custom') // []
 * ```
 */
export function getBuiltInVerbs(nounName: string): readonly string[] {
  return BUILT_IN_VERBS[nounName] ?? []
}

/**
 * Get the schema for a built-in noun.
 *
 * @param nounName - Name of the built-in noun
 * @returns Schema, or undefined if not a built-in
 *
 * @example
 * ```ts
 * const schema = getBuiltInSchema('User')
 * if (schema) {
 *   console.log(schema.email) // { type: 'string', optional: false }
 * }
 * ```
 */
export function getBuiltInSchema(nounName: string): NounSchema | undefined {
  return BUILT_IN_SCHEMAS[nounName]
}

/**
 * Get the full configuration for a built-in noun.
 *
 * @param nounName - Name of the built-in noun
 * @returns Configuration, or undefined if not a built-in
 */
export function getBuiltInConfig(nounName: string): BuiltInNounConfig | undefined {
  return BUILT_IN_CONFIGS[nounName]
}
