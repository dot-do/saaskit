/**
 * API Generator Types
 *
 * Type definitions for the REST and GraphQL API generator.
 * Supports API versioning, deprecation warnings, and middleware hooks
 * for production-ready API management.
 *
 * @module api-generator/types
 */

// ============================================================================
// Configuration Types
// ============================================================================

export type FieldType = 'string' | 'number' | 'boolean' | string

// ============================================================================
// API Versioning Types
// ============================================================================

/**
 * Supported API version format (e.g., 'v1', 'v2')
 */
export type APIVersion = `v${number}`

/**
 * Version configuration for an API version
 */
export interface VersionConfig {
  /**
   * The version identifier (e.g., 'v1', 'v2')
   */
  version: APIVersion
  /**
   * Whether this version is deprecated
   */
  deprecated?: boolean
  /**
   * Deprecation message to include in response headers
   */
  deprecationMessage?: string
  /**
   * Sunset date for deprecated version (ISO 8601 format)
   */
  sunsetDate?: string
  /**
   * Override nouns for this version (merges with base nouns)
   */
  nouns?: NounDefinitions
  /**
   * Override verbs for this version
   */
  verbs?: VerbDefinitions
}

/**
 * API versioning configuration
 */
export interface VersioningConfig {
  /**
   * Whether versioning is enabled
   */
  enabled: boolean
  /**
   * The default version to use when none is specified
   */
  defaultVersion?: APIVersion
  /**
   * Version-specific configurations
   */
  versions?: Record<APIVersion, VersionConfig>
  /**
   * Header to use for version detection (e.g., 'X-API-Version')
   */
  versionHeader?: string
  /**
   * Whether to include version in URL path (e.g., /v1/todos)
   */
  includeInPath?: boolean
}

// ============================================================================
// Deprecation Types
// ============================================================================

/**
 * Deprecation notice for endpoints or fields
 */
export interface DeprecationNotice {
  /**
   * Whether the item is deprecated
   */
  deprecated: boolean
  /**
   * Human-readable deprecation message
   */
  message?: string
  /**
   * Suggested alternative endpoint or field
   */
  alternative?: string
  /**
   * Date when the deprecated item will be removed (ISO 8601)
   */
  sunsetDate?: string
  /**
   * Link to migration documentation
   */
  migrationGuide?: string
}

/**
 * Configuration for deprecated endpoints
 */
export interface DeprecatedEndpoints {
  /**
   * Map of endpoint patterns to deprecation notices
   * Pattern format: "METHOD /path" (e.g., "GET /users/:id")
   */
  [endpointPattern: string]: DeprecationNotice
}

// ============================================================================
// Middleware Types
// ============================================================================

/**
 * Context passed to middleware functions
 */
export interface MiddlewareContext {
  /**
   * The incoming request
   */
  request: APIRequest
  /**
   * The matched endpoint, if any
   */
  endpoint?: RESTEndpoint
  /**
   * Path parameters extracted from URL
   */
  params: Record<string, string>
  /**
   * API key validation result, if authenticated
   */
  apiKey?: APIKeyValidationResult
  /**
   * API version being used
   */
  version?: APIVersion
  /**
   * Deprecation notice for this endpoint, if any
   */
  deprecation?: DeprecationNotice
  /**
   * Custom state that can be shared between middleware
   */
  state: Record<string, unknown>
}

/**
 * Result from middleware execution
 */
export interface MiddlewareResult {
  /**
   * If true, continue to next middleware. If false, stop and return response.
   */
  continue: boolean
  /**
   * Response to return if continue is false
   */
  response?: APIResponse
  /**
   * Updated context to pass to next middleware
   */
  context?: Partial<MiddlewareContext>
}

/**
 * Middleware function signature
 */
export type MiddlewareFn = (context: MiddlewareContext) => Promise<MiddlewareResult> | MiddlewareResult

/**
 * Hook that runs after request handling
 */
export type PostHookFn = (context: MiddlewareContext, response: APIResponse) => Promise<APIResponse> | APIResponse

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  /**
   * Middleware to run before request handling
   */
  before?: MiddlewareFn[]
  /**
   * Hooks to run after request handling
   */
  after?: PostHookFn[]
}

// ============================================================================
// Breaking Change Detection Types
// ============================================================================

/**
 * Types of breaking changes that can be detected
 */
export type BreakingChangeType =
  | 'field_removed'
  | 'field_type_changed'
  | 'required_field_added'
  | 'endpoint_removed'
  | 'verb_removed'
  | 'response_format_changed'

/**
 * A detected breaking change
 */
