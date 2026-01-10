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
export function defineApp(config) {
    // Parse nouns into a Set
    const nouns = new Set(config.nouns);
    // Parse verbs into a Map of Sets
    const verbs = new Map();
    if (config.verbs) {
        for (const [noun, verbList] of Object.entries(config.verbs)) {
            if (verbList && Array.isArray(verbList)) {
                verbs.set(noun, new Set(verbList));
            }
        }
    }
    // Parse relationships into indexed Maps
    const relationshipsFrom = new Map();
    const relationshipsTo = new Map();
    if (config.relationships) {
        for (const rel of config.relationships) {
            // Index by 'from'
            const fromList = relationshipsFrom.get(rel.from) || [];
            fromList.push(rel);
            relationshipsFrom.set(rel.from, fromList);
            // Index by 'to'
            const toList = relationshipsTo.get(rel.to) || [];
            toList.push(rel);
            relationshipsTo.set(rel.to, toList);
        }
    }
    // Parse events into a Map
    const events = new Map();
    if (config.events) {
        for (const [eventName, handler] of Object.entries(config.events)) {
            if (handler) {
                events.set(eventName, handler);
            }
        }
    }
    // Parse schedules into a Map
    const schedules = new Map();
    if (config.schedules) {
        for (const [scheduleName, definition] of Object.entries(config.schedules)) {
            if (definition) {
                schedules.set(scheduleName, definition);
            }
        }
    }
    return {
        config,
        nouns,
        verbs,
        relationships: {
            from: relationshipsFrom,
            to: relationshipsTo,
        },
        events,
        schedules,
        hasNoun(noun) {
            return nouns.has(noun);
        },
        hasVerb(noun, verb) {
            const nounVerbs = verbs.get(noun);
            return nounVerbs ? nounVerbs.has(verb) : false;
        },
        getRelationships(noun) {
            const fromRels = relationshipsFrom.get(noun) || [];
            const toRels = relationshipsTo.get(noun) || [];
            return [...fromRels, ...toRels];
        },
    };
}
/**
 * Create a schedule expression for $.every.day.at('9am')
 */
function createScheduleExpression(cron, description) {
    return {
        __type: 'schedule',
        cron,
        description,
    };
}
/**
 * Parse time string to cron hour/minute
 */
function parseTime(time) {
    const match = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) {
        throw new Error(`Invalid time format: ${time}. Expected format: '9am', '9:30am', '14:00'`);
    }
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3]?.toLowerCase();
    if (meridiem === 'pm' && hour !== 12) {
        hour += 12;
    }
    else if (meridiem === 'am' && hour === 12) {
        hour = 0;
    }
    return { hour, minute };
}
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
export const $ = {
    every: Object.assign(
    // Callable: $.every('cron-pattern')
    (pattern) => ({
        at: (time) => {
            const { hour, minute } = parseTime(time);
            // For custom patterns, just use the cron directly with time
            return createScheduleExpression(`${minute} ${hour} * * *`, `${pattern} at ${time}`);
        },
    }), {
        // $.every.day.at('9am')
        day: {
            at: (time) => {
                const { hour, minute } = parseTime(time);
                return createScheduleExpression(`${minute} ${hour} * * *`, `Every day at ${time}`);
            },
        },
        // $.every.hour
        hour: createScheduleExpression('0 * * * *', 'Every hour'),
        // $.every.minute
        minute: createScheduleExpression('* * * * *', 'Every minute'),
        // Days of the week
        monday: {
            at: (time) => {
                const { hour, minute } = parseTime(time);
                return createScheduleExpression(`${minute} ${hour} * * 1`, `Every Monday at ${time}`);
            },
        },
        tuesday: {
            at: (time) => {
                const { hour, minute } = parseTime(time);
                return createScheduleExpression(`${minute} ${hour} * * 2`, `Every Tuesday at ${time}`);
            },
        },
        wednesday: {
            at: (time) => {
                const { hour, minute } = parseTime(time);
                return createScheduleExpression(`${minute} ${hour} * * 3`, `Every Wednesday at ${time}`);
            },
        },
        thursday: {
            at: (time) => {
                const { hour, minute } = parseTime(time);
                return createScheduleExpression(`${minute} ${hour} * * 4`, `Every Thursday at ${time}`);
            },
        },
        friday: {
            at: (time) => {
                const { hour, minute } = parseTime(time);
                return createScheduleExpression(`${minute} ${hour} * * 5`, `Every Friday at ${time}`);
            },
        },
        saturday: {
            at: (time) => {
                const { hour, minute } = parseTime(time);
                return createScheduleExpression(`${minute} ${hour} * * 6`, `Every Saturday at ${time}`);
            },
        },
        sunday: {
            at: (time) => {
                const { hour, minute } = parseTime(time);
                return createScheduleExpression(`${minute} ${hour} * * 0`, `Every Sunday at ${time}`);
            },
        },
    }),
};
