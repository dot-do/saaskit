/**
 * saaskit type definitions
 *
 * Core types for defining SaaS applications with the defineApp() API.
 */

// Nouns - domain entities (PascalCase)
export type { Noun, Nouns, NounNames } from './nouns'
export { isNoun, noun } from './nouns'

// Verbs - actions (camelCase)
export type { Verb, VerbsConfig, VerbsFor, CrudVerb } from './verbs'
export { isVerb, verb, CRUD_VERBS } from './verbs'

// Relationships - how nouns relate
export type { Relationship, Relationships, RelationshipVerb } from './relationships'
export { relationship, RelationshipPatterns } from './relationships'

// Events - Noun.verb handlers
export type {
  EventName,
  EventPayload,
  EventHandler,
  EventsConfig,
  EventNames,
  BuiltInEventVerbs,
  GenerateEventNames,
} from './events'

// Schedules - recurring tasks
export type {
  ScheduleHandler,
  ScheduleDefinition,
  ScheduleWithHandler,
  SchedulesConfig,
  ScheduleNames,
  ParsedSchedule,
} from './schedules'
export { schedule, Schedules } from './schedules'

// Context - runtime $ object
export type {
  AppContext,
  NotifyOptions,
  EmailOptions,
  SlackOptions,
  ListOptions,
  KvOptions,
  ScheduleBuilder,
  ScheduleExpression,
} from './context'

// App - main configuration
export type { AppConfig, ResolvedApp, App } from './app'
