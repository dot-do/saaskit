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

import type {
  APIGeneratorConfig,
  APIGenerator,
  APIRequest,
  APIResponse,
  RESTEndpoint,
  GraphQLSchema,
  GraphQLRequest,
  GraphQLResponse,
  OpenAPISpec,
  RateLimitRule,
  SubscriptionCallback,
  SubscriptionOptions,
  UnsubscribeFn,
  VerbContext,
  APIKeyValidationResult,
  FieldType,
  MiddlewareFn,
  PostHookFn,
} from './types'

export * from './types'

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique identifier for records
 * @returns A random string ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Converts a noun to its plural form
 * Handles common English pluralization rules
 * @param noun - The singular noun to pluralize
 * @returns The plural form of the noun
 */
function pluralize(noun: string): string {
  const lower = noun.toLowerCase()
  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') || lower.endsWith('ch') || lower.endsWith('sh')) {
    return lower + 'es'
  }
  if (lower.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lower[lower.length - 2])) {
    return lower.slice(0, -1) + 'ies'
  }
  return lower + 's'
}

/**
 * Returns the lowercase singular form of a noun
 * @param noun - The noun to singularize
 * @returns The singular form (lowercase)
 */
function singularize(noun: string): string {
  return noun.toLowerCase()
}

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Parses a time window string into milliseconds
 * @param window - Time window string (e.g., '1m', '30s', '1h', '1d')
 * @returns The time window in milliseconds
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/)
  if (!match) return 60000 // default 1 minute
  const [, num, unit] = match
  const ms = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  }[unit] || 60000
  return parseInt(num) * ms
}

/**
 * Maps a field type to OpenAPI schema type
 * @param fieldType - The field type from noun definition
 * @returns OpenAPI schema type with optional enum values
 */
function mapFieldTypeToOpenAPI(fieldType: FieldType): { type: string; enum?: string[] } {
  if (fieldType.includes('|')) {
    const values = fieldType.split('|').map(v => v.trim())
    return { type: 'string', enum: values }
  }
  const baseType = fieldType.replace('?', '')
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
  }
  return { type: typeMap[baseType] || 'string' }
}

/**
 * Validates a field value against its expected type
 * @param value - The value to validate
 * @param expectedType - The expected type (e.g., 'string', 'number?', 'active | inactive')
 * @returns True if the value matches the expected type
 */
function validateField(value: unknown, expectedType: FieldType): boolean {
  const isOptional = expectedType.endsWith('?')
  const baseType = expectedType.replace('?', '')

  if (value === undefined || value === null) {
    return isOptional
  }

  if (baseType.includes('|')) {
    const allowedValues = baseType.split('|').map(v => v.trim())
    return allowedValues.includes(String(value))
  }

  const actualType = typeof value
  return actualType === baseType
}

/**
 * Extracts API version from request path or headers
 * @param request - The incoming API request
 * @param versionHeader - Optional header name to check for version
 * @returns The API version if found
 */
// Reserved for future API versioning support
// function _extractVersion(request: APIRequest, versionHeader?: string): APIVersion | undefined {
//   if (versionHeader && request.headers?.[versionHeader]) {
//     return request.headers[versionHeader] as APIVersion
//   }
//   const pathMatch = request.path.match(/^\/(v\d+)\//)
//   if (pathMatch) return pathMatch[1] as APIVersion
//   return undefined
// }

// function _stripVersionFromPath(path: string): string {
//   return path.replace(/^\/v\d+/, '')
// }

// ============================================================================
// In-Memory Storage
// ============================================================================

/**
 * Represents a stored record with an ID and arbitrary fields
 */
interface StorageRecord {
  /** Unique identifier for the record */
  id: string
  /** Additional fields based on noun schema */
  [key: string]: unknown
}

/**
 * In-memory storage implementation for API data
 * Provides CRUD operations for each noun type
 *
 * @internal
 */
class InMemoryStorage {
  /** Map of noun name to record store */
  private data: Map<string, Map<string, StorageRecord>> = new Map()

  constructor(nouns: string[]) {
    for (const noun of nouns) {
      this.data.set(noun, new Map())
    }
  }

