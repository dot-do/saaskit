/**
 * Zapier App Definition Types
 *
 * Types following the Zapier CLI schema for generating Zapier apps
 * from SaaSkit configurations.
 *
 * @see https://github.com/zapier/zapier-platform/tree/main/packages/cli
 */

/**
 * Zapier field types
 */
export type ZapierFieldType =
  | 'string'
  | 'text'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'file'
  | 'password'
  | 'copy'

/**
 * Zapier input/output field definition
 */
export interface ZapierField {
  /** Unique key for the field */
  key: string
  /** Human-readable label */
  label: string
  /** Field type */
  type?: ZapierFieldType
  /** Whether the field is required */
  required?: boolean
  /** Help text shown to user */
  helpText?: string
  /** Default value */
  default?: string | number | boolean
  /** Dynamic dropdown options (key of another trigger/search) */
  dynamic?: string
  /** Static dropdown choices */
  choices?: Array<{ value: string; label: string; sample?: string }>
  /** For text fields, allow multi-line input */
  list?: boolean
  /** For nested object fields */
  children?: ZapierField[]
  /** Sample value for testing */
  sample?: unknown
}

/**
 * Zapier sample data for testing
 */
export interface ZapierSample {
  [key: string]: unknown
}

/**
 * Zapier operation perform function signature
 * Returns the URL and options for the HTTP request
 */
export interface ZapierPerformRequest {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  params?: Record<string, string>
  body?: Record<string, unknown> | string
}

/**
 * Zapier operation definition (base for triggers, actions, searches)
 */
export interface ZapierOperation {
  /** Input fields shown to user */
  inputFields: ZapierField[]
  /** Output fields returned by operation */
  outputFields?: ZapierField[]
  /** Sample data for testing */
  sample?: ZapierSample
  /** Perform request configuration (simplified for generation) */
  perform: ZapierPerformRequest
}

/**
 * Zapier trigger definition
 *
 * Triggers fire when events happen in the connected app.
 * They can be polling-based or webhook-based (instant).
 */
export interface ZapierTrigger {
  /** Unique key for the trigger */
  key: string
  /** Display name */
  noun: string
  /** Description shown to user */
  display: {
    label: string
    description: string
    hidden?: boolean
    important?: boolean
  }
  /** Operation configuration */
  operation: ZapierOperation & {
    /** For webhook triggers: where to subscribe */
    performSubscribe?: ZapierPerformRequest
    /** For webhook triggers: where to unsubscribe */
    performUnsubscribe?: ZapierPerformRequest
    /** Type of trigger */
    type?: 'polling' | 'hook'
  }
}

/**
 * Zapier action definition
 *
 * Actions are performed when a Zap runs.
 * They typically create, update, or delete records.
 */
export interface ZapierAction {
  /** Unique key for the action */
  key: string
  /** Display name */
  noun: string
  /** Description shown to user */
  display: {
    label: string
    description: string
    hidden?: boolean
    important?: boolean
  }
  /** Operation configuration */
  operation: ZapierOperation
}

/**
 * Zapier search definition
 *
 * Searches find existing records in the connected app.
 * They're often used as dropdown options in other operations.
 */
export interface ZapierSearch {
  /** Unique key for the search */
  key: string
  /** Display name */
  noun: string
  /** Description shown to user */
  display: {
    label: string
    description: string
    hidden?: boolean
    important?: boolean
  }
  /** Operation configuration */
  operation: ZapierOperation
}

/**
 * OAuth2 authentication configuration
 */
export interface ZapierOAuth2Config {
  /** OAuth authorize URL */
  authorizeUrl: string
  /** OAuth token URL */
  getAccessToken: ZapierPerformRequest
  /** OAuth refresh URL */
  refreshAccessToken?: ZapierPerformRequest
  /** Test authentication */
  test: ZapierPerformRequest
  /** Fields to collect from user (e.g., subdomain) */
  connectionLabel?: string
}

/**
 * API Key authentication configuration
 */
