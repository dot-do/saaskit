/**
 * Built-in admin pages for saaskit
 *
 * These pages provide common SaaS functionality out of the box.
 * Each can be customized via props or replaced entirely.
 */

// Organizations - Multi-tenant org management
export { OrganizationsPage } from './organizations'
export type { Organization, OrganizationsPageProps } from './organizations'

// Users - User management
export { UsersPage } from './users'
export type { User, UsersPageProps } from './users'

// Teams - Team management
export { TeamsPage } from './teams'
export type { Team, TeamMember, TeamsPageProps } from './teams'

// API Keys - API key management
export { APIKeysPage } from './api-keys'
export type { APIKey, APIKeysPageProps } from './api-keys'

// Webhooks - Webhook configuration
export { WebhooksPage } from './webhooks'
export type { Webhook, WebhookDelivery, WebhooksPageProps } from './webhooks'

// Billing - Billing/subscription management
export { BillingPage } from './billing'
export type {
  Subscription,
  Plan,
  Invoice,
  PaymentMethod,
  UsageRecord,
  BillingPageProps,
} from './billing'

// Audit Log - Activity audit log
export { AuditLogPage } from './audit-log'
export type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPageProps,
} from './audit-log'

// Settings - App settings
export { SettingsPage } from './settings'
export type { AppSettings, SettingsPageProps } from './settings'
