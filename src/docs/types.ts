/**
 * Documentation Generator Types
 *
 * Type definitions for the documentation generator that creates
 * API references, quickstarts, and guides from the app definition.
 *
 * @module docs/types
 * @description
 * This module provides comprehensive type definitions for generating
 * Fumadocs-compatible documentation from SaaSkit app definitions.
 *
 * Key features supported:
 * - Full-text search indexing for fast content discovery
 * - Version-aware navigation with version switcher support
 * - Changelog integration for tracking API changes
 * - API playground configuration for interactive testing
 * - Copy code button with language-aware enhancements
 */

// ============================================================================
// API Endpoint Types
// ============================================================================

/**
 * HTTP methods supported by API endpoints
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * API endpoint documentation
 *
 * @description
 * Represents a single API endpoint with all its documentation metadata,
 * including request/response examples in multiple languages.
 *
 * @example
 * ```typescript
 * const endpoint: APIEndpoint = {
 *   method: 'POST',
 *   path: '/users',
 *   description: 'Create a new user',
 *   requestExample: { name: 'John', email: 'john@example.com.ai' },
 *   responseExample: { id: 'usr_123', name: 'John', email: 'john@example.com.ai' },
 * }
 * ```
 */
export interface APIEndpoint {
  /** HTTP method for this endpoint */
  method: HTTPMethod
  /** URL path pattern (e.g., '/users/:id') */
  path: string
  /** Human-readable description of what this endpoint does */
  description?: string
  /** Example request body for POST/PUT/PATCH requests */
  requestExample?: Record<string, unknown>
  /** Example response body (single object or array) */
  responseExample?: Record<string, unknown> | Record<string, unknown>[]
  /** Generated curl command example */
  curlExample?: string
  /** Generated JavaScript/TypeScript SDK example */
  jsExample?: string
  /** Generated Python SDK example */
  pythonExample?: string
  /** Generated Go SDK example */
  goExample?: string
  /** List of endpoint parameters */
  parameters?: EndpointParameter[]
  /** Possible error responses */
  errorResponses?: ErrorResponse[]
  /** Tags for categorization and filtering */
  tags?: string[]
  /** Whether this endpoint is deprecated */
  deprecated?: boolean
  /** Deprecation notice if deprecated */
  deprecationNotice?: string
  /** Rate limiting information */
  rateLimit?: RateLimitInfo
}

/**
 * Rate limiting information for an endpoint
 */
export interface RateLimitInfo {
  /** Requests per time window */
  requests: number
  /** Time window in seconds */
  window: number
  /** Description of the rate limit policy */
  description?: string
}

/**
 * Endpoint parameter definition
 *
 * @description
 * Describes a single parameter for an API endpoint, including
 * its type, whether it's required, and documentation.
 */
export interface EndpointParameter {
  /** Parameter name */
  name: string
  /** Parameter type (string, number, boolean, etc.) */
  type: string
  /** Whether this parameter is required */
  required: boolean
  /** Human-readable description */
  description?: string
  /** Default value if not provided */
  defaultValue?: unknown
  /** Example value for documentation */
  example?: unknown
  /** Where the parameter is located (path, query, body, header) */
  location?: 'path' | 'query' | 'body' | 'header'
}

/**
 * Error response definition
 *
 * @description
 * Documents a possible error response from an API endpoint.
 */
