/**
 * API Generator Types
 *
 * Type definitions for the REST and GraphQL API generator.
 */

// ============================================================================
// Configuration Types
// ============================================================================

export type FieldType = 'string' | 'number' | 'boolean' | string

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

export interface CORSConfig {
  origin: string
  methods?: string[]
}

export interface APIGeneratorConfig {
  nouns: NounDefinitions
  verbs?: VerbDefinitions
  rateLimiting?: RateLimitConfig
  authentication?: APIKeyAuth
  cors?: CORSConfig
  info?: {
    title?: string
    version?: string
  }
  servers?: Array<{ url: string; description?: string }>
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
  body: any
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
  data?: any
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
      get: (id: string) => Promise<any>
      update: (id: string, data: any) => Promise<any>
      create: (data: any) => Promise<any>
      delete: (id: string) => Promise<void>
      list: (options?: { limit?: number; offset?: number }) => Promise<any[]>
      find: (filter: any) => Promise<any[]>
    }
  }
  apiKey?: APIKeyValidationResult
}

// ============================================================================
// API Generator Interface
// ============================================================================

export type SubscriptionCallback = (event: any) => void
export type UnsubscribeFn = () => void

export interface SubscriptionOptions {
  filter?: Record<string, unknown>
}

export interface APIGenerator {
  getEndpoint(method: string, path: string): RESTEndpoint | undefined
  handleRequest(request: APIRequest): Promise<APIResponse>
  getGraphQLSchema(): GraphQLSchema
  executeGraphQL(request: GraphQLRequest): Promise<GraphQLResponse>
  subscribeGraphQL(
    event: string,
    callback: SubscriptionCallback,
    options?: SubscriptionOptions
  ): UnsubscribeFn
  generateOpenAPISpec(options?: { format?: 'json' | 'yaml' }): OpenAPISpec | string
  getRateLimitConfig(endpoint: string): RateLimitRule
}
