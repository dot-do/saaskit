/**
 * Creates a schedule expression from cron string
 */
export function schedule(cron, description) {
    return {
        __type: 'schedule',
        cron,
        description,
    };
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
};
