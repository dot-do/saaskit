/**
 * REST Handler Module
 *
 * REST endpoint handling, routing, and CRUD operations.
 *
 * @module api-generator/rest
 */

import type {
  RESTEndpoint,
  APIRequest,
  APIResponse,
  NounDefinitions,
  VerbDefinitions,
  VerbContext,
  RateLimitConfig,
  APIKeyAuth,
  CORSConfig,
  DeprecatedEndpoints,
  MiddlewareConfig,
  VersioningConfig,
  MiddlewareFn,
  PostHookFn,
  RateLimitRule,
} from './types'
import { pluralize, singularize, capitalize, generateId, validateField, matchPath } from './utilities'
import { InMemoryStorage } from './storage'
import { EventEmitter } from './events'
import { createRateLimiters, getRateLimiterForRequest } from './ratelimit'
import { extractAndValidateApiKey, getCorsHeaders } from './auth'
import { createDbContext } from './graphql'

/**
 * Configuration for the REST handler
 */
export interface RESTHandlerConfig {
  nouns: NounDefinitions
  verbs?: VerbDefinitions
  rateLimiting?: RateLimitConfig
  authentication?: APIKeyAuth
  cors?: CORSConfig
  versioning?: VersioningConfig
  deprecatedEndpoints?: DeprecatedEndpoints
  middleware?: MiddlewareConfig
}

/**
 * Creates a REST handler from configuration
 * @param config - REST handler configuration
 * @param storage - Storage instance
 * @param events - Event emitter instance
 * @returns REST handler functions
 */
export function createRESTHandler(
  config: RESTHandlerConfig,
  storage: InMemoryStorage,
  events: EventEmitter
): {
  handleRequest: (request: APIRequest) => Promise<APIResponse>
  getEndpoint: (method: string, pathPattern: string) => RESTEndpoint | undefined
  getRateLimitConfig: (endpoint: string) => RateLimitRule
} {
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

  // Rate limiters
  const { globalRateLimiter, rateLimiters } = createRateLimiters(rateLimiting)

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

  // Mark as intentionally unused for future support
  void deprecatedEndpoints
  void beforeMiddleware
  void afterHooks
  void versioning

  return {
    getEndpoint(method: string, pathPattern: string): RESTEndpoint | undefined {
      for (const [_, endpoint] of endpoints) {
        if (endpoint.method === method && endpoint.path === pathPattern) {
          return endpoint
        }
      }
      return undefined
    },

    async handleRequest(request: APIRequest): Promise<APIResponse> {
      const corsHeaders = getCorsHeaders(cors)

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
      const authResult = await extractAndValidateApiKey(request, authentication)
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
      const rateLimiter = getRateLimiterForRequest(endpointKey, authResult.keyInfo?.tier, rateLimiters, globalRateLimiter, rateLimiting)
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
                // Strip optional marker (?) for type comparison
                const fieldType = schema[key].replace('?', '')
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
              db: createDbContext(storage, nounNames),
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
