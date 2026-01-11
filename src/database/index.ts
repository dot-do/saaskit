/**
 * Database Layer
 *
 * This module provides the Database.do integration for SaaSkit.
 * Implements in-memory storage for development, with typed accessors per noun.
 *
 * ## Features
 *
 * - **Schema Definition**: Define nouns with field types and relationships
 * - **CRUD Operations**: Create, read, update, delete operations per noun
 * - **Relationships**: Support for forward (`->`, `~>`) and backward (`<-`, `<~`) relationships
 * - **Search**: Full-text and semantic search capabilities
 * - **Performance**: Query batching, caching, and index suggestions
 *
 * ## Usage
 *
 * ```ts
 * import { createSaaS } from '@saaskit/database'
 *
 * const $ = createSaaS()
 *
 * $.nouns({
 *   Customer: {
 *     name: 'string',
 *     email: 'string',
 *     plan: '->Plan',
 *   },
 *   Plan: {
 *     name: 'string',
 *     price: 'number',
 *   },
 * })
 *
 * // Use typed database accessors
 * const customer = await $.db.Customer.create({
 *   name: 'John',
 *   email: 'john@example.com'
 * })
 * ```
 *
 * @module database
 */

export * from './types'
export * from './batcher'
export * from './cache'
export * from './indexes'
export * from './proxy'
export * from './accessor-factory'

import type {
  NounDefinitions,
  NounSchema,
  FieldDefinition,
  BaseRecord,
  SaaSContext,
} from './types'
import type { DatabaseAccessor } from './accessor-factory'
import { createDbProxy } from './proxy'
import { createAccessor, createRelationResolver, parseFieldDefinition } from './accessor-factory'

/**
 * Valid relationship operator patterns for noun field definitions.
 *
 * - `->` Forward exact: Owner side of a relationship (e.g., Order belongs to Customer)
 * - `~>` Forward fuzzy: Semantic match or auto-create relationship
 * - `<-` Backward exact: Referenced side of a relationship (e.g., Customer has many Orders)
 * - `<~` Backward fuzzy: Semantic reverse relationship
 *
 * @internal
 */
const RELATIONSHIP_OPERATORS = ['->', '~>', '<-', '<~'] as const

/**
 * Validate noun definitions for relationship integrity
 *
 * Ensures all relationship fields reference nouns that are defined
 * in the same schema. Throws an error if a relationship points to
 * an undefined noun.
 *
 * @param definitions - The complete noun definitions to validate
 * @throws {Error} If a relationship references an undefined noun
 *
 * @example
 * ```ts
 * // Valid - Plan is defined
 * validateNounDefinitions({
 *   Customer: { plan: '->Plan' },
 *   Plan: { name: 'string' },
 * })
 *
 * // Invalid - throws error
 * validateNounDefinitions({
 *   Customer: { plan: '->Plan' }, // Plan not defined!
 * })
 * ```
 *
 * @internal
 */
function validateNounDefinitions(definitions: NounDefinitions): void {
  const nounNames = new Set(Object.keys(definitions))

  for (const [nounName, schema] of Object.entries(definitions)) {
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const parsed = parseFieldDefinition(fieldDef)

      if (parsed.isRelationship && parsed.targetNoun) {
        if (!nounNames.has(parsed.targetNoun)) {
          throw new Error(
            `Noun "${nounName}" references undefined noun "${parsed.targetNoun}" in field "${fieldName}"`
          )
        }
      }
    }
  }
}

/**
 * Create a database accessor for a single noun type
 *
 * Uses the shared accessor factory with relation resolution hooks.
 * This is a thin wrapper that configures the accessor with backward
 * relationship resolution for the pure database layer.
 *
 * @typeParam T - The record type (extends BaseRecord)
 * @param nounName - The name of the noun (e.g., 'Customer')
 * @param schema - The noun's schema definition
 * @param storage - The shared storage Map for all nouns
 * @param allDefinitions - All noun definitions (needed for relationship resolution)
 * @returns A DatabaseAccessor instance with typed operations
 *
 * @internal
 */
function createDatabaseAccessor<T extends BaseRecord>(
  nounName: string,
  schema: NounSchema,
  storage: Map<string, Map<string, T>>,
  allDefinitions: NounDefinitions
): DatabaseAccessor<T> {
  // Ensure storage exists for this noun
  if (!storage.has(nounName)) {
    storage.set(nounName, new Map())
  }
  const nounStorage = storage.get(nounName)!

  // Use the shared accessor factory with relation resolver
  return createAccessor<T>({
    nounName,
    storage: nounStorage,
    schema,
    allDefinitions,
    allStorage: storage as Map<string, Map<string, BaseRecord>>,
    enableSearch: true,
    hooks: {
      // Auto-resolve backward relationships on get()
      resolveRelations: createRelationResolver<T>(
        allDefinitions,
        storage as Map<string, Map<string, BaseRecord>>
      ),
    },
  })
}