export interface BreakingChange {
  /**
   * Type of the breaking change
   */
  type: BreakingChangeType
  /**
   * Affected noun name
   */
  noun?: string
  /**
   * Affected field name
   */
  field?: string
  /**
   * Affected endpoint path
   */
  endpoint?: string
  /**
   * Previous value/type
   */
  previous?: string
  /**
   * New value/type
   */
  current?: string
  /**
   * Human-readable description
   */
  description: string
  /**
   * Severity level
   */
  severity: 'error' | 'warning'
}

export interface NounDefinition {
  [field: string]: FieldType
}

export interface NounDefinitions {
  [noun: string]: NounDefinition
}

export type VerbHandler = (context: VerbContext) => unknown | Promise<unknown>

export interface VerbDefinitions {
  [noun: string]: {
    [verb: string]: VerbHandler
  }
}

export interface RateLimitRule {
  requests: number
  window: string
}

export interface RateLimitConfig {
  requests?: number
  window?: string
  default?: RateLimitRule
  endpoints?: Record<string, RateLimitRule>
  tiers?: Record<string, RateLimitRule>
}

export interface APIKeyValidationResult {
  valid: boolean
  keyId?: string
  tier?: string
  organizationId?: string
}

export interface APIKeyAuth {
  apiKeys: boolean
  validateKey?: (key: string) => Promise<boolean | APIKeyValidationResult>
  allowQueryParam?: boolean
  publicEndpoints?: string[]
}

/**
 * CORS configuration options
 */
export interface CORSConfig {
  /**
   * Allowed origin(s) - can be '*' or a specific origin
   */
  origin: string
  /**
   * Allowed HTTP methods
   */
  methods?: string[]
  /**
   * Allowed headers for preflight requests
   */
  allowedHeaders?: string[]
  /**
   * Headers to expose to the client
   */
  exposedHeaders?: string[]
  /**
   * Whether to allow credentials
   */
  credentials?: boolean
  /**
   * How long preflight results can be cached (in seconds)
   */
  maxAge?: number
}

/**
 * Main configuration for the API Generator
 *
 * @example
 * ```typescript
 * const config: APIGeneratorConfig = {
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
 *     defaultVersion: 'v1',
 *     versions: {
 *       v1: { version: 'v1' },
 *       v2: { version: 'v2', nouns: { Todo: { title: 'string', done: 'boolean', priority: 'number' } } }
 *     }
 *   }
 * }
 * ```
 */
export interface APIGeneratorConfig {
  /**
   * Noun definitions - the data models for your API
   */
  nouns: NounDefinitions
  /**
   * Verb definitions - custom actions that can be performed on nouns
   */
  verbs?: VerbDefinitions
  /**
   * Rate limiting configuration
   */
  rateLimiting?: RateLimitConfig
  /**
   * API key authentication configuration
   */
  authentication?: APIKeyAuth
  /**
   * CORS configuration
   */
  cors?: CORSConfig
  /**
   * API information for OpenAPI spec
   */
  info?: {
    title?: string
    version?: string
  }
  /**
   * Server URLs for OpenAPI spec
   */
  servers?: Array<{ url: string; description?: string }>
  /**
   * API versioning configuration
   */
  versioning?: VersioningConfig
  /**
   * Deprecated endpoints configuration
   */
  deprecatedEndpoints?: DeprecatedEndpoints
  /**
   * Middleware hooks for request processing
   */
  middleware?: MiddlewareConfig
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface APIRequest {
  method: string
  path: string
  query: Record<string, string>
  body: unknown
  headers?: Record<string, string>
}

export interface APIResponse {
  status: number
  body: unknown
  headers: Record<string, string>
}

// ============================================================================
// REST Types
// ============================================================================

export interface RESTEndpoint {
  method: string
  path: string
  noun: string
  operation: 'list' | 'get' | 'create' | 'update' | 'delete' | 'verb'
  verb?: string
}

// ============================================================================
// GraphQL Types
// ============================================================================

export interface GraphQLQuery {
  name: string
  returnType: string
  args?: Record<string, string>
}

export interface GraphQLMutation {
  name: string
  returnType: string
  args?: Record<string, string>
}

export interface GraphQLSubscription {
  name: string
  returnType: string
}

export interface GraphQLSchema {
  queries: Record<string, GraphQLQuery>
  mutations: Record<string, GraphQLMutation>
  subscriptions: Record<string, GraphQLSubscription>
  types: Record<string, Record<string, string>>
}

export interface GraphQLRequest {
  query: string
  variables?: Record<string, unknown>
}

export interface GraphQLResponse {
  data?: Record<string, unknown>
  errors?: Array<{ message: string }>
}

// ============================================================================
// OpenAPI Types
// ============================================================================

export interface OpenAPIParameter {
  name: string
  in: 'query' | 'path' | 'header'
  required?: boolean
  schema: { type: string }
}

export interface OpenAPIOperation {
  summary?: string
  operationId?: string
  parameters?: OpenAPIParameter[]
  requestBody?: {
    required?: boolean
    content: {
      'application/json': {
        schema: { $ref: string }
      }
    }
  }
  responses: Record<
    string,
    {
      description: string
      content?: {
        'application/json': {
          schema: { $ref: string } | { type: string }
        }
      }
    }
  >
}

export interface OpenAPIPath {
  get?: OpenAPIOperation
  post?: OpenAPIOperation
  put?: OpenAPIOperation
  delete?: OpenAPIOperation
}

export interface OpenAPISchema {
  type: string
  properties?: Record<string, { type: string; enum?: string[] }>
  required?: string[]
}

export interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
  }
  servers?: Array<{ url: string; description?: string }>
  paths: Record<string, OpenAPIPath>
  components: {
    schemas: Record<string, OpenAPISchema>
  }
}

