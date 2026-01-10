/**
 * App Generator Types
 *
 * Type definitions for the App generator that creates
 * React admin dashboard pages from noun/verb definitions.
 */

import type { ComponentType, ReactNode } from 'react'

/**
 * Field type definitions in the noun schema
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'markdown'
  | `${string}?` // Optional fields
  | `${string} | ${string}` // Union types (e.g., 'pending | paid | shipped')
  | `->${string}` // Forward relation (belongs to)
  | `<-${string}` // Reverse relation (has many)
  | `~>${string}` // Soft forward relation
  | `<~${string}` // Soft reverse relation

/**
 * Noun field definitions
 */
export type NounFields = Record<string, FieldType | FieldType[]>

/**
 * Nouns configuration - maps noun names to their field definitions
 */
export type NounsConfig = Record<string, NounFields>

/**
 * Verb handler context
 */
export interface VerbContext {
  id: string
  record?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Verb handler function
 */
export type VerbHandler = (ctx: VerbContext) => void | Promise<void>

/**
 * Verbs configuration - maps noun names to their verb handlers
 */
export type VerbsConfig = Record<string, Record<string, VerbHandler>>

/**
 * App customization configuration (imported from customization module)
 * Re-exported here for convenience
 */
export type { AppCustomization, FieldRenderer, AppPlugin, AppTheme, MobileConfig } from './customization'
import type { AppCustomization } from './customization'

/**
 * App configuration for generateApp()
 *
 * @remarks
 * The main configuration object for generating a complete React admin app.
 * Includes noun definitions, verb handlers, and optional customization hooks.
 *
 * **IMPORTANT CONSTRAINTS FOR AI/PROGRAMMATIC GENERATION:**
 * - `name` is required and should be a valid JavaScript identifier
 * - `nouns` must contain at least one noun definition
 * - `verbs` is optional - defaults to empty (no custom actions)
 * - `customization` is optional - all default behaviors are used if omitted
 *
 * @example
 * ```typescript
 * const config: AppGeneratorConfig = {
 *   name: 'MyApp',
 *   nouns: {
 *     Customer: {
 *       name: 'string',
 *       email: 'string',
 *     },
 *   },
 *   verbs: {
 *     Customer: {
 *       activate: async (ctx) => { ... },
 *     },
 *   },
 *   customization: {
 *     theme: { colors: { primary: '#3b82f6' } },
 *     fieldRenderers: { markdown: myMarkdownEditor },
 *   },
 * }
 * ```
 */
export interface AppGeneratorConfig {
  /** Application name */
  name: string
  /** Noun definitions mapping noun names to field schemas */
  nouns: NounsConfig
  /** Verb handlers mapping noun names to action handlers */
  verbs?: VerbsConfig
  /** Customization hooks for overriding components, theming, etc. */
  customization?: AppCustomization
}

/**
 * Generated route definition
 */
export interface AppRoute {
  path: string
  component: ComponentType<unknown>
}

/**
 * Generated app interface
 */
export interface GeneratedApp {
  routes: AppRoute[]
  getPage: (name: string) => ComponentType<unknown>
  getShell: () => ComponentType<unknown>
}

/**
 * User info for RBAC
 */
export interface AppUser {
  id: string
  email?: string
  role: string
  permissions?: string[]
  organizationRole?: string
}

/**
 * Render options for the test provider
 */
export interface RenderOptions {
  app: unknown
  initialData?: Record<string, unknown>
  params?: Record<string, string>
  navigate?: (path: string) => void
  mutations?: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>
  verbs?: Record<string, Record<string, (ctx: unknown) => Promise<unknown>>>
  realtime?: { connect: () => void }
  user?: AppUser
  onSort?: (sort: { field: string; direction: string }) => void
  checkPermission?: (permission: string, context: { record: unknown }) => boolean
}

/**
 * Render result from the test provider
 */
export interface RenderResult {
  container: HTMLElement
  realtimeEmit: (event: RealtimeEvent) => void
  setRealtimeStatus: (status: string) => void
}

/**
 * Real-time event structure
 */
export interface RealtimeEvent {
  type: 'created' | 'updated' | 'deleted'
  noun: string
  id: string
  data?: Record<string, unknown>
}

/**
 * Parsed field definition
 */
export interface ParsedField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'markdown' | 'union' | 'relation'
  optional: boolean
  options?: string[] // For union types
  relationTarget?: string // For relation types
  relationDirection?: 'forward' | 'reverse'
  cardinality: 'one' | 'many'
}

/**
 * Parsed noun schema
 */
export interface ParsedNoun {
  name: string
  pluralName: string
  fields: ParsedField[]
}
