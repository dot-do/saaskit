/**
 * Database Accessor Factory
 *
 * Shared factory for creating database accessors with configurable behavior.
 * Used by both the pure database layer (database/index.ts) and the SaaS
 * context (core/create-saas.ts) to avoid code duplication.
 *
 * @module database/accessor-factory
 */

import type {
  BaseRecord,
  PaginationOptions,
  SearchResult,
  NounSchema,
  NounDefinitions,
  DatabaseAccessor,
} from './types'

// Re-export DatabaseAccessor for convenience
export type { DatabaseAccessor }

/**
 * Options for get() operation
 */
export interface GetOptions {
  /** Relations to include/populate */
  include?: string[]
}

/**
 * Hooks for customizing accessor behavior
 */
export interface AccessorHooks<T extends BaseRecord = BaseRecord> {
  /**
   * Called before create - can modify data or throw to reject
   * @returns Modified data to create, or throws an error
   */
  beforeCreate?: (data: Partial<T>, context: HookContext) => Promise<Partial<T>> | Partial<T>

  /**
   * Called after create - can perform side effects
   */
  afterCreate?: (record: T, context: HookContext) => Promise<void> | void

  /**
   * Called before update - can modify data or throw to reject
   */
  beforeUpdate?: (
    id: string,
    data: Partial<T>,
    existing: T,
    context: HookContext
  ) => Promise<Partial<T>> | Partial<T>

  /**
   * Called after update - can perform side effects
   */
  afterUpdate?: (record: T, context: HookContext) => Promise<void> | void

  /**
   * Called before delete - can throw to reject
   */
  beforeDelete?: (id: string, existing: T, context: HookContext) => Promise<void> | void

  /**
   * Called after delete - can perform side effects (e.g., cascade)
   */
  afterDelete?: (id: string, deleted: T, context: HookContext) => Promise<void> | void

  /**
   * Called after get to resolve relations
   */
  resolveRelations?: (record: T, options: GetOptions, context: HookContext) => Promise<T> | T
}

/**
 * Context passed to hooks
 */
export interface HookContext {
  /** The noun name (e.g., 'Customer') */
  nounName: string
  /** The noun schema */
  schema: NounSchema | null
  /** All noun definitions (for relation resolution) */
  allDefinitions?: NounDefinitions
  /** Storage access for related nouns */
  getStorage?: (nounName: string) => Map<string, BaseRecord> | undefined
}

/**
 * Configuration for creating an accessor
 */
export interface AccessorFactoryConfig<T extends BaseRecord = BaseRecord> {
  /** The noun name (e.g., 'Customer') */
  nounName: string

  /** The storage Map for this noun */
  storage: Map<string, T>

  /** Optional noun schema for validation */
  schema?: NounSchema

  /** All noun definitions (for relation resolution) */
  allDefinitions?: NounDefinitions

  /** Storage access for all nouns (for relation resolution) */
  allStorage?: Map<string, Map<string, BaseRecord>>

  /** Hooks for customizing behavior */
  hooks?: AccessorHooks<T>

  /** Whether to include search methods */
  enableSearch?: boolean

  /** ID prefix for auto-generated IDs (defaults to first 4 chars of noun name) */
  idPrefix?: string
}

/**
 * Generate a random alphanumeric ID with optional prefix
 *
 * @param prefix - Optional prefix for the ID
 * @returns A random ID string
 */
function generateId(prefix?: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return prefix ? `${prefix}_${id}` : id
}

/**
 * Create a database accessor with configurable hooks
 *
 * This factory creates database accessors with standard CRUD operations,
 * customizable via hooks for validation, side effects, and relation resolution.
 *
 * @example
 * ```ts
 * // Basic accessor
 * const accessor = createAccessor({
 *   nounName: 'Customer',
 *   storage: customerStorage,
 * })
 *
 * // With hooks for validation
 * const accessor = createAccessor({
 *   nounName: 'User',
 *   storage: userStorage,
 *   hooks: {
 *     beforeCreate: (data) => {
 *       if (!data.email) throw new Error('Email required')
 *       return data
 *     },
 *   },
 * })
 * ```
 */