// ============================================================================
// Verb Context
// ============================================================================

export interface VerbContext {
  id: string
  input: unknown
  db: {
    [noun: string]: {
      get: (id: string) => Promise<Record<string, unknown> | null>
      update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>
      create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
      delete: (id: string) => Promise<void>
      list: (options?: { limit?: number; offset?: number }) => Promise<Record<string, unknown>[]>
      find: (filter: Record<string, unknown>) => Promise<Record<string, unknown>[]>
    }
  }
  apiKey?: APIKeyValidationResult
}

// ============================================================================
// API Generator Interface
// ============================================================================

export type SubscriptionCallback = (event: Record<string, unknown>) => void
export type UnsubscribeFn = () => void

export interface SubscriptionOptions {
  filter?: Record<string, unknown>
}

/**
 * The main API Generator interface
 *
 * Provides methods for handling REST and GraphQL requests, generating
 * OpenAPI specifications, and managing API versioning and deprecation.
 */
export interface APIGenerator {
  /**
   * Get a REST endpoint definition by method and path pattern
   * @param method - HTTP method (GET, POST, PUT, DELETE)
   * @param path - URL path pattern (e.g., '/todos/:id')
   * @returns The endpoint definition if found
   */
  getEndpoint(method: string, path: string): RESTEndpoint | undefined

  /**
   * Handle an incoming REST API request
   * @param request - The API request to handle
   * @returns The API response
   */
  handleRequest(request: APIRequest): Promise<APIResponse>

  /**
   * Get the GraphQL schema for this API
   * @returns The GraphQL schema with queries, mutations, and subscriptions
   */
  getGraphQLSchema(): GraphQLSchema

  /**
   * Execute a GraphQL query or mutation
   * @param request - The GraphQL request with query and optional variables
   * @returns The GraphQL response with data or errors
   */
  executeGraphQL(request: GraphQLRequest): Promise<GraphQLResponse>

  /**
   * Subscribe to GraphQL subscription events
   * @param event - Event name to subscribe to (e.g., 'todoCreated')
   * @param callback - Function to call when event occurs
   * @param options - Optional filter to apply to events
   * @returns Unsubscribe function
   */
  subscribeGraphQL(
    event: string,
    callback: SubscriptionCallback,
    options?: SubscriptionOptions
  ): UnsubscribeFn

  /**
   * Generate an OpenAPI specification for this API
   * @param options - Output format options
   * @returns The OpenAPI spec as an object or YAML string
   */
  generateOpenAPISpec(options?: { format?: 'json' | 'yaml'; version?: APIVersion }): OpenAPISpec | string

  /**
   * Get the rate limit configuration for an endpoint
   * @param endpoint - Endpoint pattern (e.g., 'GET /todos')
   * @returns The rate limit rule
   */
  getRateLimitConfig(endpoint: string): RateLimitRule

  /**
   * Get the list of supported API versions
   * @returns Array of version identifiers
   */
  getVersions?(): APIVersion[]

  /**
   * Check if an endpoint or version is deprecated
   * @param endpoint - Endpoint pattern to check
   * @param version - Optional version to check
   * @returns Deprecation notice if deprecated, undefined otherwise
   */
  getDeprecationNotice?(endpoint: string, version?: APIVersion): DeprecationNotice | undefined

  /**
   * Detect breaking changes between two versions
   * @param fromVersion - Source version
   * @param toVersion - Target version
   * @returns Array of detected breaking changes
   */
  detectBreakingChanges?(fromVersion: APIVersion, toVersion: APIVersion): BreakingChange[]

  /**
   * Add middleware to the request processing pipeline
   * @param middleware - Middleware function to add
   * @param position - Where to insert ('before' or 'after')
   */
  addMiddleware?(middleware: MiddlewareFn, position?: 'before' | 'after'): void

  /**
   * Add a post-processing hook
   * @param hook - Hook function to add
   */
  addPostHook?(hook: PostHookFn): void
}