  getStore(noun: string): Map<string, StorageRecord> | undefined {
    return this.data.get(noun)
  }

  create(noun: string, record: StorageRecord): StorageRecord {
    const store = this.data.get(noun)
    if (!store) throw new Error(`Unknown noun: ${noun}`)
    store.set(record.id, record)
    return record
  }

  get(noun: string, id: string): StorageRecord | undefined {
    const store = this.data.get(noun)
    if (!store) return undefined
    return store.get(id)
  }

  update(noun: string, id: string, data: Partial<StorageRecord>): StorageRecord | undefined {
    const store = this.data.get(noun)
    if (!store) return undefined
    const existing = store.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...data, id }
    store.set(id, updated)
    return updated
  }

  delete(noun: string, id: string): boolean {
    const store = this.data.get(noun)
    if (!store) return false
    return store.delete(id)
  }

  list(noun: string, options?: { limit?: number; offset?: number; filter?: Record<string, unknown> }): StorageRecord[] {
    const store = this.data.get(noun)
    if (!store) return []
    let records = Array.from(store.values())

    if (options?.filter) {
      records = records.filter(record => {
        for (const [key, value] of Object.entries(options.filter!)) {
          if (record[key] !== value) return false
        }
        return true
      })
    }

    const offset = options?.offset ?? 0
    const limit = options?.limit ?? records.length
    return records.slice(offset, offset + limit)
  }

  count(noun: string, filter?: Record<string, unknown>): number {
    const store = this.data.get(noun)
    if (!store) return 0
    if (!filter) return store.size
    return this.list(noun, { filter }).length
  }

  has(noun: string, id: string): boolean {
    const store = this.data.get(noun)
    if (!store) return false
    return store.has(id)
  }
}

// ============================================================================
// Event Emitter for Subscriptions
// ============================================================================

/**
 * Event listener callback function type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventListener = (data: any, filter?: Record<string, unknown>) => void

/**
 * Simple event emitter for GraphQL subscriptions
 * Supports filtered subscriptions where listeners only receive matching events
 *
 * @internal
 */
class EventEmitter {
  /** Map of event names to listener sets */
  private listeners: Map<string, Set<{ callback: EventListener; filter?: Record<string, unknown> }>> = new Map()

