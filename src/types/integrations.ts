/**
 * Integration Layer Types
 *
 * Types for the $.integrate(), $.api.*, and $.env systems.
 */

/**
 * OAuth configuration for integrations that require it
 */
export interface OAuthConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  accessToken?: string
  expiresAt?: number
}

/**
 * Valid configuration keys for integrations
 */
export interface IntegrationConfigOptions {
  /** API key credential */
  apiKey?: string
  /** Secret key credential (e.g., Stripe sk_*) */
  secretKey?: string
  /** Webhook URL credential */
  webhook?: string
  /** OAuth configuration */
  oauth?: OAuthConfig
}

/**
 * Stored integration with name and config
 */
export interface StoredIntegration {
  name: string
  config: IntegrationConfigOptions
}

/**
 * Email send options for Emails.do
 */
export interface EmailSendOptions {
  to: string | string[]
  subject?: string
  body?: string
  template?: string
  data?: Record<string, unknown>
}

/**
 * Email send response
 */
export interface EmailSendResponse {
  id: string
  status: string
}

/**
 * Text/SMS send options for Texts.do
 */
export interface TextSendOptions {
  to: string
  message: string
}

/**
 * Text/SMS send response
 */
export interface TextSendResponse {
  id: string
  status: string
}

/**
 * Call initiate options for Calls.do
 */
export interface CallInitiateOptions {
  to: string
  from: string
  script?: string
}

/**
 * Call initiate response
 */
export interface CallInitiateResponse {
  id: string
  status: string
}

/**
 * Slack message options
 */
export interface SlackMessageOptions {
  blocks?: unknown[]
  attachments?: unknown[]
}

/**
 * Built-in Emails.do API interface
 */
export interface EmailsApi {
  send: (options: EmailSendOptions) => Promise<EmailSendResponse>
}

/**
 * Built-in Texts.do API interface
 */
export interface TextsApi {
  send: (options: TextSendOptions) => Promise<TextSendResponse>
}

/**
 * Built-in Calls.do API interface
 */
export interface CallsApi {
  initiate: (options: CallInitiateOptions) => Promise<CallInitiateResponse>
}

/**
 * Slack API interface (requires registration)
 */
export interface SlackApi {
  send: (channel: string, text: string, options?: SlackMessageOptions) => Promise<void>
}

/**
 * Stripe API interface (built-in via Payments.do)
 */
export interface StripeApi {
  charges: {
    create: (params: Record<string, unknown>) => Promise<Record<string, unknown>>
    retrieve: (id: string) => Promise<Record<string, unknown>>
  }
  customers: {
    create: (params: Record<string, unknown>) => Promise<Record<string, unknown>>
    retrieve: (id: string) => Promise<Record<string, unknown>>
    subscriptions: {
      list: (params: Record<string, unknown>) => Promise<{ data: Record<string, unknown>[] }>
    }
  }
  [key: string]: unknown
}

/**
 * Salesforce API interface (requires OAuth registration)
 */
export interface SalesforceApi {
  query: (soql: string) => Promise<{ records: Record<string, unknown>[] }>
  [key: string]: unknown
}

/**
 * Generic third-party API interface
 */
export interface ThirdPartyApi {
  [key: string]: unknown
}

/**
 * API proxy interface with built-in and registered integrations
 */
export interface ApiProxy {
  /** Built-in Emails.do integration */
  emails: EmailsApi
  /** Built-in Texts.do integration */
  texts: TextsApi
  /** Built-in Calls.do integration */
  calls: CallsApi
  /** Built-in Stripe via Payments.do */
  stripe: StripeApi
  /** Slack (requires registration) */
  slack: SlackApi
  /** Salesforce (requires OAuth registration) */
  salesforce: SalesforceApi
  /** Any registered third-party integration */
  [key: string]: unknown
}

/**
 * Fetch function type for testing
 */
export type FetchFunction = typeof fetch

/**
 * Valid integration config keys
 */
export const VALID_CONFIG_KEYS = ['apiKey', 'secretKey', 'webhook', 'oauth'] as const
