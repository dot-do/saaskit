/**
 * Events & Schedules Tests
 *
 * Tests the fluent API for event handlers and workflow primitives
 * that integrate with Workflows.do
 *
 * This is a TDD RED phase - all tests should FAIL until implementation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEventBuilder, createWorkflowPrimitives } from '../events'
import type { AppContext, EventPayload } from '../types'

// Type helper for schedule builder
type EventHandlerFn<T> = (record: T, $: AppContext) => Promise<void>
type ScheduleHandlerFn = ($: AppContext) => Promise<void>
type ScheduleMap = Map<string, { cron: string; handler: ScheduleHandlerFn }>

// Extended schedule builder type for tests
interface TestScheduleBuilder {
  day: {
    at6am: (handler: ScheduleHandlerFn) => void
    at9am: (handler: ScheduleHandlerFn) => void
    at3am: (handler: ScheduleHandlerFn) => void
  }
  hour: (handler: ScheduleHandlerFn) => void
  minute: (handler: ScheduleHandlerFn) => void
  Monday: { at6am: (handler: ScheduleHandlerFn) => void; at9am: (handler: ScheduleHandlerFn) => void; at3am: (handler: ScheduleHandlerFn) => void }
  Tuesday: { at6am: (handler: ScheduleHandlerFn) => void; at9am: (handler: ScheduleHandlerFn) => void; at3am: (handler: ScheduleHandlerFn) => void }
  Wednesday: { at6am: (handler: ScheduleHandlerFn) => void; at9am: (handler: ScheduleHandlerFn) => void; at3am: (handler: ScheduleHandlerFn) => void }
  Thursday: { at6am: (handler: ScheduleHandlerFn) => void; at9am: (handler: ScheduleHandlerFn) => void; at3am: (handler: ScheduleHandlerFn) => void }
  Friday: { at6am: (handler: ScheduleHandlerFn) => void; at9am: (handler: ScheduleHandlerFn) => void; at3am: (handler: ScheduleHandlerFn) => void }
  Saturday: { at6am: (handler: ScheduleHandlerFn) => void; at9am: (handler: ScheduleHandlerFn) => void; at3am: (handler: ScheduleHandlerFn) => void }
  Sunday: { at6am: (handler: ScheduleHandlerFn) => void; at9am: (handler: ScheduleHandlerFn) => void; at3am: (handler: ScheduleHandlerFn) => void }
}

describe('Events & Schedules', () => {
  describe('$.on.[Noun].[event]() - Event Handler Registration', () => {
    let $on: ReturnType<typeof createEventBuilder>
    let registeredHandlers: Map<string, Array<(record: unknown, $: AppContext) => Promise<void>>>

    beforeEach(() => {
      registeredHandlers = new Map()
      $on = createEventBuilder(registeredHandlers)
    })

    it('registers a handler for $.on.Order.created()', () => {
      const handler = vi.fn()
      $on.Order.created(handler)

      expect(registeredHandlers.has('Order.created')).toBe(true)
      expect(registeredHandlers.get('Order.created')).toContain(handler)
    })

    it('registers a handler for $.on.User.updated()', () => {
      const handler = vi.fn()
      $on.User.updated(handler)

      expect(registeredHandlers.has('User.updated')).toBe(true)
      expect(registeredHandlers.get('User.updated')).toContain(handler)
    })

    it('registers a handler for $.on.Product.deleted()', () => {
      const handler = vi.fn()
      $on.Product.deleted(handler)

      expect(registeredHandlers.has('Product.deleted')).toBe(true)
    })

    it('registers a handler for custom event $.on.Order.paid()', () => {
      const handler = vi.fn()
      $on.Order.paid(handler)

      expect(registeredHandlers.has('Order.paid')).toBe(true)
    })

    it('registers a handler for custom event $.on.Match.hired()', () => {
      const handler = vi.fn()
      $on.Match.hired(handler)

      expect(registeredHandlers.has('Match.hired')).toBe(true)
    })

    it('allows multiple handlers for the same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()

      $on.Order.created(handler1)
      $on.Order.created(handler2)
      $on.Order.created(handler3)

      const handlers = registeredHandlers.get('Order.created')
      expect(handlers).toHaveLength(3)
      expect(handlers).toContain(handler1)
      expect(handlers).toContain(handler2)
      expect(handlers).toContain(handler3)
    })

    it('registers handlers for different nouns independently', () => {
      const orderHandler = vi.fn()
      const userHandler = vi.fn()

      $on.Order.created(orderHandler)
      $on.User.created(userHandler)

      expect(registeredHandlers.get('Order.created')).toContain(orderHandler)
      expect(registeredHandlers.get('User.created')).toContain(userHandler)
      expect(registeredHandlers.get('Order.created')).not.toContain(userHandler)
    })
  })

  describe('Event Handler Arguments', () => {
    let $on: ReturnType<typeof createEventBuilder>
    let registeredHandlers: Map<string, Array<(record: unknown, $: AppContext) => Promise<void>>>
    let mockContext: AppContext

    beforeEach(() => {
      registeredHandlers = new Map()
      $on = createEventBuilder(registeredHandlers)
      mockContext = {
        notify: vi.fn(),
        email: { send: vi.fn() },
        slack: { send: vi.fn() },
        db: {
          get: vi.fn(),
          list: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        kv: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
        queue: { send: vi.fn() },
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        every: {} as AppContext['every'],
        api: { slack: { send: vi.fn() }, emails: { send: vi.fn() } },
      } as unknown as AppContext
    })

    it('handler receives (record, $) arguments', async () => {
      const handler = vi.fn()
      $on.Order.created(handler)

      const order = { id: '123', total: 99.99, customerId: 'cust-1' }
      const handlers = registeredHandlers.get('Order.created')!

      await handlers[0](order, mockContext)

      expect(handler).toHaveBeenCalledWith(order, mockContext)
    })

    it('handler has access to $.db', async () => {
      $on.Order.paid(async (order, $) => {
        await $.db.update('Order', (order as { id: string }).id, { status: 'completed' })
      })

      const order = { id: 'order-123', total: 50 }
      const handlers = registeredHandlers.get('Order.paid')!
      await handlers[0](order, mockContext)

      expect(mockContext.db.update).toHaveBeenCalledWith('Order', 'order-123', { status: 'completed' })
    })

    it('handler has access to $.api.slack', async () => {
      $on.Order.created(async (order, $) => {
        await ($.api.slack as { send: (channel: string, msg: string) => Promise<void> }).send('#sales', `New order: $${(order as { total: number }).total}`)
      })

      const order = { id: '123', total: 99.99 }
      const handlers = registeredHandlers.get('Order.created')!
      await handlers[0](order, mockContext)

      expect((mockContext as any).api.slack.send).toHaveBeenCalledWith('#sales', 'New order: $99.99')
    })

    it('handler has access to $.api.emails', async () => {
      $on.Match.hired(async (match, $) => {
        await ($.api.emails as { send: (opts: { to: string; subject: string }) => Promise<void> }).send({
          to: (match as { candidate: { email: string } }).candidate.email,
          subject: 'Offer Letter',
        })
      })

      const match = { id: 'm-1', candidate: { email: 'john@example.com.ai' } }
      const handlers = registeredHandlers.get('Match.hired')!
      await handlers[0](match, mockContext)

      expect((mockContext as any).api.emails.send).toHaveBeenCalledWith({
        to: 'john@example.com.ai',
        subject: 'Offer Letter',
      })
    })

    it('handler receives full $ context with all services', async () => {
      let receivedContext: AppContext | null = null
      $on.Order.created(async (_order, $) => {
        receivedContext = $
      })

      const handlers = registeredHandlers.get('Order.created')!
      await handlers[0]({}, mockContext)

      expect(receivedContext).toBe(mockContext)
      expect(receivedContext).toHaveProperty('db')
      expect(receivedContext).toHaveProperty('email')
      expect(receivedContext).toHaveProperty('slack')
      expect(receivedContext).toHaveProperty('kv')
      expect(receivedContext).toHaveProperty('queue')
      expect(receivedContext).toHaveProperty('log')
    })
  })

  describe('$.every.[interval].at[time]() - Schedule Registration', () => {
    let $every: TestScheduleBuilder
    let registeredSchedules: ScheduleMap

    beforeEach(() => {
      registeredSchedules = new Map()
      // We need to create a schedule builder that registers to our map
      $every = createScheduleRegistrar(registeredSchedules) as TestScheduleBuilder
    })

    it('$.every.day.at6am() registers a daily schedule at 6am', () => {
      const handler = vi.fn()
      $every.day.at6am(handler)

      const schedule = registeredSchedules.get('day.at6am')
      expect(schedule).toBeDefined()
      expect(schedule?.cron).toBe('0 6 * * *')
    })

    it('$.every.day.at9am() registers a daily schedule at 9am', () => {
      const handler = vi.fn()
      $every.day.at9am(handler)

      const schedule = registeredSchedules.get('day.at9am')
      expect(schedule).toBeDefined()
      expect(schedule?.cron).toBe('0 9 * * *')
    })

    it('$.every.Monday.at9am() registers a weekly schedule', () => {
      const handler = vi.fn()
      $every.Monday.at9am(handler)

      const schedule = registeredSchedules.get('Monday.at9am')
      expect(schedule).toBeDefined()
      expect(schedule?.cron).toBe('0 9 * * 1')
    })

    it('$.every.Sunday.at3am() registers a Sunday schedule', () => {
      const handler = vi.fn()
      $every.Sunday.at3am(handler)

      const schedule = registeredSchedules.get('Sunday.at3am')
      expect(schedule).toBeDefined()
      expect(schedule?.cron).toBe('0 3 * * 0')
    })

    it('$.every.hour() registers an hourly schedule', () => {
      const handler = vi.fn()
      $every.hour(handler)

      const schedule = registeredSchedules.get('hour')
      expect(schedule).toBeDefined()
      expect(schedule?.cron).toBe('0 * * * *')
    })

    it('$.every.minute() registers a per-minute schedule', () => {
      const handler = vi.fn()
      $every.minute(handler)

      const schedule = registeredSchedules.get('minute')
      expect(schedule).toBeDefined()
      expect(schedule?.cron).toBe('* * * * *')
    })

    it('supports all days of the week', () => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
      const expectedDayNumbers = [1, 2, 3, 4, 5, 6, 0]

      days.forEach((day, index) => {
        const handler = vi.fn()
        ;($every as any)[day].at9am(handler)

        const schedule = registeredSchedules.get(`${day}.at9am`)
        expect(schedule?.cron).toBe(`0 9 * * ${expectedDayNumbers[index]}`)
      })
    })

    it('schedule handler receives $ context', async () => {
      const mockContext = {
        db: { Order: { find: vi.fn().mockResolvedValue([]) } },
      } as unknown as AppContext

      let receivedContext: AppContext | null = null
      $every.day.at6am(async ($: AppContext) => {
        receivedContext = $
        await ($.db as any).Order.find({ status: 'pending' })
      })

      const schedule = registeredSchedules.get('day.at6am')
      await schedule?.handler(mockContext)

      expect(receivedContext).toBe(mockContext)
    })
  })

  describe('$.send() - Fire and Forget Durable Events', () => {
    let workflows: ReturnType<typeof createWorkflowPrimitives>
    let sentEvents: Array<{ event: string; payload: unknown }>

    beforeEach(() => {
      sentEvents = []
      workflows = createWorkflowPrimitives({
        onSend: (event, payload) => {
          sentEvents.push({ event, payload })
        },
      })
    })

    it('$.send() fires an event with payload', () => {
      workflows.send('Order.paid', { orderId: '123' })

      expect(sentEvents).toHaveLength(1)
      expect(sentEvents[0]).toEqual({
        event: 'Order.paid',
        payload: { orderId: '123' },
      })
    })

    it('$.send() is fire-and-forget (returns void, not Promise)', () => {
      const result = workflows.send('User.invited', { userId: 'u-1' })

      // Fire and forget should return void
      expect(result).toBeUndefined()
    })

    it('$.send() can fire multiple events', () => {
      workflows.send('Order.created', { orderId: '1' })
      workflows.send('Order.paid', { orderId: '1' })
      workflows.send('Order.fulfilled', { orderId: '1' })

      expect(sentEvents).toHaveLength(3)
      expect(sentEvents.map(e => e.event)).toEqual([
        'Order.created',
        'Order.paid',
        'Order.fulfilled',
      ])
    })

    it('$.send() works with complex payloads', () => {
      workflows.send('Invoice.generated', {
        invoiceId: 'inv-123',
        customer: { id: 'c-1', name: 'Acme Corp' },
        lineItems: [
          { productId: 'p-1', quantity: 2, price: 10 },
          { productId: 'p-2', quantity: 1, price: 25 },
        ],
        total: 45,
        currency: 'USD',
      })

      expect(sentEvents[0].payload).toMatchObject({
        invoiceId: 'inv-123',
        total: 45,
      })
    })
  })

  describe('$.do() - Await Durable Action Result', () => {
    let workflows: ReturnType<typeof createWorkflowPrimitives>
    let actionResults: Map<string, unknown>

    beforeEach(() => {
      actionResults = new Map()
      actionResults.set('processRefund', { success: true, refundId: 'r-123' })
      actionResults.set('sendEmail', { delivered: true, messageId: 'm-456' })
      actionResults.set('chargeCard', { charged: true, transactionId: 't-789' })

      workflows = createWorkflowPrimitives({
        onDo: async (action, payload) => {
          return actionResults.get(action) ?? null
        },
      })
    })

    it('$.do() returns a Promise', () => {
      const result = workflows.do('processRefund', { orderId: '123' })

      expect(result).toBeInstanceOf(Promise)
    })

    it('$.do() awaits and returns the action result', async () => {
      const result = await workflows.do('processRefund', { orderId: '123' })

      expect(result).toEqual({ success: true, refundId: 'r-123' })
    })

    it('$.do() passes payload to the action', async () => {
      let receivedPayload: unknown = null
      workflows = createWorkflowPrimitives({
        onDo: async (action, payload) => {
          receivedPayload = payload
          return { success: true }
        },
      })

      await workflows.do('processRefund', { orderId: '123', reason: 'customer request' })

      expect(receivedPayload).toEqual({ orderId: '123', reason: 'customer request' })
    })

    it('$.do() can chain multiple durable actions', async () => {
      const executionOrder: string[] = []

      workflows = createWorkflowPrimitives({
        onDo: async (action, _payload) => {
          executionOrder.push(action)
          return { success: true }
        },
      })

      await workflows.do('validateOrder', { orderId: '1' })
      await workflows.do('chargePayment', { orderId: '1' })
      await workflows.do('fulfillOrder', { orderId: '1' })

      expect(executionOrder).toEqual(['validateOrder', 'chargePayment', 'fulfillOrder'])
    })

    it('$.do() propagates errors from durable actions', async () => {
      workflows = createWorkflowPrimitives({
        onDo: async (action, _payload) => {
          if (action === 'chargeCard') {
            throw new Error('Payment declined')
          }
          return { success: true }
        },
      })

      await expect(workflows.do('chargeCard', { amount: 100 })).rejects.toThrow('Payment declined')
    })

    it('$.do() handles async operations correctly', async () => {
      workflows = createWorkflowPrimitives({
        onDo: async (action, _payload) => {
          // Simulate async delay
          await new Promise(resolve => setTimeout(resolve, 10))
          return { action, completed: true, timestamp: Date.now() }
        },
      })

      const start = Date.now()
      const result = await workflows.do('slowAction', {})
      const duration = Date.now() - start

      expect(duration).toBeGreaterThanOrEqual(10)
      expect(result).toMatchObject({ action: 'slowAction', completed: true })
    })
  })

  describe('Integration: Events with Workflow Primitives', () => {
    let $on: ReturnType<typeof createEventBuilder>
    let workflows: ReturnType<typeof createWorkflowPrimitives>
    let registeredHandlers: Map<string, Array<(record: unknown, $: AppContext) => Promise<void>>>
    let sentEvents: Array<{ event: string; payload: unknown }>
    let doResults: Map<string, unknown>

    beforeEach(() => {
      registeredHandlers = new Map()
      sentEvents = []
      doResults = new Map()
      doResults.set('sendSlackNotification', { sent: true })
      doResults.set('updateMetrics', { updated: true })

      $on = createEventBuilder(registeredHandlers)
      workflows = createWorkflowPrimitives({
        onSend: (event, payload) => sentEvents.push({ event, payload }),
        onDo: async (action, _payload) => doResults.get(action),
      })
    })

    it('event handler can use $.send() to trigger other events', async () => {
      // Create a context that includes the workflow primitives
      const contextWithWorkflows = {
        send: workflows.send,
        do: workflows.do,
        db: { Metric: { increment: vi.fn() } },
      } as unknown as AppContext

      $on.Order.paid(async (order, $) => {
        // Fire analytics event
        $.send('Analytics.orderPaid', { orderId: (order as any).id })
        // Fire notification event
        $.send('Notification.send', { type: 'order_paid', userId: (order as any).customerId })
      })

      const handlers = registeredHandlers.get('Order.paid')!
      await handlers[0]({ id: 'o-1', customerId: 'c-1' }, contextWithWorkflows)

      expect(sentEvents).toHaveLength(2)
      expect(sentEvents[0].event).toBe('Analytics.orderPaid')
      expect(sentEvents[1].event).toBe('Notification.send')
    })

    it('event handler can use $.do() for durable operations', async () => {
      const contextWithWorkflows = {
        send: workflows.send,
        do: workflows.do,
        db: { Metric: { increment: vi.fn() } },
      } as unknown as AppContext

      let slackResult: unknown = null
      $on.Order.created(async (order, $) => {
        slackResult = await $.do('sendSlackNotification', {
          channel: '#orders',
          message: `New order ${(order as any).id}`,
        })
      })

      const handlers = registeredHandlers.get('Order.created')!
      await handlers[0]({ id: 'o-123' }, contextWithWorkflows)

      expect(slackResult).toEqual({ sent: true })
    })

    it('scheduled task can use workflow primitives', async () => {
      const registeredSchedules = new Map<string, { cron: string; handler: (ctx: AppContext) => Promise<void> }>()
      const $every = createScheduleRegistrar(registeredSchedules) as TestScheduleBuilder

      const contextWithWorkflows = {
        send: workflows.send,
        do: workflows.do,
        db: { Metric: { sum: vi.fn().mockResolvedValue(10000) } },
      } as unknown as AppContext

      $every.Monday.at9am(async ($: AppContext) => {
        const revenue = await ($.db as any).Metric.sum('revenue', { period: 'week' })
        $.send('Slack.message', {
          channel: '#metrics',
          message: `Weekly revenue: $${revenue}`,
        })
      })

      const schedule = registeredSchedules.get('Monday.at9am')
      await schedule?.handler(contextWithWorkflows)

      expect(sentEvents).toContainEqual({
        event: 'Slack.message',
        payload: { channel: '#metrics', message: 'Weekly revenue: $10000' },
      })
    })
  })
})

// Helper: Create schedule registrar for testing
function createScheduleRegistrar(
  schedules: Map<string, { cron: string; handler: ($: AppContext) => Promise<void> }>
) {
  const cronMap: Record<string, string> = {
    'Monday': '1',
    'Tuesday': '2',
    'Wednesday': '3',
    'Thursday': '4',
    'Friday': '5',
    'Saturday': '6',
    'Sunday': '0',
  }

  const createDayScheduler = (dayName: string, dayNumber: string) => ({
    at6am: (handler: ($: AppContext) => Promise<void>) => {
      schedules.set(`${dayName}.at6am`, { cron: `0 6 * * ${dayNumber}`, handler })
    },
    at9am: (handler: ($: AppContext) => Promise<void>) => {
      schedules.set(`${dayName}.at9am`, { cron: `0 9 * * ${dayNumber}`, handler })
    },
    at3am: (handler: ($: AppContext) => Promise<void>) => {
      schedules.set(`${dayName}.at3am`, { cron: `0 3 * * ${dayNumber}`, handler })
    },
  })

  return {
    day: createDayScheduler('day', '*'),
    hour: (handler: ($: AppContext) => Promise<void>) => {
      schedules.set('hour', { cron: '0 * * * *', handler })
    },
    minute: (handler: ($: AppContext) => Promise<void>) => {
      schedules.set('minute', { cron: '* * * * *', handler })
    },
    Monday: createDayScheduler('Monday', cronMap.Monday),
    Tuesday: createDayScheduler('Tuesday', cronMap.Tuesday),
    Wednesday: createDayScheduler('Wednesday', cronMap.Wednesday),
    Thursday: createDayScheduler('Thursday', cronMap.Thursday),
    Friday: createDayScheduler('Friday', cronMap.Friday),
    Saturday: createDayScheduler('Saturday', cronMap.Saturday),
    Sunday: createDayScheduler('Sunday', cronMap.Sunday),
  }
}