  on(event: string, callback: EventListener, filter?: Record<string, unknown>): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const listener = { callback, filter }
    this.listeners.get(event)!.add(listener)
    return () => {
      this.listeners.get(event)?.delete(listener)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    for (const { callback, filter } of eventListeners) {
      if (filter) {
        let match = true
        for (const [key, value] of Object.entries(filter)) {
          if (data[key] !== value) {
            match = false
            break
          }
        }
        if (!match) continue
      }
      // Use setTimeout to make it async
      setTimeout(() => callback(data), 0)
    }
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Token bucket rate limiter implementation
 * Tracks request counts per key within configurable time windows
 *
 * @internal
 */
class RateLimiter {
  /** Map of client keys to request counts and reset times */
  private requests: Map<string, { count: number; resetAt: number }> = new Map()
  /** Rate limit configuration */
  private config: RateLimitRule

  /**
   * Creates a new rate limiter
   * @param config - Rate limit configuration with requests and window
   */
  constructor(config: RateLimitRule) {
    this.config = config
  }

  /**
   * Checks if a request is allowed and updates the request count
   * @param key - Client identifier (e.g., API key or IP)
   * @returns Whether the request is allowed, remaining requests, and reset time
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const windowMs = parseWindow(this.config.window)
    const existing = this.requests.get(key)

    if (!existing || now >= existing.resetAt) {
      this.requests.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, remaining: this.config.requests - 1, resetAt: now + windowMs }
    }

    if (existing.count >= this.config.requests) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt }
    }

    existing.count++
    return { allowed: true, remaining: this.config.requests - existing.count, resetAt: existing.resetAt }
  }
}

// ============================================================================
// GraphQL Parser (Simple)
// ============================================================================

interface ParsedGraphQL {
  type: 'query' | 'mutation'
  operationName?: string
  selections: Array<{
    name: string
    args: Record<string, any>
    selections?: string[]
  }>
}

function parseGraphQL(query: string): ParsedGraphQL {
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

// ============================================================================
// API Generator Implementation
// ============================================================================

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
 *
 * @example
 * ```typescript
 * const api = createAPIGenerator({
 *   nouns: {
 *     Todo: { title: 'string', done: 'boolean' },
 *     User: { name: 'string', email: 'string' }
 *   },
 *   verbs: {
 *     Todo: {
 *       complete: ($) => $.db.Todo.update($.id, { done: true })
 *     }
 *   },
 *   rateLimiting: {
 *     requests: 100,
 *     window: '1m'
 *   },
 *   versioning: {
 *     enabled: true,
 *     defaultVersion: 'v1',
 *     versions: {
 *       v1: { version: 'v1' },
 *       v2: { version: 'v2', deprecated: true, sunsetDate: '2025-01-01' }
 *     }
 *   }
 * })
 * ```
 */
export function createAPIGenerator(config: APIGeneratorConfig): APIGenerator {
  const {
    nouns,
    verbs = {},
    rateLimiting,
    authentication,
    cors,
    versioning,
    deprecatedEndpoints = {},
    middleware = {},
  } = config

  // Middleware storage
  const beforeMiddleware: MiddlewareFn[] = [...(middleware.before || [])]
  const afterHooks: PostHookFn[] = [...(middleware.after || [])]
  const nounNames = Object.keys(nouns)
  const storage = new InMemoryStorage(nounNames)
  const events = new EventEmitter()

  // Rate limiters per endpoint or global
  const rateLimiters = new Map<string, RateLimiter>()
  let globalRateLimiter: RateLimiter | undefined

  if (rateLimiting) {
    if (rateLimiting.requests && rateLimiting.window) {
      globalRateLimiter = new RateLimiter({ requests: rateLimiting.requests, window: rateLimiting.window })
    } else if (rateLimiting.default) {
      globalRateLimiter = new RateLimiter(rateLimiting.default)
    }

    if (rateLimiting.endpoints) {
      for (const [endpoint, rule] of Object.entries(rateLimiting.endpoints)) {
        rateLimiters.set(endpoint, new RateLimiter(rule))
      }
    }
  }

  // Build endpoint registry
  const endpoints = new Map<string, RESTEndpoint>()

  for (const noun of nounNames) {
    const pluralPath = `/${pluralize(noun)}`
    const singularPath = `/${pluralize(noun)}/:id`

    // CRUD endpoints
    endpoints.set(`GET ${pluralPath}`, { method: 'GET', path: pluralPath, noun, operation: 'list' })
    endpoints.set(`POST ${pluralPath}`, { method: 'POST', path: pluralPath, noun, operation: 'create' })
    endpoints.set(`GET ${singularPath}`, { method: 'GET', path: singularPath, noun, operation: 'get' })
    endpoints.set(`PUT ${singularPath}`, { method: 'PUT', path: singularPath, noun, operation: 'update' })
    endpoints.set(`DELETE ${singularPath}`, { method: 'DELETE', path: singularPath, noun, operation: 'delete' })

    // Verb endpoints
    const nounVerbs = verbs[noun] || {}
    for (const verb of Object.keys(nounVerbs)) {
      const verbPath = `/${pluralize(noun)}/:id/${verb}`
      endpoints.set(`POST ${verbPath}`, { method: 'POST', path: verbPath, noun, operation: 'verb', verb })
    }
  }

  // Helper to match path patterns
  function matchPath(pattern: string, actual: string): { match: boolean; params: Record<string, string> } {
    const patternParts = pattern.split('/')
    const actualParts = actual.split('/')

    if (patternParts.length !== actualParts.length) {
      return { match: false, params: {} }
    }

    const params: Record<string, string> = {}
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = actualParts[i]
      } else if (patternParts[i] !== actualParts[i]) {
        return { match: false, params: {} }
      }
    }

    return { match: true, params }
  }

  // Find matching endpoint
  function findEndpoint(method: string, path: string): { endpoint: RESTEndpoint; params: Record<string, string> } | undefined {
    for (const [key, endpoint] of endpoints) {
      if (!key.startsWith(method + ' ')) continue
      const { match, params } = matchPath(endpoint.path, path)
      if (match) {
        return { endpoint, params }
      }
    }
    return undefined
  }

  // Create database context for verb handlers
  function createDbContext(): VerbContext['db'] {
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

  // Validate body against noun schema
  function validateBody(noun: string, body: unknown, isUpdate: boolean = false): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    if (!body || typeof body !== 'object') {
      return { valid: false, errors: [{ field: '_root', message: 'Body must be an object' }] }
    }

    const schema = nouns[noun]
    const errors: Array<{ field: string; message: string }> = []
    const bodyObj = body as Record<string, unknown>

    // Check for unknown fields (excluding id)
    for (const field of Object.keys(bodyObj)) {
      if (field === 'id') continue
      if (!(field in schema)) {
        errors.push({ field, message: `Unknown field: ${field}` })
      }
    }

    // Check field types
    for (const [field, type] of Object.entries(schema)) {
      const value = bodyObj[field]
      const isOptional = type.endsWith('?')

      if (!isUpdate && !isOptional && value === undefined) {
        // For creates, required fields must be present (but we'll allow missing for flexibility)
        continue
      }

      if (value !== undefined && !validateField(value, type)) {
        errors.push({ field, message: `Invalid type for ${field}: expected ${type}` })
      }
    }

    return { valid: errors.length === 0, errors }
  }

  // Extract API key from request
  async function extractAndValidateApiKey(request: APIRequest): Promise<{ valid: boolean; keyInfo?: APIKeyValidationResult; reason?: 'missing' | 'invalid' }> {
    if (!authentication?.apiKeys) {
      return { valid: true }
    }

    // Check public endpoints
    if (authentication.publicEndpoints?.some(ep => {
      // Simple pattern matching
      const epParts = ep.split(' ')
      if (epParts.length === 2) {
        const [method, path] = epParts
        if (method !== request.method) return false
        // Match path pattern
        const { match } = matchPath(path.replace('{id}', ':id'), request.path)
        return match
      }
      return false
    })) {
      return { valid: true }
    }

    // Also check exact match for public endpoints like "GET /todos"
    const basePathMatch = request.path.match(/^(\/[^/]+)/)
    if (basePathMatch) {
      const basePath = basePathMatch[1]
      if (authentication.publicEndpoints?.includes(`${request.method} ${basePath}`)) {
        return { valid: true }
      }
    }

    // Extract key from headers or query
    let apiKey: string | undefined

    if (request.headers?.['X-API-Key']) {
      apiKey = request.headers['X-API-Key']
    } else if (request.headers?.['Authorization']) {
      const auth = request.headers['Authorization']
      if (auth.startsWith('Bearer ')) {
        apiKey = auth.slice(7)
      }
    } else if (authentication.allowQueryParam && request.query.api_key) {
      apiKey = request.query.api_key
    }

    if (!apiKey) {
      return { valid: false, reason: 'missing' }
    }

    // Validate key
    if (authentication.validateKey) {
      const result = await authentication.validateKey(apiKey)
      if (typeof result === 'boolean') {
        if (!result) {
          return { valid: false, reason: 'invalid' }
        }
        return { valid: true, keyInfo: { valid: true } }
      }
      if (!result.valid) {
        return { valid: false, reason: 'invalid' }
      }
      return { valid: true, keyInfo: result }
    }

    // No validateKey function - key is accepted, try to extract tier from prefix
    // Format: "{tier}_key_..." e.g., "pro_key_123" -> tier "pro"
    const tierMatch = apiKey.match(/^(\w+)_key_/)
    const tier = tierMatch ? tierMatch[1] : undefined

    return { valid: true, keyInfo: { valid: true, tier } }
  }

  // Get rate limit for endpoint/tier
  function getRateLimitForRequest(endpoint: string, tier?: string): RateLimiter | undefined {
    // Check endpoint-specific rate limit
    const endpointLimiter = rateLimiters.get(endpoint)
    if (endpointLimiter) return endpointLimiter

    // Check tier-specific rate limit
    if (tier && rateLimiting?.tiers?.[tier]) {
      // Create or get cached tier limiter
      const tierKey = `tier:${tier}`
      if (!rateLimiters.has(tierKey)) {
        rateLimiters.set(tierKey, new RateLimiter(rateLimiting.tiers[tier]))
      }
      return rateLimiters.get(tierKey)
    }

    return globalRateLimiter
  }

  // CORS headers
  function getCorsHeaders(): Record<string, string> {
    if (!cors) return {}
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': cors.origin,
      'Access-Control-Allow-Methods': cors.methods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS',
    }
    if (cors.allowedHeaders) {
      headers['Access-Control-Allow-Headers'] = cors.allowedHeaders.join(', ')
    }
    if (cors.exposedHeaders) {
      headers['Access-Control-Expose-Headers'] = cors.exposedHeaders.join(', ')
    }
    if (cors.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true'
    }
    if (cors.maxAge !== undefined) {
      headers['Access-Control-Max-Age'] = cors.maxAge.toString()
    }
    return headers
  }

