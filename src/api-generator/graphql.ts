/**
 * GraphQL Module
 *
 * GraphQL schema generation, query parsing, and execution.
 *
 * @module api-generator/graphql
 */

import type {
  GraphQLSchema,
  GraphQLRequest,
  GraphQLResponse,
  NounDefinitions,
  VerbDefinitions,
  VerbContext,
  SubscriptionCallback,
  SubscriptionOptions,
  UnsubscribeFn,
} from './types'
import { pluralize, singularize, capitalize, generateId } from './utilities'
import { InMemoryStorage } from './storage'
import { EventEmitter } from './events'

/**
 * Parsed GraphQL operation
 */
export interface ParsedGraphQL {
  type: 'query' | 'mutation'
  operationName?: string
  selections: Array<{
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: Record<string, any>
    selections?: string[]
  }>
}

/**
 * Parses a GraphQL query string into an operation structure
 * @param query - The GraphQL query string
 * @returns The parsed operation
 */
export function parseGraphQL(query: string): ParsedGraphQL {
  const trimmed = query.trim()
  const type = trimmed.startsWith('mutation') ? 'mutation' : 'query'

  // Extract operation content between first { and last }
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  const content = trimmed.slice(firstBrace + 1, lastBrace).trim()

  // Parse selections
  const selections: ParsedGraphQL['selections'] = []

  // Simple regex-based parsing for our needs
  const selectionRegex = /(\w+)(?:\s*\(([^)]*)\))?\s*(?:\{([^}]*)\})?/g
  let match

  while ((match = selectionRegex.exec(content)) !== null) {
    const [, name, argsStr, fieldsStr] = match

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args: Record<string, any> = {}
    if (argsStr) {
      // Parse args like: id: "123", input: { title: "test" }
      const argMatches = argsStr.matchAll(/(\w+):\s*(?:"([^"]*)"|(\{[^}]*\})|(\d+)|(\w+))/g)
      for (const argMatch of argMatches) {
        const [, argName, stringVal, objVal, numVal, boolVal] = argMatch
        if (stringVal !== undefined) {
          args[argName] = stringVal
        } else if (objVal) {
          // Parse simple object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const obj: Record<string, any> = {}
          const innerMatches = objVal.matchAll(/(\w+):\s*(?:"([^"]*)"|(\d+)|(\w+))/g)
          for (const inner of innerMatches) {
            const [, k, sv, nv, bv] = inner
            if (sv !== undefined) obj[k] = sv
            else if (nv) obj[k] = parseInt(nv)
            else if (bv === 'true') obj[k] = true
            else if (bv === 'false') obj[k] = false
            else obj[k] = bv
          }
          args[argName] = obj
        } else if (numVal) {
          args[argName] = parseInt(numVal)
        } else if (boolVal === 'true') {
          args[argName] = true
        } else if (boolVal === 'false') {
          args[argName] = false
        }
      }
    }

    const fieldSelections = fieldsStr ? fieldsStr.split(/\s+/).filter(f => f.trim()) : undefined

    selections.push({ name, args, selections: fieldSelections })
  }

  return { type, selections }
}

/**
 * Builds a GraphQL schema from noun and verb definitions
 * @param nouns - Noun definitions
 * @param verbs - Verb definitions
 * @returns The GraphQL schema
 */
export function buildGraphQLSchema(
  nouns: NounDefinitions,
  verbs: VerbDefinitions = {}
): GraphQLSchema {
  const queries: GraphQLSchema['queries'] = {}
  const mutations: GraphQLSchema['mutations'] = {}
  const subscriptions: GraphQLSchema['subscriptions'] = {}
  const types: GraphQLSchema['types'] = {}

  const nounNames = Object.keys(nouns)

  for (const noun of nounNames) {
    const plural = pluralize(noun)
    const singular = singularize(noun)

    // Types
    types[noun] = { id: 'ID', ...nouns[noun] }

    // Queries
    queries[plural] = { name: plural, returnType: `[${noun}]` }
    queries[singular] = { name: singular, returnType: noun }

    // CRUD mutations
    mutations[`create${noun}`] = { name: `create${noun}`, returnType: noun }
    mutations[`update${noun}`] = { name: `update${noun}`, returnType: noun }
    mutations[`delete${noun}`] = { name: `delete${noun}`, returnType: 'Boolean' }

    // Subscriptions for CRUD events
    subscriptions[`${singular}Created`] = { name: `${singular}Created`, returnType: noun }
    subscriptions[`${singular}Updated`] = { name: `${singular}Updated`, returnType: noun }
    subscriptions[`${singular}Deleted`] = { name: `${singular}Deleted`, returnType: noun }

    // Verb mutations and subscriptions
    const nounVerbs = verbs[noun] || {}
    for (const verb of Object.keys(nounVerbs)) {
      mutations[`${verb}${noun}`] = { name: `${verb}${noun}`, returnType: noun }
      const pastTense = verb.endsWith('e') ? verb + 'd' : verb + 'ed'
      subscriptions[`${singular}${capitalize(pastTense)}`] = { name: `${singular}${capitalize(pastTense)}`, returnType: noun }
    }
  }

  return { queries, mutations, subscriptions, types }
}

