/**
 * API Generator
 *
 * Generates REST and GraphQL APIs from noun/verb definitions.
 * Supports API versioning, deprecation warnings, request validation,
 * custom middleware hooks, and OpenAPI specification generation.
 *
 * @module api-generator
 *
 * @example
 * ```typescript
 * import { createAPIGenerator } from './api-generator'
 *
 * const api = createAPIGenerator({
 *   nouns: {
 *     Todo: { title: 'string', done: 'boolean' }
 *   },
 *   verbs: {
 *     Todo: {
 *       complete: ($) => $.db.Todo.update($.id, { done: true })
 *     }
 *   },
 *   versioning: {
 *     enabled: true,
 *     defaultVersion: 'v1'
 *   }
 * })
 *
 * // Handle REST request
 * const response = await api.handleRequest({
 *   method: 'GET',
 *   path: '/todos',
 *   query: {},
 *   body: null
 * })
 * ```
 */

// Re-export all types
export * from './types'

// Re-export modules for direct access
export { RateLimiter, createRateLimiters, getRateLimiterForRequest } from './ratelimit'
export { extractAndValidateApiKey, getCorsHeaders } from './auth'
export { buildGraphQLSchema, createGraphQLHandler, createDbContext, parseGraphQL } from './graphql'
export { buildOpenAPISpec, generateOpenAPISpec, toYAML } from './openapi'
export { createRESTHandler } from './rest'
export { InMemoryStorage } from './storage'
export { EventEmitter } from './events'
export {
  generateId,
  pluralize,
  singularize,
  capitalize,
  parseWindow,
  mapFieldTypeToOpenAPI,
  validateField,
  matchPath,
} from './utilities'

// Import for internal use
import type {
  APIGeneratorConfig,
  APIGenerator,
  APIRequest,
  APIResponse,
  GraphQLRequest,
  GraphQLResponse,
  SubscriptionCallback,
  SubscriptionOptions,
  UnsubscribeFn,
  OpenAPISpec,
  RateLimitRule,
  RESTEndpoint,
  GraphQLSchema,
} from './types'

import { InMemoryStorage } from './storage'
import { EventEmitter } from './events'
import { createRESTHandler } from './rest'
import { createGraphQLHandler } from './graphql'
import { buildOpenAPISpec, toYAML } from './openapi'

/**
 * Creates a new API generator instance from the provided configuration
 *
 * The API generator provides:
 * - REST endpoints for CRUD operations on nouns
 * - REST endpoints for verb execution
 * - GraphQL schema generation (queries, mutations, subscriptions)
 * - OpenAPI specification generation
 * - Rate limiting and authentication
 * - API versioning and deprecation warnings
 * - Custom middleware hooks
 *
 * @param config - The API generator configuration
 * @returns An API generator instance
 */
export function createAPIGenerator(config: APIGeneratorConfig): APIGenerator {
  const { nouns, verbs = {} } = config
  const nounNames = Object.keys(nouns)

  // Initialize shared storage and events
  const storage = new InMemoryStorage(nounNames)
  const events = new EventEmitter()

  // Create REST handler
  const restHandler = createRESTHandler(config, storage, events)

  // Create GraphQL handler
  const graphqlHandler = createGraphQLHandler(nouns, verbs, storage, events)

  return {
    getEndpoint(method: string, pathPattern: string): RESTEndpoint | undefined {
      return restHandler.getEndpoint(method, pathPattern)
    },

    async handleRequest(request: APIRequest): Promise<APIResponse> {
      return restHandler.handleRequest(request)
    },

    getGraphQLSchema(): GraphQLSchema {
      return graphqlHandler.getSchema()
    },

    async executeGraphQL(request: GraphQLRequest): Promise<GraphQLResponse> {
      return graphqlHandler.execute(request)
    },

    subscribeGraphQL(event: string, callback: SubscriptionCallback, options?: SubscriptionOptions): UnsubscribeFn {
      return graphqlHandler.subscribe(event, callback, options)
    },

    generateOpenAPISpec(options?: { format?: 'json' | 'yaml' }): OpenAPISpec | string {
      const spec = buildOpenAPISpec(config)

      if (options?.format === 'yaml') {
        return toYAML(spec)
      }

      return spec
    },

    getRateLimitConfig(endpoint: string): RateLimitRule {
      return restHandler.getRateLimitConfig(endpoint)
    },
  }
}
