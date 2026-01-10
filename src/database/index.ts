/**
 * Database Layer
 *
 * This module provides the Database.do integration for SaaSkit.
 * Implements in-memory storage for development, with typed accessors per noun.
 */

export * from './types'

import type {
  NounDefinitions,
  NounSchema,
  FieldDefinition,
  DatabaseAccessor,
  BaseRecord,
  PaginationOptions,
  SearchResult,
  SaaSContext,
} from './types'

/**
 * Relationship operator patterns
 */
const RELATIONSHIP_OPERATORS = ['->', '~>', '<-', '<~'] as const
type RelOp = (typeof RELATIONSHIP_OPERATORS)[number]

/**
 * Parse a field definition to extract relationship info
 */
function parseFieldDefinition(
  field: FieldDefinition
): { isRelationship: boolean; operator?: RelOp; targetNoun?: string; isArray: boolean } {
  // Handle array field definitions
  if (Array.isArray(field)) {
    const inner = parseFieldDefinition(field[0])
    return { ...inner, isArray: true }
  }

  // Check for relationship operators
  for (const op of RELATIONSHIP_OPERATORS) {
    if (field.startsWith(op)) {
      return {
        isRelationship: true,
        operator: op,
        targetNoun: field.slice(op.length),
        isArray: false,
      }
    }
  }

  // Check for invalid operators (e.g., >>)
  if (/^[<>~-]{2,}/.test(field) && !RELATIONSHIP_OPERATORS.some((op) => field.startsWith(op))) {
    throw new Error(`Invalid relationship operator in field definition: "${field}"`)
  }

  return { isRelationship: false, isArray: false }
}

/**
 * Validate noun definitions for relationships
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
 * Generate a random ID with optional prefix
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
 * Create a database accessor for a single noun
 */