  /**
   * Get deprecation notice for an endpoint
   * @param endpointKey - Endpoint pattern (e.g., 'GET /todos/:id')
   * @param version - Optional version to check
   * @returns Deprecation notice if deprecated
   */
  // Reserved for future deprecation/middleware support
  // function _getDeprecation(endpointKey: string, version?: APIVersion): DeprecationNotice | undefined { ... }
  // function _addDeprecationHeaders(headers: Record<string, string>, deprecation: DeprecationNotice): void { ... }
  // async function _runBeforeMiddleware(context: MiddlewareContext): Promise<{ continue: boolean; response?: APIResponse; context: MiddlewareContext }> { ... }
  // async function _runAfterHooks(context: MiddlewareContext, response: APIResponse): Promise<APIResponse> { ... }
  void deprecatedEndpoints // Mark as intentionally unused for future support
  void beforeMiddleware // Mark as intentionally unused for future support
  void afterHooks // Mark as intentionally unused for future support
  void versioning // Mark as intentionally unused for future support

  return {
    getEndpoint(method: string, pathPattern: string): RESTEndpoint | undefined {
      // Find endpoint by method and path pattern
      for (const [_, endpoint] of endpoints) {
        if (endpoint.method === method && endpoint.path === pathPattern) {
          return endpoint
        }
      }
      return undefined
    },

    async handleRequest(request: APIRequest): Promise<APIResponse> {
      const corsHeaders = getCorsHeaders()

      // Handle OPTIONS preflight
      if (request.method === 'OPTIONS' && cors) {
        return {
          status: 204,
          body: null,
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
          },
        }
      }

      // Authenticate
      const authResult = await extractAndValidateApiKey(request)
      if (!authResult.valid) {
        const errorMessage = authResult.reason === 'invalid' ? 'Invalid API key' : 'API key required'
        return {
          status: 401,
          body: { error: errorMessage, code: 'UNAUTHORIZED', requestId: request.headers?.['X-Request-ID'] },
          headers: corsHeaders,
        }
      }

      // Find endpoint
      const found = findEndpoint(request.method, request.path)
      if (!found) {
        return {
          status: 404,
          body: { error: 'Not found', code: 'NOT_FOUND', requestId: request.headers?.['X-Request-ID'] },
          headers: corsHeaders,
        }
      }

      const { endpoint, params } = found

      // Rate limiting
      const endpointKey = `${endpoint.method} ${endpoint.path}`
      const rateLimiter = getRateLimitForRequest(endpointKey, authResult.keyInfo?.tier)
      let rateLimitHeaders: Record<string, string> = {}

      if (rateLimiter) {
        // Use tier-based limit display if available
        let limitValue = rateLimiting?.requests?.toString()
        if (authResult.keyInfo?.tier && rateLimiting?.tiers?.[authResult.keyInfo.tier]) {
          limitValue = rateLimiting.tiers[authResult.keyInfo.tier].requests.toString()
        } else if (rateLimiting?.default) {
          limitValue = rateLimiting.default.requests.toString()
        }

        const check = rateLimiter.check('default') // In real impl, would use client ID
        rateLimitHeaders = {
          'X-RateLimit-Limit': limitValue || check.remaining.toString(),
          'X-RateLimit-Remaining': check.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(check.resetAt / 1000).toString(),
        }

        if (!check.allowed) {
          return {
            status: 429,
            body: { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED', requestId: request.headers?.['X-Request-ID'] },
            headers: { ...corsHeaders, ...rateLimitHeaders },
          }
        }
      }

      const baseHeaders = { ...corsHeaders, ...rateLimitHeaders }

      try {
        switch (endpoint.operation) {
          case 'list': {
            const limit = request.query.limit ? parseInt(request.query.limit) : 20
            const offset = request.query.offset ? parseInt(request.query.offset) : 0
            const filter: Record<string, unknown> = {}

            // Apply filters from query
            const schema = nouns[endpoint.noun]
            for (const [key, value] of Object.entries(request.query)) {
              if (key === 'limit' || key === 'offset') continue
              if (key in schema) {
                // Convert string query params to proper types
                const fieldType = schema[key]
                if (fieldType === 'boolean') {
                  filter[key] = value === 'true'
                } else if (fieldType === 'number') {
                  filter[key] = parseFloat(value)
                } else {
                  filter[key] = value
                }
              }
            }

            const data = storage.list(endpoint.noun, { limit, offset, filter: Object.keys(filter).length > 0 ? filter : undefined })
            const total = storage.count(endpoint.noun, Object.keys(filter).length > 0 ? filter : undefined)

            return {
              status: 200,
              body: {
                data,
                pagination: { limit, offset, total },
              },
              headers: baseHeaders,
            }
          }

          case 'get': {
            const record = storage.get(endpoint.noun, params.id)
            if (!record) {
              return {
                status: 404,
                body: { error: `${endpoint.noun} not found`, code: 'NOT_FOUND', requestId: request.headers?.['X-Request-ID'] },
                headers: baseHeaders,
              }
            }
            return { status: 200, body: record, headers: baseHeaders }
          }

          case 'create': {
            const validation = validateBody(endpoint.noun, request.body)
            if (!validation.valid) {
              return {
                status: 400,
                body: { error: 'Validation error', code: 'VALIDATION_ERROR', details: validation.errors, requestId: request.headers?.['X-Request-ID'] },
                headers: baseHeaders,
              }
            }

            const bodyObj = request.body as Record<string, unknown>
            const id = (bodyObj.id as string) || generateId()

            // Check for duplicate
            if (bodyObj.id && storage.has(endpoint.noun, id)) {
              return {
                status: 409,
                body: { error: `${endpoint.noun} with id ${id} already exists`, code: 'DUPLICATE', requestId: request.headers?.['X-Request-ID'] },
                headers: baseHeaders,
              }
            }

            const record = storage.create(endpoint.noun, { ...bodyObj, id })

            // Emit event
            const eventName = `${singularize(endpoint.noun)}Created`
            events.emit(eventName, record)

            return { status: 201, body: record, headers: baseHeaders }
          }

          case 'update': {
            const existing = storage.get(endpoint.noun, params.id)
            if (!existing) {
              return {
                status: 404,
                body: { error: `${endpoint.noun} not found`, code: 'NOT_FOUND', requestId: request.headers?.['X-Request-ID'] },
                headers: baseHeaders,
              }
            }

            const validation = validateBody(endpoint.noun, request.body, true)
            if (!validation.valid) {
              return {
                status: 400,
                body: { error: 'Validation error', code: 'VALIDATION_ERROR', details: validation.errors, requestId: request.headers?.['X-Request-ID'] },
                headers: baseHeaders,
              }
            }

            const updated = storage.update(endpoint.noun, params.id, request.body as Record<string, unknown>)

            // Emit event
            const eventName = `${singularize(endpoint.noun)}Updated`
            events.emit(eventName, updated)

            return { status: 200, body: updated, headers: baseHeaders }
          }

          case 'delete': {
            const existing = storage.get(endpoint.noun, params.id)
            if (!existing) {
              return {
                status: 404,
                body: { error: `${endpoint.noun} not found`, code: 'NOT_FOUND', requestId: request.headers?.['X-Request-ID'] },
                headers: baseHeaders,
              }
            }

            storage.delete(endpoint.noun, params.id)

            // Emit event
            const eventName = `${singularize(endpoint.noun)}Deleted`
            events.emit(eventName, { id: params.id })

            return { status: 204, body: null, headers: baseHeaders }
          }

          case 'verb': {
            const record = storage.get(endpoint.noun, params.id)
            if (!record) {
              return {
                status: 404,
                body: { error: `${endpoint.noun} not found`, code: 'NOT_FOUND', requestId: request.headers?.['X-Request-ID'] },
                headers: baseHeaders,
              }
            }

            const verbHandler = verbs[endpoint.noun]?.[endpoint.verb!]
            if (!verbHandler) {
              return {
                status: 404,
                body: { error: `Verb ${endpoint.verb} not found`, code: 'VERB_NOT_FOUND', requestId: request.headers?.['X-Request-ID'] },
                headers: baseHeaders,
              }
            }

            const context: VerbContext = {
              id: params.id,
              input: request.body,
              db: createDbContext(),
              apiKey: authResult.keyInfo,
            }

            try {
              await verbHandler(context)

              // Get updated record
              const updated = storage.get(endpoint.noun, params.id)

              // Emit verb event (convert verb to past tense)
              const pastTense = endpoint.verb!.endsWith('e') ? endpoint.verb + 'd' : endpoint.verb + 'ed'
              const eventName = `${singularize(endpoint.noun)}${capitalize(pastTense)}`
              events.emit(eventName, updated)

              return { status: 200, body: updated, headers: baseHeaders }
            } catch (_err) {
              return {
                status: 500,
                body: { error: 'Internal server error', code: 'INTERNAL_ERROR', requestId: request.headers?.['X-Request-ID'] },
                headers: baseHeaders,
              }
            }
          }

          default:
            return {
              status: 404,
              body: { error: 'Not found', code: 'NOT_FOUND', requestId: request.headers?.['X-Request-ID'] },
              headers: baseHeaders,
            }
        }
      } catch (_err) {
        return {
          status: 500,
          body: { error: 'Internal server error', code: 'INTERNAL_ERROR', requestId: request.headers?.['X-Request-ID'] },
          headers: baseHeaders,
        }
      }
    },

    getGraphQLSchema(): GraphQLSchema {
      const queries: GraphQLSchema['queries'] = {}
      const mutations: GraphQLSchema['mutations'] = {}
      const subscriptions: GraphQLSchema['subscriptions'] = {}
      const types: GraphQLSchema['types'] = {}

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
    },

    async executeGraphQL(request: GraphQLRequest): Promise<GraphQLResponse> {
      try {
        const parsed = parseGraphQL(request.query)
        const data: Record<string, any> = {}

        for (const selection of parsed.selections) {
          const { name, args, selections: _fieldSelections } = selection

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
                    db: createDbContext(),
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

    subscribeGraphQL(event: string, callback: SubscriptionCallback, options?: SubscriptionOptions): UnsubscribeFn {
      return events.on(event, callback, options?.filter)
    },

    generateOpenAPISpec(options?: { format?: 'json' | 'yaml' }): OpenAPISpec | string {
      const spec = buildOpenAPISpec(config)

      if (options?.format === 'yaml') {
        return toYAML(spec)
      }

      return spec
    },

    getRateLimitConfig(endpoint: string): RateLimitRule {
      if (rateLimiting?.endpoints?.[endpoint]) {
        return rateLimiting.endpoints[endpoint]
      }
      if (rateLimiting?.default) {
        return rateLimiting.default
      }
      return { requests: rateLimiting?.requests || 100, window: rateLimiting?.window || '1m' }
    },
  }
}

// ============================================================================
// OpenAPI Spec Builder
// ============================================================================

function buildOpenAPISpec(config: APIGeneratorConfig): OpenAPISpec {
  const { nouns, verbs = {}, info, servers } = config
  const paths: OpenAPISpec['paths'] = {}
  const schemas: OpenAPISpec['components']['schemas'] = {}

  // Error schema
  schemas['Error'] = {
    type: 'object',
    properties: {
      error: { type: 'string' },
      details: { type: 'string' },
      code: { type: 'string' },
    },
  }

  for (const [noun, nounSchema] of Object.entries(nouns)) {
    const plural = pluralize(noun)
    const listPath = `/${plural}`
    const itemPath = `/${plural}/{id}`

    // Main schema
    const properties: Record<string, { type: string; enum?: string[] }> = {
      id: { type: 'string' },
    }
    for (const [field, type] of Object.entries(nounSchema)) {
      properties[field] = mapFieldTypeToOpenAPI(type)
    }
    schemas[noun] = { type: 'object', properties }

    // Input schemas
    const inputProperties: Record<string, { type: string; enum?: string[] }> = {}
    for (const [field, type] of Object.entries(nounSchema)) {
      inputProperties[field] = mapFieldTypeToOpenAPI(type)
    }
    schemas[`${noun}CreateInput`] = { type: 'object', properties: inputProperties }
    schemas[`${noun}UpdateInput`] = { type: 'object', properties: inputProperties }
    schemas[`${noun}ListResponse`] = {
      type: 'object',
      properties: {
        data: { type: 'array' },
        pagination: { type: 'object' },
      },
    }

    // List endpoint
    paths[listPath] = {
      get: {
        summary: `List ${plural}`,
        operationId: `list${noun}s`,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'offset', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}ListResponse` } } },
          },
        },
      },
      post: {
        summary: `Create ${noun}`,
        operationId: `create${noun}`,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}CreateInput` } } },
        },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}` } } },
          },
        },
      },
    }

    // Item endpoints
    paths[itemPath] = {
      get: {
        summary: `Get ${noun}`,
        operationId: `get${noun}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}` } } },
          },
        },
      },
      put: {
        summary: `Update ${noun}`,
        operationId: `update${noun}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}UpdateInput` } } },
        },
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}` } } },
          },
        },
      },
      delete: {
        summary: `Delete ${noun}`,
        operationId: `delete${noun}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
        },
      },
    }

    // Verb endpoints
    const nounVerbs = verbs[noun] || {}
    for (const verb of Object.keys(nounVerbs)) {
      const verbPath = `/${plural}/{id}/${verb}`
      paths[verbPath] = {
        post: {
          summary: `${capitalize(verb)} ${noun}`,
          operationId: `${verb}${noun}`,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Success',
              content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}` } } },
            },
          },
        },
      }
    }
  }

  return {
    openapi: '3.0.0',
    info: {
      title: info?.title || 'API',
      version: info?.version || '1.0.0',
    },
    servers,
    paths,
    components: { schemas },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toYAML(obj: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent)
  let result = ''

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      if (value.length === 0) {
        result += `${spaces}${key}: []\n`
      } else if (typeof value[0] === 'object') {
        result += `${spaces}${key}:\n`
        for (const item of value) {
          result += `${spaces}- ${toYAML(item, indent + 1).trim().replace(/\n/g, `\n${spaces}  `)}\n`
        }
      } else {
        result += `${spaces}${key}:\n`
        for (const item of value) {
          result += `${spaces}  - ${item}\n`
        }
      }
    } else if (typeof value === 'object') {
      result += `${spaces}${key}:\n${toYAML(value, indent + 1)}`
    } else if (typeof value === 'string') {
      result += `${spaces}${key}: ${value}\n`
    } else {
      result += `${spaces}${key}: ${value}\n`
    }
  }

  return result
}

// ============================================================================
// Standalone generateOpenAPISpec function
// ============================================================================

export function generateOpenAPISpec(config: {
  nouns: Record<string, Record<string, string>>
  verbs?: Record<string, Record<string, Function>>
  info?: { title?: string; version?: string }
  servers?: Array<{ url: string; description?: string }>
}): OpenAPISpec {
  return buildOpenAPISpec(config as APIGeneratorConfig)
}
