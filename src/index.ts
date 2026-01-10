/**
 * saaskit - Full-stack SaaS admin framework
 *
 * Define your domain model with Nouns, Verbs, and Relationships,
 * and get a complete admin UI with Organizations, Users, API Keys, Billing, and more.
 *
 * @example
 * ```tsx
 * import { defineApp, $ } from 'saaskit'
 *
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
 *
 * @packageDocumentation
 */

// Core
export { defineApp, $ } from './core'

// Types - re-export everything
export type {
  // Nouns
  Noun,
  Nouns,
  NounNames,
  // Verbs
  Verb,
  VerbsConfig,
  VerbsFor,
  CrudVerb,
  // Relationships
  Relationship,
  Relationships,
  RelationshipVerb,
  // Events
  EventName,
  EventPayload,
  EventHandler,
  EventsConfig,
  EventNames,
  BuiltInEventVerbs,
  GenerateEventNames,
  // Schedules
  ScheduleHandler,
  ScheduleDefinition,
  ScheduleWithHandler,
  SchedulesConfig,
  ScheduleNames,
  ParsedSchedule,
  // Context
  AppContext,
  NotifyOptions,
  EmailOptions,
  SlackOptions,
  ListOptions,
  KvOptions,
  ScheduleBuilder,
  ScheduleExpression,
  // App
  AppConfig,
  ResolvedApp,
  App,
} from './types'

// Utilities
export { isNoun, noun, isVerb, verb, CRUD_VERBS, relationship, RelationshipPatterns, schedule, Schedules } from './types'
