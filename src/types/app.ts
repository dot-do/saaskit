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
export interface AppConfig<
  Nouns extends readonly string[] = readonly string[],
  Verbs extends VerbsConfig<Nouns[number]> = VerbsConfig<Nouns[number]>,
> {
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
