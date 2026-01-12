/**
 * Event to Dotdo Workflow Compiler
 *
 * Compiles SaaSKit event handlers to dotdo Workflow definitions.
 */

export interface EventDefinition {
  type: 'on' | 'every'
  noun?: string
  action?: string
  interval?: string
  time?: string
  day?: string
  handler?: unknown
  steps?: Array<{ action?: string; condition?: string }>
  parallelSteps?: Array<{ action: string }>
}

export interface WorkflowStep {
  type: 'function' | 'parallel' | 'conditional'
  functionId?: string
  branches?: WorkflowStep[]
  condition?: string
}

export interface CompiledWorkflow {
  name: string
  trigger: {
    type: 'event' | 'schedule'
    pattern?: string
    schedule?: string
    timezone?: string
  }
  steps: WorkflowStep[]
}

/**
 * Compiles an event definition to a dotdo Workflow definition.
 *
 * @param event - The event definition to compile
 * @returns A compiled Workflow definition
 */
export function compileEventToWorkflow(event: EventDefinition): CompiledWorkflow {
  if (event.type === 'on') {
    return compileOnEvent(event)
  } else {
    return compileScheduleEvent(event)
  }
}

/**
 * Compiles an 'on' event (e.g., $.Order.paid) to an event-triggered Workflow.
 */
function compileOnEvent(event: EventDefinition): CompiledWorkflow {
  const steps = compileSteps(event)

  return {
    name: `on-${event.noun}-${event.action}`,
    trigger: {
      type: 'event',
      pattern: `$.${event.noun}.${event.action}`,
    },
    steps,
  }
}

/**
 * Compiles an 'every' event (e.g., every day at 6am) to a schedule-triggered Workflow.
 */
function compileScheduleEvent(event: EventDefinition): CompiledWorkflow {
  return {
    name: `every-${event.interval}`,
    trigger: {
      type: 'schedule',
      schedule: mapToCron(event.interval!, event.time, event.day),
      timezone: 'UTC',
    },
    steps: [{ type: 'function' as const }],
  }
}

/**
 * Maps interval/time/day to a cron expression.
 *
 * @param interval - 'hour' | 'day' | 'week'
 * @param time - Optional time like '6am', '9am'
 * @param day - Optional day like 'monday'
 * @returns A cron expression string
 */
function mapToCron(interval: string, time?: string, day?: string): string {
  if (interval === 'hour') {
    return '0 * * * *'
  }

  if (interval === 'day') {
    const hour = parseHour(time)
    return `0 ${hour} * * *`
  }

  if (interval === 'week') {
    const hour = parseHour(time)
    const dayNum = mapDayToNumber(day)
    return `0 ${hour} * * ${dayNum}`
  }

  // Default fallback
  return '0 0 * * *'
}

/**
 * Parses a time string like '6am' or '9pm' to an hour number.
 */
function parseHour(time?: string): number {
  if (!time) return 0

  const isPM = time.toLowerCase().includes('pm')
  const hour = parseInt(time.replace(/[^0-9]/g, ''), 10)

  if (isPM && hour !== 12) {
    return hour + 12
  }
  if (!isPM && hour === 12) {
    return 0
  }
  return hour
}

/**
 * Maps a day name to cron day number (0-6, 0=Sunday).
 */
function mapDayToNumber(day?: string): number {
  if (!day) return 0

  const days: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  return days[day.toLowerCase()] ?? 0
}

/**
 * Compiles event steps into workflow steps.
 */
function compileSteps(event: EventDefinition): WorkflowStep[] {
  // Handle parallel steps (from Promise.all patterns)
  if (event.parallelSteps) {
    return [
      {
        type: 'parallel',
        branches: event.parallelSteps.map(() => ({ type: 'function' as const })),
      },
    ]
  }

  // Handle sequential steps
  if (event.steps) {
    return event.steps.map((step) => {
      if (step.condition) {
        return {
          type: 'conditional' as const,
          condition: step.condition,
        }
      }
      return { type: 'function' as const }
    })
  }

  // Default single step
  return [{ type: 'function' }]
}
