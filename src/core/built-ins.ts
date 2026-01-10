/**
 * Built-in SaaS Nouns
 *
 * Defines the schema and behavior for common SaaS patterns:
 * - User: Authentication and identity
 * - Organization: Multi-tenancy
 * - Plan: Subscription tiers
 * - APIKey: Developer access
 * - Webhook: Event subscriptions
 * - Usage: Metered billing
 * - Metric: Analytics tracking
 */

import type { NounSchema, FieldDefinition } from '../parsers/noun-parser'

/**
 * Built-in noun names
 */
export const BUILT_IN_NOUN_NAMES = [
  'User',
  'Organization',
  'Plan',
  'APIKey',
  'Webhook',
  'Usage',
  'Metric',
] as const

export type BuiltInNounName = (typeof BUILT_IN_NOUN_NAMES)[number]

/**
 * Type interface for built-in nouns
 */
export interface BuiltInNouns {
  User: NounSchema
  Organization: NounSchema
  Plan: NounSchema
  APIKey: NounSchema
  Webhook: NounSchema
  Usage: NounSchema
  Metric: NounSchema
}

/**
 * User noun schema
 * Handles authentication, identity, and org membership
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
 * Organization noun schema
 * Handles multi-tenancy and plan subscription
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
 * Plan noun schema
 * Handles subscription tiers and pricing
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
 * APIKey noun schema
 * Handles developer API access
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
 * Webhook noun schema
 * Handles event subscriptions
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
 * Usage noun schema
 * Handles metered billing tracking
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
 * Metric noun schema
 * Handles analytics tracking
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
 * All built-in noun schemas
 */
export const BUILT_IN_SCHEMAS: BuiltInNouns = {
  User: UserSchema,
  Organization: OrganizationSchema,
  Plan: PlanSchema,
  APIKey: APIKeySchema,
  Webhook: WebhookSchema,
  Usage: UsageSchema,
  Metric: MetricSchema,
}

/**
 * Built-in verb definitions for each noun
 */
export const BUILT_IN_VERBS: Record<string, string[]> = {
  User: ['invite', 'verify', 'deactivate'],
  Organization: ['upgrade', 'downgrade'],
  APIKey: ['revoke', 'rotate'],
  Webhook: ['test', 'disable'],
}

/**
 * Merge user-defined noun schema with built-in schema
 */
export function mergeWithBuiltIn(
  nounName: string,
  customSchema: Record<string, string | string[]>
): NounSchema {
  const builtIn = BUILT_IN_SCHEMAS[nounName as BuiltInNounName]
  if (!builtIn) {
    return {} as NounSchema // Not a built-in, return empty
  }

  // Start with built-in schema
  const merged: NounSchema = { ...builtIn }

  // Add custom fields (these override built-in if same name)
  for (const [fieldName, fieldType] of Object.entries(customSchema)) {
    if (typeof fieldType === 'string') {
      const optional = fieldType.endsWith('?')
      const type = optional ? fieldType.slice(0, -1) : fieldType
      merged[fieldName] = { type, optional }
    }
  }

  return merged
}
