/**
 * Dotdo Compiler Tests - Events to Workflows (RED Phase)
 *
 * Tests that SaaSKit event handlers compile to dotdo Workflow definitions.
 * This is the RED phase - tests should FAIL because compilers don't exist yet.
 */

import { describe, it, expect } from 'vitest'
import { compileEventToWorkflow } from '../../compiler/events'

describe('event → dotdo Workflow compilation', () => {
  it('compiles $.on handler to Event-triggered Workflow', () => {
    const event = {
      type: 'on',
      noun: 'Order',
      action: 'paid',
      handler: async (_$: unknown) => {},
    }

    const result = compileEventToWorkflow(event)

    expect(result).toMatchObject({
      name: 'on-Order-paid',
      trigger: {
        type: 'event',
        pattern: '$.Order.paid',
      },
    })
  })

  it('compiles $.every schedule to Schedule-triggered Workflow', () => {
    const event = {
      type: 'every',
      interval: 'day',
      time: '6am',
      handler: async (_$: unknown) => {},
    }

    const result = compileEventToWorkflow(event)

    expect(result).toMatchObject({
      trigger: {
        type: 'schedule',
        schedule: '0 6 * * *', // 6am daily cron
        timezone: 'UTC',
      },
    })
  })

  it('compiles hourly schedule correctly', () => {
    const event = {
      type: 'every',
      interval: 'hour',
      handler: async (_$: unknown) => {},
    }

    const result = compileEventToWorkflow(event)

    expect(result.trigger.schedule).toBe('0 * * * *')
  })

  it('compiles weekly schedule correctly', () => {
    const event = {
      type: 'every',
      interval: 'week',
      day: 'monday',
      time: '9am',
      handler: async (_$: unknown) => {},
    }

    const result = compileEventToWorkflow(event)

    expect(result.trigger.schedule).toBe('0 9 * * 1') // Monday 9am
  })

  it('creates workflow steps from handler actions', () => {
    const event = {
      type: 'on',
      noun: 'Order',
      action: 'created',
      steps: [
        { action: 'emails.sendConfirmation' },
        { action: 'slack.notify' },
        { action: 'analytics.increment' },
      ],
    }

    const result = compileEventToWorkflow(event)

    expect(result.steps).toHaveLength(3)
    expect(result.steps[0].type).toBe('function')
    expect(result.steps[1].type).toBe('function')
    expect(result.steps[2].type).toBe('function')
  })

  it('detects parallel operations (Promise.all)', () => {
    const event = {
      type: 'on',
      noun: 'Order',
      action: 'created',
      parallelSteps: [{ action: 'emails.send' }, { action: 'slack.notify' }],
    }

    const result = compileEventToWorkflow(event)

    expect(result.steps[0].type).toBe('parallel')
    expect(result.steps[0].branches).toHaveLength(2)
  })

  it('handles conditional steps', () => {
    const event = {
      type: 'on',
      noun: 'Order',
      action: 'created',
      steps: [
        {
          condition: '$.record.total > 100',
          action: 'emails.sendVIPNotification',
        },
      ],
    }

    const result = compileEventToWorkflow(event)

    expect(result.steps[0].type).toBe('conditional')
    expect(result.steps[0].condition).toBe('$.record.total > 100')
  })
})
