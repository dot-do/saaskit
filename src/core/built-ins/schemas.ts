/**
 * Built-in SaaS Nouns - Schema Definitions
 *
 * Defines the schema for each built-in noun representing common SaaS patterns.
 * Each schema specifies fields, types, relationships, and constraints.
 *
 * @module core/built-ins/schemas
 */

import type { NounSchema } from '../../parsers/noun-parser'
import type { BuiltInNounConfig } from './types'

// ============================================================================
// User Schema
// ============================================================================

/**
 * User noun schema.
 *
 * Represents authenticated users in your application. Handles:
 * - Authentication (email, password hash, verification status)
 * - Authorization (role-based access)
 * - Organization membership
 *
 * **Fields:**
 * | Field | Type | Required | Description |
 * |-------|------|----------|-------------|
 * | email | string | Yes | Unique email address |
 * | name | string | Yes | Display name |
 * | role | enum | Yes | 'admin' | 'member' | 'owner' |
 * | organization | relation | No | Forward relation to Organization |
 * | passwordHash | string | No | Bcrypt-hashed password |
 * | emailVerified | boolean | Yes | Email verification status |
 * | createdAt | datetime | Yes | Auto-populated |
 * | updatedAt | datetime | Yes | Auto-populated |
 *
 * **Relationships:**
 * - `->Organization`: User belongs to an Organization
 *
 * **Unique Constraints:**
 * - `email` must be unique across all users
 *
 * @example
 * ```ts
 * const user = await $.db.User.create({
 *   email: 'jane@example.com',
 *   name: 'Jane Doe',
 *   role: 'admin',
 *   organization: orgId,
 * })
 * ```
 */
export const UserSchema: NounSchema = {
  email: { type: 'string', optional: false },
  name: { type: 'string', optional: false },
  role: { type: 'admin | member | owner', optional: false },
  organization: { type: 'relation', target: 'Organization', direction: 'forward', cardinality: 'one' },
  passwordHash: { type: 'string', optional: true },
  emailVerified: { type: 'boolean', optional: false },
  createdAt: { type: 'datetime', optional: false },
  updatedAt: { type: 'datetime', optional: false },
}

/**
 * User noun configuration.
 */
export const UserConfig: BuiltInNounConfig = {
  schema: UserSchema,
  verbs: ['invite', 'verify', 'deactivate'],
  uniqueFields: ['email'],
  validate: (data, operation) => {
    if (operation === 'create' && !data.email) {
      return 'Email is required'
    }
    if (data.email && typeof data.email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        return 'Invalid email format'
      }
    }
    if (data.role && !['admin', 'member', 'owner'].includes(data.role as string)) {
      return `Invalid role: "${data.role}". Must be one of: admin, member, owner`
    }
    return undefined
  },
}

// ============================================================================
// Organization Schema
// ============================================================================

/**
 * Organization noun schema.
 *
 * Represents a tenant/workspace in your multi-tenant SaaS application.
 * Organizations contain users, API keys, webhooks, and usage tracking.
 *
 * **Fields:**
 * | Field | Type | Required | Description |
 * |-------|------|----------|-------------|
 * | name | string | Yes | Organization display name |
 * | slug | string | Yes | URL-safe unique identifier |
 * | plan | relation | No | Current subscription plan |
 * | stripeCustomerId | string | No | Stripe customer ID |
 * | createdAt | datetime | Yes | Auto-populated |
 * | updatedAt | datetime | Yes | Auto-populated |
 *
 * **Relationships:**
 * - `->Plan`: Organization subscribes to a Plan
 * - `<-User` (members): Users belonging to this Organization
 * - `<-APIKey` (apiKeys): API keys owned by this Organization
 *
 * **Unique Constraints:**
 * - `slug` must be unique across all organizations
 *
 * **Cascade Delete:**
 * - Deleting an Organization also deletes its APIKeys and Webhooks
 *
 * @example
 * ```ts
 * const org = await $.db.Organization.create({
 *   name: 'Acme Corp',
 *   slug: 'acme-corp',
 *   plan: proPlanId,
 * })
 * ```
 */
