import type { AppConfig, App } from '../types/app';
import type { VerbsConfig } from '../types/verbs';
import type { ScheduleBuilder } from '../types/context';
/**
 * Define a SaaS application with type-safe nouns, verbs, relationships, events, and schedules.
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
export declare function defineApp<const Nouns extends readonly string[], const Verbs extends VerbsConfig<Nouns[number]> = VerbsConfig<Nouns[number]>>(config: AppConfig<Nouns, Verbs>): App<Nouns, Verbs>;
/**
 * Schedule builder for the $.every DSL
 *
 * @example
 * ```ts
 * $.every.day.at('9am')        // 0 9 * * *
 * $.every.sunday.at('3am')     // 0 3 * * 0
 * $.every.hour                  // 0 * * * *
 * $.every('first monday').at('6am')  // 0 6 * * 1
 * ```
 */
export declare const $: {
    every: ScheduleBuilder;
};
//# sourceMappingURL=define-app.d.ts.map