/**
 * Creates a database context for verb handlers
 * @param storage - The storage instance
 * @param nounNames - List of noun names
 * @returns The database context
 */
export function createDbContext(
  storage: InMemoryStorage,
  nounNames: string[]
): VerbContext['db'] {
  const db: VerbContext['db'] = {}
  for (const noun of nounNames) {
    db[noun] = {
      get: async (id: string) => storage.get(noun, id) || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: async (id: string, data: any) => storage.update(noun, id, data),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (data: any) => {
        const id = data.id || generateId()
        return storage.create(noun, { id, ...data })
      },
      delete: async (id: string) => { storage.delete(noun, id) },
      list: async (options) => storage.list(noun, options),
      find: async (filter) => storage.list(noun, { filter }),
    }
  }
  return db
}

/**
 * Creates a GraphQL handler for executing queries and mutations
 * @param nouns - Noun definitions
 * @param verbs - Verb definitions
 * @param storage - Storage instance
 * @param events - Event emitter for subscriptions
 * @returns The GraphQL handler functions
 */
export function createGraphQLHandler(
  nouns: NounDefinitions,
  verbs: VerbDefinitions,
  storage: InMemoryStorage,
  events: EventEmitter
): {
  getSchema: () => GraphQLSchema
  execute: (request: GraphQLRequest) => Promise<GraphQLResponse>
  subscribe: (event: string, callback: SubscriptionCallback, options?: SubscriptionOptions) => UnsubscribeFn
} {
  const nounNames = Object.keys(nouns)

  return {
    getSchema: () => buildGraphQLSchema(nouns, verbs),

    execute: async (request: GraphQLRequest): Promise<GraphQLResponse> => {
      try {
        const parsed = parseGraphQL(request.query)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {}

        for (const selection of parsed.selections) {
          const { name, args } = selection

          if (parsed.type === 'query') {
            // Find which noun this query is for
            for (const noun of nounNames) {
              const plural = pluralize(noun)
              const singular = singularize(noun)

              if (name === plural) {
                // List query
                const { limit, offset, filter } = args
                const records = storage.list(noun, { limit, offset, filter })
                data[name] = records
                break
              } else if (name === singular) {
                // Single query
                const record = storage.get(noun, args.id)
                data[name] = record || null
                break
              }
            }
          } else if (parsed.type === 'mutation') {
            // Handle mutations
            for (const noun of nounNames) {
              if (name === `create${noun}`) {
                const id = args.input?.id || generateId()
                const record = storage.create(noun, { id, ...args.input })
                events.emit(`${singularize(noun)}Created`, record)
                data[name] = record
                break
              } else if (name === `update${noun}`) {
                const updated = storage.update(noun, args.id, args.input)
                if (updated) {
                  events.emit(`${singularize(noun)}Updated`, updated)
                }
                data[name] = updated
                break
              } else if (name === `delete${noun}`) {
                const existed = storage.has(noun, args.id)
                if (existed) {
                  storage.delete(noun, args.id)
                  events.emit(`${singularize(noun)}Deleted`, { id: args.id })
                }
                data[name] = existed
                break
              }

              // Check for verb mutations
              const nounVerbs = verbs[noun] || {}
              for (const verb of Object.keys(nounVerbs)) {
                if (name === `${verb}${noun}`) {
                  const context: VerbContext = {
                    id: args.id,
                    input: args.input,
                    db: createDbContext(storage, nounNames),
                  }
                  await nounVerbs[verb](context)
                  const updated = storage.get(noun, args.id)

                  const pastTense = verb.endsWith('e') ? verb + 'd' : verb + 'ed'
                  events.emit(`${singularize(noun)}${capitalize(pastTense)}`, updated)

                  data[name] = updated
                  break
                }
              }
            }
          }
        }

        return { data }
      } catch (err) {
        return { errors: [{ message: (err as Error).message }] }
      }
    },

    subscribe: (event: string, callback: SubscriptionCallback, options?: SubscriptionOptions): UnsubscribeFn => {
      return events.on(event, callback, options?.filter)
    },
  }
}
