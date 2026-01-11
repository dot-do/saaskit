/**
 * saaskit - Full-stack SaaS admin framework
 *
 * Define your domain model with Nouns, Verbs, and Relationships,
 * and get a complete admin UI with Organizations, Users, API Keys, Billing, and more.
 *
 * @example
 * ```tsx
 * import { defineApp, $, SaaS, SaaSProvider } from 'saaskit'
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
 *
 * // Render the admin UI
 * function App() {
 *   return (
 *     <SaaSProvider app={app}>
 *       <SaaS app={app} />
 *     </SaaSProvider>
 *   )
 * }
 * ```
 *
 * @packageDocumentation
 */

// Core
export { defineApp, $ } from './core'

// Components
export { SaaS, SaaSAdmin } from './components'
export type { SaaSProps, ResourceConfig } from './components'

// Built-in pages
export {
  OrganizationsPage,
  UsersPage,
  TeamsPage,
  APIKeysPage,
  WebhooksPage,
  BillingPage,
  AuditLogPage,
  SettingsPage,
} from './components'
export type {
  // Organizations
  Organization,
  OrganizationsPageProps,
  // Users
  User,
  UsersPageProps,
  // Teams
  Team,
  TeamMember,
  TeamsPageProps,
  // API Keys
  APIKey,
  APIKeysPageProps,
  // Webhooks
  Webhook,
  WebhookDelivery,
  WebhooksPageProps,
  // Billing
  Subscription,
  Plan,
  Invoice,
  PaymentMethod,
  UsageRecord,
  BillingPageProps,
  // Audit Log
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPageProps,
  // Settings
  AppSettings,
  SettingsPageProps,
} from './components'

// Providers
export {
  AppProvider,
  SaaSProvider,
  useApp,
  useSaaS,
  useAppContext,
} from './providers'
export type {
  AppContextValue,
  AppProviderProps,
  AuthConfig,
  RealtimeConfig,
  SaaSContextValue,
  SaaSProviderProps,
} from './providers'

// Hooks
export {
  useResource,
  useRealtime,
  useAuth,
  usePermission,
  useOrganization,
} from './hooks'
export type {
  ResourceData,
  ResourceMutations,
  UseResourceOptions,
  RealtimeStatus,
  RealtimeEvent,
  UseRealtimeOptions,
  UseRealtimeResult,
  AuthUser,
  AuthState,
  AuthActions,
} from './hooks'

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
} from './parsers'
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
} from './parsers'

// Studio - Management Console for YOUR SaaS
export { createStudio } from './studio'
export type {
  // Configuration
  StudioConfig,
  // Core interface
  StudioInterface,
  // Metrics
  StudioMetrics,
  TrendDataPoint,
  MrrTrend,
  ChurnTrend,
  CustomerGrowthTrend,
  TrendPeriodOptions,
  MetricsInterface,
  // Customers (aliased to avoid conflict with components/pages types)
  Customer as StudioCustomer,
  CustomerStatus,
  CustomerSubscription,
  BillingHistoryEntry,
  ActivityTimelineEntry,
  CustomerListOptions,
  CustomerListResult,
  CancelOptions,
  ApplyDiscountOptions,
  ExtendTrialOptions as StudioExtendTrialOptions,
  ActionResult,
  UpgradeResult,
  DowngradeResult,
  CancelResult,
  ReactivateResult,
  ApplyDiscountResult,
  ExtendTrialResult,
  CustomersInterface,
  // Revenue
  RevenueSummary,
  RevenuePeriodOptions,
  RevenueTimeSeries,
  RevenueData,
  PlanDistribution,
  GrowthRate,
  ExpansionRevenue,
  ContractionRevenue,
  CohortAnalysisOptions,
  CohortData,
  RevenueInterface,
  // Usage
  ApiUsageSummary,
  UsageData,
  UsageTrendOptions,
  UsageTrend,
  FeatureAdoption,
  CustomerUsage,
  TopUser,
  AtRiskCustomer,
  UsageInterface,
  // Alerts
  AlertSeverity,
  AlertStatus,
  AlertType,
  Alert,
  ChurnRiskAlert,
  GrowthOpportunityAlert,
  UsageAnomalyAlert,
  AlertListOptions,
  AlertListResult,
  AlertSummary,
  AcknowledgeAlertOptions,
  SnoozeAlertOptions,
  ResolveAlertOptions,
  AlertsInterface,
  // Insights
  RevenueForecast,
  ForecastFactor,
  EnhancedCohortData,
  CustomerHealthScore,
  GrowthInsights,
  EngagementMetrics,
  InsightsInterface,
  // Notifications (aliased to avoid conflict with NotificationSettings)
  NotificationChannel,
  NotificationTrigger,
  NotificationRule,
  EmailNotificationConfig,
  SlackNotificationConfig,
  WebhookNotificationConfig,
  NotificationDelivery,
  CreateNotificationRuleOptions,
  NotificationsInterface,
  // Team (aliased to avoid conflict with components/pages types)
  TeamRole as StudioTeamRole,
  TeamMember as StudioTeamMember,
  InviteMemberOptions,
  InviteResult,
  UpdateRoleResult,
  RolePermissions,
  TeamInterface,
  // Settings (aliased to avoid conflict with components/pages types)
  AppSettings as StudioAppSettings,
  BillingSettings,
  NotificationSettings,
  ConnectedIntegration,
  UpdateSettingsOptions,
  UpdateBillingOptions,
  UpdateNotificationOptions,
  SettingsInterface,
  // Connection
  ConnectionStatus,
  // Events
  StudioEventType,
  StudioEventHandler,
} from './studio'