export const OrganizationSchema: NounSchema = {
  name: { type: 'string', optional: false },
  slug: { type: 'string', optional: false },
  plan: { type: 'relation', target: 'Plan', direction: 'forward', cardinality: 'one' },
  stripeCustomerId: { type: 'string', optional: true },
  members: { type: 'relation', target: 'User', direction: 'reverse', cardinality: 'many' },
  apiKeys: { type: 'relation', target: 'APIKey', direction: 'reverse', cardinality: 'many' },
  createdAt: { type: 'datetime', optional: false },
  updatedAt: { type: 'datetime', optional: false },
}

/**
 * Organization noun configuration.
 */
export const OrganizationConfig: BuiltInNounConfig = {
  schema: OrganizationSchema,
  verbs: ['upgrade', 'downgrade'],
  uniqueFields: ['slug'],
  cascadeDelete: ['APIKey', 'Webhook'],
  cascadeDeleteField: 'organization',
  validate: (data, operation) => {
    if (operation === 'create' && !data.slug) {
      return 'Slug is required'
    }
    return undefined
  },
}

// ============================================================================
// Plan Schema
// ============================================================================

/**
 * Plan noun schema.
 *
 * Represents a subscription tier/plan for billing. Plans define:
 * - Pricing (monthly/yearly/one-time)
 * - Features included in the tier
 * - Integration with Stripe
 *
 * **Fields:**
 * | Field | Type | Required | Description |
 * |-------|------|----------|-------------|
 * | name | string | Yes | Plan display name (e.g., 'Pro', 'Enterprise') |
 * | price | number | Yes | Price in cents |
 * | interval | enum | Yes | 'month' | 'year' | 'one-time' |
 * | features | json | No | Array of feature strings |
 * | stripePriceId | string | No | Stripe Price ID |
 * | isActive | boolean | Yes | Whether plan is available for purchase |
 * | createdAt | datetime | Yes | Auto-populated |
 * | updatedAt | datetime | Yes | Auto-populated |
 *
 * @example
 * ```ts
 * const plan = await $.db.Plan.create({
 *   name: 'Pro',
 *   price: 2999, // $29.99
 *   interval: 'month',
 *   features: ['Unlimited API calls', 'Priority support'],
 *   isActive: true,
 * })
 * ```
 */
export const PlanSchema: NounSchema = {
  name: { type: 'string', optional: false },
  price: { type: 'number', optional: false },
  interval: { type: 'month | year | one-time', optional: false },
  features: { type: 'json', optional: true },
  stripePriceId: { type: 'string', optional: true },
  isActive: { type: 'boolean', optional: false },
  createdAt: { type: 'datetime', optional: false },
  updatedAt: { type: 'datetime', optional: false },
}

/**
 * Plan noun configuration.
 */
export const PlanConfig: BuiltInNounConfig = {
  schema: PlanSchema,
  verbs: [],
  validate: (data, operation) => {
    if (data.interval && !['month', 'year', 'one-time'].includes(data.interval as string)) {
      return `Invalid interval: "${data.interval}". Must be one of: month, year, one-time`
    }
    return undefined
  },
}

// ============================================================================
// APIKey Schema
// ============================================================================

/**
 * APIKey noun schema.
 *
 * Represents API access credentials for programmatic access. Features:
 * - Secure key generation with prefix
 * - Key hashing for storage (raw key only shown on creation)
 * - Expiration and activity tracking
 * - Permission scoping
 *
 * **Fields:**
 * | Field | Type | Required | Description |
 * |-------|------|----------|-------------|
 * | key | string | Yes | The API key (auto-generated, hashed after creation) |
 * | name | string | Yes | Human-readable label |
 * | organization | relation | Yes | Owning organization |
 * | permissions | json | No | Array of permission scopes |
 * | expiresAt | datetime | No | Expiration timestamp |
 * | lastUsedAt | datetime | No | Last usage timestamp |
 * | isActive | boolean | Yes | Whether key is active |
 * | createdAt | datetime | Yes | Auto-populated |
 * | updatedAt | datetime | Yes | Auto-populated |
 *
 * **Security:**
 * - Keys are prefixed (e.g., `sk_...`) for identification
 * - Raw key is only returned on creation, then hashed
 * - Expired or inactive keys are rejected on validation
 *
 * @example
 * ```ts
 * const apiKey = await $.db.APIKey.create({
 *   name: 'Production Key',
 *   organization: orgId,
 *   permissions: ['read:users', 'write:users'],
 *   isActive: true,
 * })
 * // apiKey.key is the raw key - save it now!
 * ```
 */
