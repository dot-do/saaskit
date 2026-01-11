import type { Relationship } from './relationships'
import type { VerbsConfig } from './verbs'
import type { EventsConfig } from './events'
import type { SchedulesConfig } from './schedules'

/**
 * Main app configuration interface for defineApp()
 *
 * @example
 * ```ts
 * const app = defineApp({
 *   do: 'https://api.your-app.do',
 *   ns: 'tenant-123',
 *
 *   nouns: ['User', 'Product', 'Order', 'Customer', 'Organization'],
 *
 *   verbs: {
 *     User: ['create', 'update', 'delete', 'invite', 'impersonate'],
 *     Order: ['create', 'fulfill', 'cancel', 'refund'],
 *   },
 *
 *   relationships: [
 *     { from: 'Order', to: 'Customer', verb: 'belongsTo', reverse: 'hasMany' },
 *     { from: 'Order', to: 'Product', verb: 'contains', reverse: 'appearsIn' },
 *     { from: 'User', to: 'Organization', verb: 'memberOf', reverse: 'hasMembers' },
 *   ],
 *
 *   events: {
 *     'Order.created': async ($, event) => { },
 *     'User.invited': async ($, event) => { },
 *   },
 *
 *   schedules: {
 *     DailyReport: $.every.day.at('9am'),
 *     WeeklyCleanup: $.every.sunday.at('3am'),
 *   },
 * })
 * ```
 */
/**
 * Plan configuration for pricing
 */
export interface PlanConfig {
  /** Price in dollars (0 for free) */
  price: number
  /** Features included in this plan */
  features: string[]
  /** Whether this plan is recommended/highlighted */
  recommended?: boolean
}

/**
 * StoryBrand context for AI copy generation
 */
export interface StoryBrandContext {
  /** Target audience/customer hero */
  hero?: string
  /** Target audience description */
  targetAudience?: string
  /** The problem/villain they face */
  villain?: string
  /** The problem statement */
  problem?: string
  /** Your product as the guide */
  guide?: string
  /** The solution your product provides */
  solution?: string
  /** The plan to solve their problem */
  plan?: string
  /** What unique value you provide */
  uniqueValue?: string
  /** What success looks like */
  successOutcome?: string
  /** What failure looks like (stakes) */
  failureOutcome?: string
  /** Tone of voice for copy */
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative'
}

/**
 * Site customization options
 */
export interface SiteCustomization {
  /** Hero section overrides */
  hero?: {
    secondaryCTA?: {
      text: string
      href: string
    }
  }
  /** Features section overrides */
  features?: {
    items?: Array<{ title: string; description: string }>
  }
  /** CTA section overrides */
  cta?: {
    headline?: string
    subheadline?: string
    button?: {
      text: string
      href: string
    }
  }
  /** Footer section overrides */
  footer?: {
    social?: {
      twitter?: string
      github?: string
      linkedin?: string
    }
  }
  /** Meta tag overrides */
  meta?: {
    keywords?: string
    author?: string
    robots?: string
  }
}

export interface AppConfig<
  Nouns extends readonly string[] = readonly string[],
  Verbs extends VerbsConfig<Nouns[number]> = VerbsConfig<Nouns[number]>,
> {
  /**
   * Application name
   * @example 'TaskFlow'
   */
  name?: string

  /**
   * Application description
   * @example 'The easiest way to manage your tasks'
   */
  description?: string

  /**
   * The dotdo endpoint URL
   * @example 'https://api.your-app.do'
   */
  do?: string

  /**
   * Namespace/context for multi-tenant isolation
   * @example 'tenant-123'
   */
  ns?: string

  /**
   * Domain name for the app
   * @example 'taskflow.io'
   */
  domain?: string

  /**
   * Domain entities (PascalCase)
   * @example ['User', 'Product', 'Order', 'Customer']
   */
  nouns: Nouns

  /**
   * Allowed actions per noun (camelCase)
   * @example { User: ['create', 'update', 'delete', 'invite'] }
   */
  verbs?: Verbs

  /**
   * Relationships between nouns
   */
  relationships?: readonly Relationship<Nouns[number]>[]

  /**
   * Event handlers for Noun.verb patterns
   */
  events?: EventsConfig<Nouns[number], VerbsFor<Verbs>>

  /**
   * Scheduled tasks (PascalCase names)
   */
  schedules?: SchedulesConfig

  /**
   * Pricing plans configuration
   */
  plans?: Record<string, PlanConfig>

  /**
   * Site customization options for landing page generation
   */
  site?: SiteCustomization

  /**
   * StoryBrand context for AI-powered copy generation
   */
  context?: StoryBrandContext
}

/**
 * Helper type to extract verb names from a verbs config
 */
type VerbsFor<Verbs extends VerbsConfig> = {
  [K in keyof Verbs]: Verbs[K] extends readonly (infer V)[] ? (V extends string ? V : never) : never
}[keyof Verbs]

/**
 * Resolved app configuration with computed types
 */
export interface ResolvedApp<
  Nouns extends readonly string[] = readonly string[],
  Verbs extends VerbsConfig<Nouns[number]> = VerbsConfig<Nouns[number]>,
> {
  /** Configuration as provided */
  config: AppConfig<Nouns, Verbs>

  /** Parsed nouns */
  nouns: Set<Nouns[number]>

  /** Parsed verbs by noun */
  verbs: Map<Nouns[number], Set<string>>

  /** Parsed relationships */
  relationships: {
    from: Map<Nouns[number], Relationship<Nouns[number]>[]>
    to: Map<Nouns[number], Relationship<Nouns[number]>[]>
  }

  /** Event handler registry */
  events: Map<string, unknown>

  /** Schedule registry */
  schedules: Map<string, unknown>

  /** Check if a noun exists */
  hasNoun: (noun: string) => boolean

  /** Check if a verb is allowed for a noun */
  hasVerb: (noun: string, verb: string) => boolean

  /** Get relationships for a noun */
  getRelationships: (noun: string) => Relationship<Nouns[number]>[]
}

/**
 * Type-safe app builder result
 */
export type App<
  Nouns extends readonly string[] = readonly string[],
  Verbs extends VerbsConfig<Nouns[number]> = VerbsConfig<Nouns[number]>,
> = ResolvedApp<Nouns, Verbs>