// MCP Generator - Model Context Protocol for AI-native SaaS
export { createMCPGenerator, generateMCPServer } from './mcp-generator'
export type {
  // Main interfaces
  MCPGenerator,
  MCPGeneratorConfig,
  MCPServerConfig,
  // Tool types
  MCPTool,
  MCPToolResult,
  // Resource types
  MCPResource,
  MCPResourceTemplate,
  MCPResourceContent,
  // Prompt types
  MCPPrompt,
  MCPPromptArgument,
  MCPPromptResult,
  // Server types
  MCPServerInfo,
  MCPCapabilities,
  // Sampling types
  MCPSamplingMessage,
  MCPSamplingRequest,
  // Transport types
  MCPStdioTransport,
  MCPJSONRPCMessage,
  // Utility types
  JSONSchema,
  JSONSchemaProperty,
} from './mcp-generator'
export { toMCPKey, fromMCPKey, generateToolDescription, generateResourceDescription } from './mcp-generator'

// SDK Generator - Type-safe client SDKs for TypeScript, Python, and Go
export {
  createSDKGenerator,
  generateTypeScriptSDK,
  generatePythonSDK,
  generateGoSDK,
  // Utilities
  parseFieldType,
  parseNoun as parseSDKNoun,
  parseNouns as parseSDKNouns,
  pluralize as sdkPluralize,
  toSnakeCase,
  toCamelCase,
} from './sdk-generator'
export type {
  // Main interfaces
  SDKGenerator,
  SDKConfig,
  GeneratedSDK,
  GeneratedFiles,
  // Language-specific configs
  TypeScriptSDKConfig,
  PythonSDKConfig,
  GoSDKConfig,
  // Input types
  NounSchema as SDKNounSchema,
  NounsConfig as SDKNounsConfig,
  VerbsConfig as SDKVerbsConfig,
  VerbHandler as SDKVerbHandler,
  NounVerbs as SDKNounVerbs,
  FieldType as SDKFieldType,
  // Auth configuration
  AuthConfig as SDKAuthConfig,
  PaginationStrategy,
  RetryStrategy as SDKRetryStrategy,
  RetryConfig as SDKRetryConfig,
  CircuitBreakerConfig as SDKCircuitBreakerConfig,
  RateLimitConfig as SDKRateLimitConfig,
  LoggingConfig as SDKLoggingConfig,
  // Parsed types
  ParsedField as SDKParsedField,
  ParsedNoun as SDKParsedNoun,
  // Publisher types
  Publisher as SDKPublisher,
  PublisherConfig as SDKPublisherConfig,
  PublishResult as SDKPublishResult,
  PublishAllResult as SDKPublishAllResult,
  NpmConfig as SDKNpmConfig,
  PyPIConfig as SDKPyPIConfig,
  GoModulesConfig as SDKGoModulesConfig,
  WebhookConfig as SDKWebhookConfig,
} from './sdk-generator'

// Re-export publisher functions
export {
  createPublisher,
  publishAllSDKs,
  generateAllSDKs,
  createSchemaHash,
} from './sdk-generator'

// App Generator - React admin dashboard generator
export { generateApp } from './generators/app'
export type {
  // Main interfaces
  AppGeneratorConfig,
  GeneratedApp,
  AppRoute,
  // Noun/Verb types
  NounsConfig as AppNounsConfig,
  VerbsConfig as AppVerbsConfig,
  VerbHandler as AppVerbHandler,
  VerbContext as AppVerbContext,
  FieldType as AppFieldType,
  NounFields as AppNounFields,
  // Parsed types
  ParsedField as AppParsedField,
  ParsedNoun as AppParsedNoun,
  // User and permissions
  AppUser,
  // Render options
  RenderOptions as AppRenderOptions,
  RenderResult as AppRenderResult,
  RealtimeEvent as AppRealtimeEvent,
  // Customization
  AppCustomization,
  FieldRenderer,
  FieldRendererContext,
  FieldRendererRegistry,
  AppPlugin,
  PluginContext,
  PluginPosition,
  AppTheme,
  MobileConfig,
  ComponentOverrides,
  DashboardComponentProps,
  ListPageComponentProps,
  ShowPageComponentProps,
  FormPageComponentProps,
} from './generators/app'

// Customization helpers
export {
  getFieldRenderer,
  getComponentOverride,
  getPluginsForPosition,
  getThemeCSSVariables,
  isHiddenOnMobile,
  getResponsiveClasses,
  mergeCustomization,
  defaultCustomization,
} from './generators/app/customization'

// App Context
export { AppProvider as AppGeneratorProvider, useAppContext as useAppGeneratorContext } from './generators/app/context'
export type { AppContextValue as AppGeneratorContextValue, AppProviderProps as AppGeneratorProviderProps } from './generators/app/context'

// CLI Generator - Command-line interface generator
export { createCLIGenerator, generateCLI } from './cli-generator'
export type {
  // Main interfaces
  CLIGenerator,
  CLIConfig,
  GeneratedCLI,
  // Command types
  CommandInfo,
  CommandArg,
  CommandOption,
  CustomCommand,
  // Auth configuration
  CLIAuthConfig,
  // Shell types
  ShellType,
  OutputFormat as CLIOutputFormat,
  // Internal types
  ParsedNoun as CLIParsedNoun,
  ParsedField as CLIParsedField,
  NounsConfig as CLINounsConfig,
  VerbsConfig as CLIVerbsConfig,
  NounVerbs as CLINounVerbs,
  NounSchema as CLINounSchema,
  FieldType as CLIFieldType,
  GeneratedFiles as CLIGeneratedFiles,
} from './cli-generator'
