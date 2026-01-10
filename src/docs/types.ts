/**
 * Documentation Generator Types
 *
 * Type definitions for the documentation generator that creates
 * API references, quickstarts, and guides from the app definition.
 */

/**
 * API endpoint documentation
 */
export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description?: string
  requestExample?: Record<string, unknown>
  responseExample?: Record<string, unknown> | Record<string, unknown>[]
  curlExample?: string
  jsExample?: string
  pythonExample?: string
  goExample?: string
  parameters?: EndpointParameter[]
  errorResponses?: ErrorResponse[]
}

/**
 * Endpoint parameter definition
 */
export interface EndpointParameter {
  name: string
  type: string
  required: boolean
  description?: string
}

/**
 * Error response definition
 */
export interface ErrorResponse {
  status: number
  description: string
  example?: Record<string, unknown>
}

/**
 * Webhook event documentation
 */
export interface WebhookEvent {
  name: string
  description?: string
  payload?: Record<string, unknown>
  examplePayload?: {
    event: string
    data: Record<string, unknown>
    timestamp: string
  }
}

/**
 * Schema field documentation
 */
export interface SchemaField {
  type: string
  required: boolean
  values?: string[]
  target?: string
}

/**
 * SDK quickstart examples
 */
export interface SDKExamples {
  create?: string
  list?: string
  get?: string
  update?: string
  delete?: string
  [key: string]: string | undefined
}

/**
 * SDK quickstart page
 */
export interface SDKQuickstart extends DocsPage {
  initCode?: string
  examples?: SDKExamples
}

/**
 * Documentation page
 */
export interface DocsPage {
  slug: string
  title: string
  content: string
  frontmatter?: {
    title: string
    description?: string
    [key: string]: unknown
  }
  endpoints?: APIEndpoint[]
  events?: WebhookEvent[]
  schema?: Record<string, SchemaField>
}

/**
 * Navigation item
 */
export interface NavItem {
  title: string
  slug?: string
  children?: NavItem[]
}

/**
 * OpenAPI specification (subset)
 */
export interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  paths: Record<string, Record<string, unknown>>
  components?: Record<string, unknown>
}

/**
 * Documentation meta file content
 */
export interface DocsMeta {
  pages: string[]
}

/**
 * Documentation configuration
 */
export interface DocsConfig {
  appName?: string
  logo?: string
  primaryColor?: string
  baseUrl?: string
  version?: string
  templates?: {
    apiReference?: (noun: string) => string
    [key: string]: ((arg: string) => string) | undefined
  }
  plugins?: DocsPlugin[]
}

/**
 * Documentation plugin
 */
export interface DocsPlugin {
  name: string
  beforeGenerate?: (config: DocsConfig) => DocsConfig
  afterGenerate?: (docs: GeneratedDocs) => GeneratedDocs
}

/**
 * Generated documentation output
 */
export interface GeneratedDocs {
  pages: DocsPage[]
  config: DocsConfig
  baseUrl?: string
  version?: string
  navigation: NavItem[]
  meta: DocsMeta
  openapi: OpenAPISpec
  toFileStructure: () => Record<string, string>
}

/**
 * Section for documentation organization
 */
export interface DocsSection {
  title: string
  slug: string
  pages: DocsPage[]
}