export const APIKeySchema: NounSchema = {
  key: { type: 'string', optional: false },
  name: { type: 'string', optional: false },
  organization: { type: 'relation', target: 'Organization', direction: 'forward', cardinality: 'one' },
  permissions: { type: 'json', optional: true },
  expiresAt: { type: 'datetime', optional: true },
  lastUsedAt: { type: 'datetime', optional: true },
  isActive: { type: 'boolean', optional: false },
  createdAt: { type: 'datetime', optional: false },
  updatedAt: { type: 'datetime', optional: false },
}

/**
 * APIKey noun configuration.
 */
export const APIKeyConfig: BuiltInNounConfig = {
  schema: APIKeySchema,
  verbs: ['revoke', 'rotate'],
  validate: (data, operation) => {
    if (operation === 'create' && !data.organization) {
      return 'Organization is required for API key'
    }
    return undefined
  },
}

// ============================================================================
// Webhook Schema
// ============================================================================

/**
 * Webhook noun schema.
 *
 * Represents event subscriptions for real-time notifications. Features:
 * - HTTPS URL validation (required in production)
 * - Automatic secret generation for signature verification
 * - Event type filtering
 * - Failure tracking for circuit breaker patterns
 *
 * **Fields:**
 * | Field | Type | Required | Description |
 * |-------|------|----------|-------------|
 * | url | string | Yes | HTTPS endpoint URL |
 * | events | json | Yes | Array of event types to receive |
 * | secret | string | Yes | HMAC signing secret (auto-generated) |
 * | organization | relation | Yes | Owning organization |
 * | isActive | boolean | Yes | Whether webhook is active |
 * | failureCount | number | Yes | Consecutive failure count |
 * | createdAt | datetime | Yes | Auto-populated |
 * | updatedAt | datetime | Yes | Auto-populated |
 *
 * **Security:**
 * - URLs must use HTTPS in production
 * - Payloads are signed with HMAC-SHA256 using the secret
 *
 * @example
 * ```ts
 * const webhook = await $.db.Webhook.create({
 *   url: 'https://example.com/webhook',
 *   events: ['order.created', 'order.paid'],
 *   organization: orgId,
 *   isActive: true,
 * })
 * // webhook.secret is the HMAC signing secret
 * ```
 */
export const WebhookSchema: NounSchema = {
  url: { type: 'string', optional: false },
  events: { type: 'json', optional: false },
  secret: { type: 'string', optional: false },
  organization: { type: 'relation', target: 'Organization', direction: 'forward', cardinality: 'one' },
  isActive: { type: 'boolean', optional: false },
  failureCount: { type: 'number', optional: false },
  createdAt: { type: 'datetime', optional: false },
  updatedAt: { type: 'datetime', optional: false },
}

/**
 * Webhook noun configuration.
 */
export const WebhookConfig: BuiltInNounConfig = {
  schema: WebhookSchema,
  verbs: ['test', 'disable'],
  validate: (data, operation) => {
    if (!data.url) {
      return 'URL is required'
    }
    try {
      const url = new URL(data.url as string)
      if (url.protocol !== 'https:') {
        return 'HTTPS required for webhook URL (secure URL)'
      }
    } catch {
      return 'Invalid URL format'
    }
    return undefined
  },
}

// ============================================================================
// Usage Schema
// ============================================================================

/**
 * Usage noun schema.
 *
 * Tracks metered usage for billing purposes. Enables:
 * - Per-organization usage tracking
 * - Multiple metric types (API calls, storage, etc.)
 * - Period-based aggregation for billing cycles
 *
 * **Fields:**
 * | Field | Type | Required | Description |
 * |-------|------|----------|-------------|
 * | organization | relation | Yes | Organization being tracked |
 * | metric | string | Yes | What is being tracked (e.g., 'api_calls') |
 * | value | number | Yes | Numeric value |
 * | period | datetime | Yes | Billing period start |
 * | createdAt | datetime | Yes | Auto-populated |
 * | updatedAt | datetime | Yes | Auto-populated |
 *
 * @example
 * ```ts
 * // Track API call
 * await $.usage.increment(orgId, 'api_calls')
 *
 * // Get monthly usage
 * const total = await $.usage.aggregate(orgId, 'api_calls', {
 *   start: new Date('2024-01-01'),
 *   end: new Date('2024-01-31'),
 * })
 * ```
 */
