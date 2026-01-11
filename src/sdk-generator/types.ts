/**
 * SDK Generator Types
 *
 * Type definitions for the SDK generator that creates type-safe client
 * libraries from noun/verb definitions.
 *
 * @module sdk-generator/types
 */

// ============================================================================
// Input Types
// ============================================================================

/**
 * Field type definitions for noun schemas
 */
export type FieldType = string // e.g., 'string', 'number', 'boolean', 'string?', '->User', 'admin | member | guest'

/**
 * Noun schema definition - maps field names to their types
 */
export type NounSchema = Record<string, FieldType>

/**
 * Nouns configuration - maps noun names to their schemas
 */
export type NounsConfig = Record<string, NounSchema>

/**
 * Verb handler function type
 */
export type VerbHandler = ($: unknown) => unknown

/**
 * Verbs configuration for a single noun
 */
export type NounVerbs = Record<string, VerbHandler>

/**
 * Verbs configuration - maps noun names to their verb handlers
 */
export type VerbsConfig = Record<string, NounVerbs>

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Authentication type */
  type: 'bearer' | 'header' | 'basic'
  /** Custom header name (for 'header' type) */
  headerName?: string
  /** Environment variable hint for API key */
  envVar?: string
}

/**
 * Pagination strategy configuration
 */
export type PaginationStrategy = 'offset' | 'cursor' | 'page'

/**
 * Retry strategy configuration
 */
export type RetryStrategy = 'exponential' | 'linear' | 'fixed' | 'decorrelated-jitter'

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Retry strategy type */
  strategy?: RetryStrategy
  /** Maximum number of retry attempts */
  maxAttempts?: number
  /** Base delay in milliseconds */
  baseDelay?: number
  /** Maximum delay in milliseconds */
  maxDelay?: number
  /** Jitter factor (0-1) for adding randomness */
  jitter?: number
  /** HTTP status codes that should trigger a retry */
  retryableStatuses?: number[]
  /** Whether to retry on network errors */
  retryOnNetworkError?: boolean
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Whether to enable circuit breaker */
  enabled?: boolean
  /** Failure threshold before opening circuit */
  failureThreshold?: number
  /** Success threshold to close circuit */
  successThreshold?: number
  /** Time in ms before attempting to close circuit */
  resetTimeout?: number
}

/**
 * Rate limit handling configuration
 */
export interface RateLimitConfig {
  /** Whether to automatically retry on rate limit */
  autoRetry?: boolean
  /** Maximum wait time for rate limit retry (ms) */
  maxWaitTime?: number
  /** Header name for retry-after value */
  retryAfterHeader?: string
  /** Header name for rate limit remaining */
  remainingHeader?: string
  /** Header name for rate limit reset time */
  resetHeader?: string
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Enable request logging */
  logRequests?: boolean
  /** Enable response logging */
  logResponses?: boolean
  /** Enable error logging */
  logErrors?: boolean
  /** Log level */
  level?: 'debug' | 'info' | 'warn' | 'error'
  /** Custom logger function */
  logger?: string // Will generate logger interface
}

/**
 * SDK configuration for generating client libraries
 */
