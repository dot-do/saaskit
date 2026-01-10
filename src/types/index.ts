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
  Context,
  ContextConfig,
  NounAccessor,
  AgentDefinition,
  TimeHelpers,
  HumanHandlers,
  AppContext,
  NotifyOptions,
  EmailOptions,
  SlackOptions,
  ListOptions,
  KvOptions,
  ScheduleBuilder,
  ScheduleExpression,
  NounDefinitions,
  NounNamesFrom,
  AIFunction,
  RunnableAgent,
  TypedDatabase,
} from './context'

// App - main configuration
export type { AppConfig, ResolvedApp, App } from './app'

// Integrations - third-party API access
export type {
  OAuthConfig,
  IntegrationConfigOptions,
  StoredIntegration,
  EmailSendOptions,
  EmailSendResponse,
  TextSendOptions,
  TextSendResponse,
  CallInitiateOptions,
  CallInitiateResponse,
  SlackMessageOptions,
  EmailsApi,
  TextsApi,
  CallsApi,
  SlackApi,
  StripeApi,
  SalesforceApi,
  ThirdPartyApi,
  ApiProxy,
  FetchFunction,
} from './integrations'
export { VALID_CONFIG_KEYS } from './integrations'

// Parsers - DSL parsing utilities
export type {
  // Noun parsing
  ParsedFieldType,
  FieldDefinition,
  NounSchema,
  RawNounDefinitions,
  ParsedNounDefinitions,
  NounValidationResult,
  // Verb parsing
  VerbAnatomy,
  VerbValidationResult,
  // Relationship parsing
  RelationDirection,
  Cardinality,
  ParsedRelation,
  RelationRecord,
} from '../parsers'
export {
  // Noun parsing
  parseFieldDefinition,
  parseNounDefinitions,
  validateNounDefinitions,
  // Verb parsing
  generatePastTense,
  generateParticiple,
  generateVerbAnatomy,
  generateAllVerbAnatomy,
  validateVerbDefinitions,
  IRREGULAR_PAST,
  // Relationship parsing
  parseRelationshipOperator,
  isRelationshipOperator,
  getRelationshipOperator,
  getRelationshipTarget,
  RELATIONSHIP_OPERATORS,
} from '../parsers'