export function createAccessor<T extends BaseRecord>(
  config: AccessorFactoryConfig<T>
): DatabaseAccessor<T> {
  const {
    nounName,
    storage,
    schema = null,
    allDefinitions,
    allStorage,
    hooks = {},
    enableSearch = true,
    idPrefix = nounName.toLowerCase().slice(0, 4),
  } = config

  const hookContext: HookContext = {
    nounName,
    schema,
    allDefinitions,
    getStorage: allStorage ? (name) => allStorage.get(name) : undefined,
  }

  const accessor: DatabaseAccessor<T> = {
    async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<T> {
      // Run beforeCreate hook
      let processedData: Partial<T> & { id?: string } = data as Partial<T> & { id?: string }
      if (hooks.beforeCreate) {
        processedData = await hooks.beforeCreate(data as Partial<T>, hookContext) as Partial<T> & { id?: string }
      }

      // Generate ID if not provided
      const id = (processedData as { id?: string }).id || generateId(idPrefix)

      // Check for duplicate ID
      if (storage.has(id)) {
        throw new Error(`Record with id "${id}" already exists in ${nounName}`)
      }

      const now = new Date()
      const record = {
        ...processedData,
        id,
        createdAt: now,
        updatedAt: now,
      } as T

      storage.set(id, record)

      // Run afterCreate hook
      if (hooks.afterCreate) {
        await hooks.afterCreate(record, hookContext)
      }

      return record
    },

    async get(id: string, options?: GetOptions): Promise<T | null> {
      const record = storage.get(id)
      if (!record) return null

      // Clone to avoid external mutations
      let result = { ...record } as T

      // Resolve relations if hook provided
      // When options.include is specified, resolve only those relations
      // When options.include is not specified, auto-resolve all relationships
      if (hooks.resolveRelations) {
        result = await hooks.resolveRelations(result, options || {}, hookContext)
      }

      return result
    },

    async update(id: string, data: Partial<T>): Promise<T> {
      const existing = storage.get(id)
      if (!existing) {
        throw new Error(`Record with id "${id}" does not exist in ${nounName}`)
      }

      // Run beforeUpdate hook
      let processedData = data
      if (hooks.beforeUpdate) {
        processedData = await hooks.beforeUpdate(id, data, existing, hookContext)
      }

      const updated = {
        ...existing,
        ...processedData,
        id, // Ensure id cannot be changed
        updatedAt: new Date(),
      } as T

      storage.set(id, updated)

      // Run afterUpdate hook
      if (hooks.afterUpdate) {
        await hooks.afterUpdate(updated, hookContext)
      }

      return updated
    },

    async delete(id: string): Promise<void> {
      const existing = storage.get(id)
      if (!existing) {
        throw new Error(`Record with id "${id}" does not exist in ${nounName}`)
      }

      // Run beforeDelete hook
      if (hooks.beforeDelete) {
        await hooks.beforeDelete(id, existing, hookContext)
      }

      storage.delete(id)

      // Run afterDelete hook
      if (hooks.afterDelete) {
        await hooks.afterDelete(id, existing, hookContext)
      }
    },

    async list(options?: PaginationOptions): Promise<T[]> {
      const records = Array.from(storage.values())
      const offset = options?.offset ?? 0
      const limit = options?.limit ?? records.length

      return records.slice(offset, offset + limit)
    },

    async find(filter: Partial<T>): Promise<T[]> {
      const records = Array.from(storage.values())

      return records.filter((record) => {
        for (const [key, value] of Object.entries(filter)) {
          // Handle Date comparison
          if (value instanceof Date) {
            const recordValue = (record as Record<string, unknown>)[key] as Date
            if (recordValue?.getTime?.() !== value.getTime()) {
              return false
            }
          } else if ((record as Record<string, unknown>)[key] !== value) {
            return false
          }
        }
        return true
      })
    },

    async search(query: string): Promise<T[]> {
      if (!enableSearch) {
        throw new Error(`Search is not enabled for ${nounName}`)
      }
      const records = Array.from(storage.values())
      const queryLower = query.toLowerCase()

      return records.filter((record) => {
        // Search across all string fields
        for (const value of Object.values(record as Record<string, unknown>)) {
          if (typeof value === 'string' && value.toLowerCase().includes(queryLower)) {
            return true
          }
        }
        return false
      })
    },

    async semanticSearch(query: string): Promise<SearchResult<T>[]> {
      if (!enableSearch) {
        throw new Error(`Semantic search is not enabled for ${nounName}`)
      }
      const records = Array.from(storage.values())
      const queryWords = query.toLowerCase().split(/\s+/)

      // Simple word-matching based semantic search (placeholder for real AI)
      const scored = records
        .map((record) => {
          let score = 0
          const textContent = Object.values(record as Record<string, unknown>)
            .filter((v) => typeof v === 'string')
            .join(' ')
            .toLowerCase()

          for (const word of queryWords) {
            if (textContent.includes(word)) {
              score += 1
            }
          }

          // Boost for exact matches
          if (textContent.includes(query.toLowerCase())) {
            score += 2
          }

          return { record, score }
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)

      return scored.map(({ record, score }) => ({
        ...record,
        _score: score,
      })) as SearchResult<T>[]
    },
  }

  return accessor
}

/**
 * Relationship operators for parsing field definitions
 */
const RELATIONSHIP_OPERATORS = ['->', '~>', '<-', '<~'] as const
type RelOp = (typeof RELATIONSHIP_OPERATORS)[number]

/**
 * Pattern to detect invalid relationship operators
 * Valid: ->, ~>, <-, <~
 * Invalid: >>, <<, >, <, =>>, etc.
 */
const INVALID_OPERATOR_PATTERN = /^(?:>>|<<|=>|<=|>|<(?![~-])|<[^~-]|~(?!>)|->(?!.)|<-(?!.)|~>(?!.)|<~(?!.))/

/**
 * Parse a field definition to extract relationship information
 *
 * @throws {Error} If the field looks like a relationship operator but isn't valid
 */
export function parseFieldDefinition(field: string | [string]): {
  isRelationship: boolean
  operator?: RelOp
  targetNoun?: string
  isArray: boolean
} {
  // Handle array field definitions
  if (Array.isArray(field)) {
    const inner = parseFieldDefinition(field[0])
    return { ...inner, isArray: true }
  }

  // Check for relationship operators
  for (const op of RELATIONSHIP_OPERATORS) {
    if (field.startsWith(op)) {
      const target = field.slice(op.length)
      if (!target) {
        throw new Error(`Invalid relationship operator: "${field}" - missing target noun`)
      }
      return {
        isRelationship: true,
        operator: op,
        targetNoun: target,
        isArray: false,
      }
    }
  }

  // Check for invalid relationship-like operators
  if (INVALID_OPERATOR_PATTERN.test(field)) {
    throw new Error(
      `Invalid relationship operator in: "${field}". Valid operators are: ->, <-, ~>, <~`
    )
  }

  return { isRelationship: false, isArray: false }
}

/**
 * Create a relation resolver hook for backward relationships
 *
 * Resolves relationships automatically:
 * - Forward (`->`, `~>`): Look up by stored ID
 * - Backward (`<-`, `<~`): Find referencing records in target noun
 * - Array relationships (`['->', ...]`): Resolve each ID in the array
 *
 * When `include` option is provided, only resolves specified relations.
 * When `include` is not provided, auto-resolves ALL relationships in schema.
 */
export function createRelationResolver<T extends BaseRecord>(
  allDefinitions: NounDefinitions,
  allStorage: Map<string, Map<string, BaseRecord>>
): NonNullable<AccessorHooks<T>['resolveRelations']> {
  return (record, options, context) => {
    if (!context.schema) {
      return record
    }

    const result: Record<string, unknown> = { ...(record as object) }
    const nounName = context.nounName

    // If include is specified, only resolve those relations.
    // Otherwise, auto-resolve all relationships in the schema.
    const relationNames = options.include?.length
      ? options.include
      : Object.keys(context.schema)

    for (const relationName of relationNames) {
      const fieldDef = context.schema[relationName]
      if (!fieldDef) continue

      const parsed = parseFieldDefinition(fieldDef)
      if (!parsed.isRelationship || !parsed.targetNoun) continue

      // Forward relationship (-> or ~>): look up by stored ID
      if ((parsed.operator === '->' || parsed.operator === '~>')) {
        if (parsed.isArray) {
          // Array of forward relationships: ['->Product']
          const relationIds = (record as Record<string, unknown>)[relationName]
          if (Array.isArray(relationIds)) {
            const targetStorage = allStorage.get(parsed.targetNoun)
            const resolvedItems: BaseRecord[] = []
            for (const relId of relationIds) {
              if (typeof relId === 'string') {
                const related = targetStorage?.get(relId)
                if (related) {
                  resolvedItems.push({ ...related, id: relId })
                }
              }
            }
            result[relationName] = resolvedItems
          }
        } else {
          // Single forward relationship: '->Customer'
          const relationId = (record as Record<string, unknown>)[relationName]
          if (typeof relationId === 'string') {
            const targetStorage = allStorage.get(parsed.targetNoun)
            const related = targetStorage?.get(relationId)
            if (related) {
              result[relationName] = { ...related, id: relationId }
            }
          }
        }
      }

      // Backward relationship (<- or <~): find referencing records
      if ((parsed.operator === '<-' || parsed.operator === '<~')) {
        const targetStorage = allStorage.get(parsed.targetNoun)
        if (targetStorage) {
          const relatedRecords: BaseRecord[] = []
          const targetSchema = allDefinitions[parsed.targetNoun]

          for (const [targetId, targetRecord] of targetStorage) {
            // Find which field in the target references this noun
            for (const [targetField, targetFieldDef] of Object.entries(targetSchema)) {
              const targetParsed = parseFieldDefinition(targetFieldDef)
              if (
                targetParsed.isRelationship &&
                (targetParsed.operator === '->' || targetParsed.operator === '~>') &&
                targetParsed.targetNoun === nounName
              ) {
                if ((targetRecord as Record<string, unknown>)[targetField] === record.id) {
                  relatedRecords.push({ ...targetRecord, id: targetId })
                }
              }
            }
          }
          result[relationName] = relatedRecords
        }
      }
    }

    return result as T
  }
}
