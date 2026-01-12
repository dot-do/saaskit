import type { AppConfig, App } from '../types/app'
import type { VerbsConfig } from '../types/verbs'
import type { Relationship } from '../types/relationships'
import type { ScheduleExpression, ScheduleBuilder } from '../types/context'
import { ai, agent, agents, human } from '../ai'

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
export function defineApp<
  const Nouns extends readonly string[],
  const Verbs extends VerbsConfig<Nouns[number]> = VerbsConfig<Nouns[number]>,
>(config: AppConfig<Nouns, Verbs>): App<Nouns, Verbs> {
  // Parse nouns into a Set
  const nouns = new Set(config.nouns)

  // Parse verbs into a Map of Sets
  const verbs = new Map<Nouns[number], Set<string>>()
  if (config.verbs) {
    for (const [noun, verbList] of Object.entries(config.verbs)) {
      if (verbList && Array.isArray(verbList)) {
        verbs.set(noun as Nouns[number], new Set(verbList as readonly string[]))
      }
    }
  }

  // Parse relationships into indexed Maps
  const relationshipsFrom = new Map<Nouns[number], Relationship<Nouns[number]>[]>()
  const relationshipsTo = new Map<Nouns[number], Relationship<Nouns[number]>[]>()

  if (config.relationships) {
    for (const rel of config.relationships) {
      // Index by 'from'
      const fromList = relationshipsFrom.get(rel.from) || []
      fromList.push(rel)
      relationshipsFrom.set(rel.from, fromList)

      // Index by 'to'
      const toList = relationshipsTo.get(rel.to) || []
      toList.push(rel)
      relationshipsTo.set(rel.to, toList)
    }
  }

  // Parse events into a Map
  const events = new Map<string, unknown>()
  if (config.events) {
    for (const [eventName, handler] of Object.entries(config.events)) {
      if (handler) {
        events.set(eventName, handler)
      }
    }
  }

  // Parse schedules into a Map
  const schedules = new Map<string, unknown>()
  if (config.schedules) {
    for (const [scheduleName, definition] of Object.entries(config.schedules)) {
      if (definition) {
        schedules.set(scheduleName, definition)
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

    hasNoun(noun: string): boolean {
      return nouns.has(noun as Nouns[number])
    },

    hasVerb(noun: string, verb: string): boolean {
      const nounVerbs = verbs.get(noun as Nouns[number])
      return nounVerbs ? nounVerbs.has(verb) : false
    },

    getRelationships(noun: string): Relationship<Nouns[number]>[] {
      const fromRels = relationshipsFrom.get(noun as Nouns[number]) || []
      const toRels = relationshipsTo.get(noun as Nouns[number]) || []
      return [...fromRels, ...toRels]
    },
  }
}

/**
 * Create a schedule expression for $.every.day.at('9am')
 */
function createScheduleExpression(cron: string, description: string): ScheduleExpression {
  return {
    __type: 'schedule',
    cron,
    description,
  }
}

/**
 * Parse time string to cron hour/minute
 */
function parseTime(time: string): { hour: number; minute: number } {
  const match = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) {
    throw new Error(`Invalid time format: ${time}. Expected format: '9am', '9:30am', '14:00'`)
  }

  let hour = parseInt(match[1], 10)
  const minute = match[2] ? parseInt(match[2], 10) : 0
  const meridiem = match[3]?.toLowerCase()

  if (meridiem === 'pm' && hour !== 12) {
    hour += 12
  } else if (meridiem === 'am' && hour === 12) {
    hour = 0
  }

  return { hour, minute }
}

/**
 * Schedule builder for the $.every DSL
 */
const everyBuilder: ScheduleBuilder = Object.assign(
  // Callable: $.every('cron-pattern')
  (pattern: string) => ({
    at: (time: string) => {
      const { hour, minute } = parseTime(time)
      // For custom patterns, just use the cron directly with time
      return createScheduleExpression(`${minute} ${hour} * * *`, `${pattern} at ${time}`)
    },
  }),
  {
    // $.every.day.at('9am')
    day: {
      at: (time: string) => {
        const { hour, minute } = parseTime(time)
        return createScheduleExpression(`${minute} ${hour} * * *`, `Every day at ${time}`)
      },
    },

    // $.every.hour
    hour: createScheduleExpression('0 * * * *', 'Every hour'),

    // $.every.minute
    minute: createScheduleExpression('* * * * *', 'Every minute'),

    // Days of the week
    monday: {
      at: (time: string) => {
        const { hour, minute } = parseTime(time)
        return createScheduleExpression(`${minute} ${hour} * * 1`, `Every Monday at ${time}`)
      },
    },
    tuesday: {
      at: (time: string) => {
        const { hour, minute } = parseTime(time)
        return createScheduleExpression(`${minute} ${hour} * * 2`, `Every Tuesday at ${time}`)
      },
    },
    wednesday: {
      at: (time: string) => {
        const { hour, minute } = parseTime(time)
        return createScheduleExpression(`${minute} ${hour} * * 3`, `Every Wednesday at ${time}`)
      },
    },
    thursday: {
      at: (time: string) => {
        const { hour, minute } = parseTime(time)
        return createScheduleExpression(`${minute} ${hour} * * 4`, `Every Thursday at ${time}`)
      },
    },
    friday: {
      at: (time: string) => {
        const { hour, minute } = parseTime(time)
        return createScheduleExpression(`${minute} ${hour} * * 5`, `Every Friday at ${time}`)
      },
    },
    saturday: {
      at: (time: string) => {
        const { hour, minute } = parseTime(time)
        return createScheduleExpression(`${minute} ${hour} * * 6`, `Every Saturday at ${time}`)
      },
    },
    sunday: {
      at: (time: string) => {
        const { hour, minute } = parseTime(time)
        return createScheduleExpression(`${minute} ${hour} * * 0`, `Every Sunday at ${time}`)
      },
    },
  }
)

/**
 * The $ context object - provides access to all SaaSKit capabilities
 *
 * @example
 * ```ts
 * // AI generation
 * const text = await $.ai`Write a greeting for ${name}`
 *
 * // Agent registration and execution
 * $.agent('support', { instructions: '...', tools: ['...'] })
 * const result = await $.agents.support.run({ message: '...' })
 *
 * // Human-in-the-loop
 * const approved = await $.human.approve('Refund $50?')
 *
 * // Schedules
 * $.every.day.at('9am')
 * ```
 */
export const $ = {
  /** AI template literal for text generation */
  ai,
  /** Register an agent with instructions and tools */
  agent,
  /** Access registered agents */
  agents,
  /** Human-in-the-loop operations */
  human,
  /** Schedule builder */
  every: everyBuilder,
}