export interface ErrorResponse {
  /** HTTP status code */
  status: number
  /** Human-readable description of when this error occurs */
  description: string
  /** Example error response body */
  example?: Record<string, unknown>
  /** Error code for programmatic handling */
  code?: string
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Webhook event documentation
 *
 * @description
 * Documents a webhook event that the system can emit.
 */
export interface WebhookEvent {
  /** Event name (e.g., 'order.created') */
  name: string
  /** Human-readable description */
  description?: string
  /** Schema of the event payload */
  payload?: Record<string, unknown>
  /** Example webhook payload */
  examplePayload?: {
    /** Event type identifier */
    event: string
    /** Event data payload */
    data: Record<string, unknown>
    /** ISO timestamp of when the event occurred */
    timestamp: string
  }
  /** Version when this event was introduced */
  introducedIn?: string
  /** Whether this event is deprecated */
  deprecated?: boolean
}

// ============================================================================
// Schema Types
// ============================================================================

/**
 * Schema field documentation
 *
 * @description
 * Describes a single field in a resource schema.
 */
export interface SchemaField {
  /** Field type (string, number, boolean, enum, relation, etc.) */
  type: string
  /** Whether this field is required */
  required: boolean
  /** Enum values if type is 'enum' */
  values?: string[]
  /** Target noun if type is 'relation' */
  target?: string
  /** Human-readable description */
  description?: string
  /** Example value */
  example?: unknown
  /** Default value */
  defaultValue?: unknown
  /** Whether this field is read-only */
  readOnly?: boolean
  /** Whether this field is write-only (e.g., password) */
  writeOnly?: boolean
}

// ============================================================================
// SDK Types
// ============================================================================

/**
 * SDK quickstart examples
 *
 * @description
 * Code examples for common operations in each SDK.
 */
export interface SDKExamples {
  /** Create operation example */
  create?: string
  /** List operation example */
  list?: string
  /** Get operation example */
  get?: string
  /** Update operation example */
  update?: string
  /** Delete operation example */
  delete?: string
  /** Additional custom verb examples */
  [key: string]: string | undefined
}

/**
 * SDK quickstart page
 *
 * @description
 * Extended documentation page for SDK quickstart guides.
 */
export interface SDKQuickstart extends DocsPage {
  /** SDK client initialization code */
  initCode?: string
  /** Operation examples */
  examples?: SDKExamples
  /** SDK language identifier */
  language?: 'javascript' | 'python' | 'go' | 'ruby' | 'java' | 'csharp'
  /** Package/module name */
  packageName?: string
  /** Minimum required version */
  minVersion?: string
}

// ============================================================================
// Page and Navigation Types
// ============================================================================

/**
 * Documentation page
 *
 * @description
 * Represents a single documentation page with its content and metadata.
 */
export interface DocsPage {
  /** URL slug for this page */
  slug: string
  /** Page title */
  title: string
  /** MDX content */
  content: string
  /** Fumadocs frontmatter */
  frontmatter?: DocsPageFrontmatter
  /** API endpoints documented on this page */
  endpoints?: APIEndpoint[]
  /** Webhook events documented on this page */
  events?: WebhookEvent[]
  /** Schema fields documented on this page */
  schema?: Record<string, SchemaField>
  /** Search keywords for this page */
  searchKeywords?: string[]
  /** Last updated timestamp */
  lastUpdated?: string
  /** Page category for grouping */
  category?: string
}

/**
 * Frontmatter for documentation pages
 */
export interface DocsPageFrontmatter {
  /** Page title */
  title: string
  /** Page description for SEO and previews */
  description?: string
  /** Navigation icon */
  icon?: string
  /** Full path for breadcrumbs */
  full?: boolean
  /** Additional frontmatter fields */
  [key: string]: unknown
}

/**
 * Navigation item
 *
 * @description
 * Represents a navigation item in the docs sidebar.
 */
export interface NavItem {
  /** Display title */
  title: string
  /** URL slug */
  slug?: string
  /** Child navigation items */
  children?: NavItem[]
  /** Navigation icon */
  icon?: string
  /** Whether this item is expanded by default */
  defaultOpen?: boolean
  /** Badge text (e.g., 'New', 'Beta') */
  badge?: string
  /** Whether this is an external link */
  external?: boolean
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Search index entry for full-text search
 *
 * @description
 * Represents a searchable entry in the documentation search index.
 * Used to build fast client-side or server-side search functionality.
 */
export interface SearchIndexEntry {
  /** Unique identifier for this entry */
  id: string
  /** Page slug */
  slug: string
  /** Entry title */
  title: string
  /** Entry description or excerpt */
  description?: string
  /** Full searchable content (stripped of markdown) */
  content: string
  /** Entry type for filtering */
  type: 'page' | 'heading' | 'endpoint' | 'event' | 'sdk'
  /** Heading level if type is 'heading' */
  headingLevel?: number
  /** Anchor link within the page */
  anchor?: string
  /** Keywords for boosting search relevance */
  keywords?: string[]
  /** Category for filtering */
  category?: string
}

/**
 * Search index configuration
 */
export interface SearchConfig {
  /** Enable full-text search index generation */
  enabled?: boolean
  /** Fields to index */
  fields?: ('title' | 'description' | 'content' | 'keywords')[]
  /** Maximum content length per entry */
  maxContentLength?: number
  /** Whether to include code blocks in search */
  includeCodeBlocks?: boolean
}

// ============================================================================
// Version and Changelog Types
// ============================================================================

/**
 * Version information for the documentation
 */
export interface VersionInfo {
  /** Version identifier (e.g., 'v1', '2024-01-01') */
  id: string
  /** Display label */
  label: string
  /** Base URL for this version */
  baseUrl?: string
  /** Whether this is the current/latest version */
  current?: boolean
  /** Whether this version is deprecated */
  deprecated?: boolean
  /** End of life date if deprecated */
  endOfLife?: string
}

/**
 * Changelog entry
 *
 * @description
 * Represents a single changelog entry documenting API changes.
 */
export interface ChangelogEntry {
  /** Version this change was introduced in */
  version: string
  /** Release date (ISO format) */
  date: string
  /** Change title */
  title: string
  /** Detailed description of changes */
  description?: string
  /** Type of change */
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security'
  /** Breaking change indicator */
  breaking?: boolean
  /** Affected resources/endpoints */
  affects?: string[]
  /** Migration guide if breaking */
  migrationGuide?: string
}

// ============================================================================
// API Playground Types
// ============================================================================

/**
 * API Playground configuration
 *
 * @description
 * Configuration for interactive API playground/testing functionality.
 */
export interface PlaygroundConfig {
  /** Enable API playground */
  enabled?: boolean
  /** Base URL for API requests */
  baseUrl?: string
  /** Default headers to include */
  defaultHeaders?: Record<string, string>
  /** Authentication configuration */
  auth?: {
    /** Authentication type */
    type: 'bearer' | 'apiKey' | 'basic'
    /** Header name for API key auth */
    headerName?: string
    /** Environment variable hint for the key */
    envVar?: string
  }
  /** Whether to allow editing request bodies */
  allowEditing?: boolean
  /** Maximum response size to display */
  maxResponseSize?: number
}

// ============================================================================
// Code Display Types
// ============================================================================

/**
 * Code block configuration
 *
 * @description
 * Configuration for code block display and copy functionality.
 */
export interface CodeBlockConfig {
  /** Enable copy button */
  copyButton?: boolean
  /** Enable line numbers */
  lineNumbers?: boolean
  /** Highlight specific lines */
  highlightLines?: number[]
  /** Show language label */
  showLanguage?: boolean
  /** Theme for syntax highlighting */
  theme?: 'light' | 'dark' | 'system'
  /** Custom copy success message */
  copySuccessMessage?: string
  /** Whether to wrap long lines */
  wordWrap?: boolean
}

// ============================================================================
// OpenAPI Types
// ============================================================================

/**
 * OpenAPI specification (subset)
 *
 * @description
 * Subset of the OpenAPI 3.x specification used for API documentation.
 */
export interface OpenAPISpec {
  /** OpenAPI version */
  openapi: string
  /** API information */
  info: {
    /** API title */
    title: string
    /** API version */
    version: string
    /** API description */
    description?: string
    /** Terms of service URL */
    termsOfService?: string
    /** Contact information */
    contact?: {
      name?: string
      url?: string
      email?: string
    }
    /** License information */
    license?: {
      name: string
      url?: string
    }
  }
  /** Server configurations */
  servers?: Array<{
    url: string
    description?: string
  }>
  /** API paths/endpoints */
  paths: Record<string, Record<string, unknown>>
  /** Reusable components */
  components?: Record<string, unknown>
  /** Security schemes */
  security?: Array<Record<string, string[]>>
  /** Tags for grouping endpoints */
  tags?: Array<{
    name: string
    description?: string
  }>
}

// ============================================================================
// Meta and Config Types
// ============================================================================

/**
 * Documentation meta file content
 */
export interface DocsMeta {
  /** List of page slugs */
  pages: string[]
}

/**
 * Documentation configuration
 *
 * @description
 * Configuration options for the documentation generator.
 */
export interface DocsConfig {
  /** Application name */
  appName?: string
  /** Logo URL or path */
  logo?: string
  /** Primary brand color (hex) */
  primaryColor?: string
  /** Base URL for the documentation site */
  baseUrl?: string
  /** API version */
  version?: string
  /** Custom page templates */
  templates?: {
    /** API reference page template */
    apiReference?: (noun: string) => string
    /** Additional templates */
    [key: string]: ((arg: string) => string) | undefined
  }
  /** Documentation plugins */
  plugins?: DocsPlugin[]
  /** Search configuration */
  search?: SearchConfig
  /** Available versions */
  versions?: VersionInfo[]
  /** Changelog entries */
  changelog?: ChangelogEntry[]
  /** API Playground configuration */
  playground?: PlaygroundConfig
  /** Code block configuration */
  codeBlocks?: CodeBlockConfig
  /** Social links */
  social?: {
    github?: string
    twitter?: string
    discord?: string
  }
  /** Footer configuration */
  footer?: {
    copyright?: string
    links?: Array<{ label: string; href: string }>
  }
}

/**
 * Documentation plugin
 *
 * @description
 * Plugin interface for extending documentation generation.
 */
export interface DocsPlugin {
  /** Plugin name */
  name: string
  /** Hook called before documentation generation */
  beforeGenerate?: (config: DocsConfig) => DocsConfig
  /** Hook called after documentation generation */
  afterGenerate?: (docs: GeneratedDocs) => GeneratedDocs
  /** Hook to modify pages */
  transformPage?: (page: DocsPage) => DocsPage
  /** Hook to add custom pages */
  addPages?: () => DocsPage[]
}

// ============================================================================
// Generated Output Types
// ============================================================================

/**
 * Generated documentation output
 *
 * @description
 * The complete output of the documentation generator, including
 * all pages, navigation, search index, and utility functions.
 */
export interface GeneratedDocs {
  /** Generated documentation pages */
  pages: DocsPage[]
  /** Documentation configuration */
  config: DocsConfig
  /** Base URL */
  baseUrl?: string
  /** API version */
  version?: string
  /** Navigation structure */
  navigation: NavItem[]
  /** Documentation metadata */
  meta: DocsMeta
  /** OpenAPI specification */
  openapi: OpenAPISpec
  /** Search index for full-text search */
  searchIndex?: SearchIndexEntry[]
  /** Available versions */
  versions?: VersionInfo[]
  /** Changelog entries */
  changelog?: ChangelogEntry[]
  /** Convert to file structure for static generation */
  toFileStructure: () => Record<string, string>
  /** Get search index as JSON */
  toSearchIndex?: () => string
  /** Get OpenAPI spec as YAML */
  toOpenAPIYaml?: () => string
}

/**
 * Section for documentation organization
 */
export interface DocsSection {
  /** Section title */
  title: string
  /** Section slug */
  slug: string
  /** Pages in this section */
  pages: DocsPage[]
}