export interface ZapierApiKeyConfig {
  /** Fields to collect from user */
  fields: ZapierField[]
  /** Test authentication */
  test: ZapierPerformRequest
  /** How to pass the key in requests */
  connectionLabel?: string
}

/**
 * Session authentication configuration
 */
export interface ZapierSessionConfig {
  /** Fields to collect from user */
  fields: ZapierField[]
  /** Perform session exchange */
  perform: ZapierPerformRequest
  /** Test authentication */
  test: ZapierPerformRequest
  /** Connection label template */
  connectionLabel?: string
}

/**
 * Zapier authentication configuration
 */
export interface ZapierAuthentication {
  /** Authentication type */
  type: 'oauth2' | 'api_key' | 'session' | 'basic' | 'custom'
  /** OAuth2 config */
  oauth2Config?: ZapierOAuth2Config
  /** API key config */
  apiKeyConfig?: ZapierApiKeyConfig
  /** Session config */
  sessionConfig?: ZapierSessionConfig
  /** Test request to verify auth */
  test?: ZapierPerformRequest
  /** Fields shown to user */
  fields?: ZapierField[]
  /** Connection label template */
  connectionLabel?: string
}

/**
 * Zapier App version info
 */
export interface ZapierAppVersion {
  /** Semantic version */
  version: string
  /** Platform version requirement */
  platformVersion: string
}

/**
 * Zapier app definition
 *
 * The complete app configuration that can be exported to Zapier CLI format.
 */
export interface ZapierApp {
  /** App version info */
  version: string
  /** Platform version */
  platformVersion: string
  /** App identity */
  identity: {
    /** Unique app key */
    key: string
    /** App display name */
    name: string
    /** App description */
    description?: string
    /** App icon URL */
    iconUrl?: string
    /** App brand color */
    brandColor?: string
  }
  /** Authentication configuration */
  authentication?: ZapierAuthentication
  /** Available triggers */
  triggers: Record<string, ZapierTrigger>
  /** Available actions */
  creates: Record<string, ZapierAction>
  /** Available searches */
  searches: Record<string, ZapierSearch>
  /** Request middleware (for adding auth headers) */
  beforeRequest?: ZapierPerformRequest[]
  /** Response middleware */
  afterResponse?: Array<{ status?: number; throwForStatus?: boolean }>
  /** Resources (optional, for advanced apps) */
  resources?: Record<string, unknown>
}

/**
 * Options for generating a Zapier app from SaaSkit config
 */
export interface ZapierGeneratorOptions {
  /** App key (defaults to kebab-case of app name) */
  appKey?: string
  /** App name override */
  appName?: string
  /** App description */
  description?: string
  /** App icon URL */
  iconUrl?: string
  /** Brand color (hex) */
  brandColor?: string
  /** Base API URL for the app */
  apiBaseUrl: string
  /** Authentication type */
  authType?: 'oauth2' | 'api_key'
  /** OAuth2 authorize URL (if using oauth2) */
  oauthAuthorizeUrl?: string
  /** OAuth2 token URL (if using oauth2) */
  oauthTokenUrl?: string
  /** Webhook base URL for instant triggers */
  webhookBaseUrl?: string
  /** Platform version (defaults to '15.0.0') */
  platformVersion?: string
}

/**
 * Mapping from SaaSkit field types to Zapier field types
 */
export const FIELD_TYPE_MAP: Record<string, ZapierFieldType> = {
  string: 'string',
  text: 'text',
  number: 'number',
  integer: 'integer',
  boolean: 'boolean',
  date: 'datetime',
  datetime: 'datetime',
  email: 'string',
  url: 'string',
  password: 'password',
  file: 'file',
}

/**
 * Convert a noun name to a Zapier-friendly key
 */
export function toZapierKey(name: string): string {
  // Convert PascalCase or camelCase to snake_case
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

/**
 * Convert a noun name to a display label
 */
export function toDisplayLabel(name: string): string {
  // Convert PascalCase to "Pascal Case"
  return name.replace(/([A-Z])/g, ' $1').trim()
}
