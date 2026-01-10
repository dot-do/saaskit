import type { AppContext, ScheduleExpression } from './context'

/**
 * Schedule handler function signature
 *
 * @example
 * ```ts
 * const handler: ScheduleHandler = async ($) => {
 *   const users = await $.db.list('User', { filter: { inactive: true } })
 *   // Process users...
 * }
 * ```
 */
export type ScheduleHandler = ($: AppContext) => Promise<void> | void

/**
 * Schedule definition - either a schedule expression or handler with expression
 */
export type ScheduleDefinition = ScheduleExpression | ScheduleWithHandler

/**
 * Schedule with attached handler
 */
export interface ScheduleWithHandler {
  schedule: ScheduleExpression
  handler: ScheduleHandler
}

/**
 * Schedules configuration - maps schedule names to definitions
 *
 * Schedule names should be PascalCase.
 *
 * @example
 * ```ts
 * const schedules: SchedulesConfig = {
 *   DailyReport: $.every.day.at('9am'),
 *   WeeklyCleanup: $.every.sunday.at('3am'),
 *   MonthlyBilling: $.every('first monday').at('6am'),
 *   HourlySync: $.every.hour,
 * }
 * ```
 */
export type SchedulesConfig = {
  [K: string]: ScheduleDefinition
}

/**
 * Helper type to extract schedule names from a config
 */
export type ScheduleNames<Config extends SchedulesConfig> = keyof Config & string

/**
 * Parsed schedule with metadata
 */
export interface ParsedSchedule {
  name: string
  cron: string
  description: string
  handler?: ScheduleHandler
  nextRun?: Date
}

/**
 * Creates a schedule expression from cron string
 */
export function schedule(cron: string, description: string): ScheduleExpression {
  return {
    __type: 'schedule',
    cron,
    description,
  }
}

/**
 * Pre-built schedule expressions for common patterns
 */
export const Schedules = {
  /** Every hour on the hour */
  hourly: schedule('0 * * * *', 'Every hour'),

  /** Every day at midnight */
  daily: schedule('0 0 * * *', 'Every day at midnight'),

  /** Every day at 9am */
  dailyMorning: schedule('0 9 * * *', 'Every day at 9am'),

  /** Every Monday at 9am */
  weekly: schedule('0 9 * * 1', 'Every Monday at 9am'),

  /** First day of every month at midnight */
  monthly: schedule('0 0 1 * *', 'First day of every month'),

  /** Every 5 minutes */
  everyFiveMinutes: schedule('*/5 * * * *', 'Every 5 minutes'),

  /** Every 15 minutes */
  everyFifteenMinutes: schedule('*/15 * * * *', 'Every 15 minutes'),

  /** Every 30 minutes */
  everyThirtyMinutes: schedule('*/30 * * * *', 'Every 30 minutes'),
} as const