/**
 * Create a new SaaS context with database layer
 *
 * Creates an isolated SaaS context with its own storage and noun definitions.
 * The returned object provides:
 *
 * - `$.nouns()` - Define noun schemas with relationships
 * - `$.db` - Access typed database accessors for CRUD operations
 *
 * ## Schema Definition
 *
 * Use `$.nouns()` to define your data model with field types and relationships:
 *
 * ```ts
 * $.nouns({
 *   Customer: {
 *     name: 'string',           // Required string
 *     email: 'string',          // Required string
 *     age: 'number?',           // Optional number
 *     status: 'active | inactive', // Union type
 *     plan: '->Plan',           // Forward relationship to Plan
 *     orders: ['<-Order'],      // Backward relationship from Order
 *   },
 *   Plan: {
 *     name: 'string',
 *     price: 'number',
 *   },
 *   Order: {
 *     customer: '->Customer',   // Forward relationship
 *     items: ['->Product'],     // Array of relationships
 *     total: 'number',
 *   },
 * })
 * ```
 *
 * ## CRUD Operations
 *
 * Each noun gets a typed accessor with standard operations:
 *
 * ```ts
 * // Create
 * const customer = await $.db.Customer.create({
 *   name: 'John',
 *   email: 'john@example.com'
 * })
 *
 * // Read
 * const found = await $.db.Customer.get(customer.id)
 *
 * // Update
 * const updated = await $.db.Customer.update(customer.id, {
 *   name: 'John Doe'
 * })
 *
 * // Delete
 * await $.db.Customer.delete(customer.id)
 *
 * // List all
 * const all = await $.db.Customer.list()
 *
 * // List with pagination
 * const page = await $.db.Customer.list({ limit: 10, offset: 20 })
 *
 * // Find by filter
 * const active = await $.db.Customer.find({ status: 'active' })
 *
 * // Full-text search
 * const results = await $.db.Customer.search('john')
 *
 * // Semantic search
 * const semantic = await $.db.Customer.semanticSearch('enterprise customers')
 * ```
 *
 * @returns A SaaSContext with `nouns()` and `db` properties
 *
 * @example
 * ```ts
 * const $ = createSaaS()
 *
 * $.nouns({
 *   Customer: {
 *     name: 'string',
 *     email: 'string',
 *     plan: '->Plan',
 *   },
 *   Plan: {
 *     name: 'string',
 *     price: 'number',
 *   },
 * })
 *
 * // Then use via $.db:
 * const customer = await $.db.Customer.create({
 *   name: 'John',
 *   email: 'john@example.com'
 * })
 * ```
 */
export function createSaaS(): SaaSContext {
  let nounDefinitions: NounDefinitions | null = null
  const storage = new Map<string, Map<string, BaseRecord>>()

  // Create a proxy for $.db using shared utility
  const { proxy: dbProxy, clearCache } = createDbProxy<DatabaseAccessor>({
    isInitialized: () => nounDefinitions !== null,
    notInitializedError: 'Nouns not defined. Call $.nouns() before accessing $.db',
    isRegistered: (nounName) => nounDefinitions !== null && nounName in nounDefinitions,
    createAccessor: (nounName) =>
      createDatabaseAccessor(nounName, nounDefinitions![nounName], storage, nounDefinitions!),
    getNounNames: () => (nounDefinitions ? Object.keys(nounDefinitions) : []),
    unregisteredError: (nounName) =>
      `Noun "${nounName}" is not defined. Did you forget to add it to $.nouns()?`,
  })

  // Verb definitions: { NounName: { verbName: handler } }
  let verbDefinitions: Record<string, Record<string, (...args: unknown[]) => unknown>> = {}

  // Registered event handlers: { 'noun.event': handler[] }
  const eventHandlers: Record<string, Array<(...args: unknown[]) => unknown>> = {}

  // Create proxy for $.on that allows $.on.Order.created(handler)
  const onProxy = new Proxy(
    {},
    {
      get(_target, nounName: string | symbol) {
        if (typeof nounName === 'symbol') return undefined

        // Return a proxy for the noun that captures event names
        return new Proxy(
          {},
          {
            get(_target, eventName: string | symbol) {
              if (typeof eventName === 'symbol') return undefined

              // Return a function to register the handler
              return (handler: (...args: unknown[]) => unknown) => {
                const key = `${nounName.toLowerCase()}.${eventName}`
                if (!eventHandlers[key]) {
                  eventHandlers[key] = []
                }
                eventHandlers[key].push(handler)
              }
            },
          }
        )
      },
    }
  )

  const context = {
    nouns(definitions: NounDefinitions): void {
      if (nounDefinitions !== null) {
        throw new Error('Nouns already defined. Cannot redefine nouns after initial definition.')
      }

      // Validate all noun definitions
      validateNounDefinitions(definitions)

      nounDefinitions = definitions
    },

    verbs(
      definitions: Record<string, Record<string, (...args: unknown[]) => unknown>>
    ): void {
      verbDefinitions = { ...verbDefinitions, ...definitions }
    },

    addNoun(name: string, schema: NounSchema): void {
      if (nounDefinitions === null) {
        nounDefinitions = {}
      }
      nounDefinitions[name] = schema
      // Clear cached accessor if it exists
      clearCache(name)
    },

    updateNoun(name: string, schema: NounSchema): void {
      if (nounDefinitions === null) {
        nounDefinitions = {}
      }
      nounDefinitions[name] = schema
      // Clear cached accessor to force recreation
      clearCache(name)
    },

    addVerb(
      nounName: string,
      verbName: string,
      handler: (...args: unknown[]) => unknown
    ): void {
      if (!verbDefinitions[nounName]) {
        verbDefinitions[nounName] = {}
      }
      verbDefinitions[nounName][verbName] = handler
    },

    get on() {
      return onProxy
    },

    get db() {
      return dbProxy as ReturnType<typeof createSaaS>['db']
    },

    // Expose internal state for documentation generator
    getNounDefinitions(): NounDefinitions | null {
      return nounDefinitions
    },

    getVerbDefinitions(): Record<
      string,
      Record<string, (...args: unknown[]) => unknown>
    > {
      return verbDefinitions
    },

    getEventHandlers(): Record<string, Array<(...args: unknown[]) => unknown>> {
      return eventHandlers
    },
  }

  return context as SaaSContext
}
