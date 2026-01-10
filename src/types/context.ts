/**
 * Configuration for creating a $ context
 */
export interface ContextConfig {
  /** Available nouns for database operations */
  nouns?: string[]
  /** Verb definitions per noun */
  verbs?: Record<string, string[]>
  /** Input payload for verb handlers */
  input?: Record<string, unknown>
  /** Current record being operated on */
  record?: Record<string, unknown>
  /** Current record ID */
  id?: string
  /** Authenticated user */
  user?: { id: string; email: string; role?: string; [key: string]: unknown }
  /** Current organization */
  org?: { id: string; name: string; plan?: string; [key: string]: unknown }
  /** Environment variables */
  env?: Record<string, string | undefined>
}

/**
 * Noun accessor for database operations
 */
export interface NounAccessor {
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  get: (id: string) => Promise<Record<string, unknown> | null>
  update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  delete: (id: string) => Promise<void>
  list: (options?: Record<string, unknown>) => Promise<Record<string, unknown>[]>
  find: (query: Record<string, unknown>) => Promise<Record<string, unknown>[]>
  search: (query: string) => Promise<Record<string, unknown>[]>
  semanticSearch: (query: string) => Promise<Record<string, unknown>[]>
}

/**
 * Agent definition for $.agents
 */
export interface AgentDefinition {
  instructions: string
  tools: string[]
}

/**
 * Time helpers for $.time
 */
export interface TimeHelpers {
  now: () => Date
  daysAgo: (days: number) => Date
  daysFromNow: (days: number) => Date
  hoursAgo: (hours: number) => Date
  startOfDay: () => Date
  endOfDay: () => Date
}

/**
 * Human-in-the-loop handlers
 */
export interface HumanHandlers {
  approve: (message: string, context?: Record<string, unknown>) => Promise<boolean>
  ask: (question: string) => Promise<string>
  review: (content: { content: string; type: string }) => Promise<{ approved: boolean }>
}

/**
 * The $ Context - runtime API for verb handlers, event handlers, and scheduled tasks
 */
export interface Context {
  /** Database operations via noun accessors */
  db: Record<string, NounAccessor>

  /** AI template literal for generation */
  ai: ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<string>) &
    ((prompt: string, options?: Record<string, unknown>) => Promise<string>)

  /** Agent registry */
  agents: Record<string, AgentDefinition & { run: (input: Record<string, unknown>) => Promise<unknown> }>

  /** Human-in-the-loop handlers */
  human: HumanHandlers

  /** Fire and forget event dispatch (durable) */
  send: (event: string, data?: Record<string, unknown>) => void

  /** Wait for action result (durable) */
  do: (action: string, data?: Record<string, unknown>) => Promise<unknown>

  /** Integration API access */
  api: Record<string, unknown>

  /** Input payload for verb handlers */
  input: Record<string, unknown>

  /** Current record being operated on */
  record: Record<string, unknown> | undefined

  /** Current record ID */
  id: string | undefined

  /** Authenticated user */
  user: { id: string; email: string; role?: string; [key: string]: unknown } | undefined

  /** Current organization */
  org: { id: string; name: string; plan?: string; [key: string]: unknown } | undefined

  /** Environment variables */
  env: Record<string, string | undefined>

  /** Time helpers */
  time: TimeHelpers

  /** Event handler registration */
  on: Record<string, Record<string, (handler: Function) => void>>

  /** Schedule registration */
  every: Record<string, unknown>
}

/**
 * App Context ($) - the runtime context available in event handlers and schedules
 *
 * Provides access to all dotdo services and utilities.
 */
export interface AppContext {
  /**
   * Send notifications to users
   */
  notify: (userId: string, message: string, options?: NotifyOptions) => Promise<void>

  /**
   * Email service
   */
  email: {
    send: (options: EmailOptions) => Promise<void>
  }

  /**
   * Slack integration
   */
  slack: {
    send: (channel: string, message: string, options?: SlackOptions) => Promise<void>
  }

  /**
   * Database operations
   */
  db: {
    get: <T>(noun: string, id: string) => Promise<T | null>
    list: <T>(noun: string, options?: ListOptions) => Promise<T[]>
    create: <T>(noun: string, data: Partial<T>) => Promise<T>
    update: <T>(noun: string, id: string, data: Partial<T>) => Promise<T>
    delete: (noun: string, id: string) => Promise<void>
  }

  /**
   * Key-value storage
   */
  kv: {
    get: <T>(key: string) => Promise<T | null>
    set: <T>(key: string, value: T, options?: KvOptions) => Promise<void>
    delete: (key: string) => Promise<void>
  }

  /**
   * Queue operations
   */
  queue: {
    send: (queueName: string, message: unknown) => Promise<void>
  }

  /**
   * Logging
   */
  log: {
    info: (message: string, data?: Record<string, unknown>) => void
    warn: (message: string, data?: Record<string, unknown>) => void
    error: (message: string, data?: Record<string, unknown>) => void
  }

  /**
   * Schedule builder for defining recurring tasks
   */
  every: ScheduleBuilder
}

export interface NotifyOptions {
  type?: 'info' | 'success' | 'warning' | 'error'
  actionUrl?: string
  actionLabel?: string
}

export interface EmailOptions {
  to: string | string[]
  subject?: string
  template?: string
  data?: Record<string, unknown>
}

export interface SlackOptions {
  blocks?: unknown[]
  attachments?: unknown[]
}

export interface ListOptions {
  filter?: Record<string, unknown>
  limit?: number
  offset?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

export interface KvOptions {
  expirationTtl?: number
}

/**
 * Schedule builder interface for the $.every DSL
 */
export interface ScheduleBuilder {
  /** Every day at specified time */
  day: { at: (time: string) => ScheduleExpression }

  /** Every hour */
  hour: ScheduleExpression

  /** Every minute */
  minute: ScheduleExpression

  /** Every week on a specific day */
  monday: { at: (time: string) => ScheduleExpression }
  tuesday: { at: (time: string) => ScheduleExpression }
  wednesday: { at: (time: string) => ScheduleExpression }
  thursday: { at: (time: string) => ScheduleExpression }
  friday: { at: (time: string) => ScheduleExpression }
  saturday: { at: (time: string) => ScheduleExpression }
  sunday: { at: (time: string) => ScheduleExpression }

  /** Custom cron expression */
  (cronExpression: string): { at: (time: string) => ScheduleExpression }
}

/**
 * Represents a parsed schedule expression
 */
export interface ScheduleExpression {
  readonly __type: 'schedule'
  readonly cron: string
  readonly description: string
}