function createDatabaseAccessor<T extends BaseRecord>(
  nounName: string,
  _schema: NounSchema,
  storage: Map<string, Map<string, T>>,
  allDefinitions: NounDefinitions
): DatabaseAccessor<T> {
  // Ensure storage exists for this noun
  if (!storage.has(nounName)) {
    storage.set(nounName, new Map())
  }
  const nounStorage = storage.get(nounName)!

  // Prefix for auto-generated IDs (e.g., 'Customer' -> 'cust')
  const idPrefix = nounName.toLowerCase().slice(0, 4)

  return {
    async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<T> {
      const id = data.id || generateId(idPrefix)

      if (nounStorage.has(id)) {
        throw new Error(`Record with id "${id}" already exists in ${nounName}`)
      }

      const record = {
        ...data,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as T

      nounStorage.set(id, record)
      return record
    },

    async get(id: string): Promise<T | null> {
      const record = nounStorage.get(id)
      if (!record) return null

      // Clone to avoid external mutations and resolve relationships
      const result: Record<string, unknown> = { ...(record as object) }

      // Resolve backward relationships (<-)
      const schema = allDefinitions[nounName]
      for (const [fieldName, fieldDef] of Object.entries(schema)) {
        const parsed = parseFieldDefinition(fieldDef)
        if (parsed.isRelationship && parsed.operator === '<-' && parsed.targetNoun) {
          // Find all records of the target noun that reference this record
          const targetStorage = storage.get(parsed.targetNoun)
          if (targetStorage) {
            const relatedRecords: T[] = []
            const targetSchema = allDefinitions[parsed.targetNoun]

            for (const targetRecord of Array.from(targetStorage.values())) {
              // Find which field in the target references this noun
              for (const [targetField, targetFieldDef] of Object.entries(targetSchema)) {
                const targetParsed = parseFieldDefinition(targetFieldDef)
                if (
                  targetParsed.isRelationship &&
                  targetParsed.operator === '->' &&
                  targetParsed.targetNoun === nounName
                ) {
                  if ((targetRecord as Record<string, unknown>)[targetField] === id) {
                    relatedRecords.push(targetRecord as unknown as T)
                  }
                }
              }
            }
            result[fieldName] = relatedRecords
          }
        }
      }

      return result as T
    },

    async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<T> {
      const existing = nounStorage.get(id)
      if (!existing) {
        throw new Error(`Record with id "${id}" does not exist in ${nounName}`)
      }

      const updated = {
        ...existing,
        ...data,
        id, // Ensure id cannot be changed
        updatedAt: new Date(),
      } as T

      nounStorage.set(id, updated)
      return updated
    },

    async delete(id: string): Promise<void> {
      if (!nounStorage.has(id)) {
        throw new Error(`Record with id "${id}" does not exist in ${nounName}`)
      }
      nounStorage.delete(id)
    },

    async list(options?: PaginationOptions): Promise<T[]> {
      const records = Array.from(nounStorage.values())
      const offset = options?.offset ?? 0
      const limit = options?.limit ?? records.length

      return records.slice(offset, offset + limit)
    },

    async find(filter: Partial<T>): Promise<T[]> {
      const records = Array.from(nounStorage.values())

      return records.filter((record) => {
        for (const [key, value] of Object.entries(filter)) {
          if ((record as Record<string, unknown>)[key] !== value) {
            return false
          }
        }
        return true
      })
    },

    async search(query: string): Promise<T[]> {
      const records = Array.from(nounStorage.values())
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
      const records = Array.from(nounStorage.values())
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
}

/**
 * Create a new SaaS context with database layer
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
 * const customer = await $.db.Customer.create({ name: 'John', email: 'john@example.com' })
 * ```
 */
export function createSaaS(): SaaSContext {
  let nounDefinitions: NounDefinitions | null = null
  const storage = new Map<string, Map<string, BaseRecord>>()
  const accessors = new Map<string, DatabaseAccessor>()

  // Create a proxy for $.db that throws on access before nouns() is called
  const dbProxy = new Proxy(
    {},
    {
      get(_target, prop: string | symbol) {
        // Skip Symbol properties (used for internal JS operations)
        if (typeof prop === 'symbol') {
          return undefined
        }

        if (nounDefinitions === null) {
          throw new Error('Nouns not defined. Call $.nouns() before accessing $.db')
        }

        // Check if accessor already exists
        if (accessors.has(prop)) {
          return accessors.get(prop)
        }

        // Check if this noun was defined
        if (!(prop in nounDefinitions)) {
          throw new Error(`Noun "${prop}" is not defined. Did you forget to add it to $.nouns()?`)
        }

        // Create and cache the accessor
        const accessor = createDatabaseAccessor(
          prop,
          nounDefinitions[prop],
          storage,
          nounDefinitions
        )
        accessors.set(prop, accessor)
        return accessor
      },

      has(_target, prop: string | symbol) {
        // Skip Symbol properties
        if (typeof prop === 'symbol') {
          return false
        }

        if (nounDefinitions === null) {
          return false
        }

        return prop in nounDefinitions
      },

      ownKeys() {
        if (nounDefinitions === null) {
          return []
        }
        return Object.keys(nounDefinitions)
      },

      getOwnPropertyDescriptor(_target, prop: string | symbol) {
        if (typeof prop === 'symbol') {
          return undefined
        }

        if (nounDefinitions === null || !(prop in nounDefinitions)) {
          return undefined
        }

        // Need to get the accessor properly - can't use this.get inside proxy trap
        // Just create the accessor if not already cached
        if (!accessors.has(prop)) {
          const accessor = createDatabaseAccessor(
            prop,
            nounDefinitions[prop],
            storage,
            nounDefinitions
          )
          accessors.set(prop, accessor)
        }

        return {
          enumerable: true,
          configurable: true,
          value: accessors.get(prop),
        }
      },
    }
  )

  return {
    nouns(definitions: NounDefinitions): void {
      if (nounDefinitions !== null) {
        throw new Error('Nouns already defined. Cannot redefine nouns after initial definition.')
      }

      // Validate all noun definitions
      validateNounDefinitions(definitions)

      nounDefinitions = definitions
    },

    get db() {
      return dbProxy as ReturnType<typeof createSaaS>['db']
    },
  } as SaaSContext
}
