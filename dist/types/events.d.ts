import type { AppContext } from './context';
/**
 * Event name pattern: Noun.verb
 *
 * @example
 * - 'Order.created'
 * - 'User.invited'
 * - 'Payment.failed'
 */
export type EventName<N extends string = string, V extends string = string> = `${N}.${V}`;
/**
 * Event payload - the data associated with an event
 */
export interface EventPayload<T = unknown> {
    /** Unique event ID */
    id: string;
    /** Event timestamp */
    timestamp: Date;
    /** The noun that triggered the event */
    noun: string;
    /** The verb/action that occurred */
    verb: string;
    /** The entity ID that triggered the event */
    entityId: string;
    /** Event-specific data */
    data: T;
    /** User/actor who triggered the event (if applicable) */
    actor?: {
        id: string;
        type: 'user' | 'system' | 'api';
    };
    /** Metadata for tracing and debugging */
    metadata?: Record<string, unknown>;
}
/**
 * Event handler function signature
 *
 * @example
 * ```ts
 * const handler: EventHandler = async ($, event) => {
 *   await $.notify(event.data.customerId, 'Your order has been placed')
 * }
 * ```
 */
export type EventHandler<T = unknown> = ($: AppContext, event: EventPayload<T>) => Promise<void> | void;
/**
 * Events configuration - maps event names to handlers
 *
 * @example
 * ```ts
 * const events: EventsConfig = {
 *   'Order.created': async ($, event) => {
 *     await $.notify(event.data.customerId, 'Order placed')
 *   },
 *   'User.invited': async ($, event) => {
 *     await $.email.send({ to: event.data.email, template: 'invite' })
 *   },
 * }
 * ```
 */
export type EventsConfig<N extends string = string, V extends string = string> = {
    [K in EventName<N, V>]?: EventHandler;
};
/**
 * Helper type to extract event names from a config
 */
export type EventNames<Config extends EventsConfig> = keyof Config & string;
/**
 * Built-in event types for common patterns
 */
export type BuiltInEventVerbs = 'created' | 'updated' | 'deleted' | 'archived' | 'restored';
/**
 * Generates event name type from nouns and verbs
 */
export type GenerateEventNames<Nouns extends readonly string[], Verbs extends Record<string, readonly string[]>> = {
    [N in Nouns[number]]: N extends keyof Verbs ? `${N}.${Verbs[N][number] extends string ? Verbs[N][number] : never}` : never;
}[Nouns[number]];
//# sourceMappingURL=events.d.ts.map