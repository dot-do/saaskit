/**
 * Built-in SaaS Nouns - Type Definitions
 *
 * Core type definitions for the built-in noun system.
 * These types enable type-safe noun registration, extension, and customization.
 *
 * @module core/built-ins/types
 */

import type { NounSchema } from '../../parsers/noun-parser'

/**
 * Names of all built-in nouns provided by SaaSKit.
 *
 * These nouns represent common SaaS patterns:
 * - **User**: Authentication and identity management
 * - **Organization**: Multi-tenancy support
 * - **Plan**: Subscription tiers and pricing
 * - **APIKey**: Developer API access
 * - **Webhook**: Event subscriptions
 * - **Usage**: Metered billing tracking
 * - **Metric**: Analytics and telemetry
 */
export const BUILT_IN_NOUN_NAMES = [
  'User',
  'Organization',
  'Plan',
  'APIKey',
  'Webhook',
  'Usage',
  'Metric',
] as const

/**
 * Union type of all built-in noun names.
 *
 * @example
 * ```ts
 * const nounName: BuiltInNounName = 'User' // Valid
 * const invalid: BuiltInNounName = 'Custom' // TypeScript error
 * ```
 */
export type BuiltInNounName = (typeof BUILT_IN_NOUN_NAMES)[number]

/**
 * Type interface mapping built-in noun names to their schemas.
 */
export interface BuiltInNouns {
  User: NounSchema
  Organization: NounSchema
  Plan: NounSchema
  APIKey: NounSchema
  Webhook: NounSchema
  Usage: NounSchema
  Metric: NounSchema
}

/**
 * Configuration for a single built-in noun definition.
 *
 * Includes the schema, default verbs, validation rules, and hooks.
 *
 * @example
 * ```ts
 * const userConfig: BuiltInNounConfig = {
 *   schema: { email: { type: 'string', optional: false }, ... },
 *   verbs: ['invite', 'verify', 'deactivate'],
 *   validate: (data) => isValidEmail(data.email),
 *   uniqueFields: ['email'],
 * }
 * ```
 */
export interface BuiltInNounConfig {
  /** The field schema for this noun */
  schema: NounSchema

  /** Default verbs (actions) available for this noun */
  verbs: readonly string[]

  /** Fields that must be unique across all instances */
  uniqueFields?: readonly string[]

  /**
   * Custom validation function for create/update operations.
   * Return an error message string if validation fails, or undefined if valid.
   */
  validate?: (data: Record<string, unknown>, operation: 'create' | 'update') => string | undefined

  /**
   * Hook called before creating an instance.
   * Can modify the data or throw an error to abort.
   */
  beforeCreate?: (data: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>

  /**
   * Hook called after creating an instance.
   */
  afterCreate?: (entity: Record<string, unknown> & { id: string }) => void | Promise<void>

  /**
   * Hook called before deleting an instance.
   * Can throw an error to abort.
   */
  beforeDelete?: (id: string) => void | Promise<void>

  /**
   * Hook called after deleting an instance.
   */
  afterDelete?: (id: string) => void | Promise<void>

  /**
   * Names of related nouns to cascade delete when this noun is deleted.
   *
   * @example
   * ```ts
   * // When an Organization is deleted, also delete its APIKeys and Webhooks
   * cascadeDelete: ['APIKey', 'Webhook']
   * ```
   */
  cascadeDelete?: readonly string[]

  /**
   * The field name on related nouns that references this noun.
   * Used for cascade delete queries.
   *
   * @example
   * ```ts
   * // APIKey.organization references Organization.id
   * cascadeDeleteField: 'organization'
   * ```
   */
  cascadeDeleteField?: string
}

/**
 * Registry of all built-in noun configurations.
 */
export type BuiltInNounRegistry = Record<BuiltInNounName, BuiltInNounConfig>

/**
 * Options for extending a built-in noun with custom fields or behavior.
 *
 * @example
 * ```ts
 * const userExtension: NounExtension = {
 *   // Add new fields
 *   fields: {
 *     avatarUrl: 'string?',
 *     phoneNumber: 'string?',
 *     department: 'string?',
 *   },
 *   // Add new verbs
 *   verbs: ['suspend', 'unsuspend'],
 *   // Override validation
 *   validate: (data) => {
 *     if (data.phoneNumber && !isValidPhone(data.phoneNumber)) {
 *       return 'Invalid phone number format'
 *     }
 *   },
 * }
 * ```
 */
export interface NounExtension {
  /**
   * Additional fields to add to the built-in noun schema.
   * Use DSL syntax: 'string', 'number?', '->RelatedNoun', etc.
   */
  fields?: Record<string, string | string[]>

  /**
   * Additional verbs to add to the built-in noun.
   */
  verbs?: readonly string[]

  /**
   * Custom validation to run in addition to built-in validation.
   */
  validate?: (data: Record<string, unknown>, operation: 'create' | 'update') => string | undefined

  /**
   * Additional unique field constraints.
   */
  uniqueFields?: readonly string[]
}

/**
 * Options for selectively including or excluding built-in nouns.
 *
 * @example
 * ```ts
 * // Include only User and Organization
 * const options: BuiltInNounOptions = {
 *   include: ['User', 'Organization'],
 * }
 *
 * // Include all except Usage and Metric
 * const options: BuiltInNounOptions = {
 *   exclude: ['Usage', 'Metric'],
 * }
 *
 * // Extend User with custom fields
 * const options: BuiltInNounOptions = {
 *   extensions: {
 *     User: {
 *       fields: { avatarUrl: 'string?' },
 *       verbs: ['suspend'],
 *     },
 *   },
 * }
 * ```
 */
export interface BuiltInNounOptions {
  /**
   * Specific built-in nouns to include.
   * If specified, only these nouns will be registered.
   * Cannot be used with `exclude`.
   */
  include?: readonly BuiltInNounName[]

  /**
   * Specific built-in nouns to exclude.
   * If specified, all built-ins except these will be registered.
   * Cannot be used with `include`.
   */
  exclude?: readonly BuiltInNounName[]

  /**
   * Extensions to apply to built-in nouns.
   * Keys are noun names, values are extension configurations.
   */
  extensions?: Partial<Record<BuiltInNounName, NounExtension>>

  /**
   * Override the default verbs for built-in nouns.
   * Keys are noun names, values are arrays of verb names.
   * This completely replaces the default verbs (not additive).
   */
  verbOverrides?: Partial<Record<BuiltInNounName, readonly string[]>>
}

/**
 * Result of resolving built-in noun options.
 * Contains the final set of nouns to register and their configurations.
 */
export interface ResolvedBuiltIns {
  /** Final set of noun names to register */
  nouns: Set<BuiltInNounName>

  /** Final schemas after applying extensions */
  schemas: Record<string, NounSchema>

  /** Final verbs after applying overrides and extensions */
  verbs: Record<string, readonly string[]>

  /** Unique field constraints per noun */
  uniqueFields: Record<string, Set<string>>

  /** Validation functions per noun */
  validators: Record<string, BuiltInNounConfig['validate']>

  /** Cascade delete configuration per noun */
  cascadeDelete: Record<string, { nouns: string[]; field: string }>
}

/**
 * Check if a noun name is a built-in noun.
 *
 * @param name - The noun name to check
 * @returns True if the name is a built-in noun
 *
 * @example
 * ```ts
 * isBuiltInNoun('User') // true
 * isBuiltInNoun('Customer') // false
 * ```
 */
export function isBuiltInNoun(name: string): name is BuiltInNounName {
  return (BUILT_IN_NOUN_NAMES as readonly string[]).includes(name)
}