export interface SDKConfig {
  /** Noun definitions with field schemas */
  nouns: NounsConfig
  /** Verb definitions for each noun */
  verbs: VerbsConfig
  /** Package/module name */
  packageName: string
  /** Package version */
  version: string
  /** Base URL for API requests */
  baseUrl?: string
  /** Authentication configuration */
  auth?: AuthConfig
  /** Custom request timeout (ms) */
  timeout?: number
  /** Maximum retry attempts (deprecated: use retry.maxAttempts) */
  maxRetries?: number
  /** Pagination strategy */
  pagination?: PaginationStrategy
  /** Retry configuration */
  retry?: RetryConfig
  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfig
  /** Rate limit handling configuration */
  rateLimit?: RateLimitConfig
  /** Logging configuration */
  logging?: LoggingConfig
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Generated SDK file content
 */
export type GeneratedFiles = Record<string, string>

/**
 * Generated SDK output
 */
export interface GeneratedSDK {
  /** Package name */
  packageName: string
  /** Package version */
  version: string
  /** List of resource names (nouns) */
  resources: string[]
  /** Generated file contents keyed by file path */
  files: GeneratedFiles
  /** SDK language */
  language: 'typescript' | 'python' | 'go'
}

/**
 * Publish options for a single target
 */
export interface PublishOptions {
  /** Run in dry-run mode (no actual publishing) */
  dryRun?: boolean
  /** npm registry URL */
  registry?: string
  /** PyPI repository URL */
  repository?: string
  /** Go module path override */
  module?: string
}

/**
 * Publish result for a single target
 */
export interface SinglePublishResult {
  success: boolean
  package: string
  version: string
  registry?: string
  repository?: string
  module?: string
  tag?: string
}

/**
 * Publish all options
 */
export interface PublishAllOptions {
  dryRun?: boolean
  continueOnError?: boolean
  npm?: { registry?: string }
  pypi?: { repository?: string }
  go?: { module?: string }
}

/**
 * Publish all result
 */
export interface PublishAllResult {
  npm: SinglePublishResult
  pypi: SinglePublishResult
  go: SinglePublishResult
  summary: {
    totalTargets: number
    successful: number
    failed: number
  }
}

/**
 * Changelog generation options
 */
export interface ChangelogDiffOptions {
  previousNouns: NounsConfig
  currentNouns: NounsConfig
}

/**
 * Auto-publish configuration
 */
export interface AutoPublishOptions {
  onSchemaChange: 'major' | 'minor' | 'patch'
  targets: ('npm' | 'pypi' | 'go')[]
  dryRun?: boolean
}

/**
 * Auto-publish configuration result
 */
export interface AutoPublishConfig {
  enabled: boolean
  targets: ('npm' | 'pypi' | 'go')[]
  versionBump: 'major' | 'minor' | 'patch'
  dryRun: boolean
}

/**
 * SDK Generator instance
 */
export interface SDKGenerator {
  /** Generate TypeScript SDK */
  generateTypeScript(config?: TypeScriptSDKConfig): GeneratedSDK
  /** Generate Python SDK */
  generatePython(config?: PythonSDKConfig): GeneratedSDK
  /** Generate Go SDK */
  generateGo(config?: GoSDKConfig): GeneratedSDK

  /** Publish SDK to a specific target (npm, pypi, or go) */
  publish(target: 'npm' | 'pypi' | 'go', options?: PublishOptions): Promise<SinglePublishResult>
  /** Publish SDKs to all targets */
  publishAll(options?: PublishAllOptions): Promise<PublishAllResult>

  /** Get hash of current schema for change detection */
  getSchemaHash(): string
  /** Get next semantic version based on bump type */
  getNextVersion(bumpType: 'major' | 'minor' | 'patch'): string
  /** Generate changelog from schema diff */
  generateChangelog(diff: ChangelogDiffOptions): string
  /** Set up auto-publish configuration */
  setupAutoPublish(options: AutoPublishOptions): AutoPublishConfig
}

// ============================================================================
// Language-Specific Config Types
// ============================================================================

/**
 * TypeScript SDK configuration options
 */
export interface TypeScriptSDKConfig {
  /** Include ESM build */
  esm?: boolean
  /** Include CJS build */
  cjs?: boolean
  /** Generate declaration files */
  declarations?: boolean
  /** Target ECMAScript version */
  target?: 'ES2020' | 'ES2021' | 'ES2022' | 'ES2023'
  /** npm publish configuration */
  publishConfig?: {
    /** npm registry URL */
    registry?: string
    /** Package access level */
    access?: 'public' | 'restricted'
  }
}

/**
 * Python SDK configuration options
 */
export interface PythonSDKConfig {
  /** Minimum Python version */
  minVersion?: '3.8' | '3.9' | '3.10' | '3.11' | '3.12'
  /** Use async client */
  async?: boolean
  /** Use pydantic for models */
  usePydantic?: boolean
}

/**
 * Go SDK configuration options
 */
export interface GoSDKConfig {
  /** Go module path */
  modulePath?: string
  /** Minimum Go version */
  goVersion?: string
}

// ============================================================================
// Internal Types for Generation
// ============================================================================

/**
 * Parsed field definition
 */
export interface ParsedField {
  /** Field name */
  name: string
  /** Base type (string, number, boolean, etc.) */
  type: string
  /** Whether the field is optional */
  optional: boolean
  /** Whether this is a relationship */
  isRelation: boolean
  /** Target noun if this is a relationship */
  relationTarget?: string
  /** Enum values if this is an enum type */
  enumValues?: string[]
}

/**
 * Parsed noun definition
 */
export interface ParsedNoun {
  /** Noun name (singular, PascalCase) */
  name: string
  /** Plural name for resource endpoints */
  pluralName: string
  /** Parsed field definitions */
  fields: ParsedField[]
  /** Verbs defined for this noun */
  verbs: string[]
}