export const UsageSchema: NounSchema = {
  organization: { type: 'relation', target: 'Organization', direction: 'forward', cardinality: 'one' },
  metric: { type: 'string', optional: false },
  value: { type: 'number', optional: false },
  period: { type: 'datetime', optional: false },
  createdAt: { type: 'datetime', optional: false },
  updatedAt: { type: 'datetime', optional: false },
}

/**
 * Usage noun configuration.
 */
export const UsageConfig: BuiltInNounConfig = {
  schema: UsageSchema,
  verbs: [],
}

// ============================================================================
// Metric Schema
// ============================================================================

/**
 * Metric noun schema.
 *
 * Records analytics and telemetry data points. Features:
 * - Time-series data storage
 * - Optional organization scoping
 * - Dimension/tag support for filtering
 * - Aggregation functions (sum, avg, min, max)
 *
 * **Fields:**
 * | Field | Type | Required | Description |
 * |-------|------|----------|-------------|
 * | name | string | Yes | Metric identifier |
 * | value | number | Yes | Numeric value |
 * | date | datetime | Yes | Timestamp of measurement |
 * | organization | relation | No | Optional organization scope |
 * | dimensions | json | No | Key-value tags for filtering |
 * | createdAt | datetime | Yes | Auto-populated |
 * | updatedAt | datetime | Yes | Auto-populated |
 *
 * @example
 * ```ts
 * // Record a metric
 * await $.db.Metric.create({
 *   name: 'page_views',
 *   value: 1,
 *   date: new Date(),
 *   dimensions: { page: '/pricing', country: 'US' },
 * })
 *
 * // Query metrics
 * const sum = await $.metrics.sum('page_views')
 * ```
 */
export const MetricSchema: NounSchema = {
  name: { type: 'string', optional: false },
  value: { type: 'number', optional: false },
  date: { type: 'datetime', optional: false },
  organization: { type: 'relation', target: 'Organization', direction: 'forward', cardinality: 'one' },
  dimensions: { type: 'json', optional: true },
  createdAt: { type: 'datetime', optional: false },
  updatedAt: { type: 'datetime', optional: false },
}

/**
 * Metric noun configuration.
 */
export const MetricConfig: BuiltInNounConfig = {
  schema: MetricSchema,
  verbs: [],
}

// ============================================================================
// Aggregated Exports
// ============================================================================

/**
 * All built-in noun schemas indexed by name.
 *
 * @example
 * ```ts
 * const userSchema = BUILT_IN_SCHEMAS.User
 * const orgSchema = BUILT_IN_SCHEMAS.Organization
 * ```
 */
export const BUILT_IN_SCHEMAS: Record<string, NounSchema> = {
  User: UserSchema,
  Organization: OrganizationSchema,
  Plan: PlanSchema,
  APIKey: APIKeySchema,
  Webhook: WebhookSchema,
  Usage: UsageSchema,
  Metric: MetricSchema,
}

/**
 * All built-in noun configurations indexed by name.
 */
export const BUILT_IN_CONFIGS: Record<string, BuiltInNounConfig> = {
  User: UserConfig,
  Organization: OrganizationConfig,
  Plan: PlanConfig,
  APIKey: APIKeyConfig,
  Webhook: WebhookConfig,
  Usage: UsageConfig,
  Metric: MetricConfig,
}

/**
 * All built-in verb definitions indexed by noun name.
 *
 * @example
 * ```ts
 * const userVerbs = BUILT_IN_VERBS.User // ['invite', 'verify', 'deactivate']
 * ```
 */
export const BUILT_IN_VERBS: Record<string, readonly string[]> = {
  User: UserConfig.verbs,
  Organization: OrganizationConfig.verbs,
  Plan: PlanConfig.verbs,
  APIKey: APIKeyConfig.verbs,
  Webhook: WebhookConfig.verbs,
  Usage: UsageConfig.verbs,
  Metric: MetricConfig.verbs,
}
