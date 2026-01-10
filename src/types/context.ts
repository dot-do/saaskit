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
