import type { AppContext, ScheduleExpression } from './context';
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
export type ScheduleHandler = ($: AppContext) => Promise<void> | void;
/**
 * Schedule definition - either a schedule expression or handler with expression
 */
export type ScheduleDefinition = ScheduleExpression | ScheduleWithHandler;
/**
 * Schedule with attached handler
 */
export interface ScheduleWithHandler {
    schedule: ScheduleExpression;
    handler: ScheduleHandler;
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
    [K: string]: ScheduleDefinition;
};
/**
 * Helper type to extract schedule names from a config
 */
export type ScheduleNames<Config extends SchedulesConfig> = keyof Config & string;
/**
 * Parsed schedule with metadata
 */
export interface ParsedSchedule {
    name: string;
    cron: string;
    description: string;
    handler?: ScheduleHandler;
    nextRun?: Date;
}
/**
 * Creates a schedule expression from cron string
 */
export declare function schedule(cron: string, description: string): ScheduleExpression;
/**
 * Pre-built schedule expressions for common patterns
 */
export declare const Schedules: {
    /** Every hour on the hour */
    readonly hourly: ScheduleExpression;
    /** Every day at midnight */
    readonly daily: ScheduleExpression;
    /** Every day at 9am */
    readonly dailyMorning: ScheduleExpression;
    /** Every Monday at 9am */
    readonly weekly: ScheduleExpression;
    /** First day of every month at midnight */
    readonly monthly: ScheduleExpression;
    /** Every 5 minutes */
    readonly everyFiveMinutes: ScheduleExpression;
    /** Every 15 minutes */
    readonly everyFifteenMinutes: ScheduleExpression;
    /** Every 30 minutes */
    readonly everyThirtyMinutes: ScheduleExpression;
};
//# sourceMappingURL=schedules.d.ts.map