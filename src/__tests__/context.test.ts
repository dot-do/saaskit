/**
 * Tests for the $ Context System
 *
 * The $ context is the runtime API available to all verb handlers, event handlers,
 * and scheduled tasks. It provides unified access to:
 *
 * - Database operations ($.db)
 * - AI capabilities ($.ai, $.agents)
 * - Human-in-the-loop ($.human)
 * - Workflow primitives ($.send, $.do)
 * - External integrations ($.api)
 * - Runtime context ($.input, $.record, $.id, $.user, $.org, $.env, $.time)
 * - Event handlers ($.on)
 * - Schedules ($.every)
 */

import { describe, it, expect, vi } from 'vitest'
import { createContext } from '../core/context'
import type { Context, ContextConfig } from '../types/context'

describe('$ Context System', () => {
  /**
   * Factory function for creating test contexts
   */
  const createTestContext = (config: Partial<ContextConfig> = {}): Context => {
    return createContext({
      nouns: ['Customer', 'Order', 'Product'],
      ...config,
    })
  }

  describe('Context Creation', () => {
    it('should create a context with all required properties', () => {
      const $ = createTestContext()

      // Core APIs
      expect($).toHaveProperty('db')
      expect($).toHaveProperty('ai')
      expect($).toHaveProperty('agents')
      expect($).toHaveProperty('human')
      expect($).toHaveProperty('send')
      expect($).toHaveProperty('do')
      expect($).toHaveProperty('api')

      // Runtime context
      expect($).toHaveProperty('input')
      expect($).toHaveProperty('record')
      expect($).toHaveProperty('id')
      expect($).toHaveProperty('user')
      expect($).toHaveProperty('org')
      expect($).toHaveProperty('env')
      expect($).toHaveProperty('time')

      // Event and schedule handlers
      expect($).toHaveProperty('on')
      expect($).toHaveProperty('every')
    })

    it('should be immutable/frozen in production mode', () => {
      const $ = createTestContext()

      // Core properties should not be reassignable
      expect(() => {
        // @ts-expect-error - testing runtime immutability
        $.db = {}
      }).toThrow()
    })
  })

  describe('$.db - Database Operations', () => {
    it('should create noun-specific database accessors via proxy', () => {
      const $ = createTestContext({ nouns: ['Customer', 'Order', 'Product'] })

      // Each noun should have its own accessor
      expect($.db.Customer).toBeDefined()
      expect($.db.Order).toBeDefined()
      expect($.db.Product).toBeDefined()
    })

    it('should expose CRUD operations on noun accessors', () => {
      const $ = createTestContext({ nouns: ['Customer'] })

      expect($.db.Customer.create).toBeInstanceOf(Function)
      expect($.db.Customer.get).toBeInstanceOf(Function)
      expect($.db.Customer.update).toBeInstanceOf(Function)
      expect($.db.Customer.delete).toBeInstanceOf(Function)
      expect($.db.Customer.list).toBeInstanceOf(Function)
      expect($.db.Customer.find).toBeInstanceOf(Function)
    })

    it('should expose search operations on noun accessors', () => {
      const $ = createTestContext({ nouns: ['Customer'] })

      expect($.db.Customer.search).toBeInstanceOf(Function)
      expect($.db.Customer.semanticSearch).toBeInstanceOf(Function)
    })

    it('should return promises from database operations', async () => {
      const $ = createTestContext({ nouns: ['Customer'] })

      const createResult = $.db.Customer.create({ name: 'John' })
      expect(createResult).toBeInstanceOf(Promise)

      const getResult = $.db.Customer.get('cus_123')
      expect(getResult).toBeInstanceOf(Promise)

      const listResult = $.db.Customer.list()
      expect(listResult).toBeInstanceOf(Promise)
    })

    it('should throw for undefined nouns', () => {
      const $ = createTestContext({ nouns: ['Customer'] })

      expect(() => $.db.NonExistent.get('123')).toThrow()
    })
  })

  describe('$.ai - AI Template Literal', () => {
    it('should be callable as a template literal', () => {
      const $ = createTestContext()

      // $.ai`prompt` syntax
      const result = $.ai`Write a summary`
      expect(result).toBeInstanceOf(Promise)
    })

    it('should interpolate values in the template', async () => {
      const $ = createTestContext()
      const name = 'John'
      const topic = 'customer service'

      const result = $.ai`Write about ${topic} for ${name}`
      expect(result).toBeInstanceOf(Promise)
    })

    it('should support multiline prompts', () => {
      const $ = createTestContext()

      const result = $.ai`
        Write a blog post about: TypeScript

        Requirements:
        - 500 words minimum
        - Include code examples
      `
      expect(result).toBeInstanceOf(Promise)
    })

    it('should accept options as second parameter', () => {
      const $ = createTestContext()

      // When called as a function with options
      const result = $.ai('Write something', { model: 'claude-3', temperature: 0.7 })
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('$.agents - AI Agent Registry', () => {
    it('should accept agent definitions', () => {
      const $ = createTestContext()

      // Agents should be registerable
      expect(() => {
        $.agents.support = {
          instructions: 'You are a support agent',
          tools: ['getCustomer', 'createTicket'],
        }
      }).not.toThrow()
    })

    it('should provide run method on agents', () => {
      const $ = createTestContext()

      $.agents.support = {
        instructions: 'You are a support agent',
        tools: ['getCustomer'],
      }

      expect($.agents.support.run).toBeInstanceOf(Function)
    })

    it('should return promise from agent run', async () => {
      const $ = createTestContext()

      $.agents.support = {
        instructions: 'You are a support agent',
        tools: [],
      }

      const result = $.agents.support.run({ message: 'Help me' })
      expect(result).toBeInstanceOf(Promise)
    })

    it('should support dynamic agent access via proxy', () => {
      const $ = createTestContext()

      // Access agent that doesn't exist yet
      expect($.agents.newAgent).toBeDefined()
    })
  })

  describe('$.human - Human-in-the-Loop', () => {
    it('should expose approve method', () => {
      const $ = createTestContext()

      expect($.human.approve).toBeInstanceOf(Function)
    })

    it('should expose ask method', () => {
      const $ = createTestContext()

      expect($.human.ask).toBeInstanceOf(Function)
    })

    it('should expose review method', () => {
      const $ = createTestContext()

      expect($.human.review).toBeInstanceOf(Function)
    })

    it('should return promise from approve', () => {
      const $ = createTestContext()

      const result = $.human.approve('Should we proceed with this action?')
      expect(result).toBeInstanceOf(Promise)
    })

    it('should return promise from ask', () => {
      const $ = createTestContext()

      const result = $.human.ask('What is the preferred date for the meeting?')
      expect(result).toBeInstanceOf(Promise)
    })

    it('should return promise from review', () => {
      const $ = createTestContext()

      const result = $.human.review({ content: 'Draft email content...', type: 'email' })
      expect(result).toBeInstanceOf(Promise)
    })

    it('should support approval with context', () => {
      const $ = createTestContext()

      const result = $.human.approve('Large refund requested', {
        amount: 500,
        customer: 'John Doe',
        reason: 'Product defect',
      })
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('$.send - Fire and Forget (Durable)', () => {
    it('should be a function', () => {
      const $ = createTestContext()

      expect($.send).toBeInstanceOf(Function)
    })

    it('should accept event name and data', () => {
      const $ = createTestContext()

      // Should not throw
      expect(() => $.send('Order.shipped', { orderId: '123' })).not.toThrow()
    })

    it('should return void (fire and forget)', () => {
      const $ = createTestContext()

      const result = $.send('notification', { message: 'Hello' })
      expect(result).toBeUndefined()
    })

    it('should be durable (survives process restarts)', () => {
      const $ = createTestContext()

      // This is a behavioral contract - the implementation should
      // persist the event before returning
      const result = $.send('durable.event', { data: 'test' })
      expect(result).toBeUndefined()
    })
  })

  describe('$.do - Wait for Result (Durable)', () => {
    it('should be a function', () => {
      const $ = createTestContext()

      expect($.do).toBeInstanceOf(Function)
    })

    it('should accept action name and data', async () => {
      const $ = createTestContext()

      const result = $.do('processPayment', { amount: 100 })
      expect(result).toBeInstanceOf(Promise)
    })

    it('should return promise that resolves with result', async () => {
      const $ = createTestContext()

      const result = $.do('validateAddress', { street: '123 Main St' })
      expect(result).toBeInstanceOf(Promise)
    })

    it('should be durable (survives process restarts)', async () => {
      const $ = createTestContext()

      // The implementation should persist the action and its result
      const result = $.do('durable.action', { data: 'test' })
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('$.api - Integration Access', () => {
    it('should provide integration access via proxy', () => {
      const $ = createTestContext()

      // Core integrations
      expect($.api.emails).toBeDefined()
      expect($.api.texts).toBeDefined()
      expect($.api.calls).toBeDefined()
      expect($.api.stripe).toBeDefined()
      expect($.api.slack).toBeDefined()
    })

    it('should support arbitrary integration access', () => {
      const $ = createTestContext()

      // Any integration should be accessible via proxy
      expect($.api.hubspot).toBeDefined()
      expect($.api.salesforce).toBeDefined()
      expect($.api.twilio).toBeDefined()
      expect($.api.customIntegration).toBeDefined()
    })

    it('should provide nested API access', () => {
      const $ = createTestContext()

      // e.g., $.api.stripe.charges.create
      expect($.api.stripe.charges).toBeDefined()
      expect($.api.stripe.charges.create).toBeInstanceOf(Function)
    })

    it('should return promises from API calls', async () => {
      const $ = createTestContext()

      const result = $.api.emails.send({ to: 'test@example.com', subject: 'Hello' })
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('$.input - Verb Input Payload', () => {
    it('should be accessible as a property', () => {
      const $ = createTestContext({
        input: { name: 'John', email: 'john@example.com' },
      })

      expect($.input).toBeDefined()
    })

    it('should contain the verb input data', () => {
      const input = { name: 'John', email: 'john@example.com' }
      const $ = createTestContext({ input })

      expect($.input).toEqual(input)
    })

    it('should be typed based on verb definition', () => {
      const $ = createTestContext({
        input: { name: 'John', quantity: 5 },
      })

      // Type inference should work
      expect($.input.name).toBe('John')
      expect($.input.quantity).toBe(5)
    })
  })

  describe('$.record - Current Noun Instance', () => {
    it('should be accessible as a property', () => {
      const record = { id: 'cus_123', name: 'John', email: 'john@example.com' }
      const $ = createTestContext({ record })

      expect($.record).toBeDefined()
    })

    it('should contain the current record data', () => {
      const record = { id: 'cus_123', name: 'John', email: 'john@example.com' }
      const $ = createTestContext({ record })

      expect($.record).toEqual(record)
    })

    it('should be undefined when no record context', () => {
      const $ = createTestContext()

      expect($.record).toBeUndefined()
    })
  })

  describe('$.id - Record ID', () => {
    it('should be accessible as a property', () => {
      const $ = createTestContext({ id: 'cus_123' })

      expect($.id).toBeDefined()
    })

    it('should contain the record ID', () => {
      const $ = createTestContext({ id: 'cus_123' })

      expect($.id).toBe('cus_123')
    })

    it('should be undefined when no ID context', () => {
      const $ = createTestContext()

      expect($.id).toBeUndefined()
    })
  })

  describe('$.user - Authenticated User', () => {
    it('should be accessible as a property', () => {
      const user = { id: 'usr_123', email: 'admin@example.com', role: 'admin' }
      const $ = createTestContext({ user })

      expect($.user).toBeDefined()
    })

    it('should contain user information', () => {
      const user = { id: 'usr_123', email: 'admin@example.com', role: 'admin' }
      const $ = createTestContext({ user })

      expect($.user.id).toBe('usr_123')
      expect($.user.email).toBe('admin@example.com')
      expect($.user.role).toBe('admin')
    })

    it('should be undefined for unauthenticated contexts', () => {
      const $ = createTestContext()

      expect($.user).toBeUndefined()
    })
  })

  describe('$.org - Current Organization', () => {
    it('should be accessible as a property', () => {
      const org = { id: 'org_123', name: 'Acme Corp', plan: 'enterprise' }
      const $ = createTestContext({ org })

      expect($.org).toBeDefined()
    })

    it('should contain organization information', () => {
      const org = { id: 'org_123', name: 'Acme Corp', plan: 'enterprise' }
      const $ = createTestContext({ org })

      expect($.org.id).toBe('org_123')
      expect($.org.name).toBe('Acme Corp')
      expect($.org.plan).toBe('enterprise')
    })

    it('should be undefined for org-less contexts', () => {
      const $ = createTestContext()

      expect($.org).toBeUndefined()
    })
  })

  describe('$.env - Environment Variables', () => {
    it('should be accessible as a property', () => {
      const env = { STRIPE_API_KEY: 'sk_test_123', DATABASE_URL: 'postgres://...' }
      const $ = createTestContext({ env })

      expect($.env).toBeDefined()
    })

    it('should contain environment variables', () => {
      const env = { STRIPE_API_KEY: 'sk_test_123', DATABASE_URL: 'postgres://...' }
      const $ = createTestContext({ env })

      expect($.env.STRIPE_API_KEY).toBe('sk_test_123')
      expect($.env.DATABASE_URL).toBe('postgres://...')
    })

    it('should return undefined for missing env vars', () => {
      const $ = createTestContext({ env: {} })

      expect($.env.NONEXISTENT).toBeUndefined()
    })
  })

  describe('$.time - Time Helpers', () => {
    it('should provide now() helper', () => {
      const $ = createTestContext()

      expect($.time.now).toBeInstanceOf(Function)
      expect($.time.now()).toBeInstanceOf(Date)
    })

    it('should provide daysAgo() helper', () => {
      const $ = createTestContext()

      expect($.time.daysAgo).toBeInstanceOf(Function)

      const sevenDaysAgo = $.time.daysAgo(7)
      expect(sevenDaysAgo).toBeInstanceOf(Date)

      const diff = Date.now() - sevenDaysAgo.getTime()
      const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBe(7)
    })

    it('should provide daysFromNow() helper', () => {
      const $ = createTestContext()

      expect($.time.daysFromNow).toBeInstanceOf(Function)

      const sevenDaysFromNow = $.time.daysFromNow(7)
      expect(sevenDaysFromNow).toBeInstanceOf(Date)

      const diff = sevenDaysFromNow.getTime() - Date.now()
      const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBe(7)
    })

    it('should provide hoursAgo() helper', () => {
      const $ = createTestContext()

      expect($.time.hoursAgo).toBeInstanceOf(Function)

      const twoHoursAgo = $.time.hoursAgo(2)
      expect(twoHoursAgo).toBeInstanceOf(Date)
    })

    it('should provide startOfDay() helper', () => {
      const $ = createTestContext()

      expect($.time.startOfDay).toBeInstanceOf(Function)

      const start = $.time.startOfDay()
      expect(start).toBeInstanceOf(Date)
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)
    })

    it('should provide endOfDay() helper', () => {
      const $ = createTestContext()

      expect($.time.endOfDay).toBeInstanceOf(Function)

      const end = $.time.endOfDay()
      expect(end).toBeInstanceOf(Date)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
    })
  })

  describe('$.on - Event Handlers', () => {
    it('should provide on property for event registration', () => {
      const $ = createTestContext({ nouns: ['Order', 'Customer'] })

      expect($.on).toBeDefined()
    })

    it('should support Noun.verb event pattern', () => {
      const $ = createTestContext({ nouns: ['Order'] })

      // $.on.Order.paid should be registrable
      expect($.on.Order).toBeDefined()
      expect($.on.Order.paid).toBeInstanceOf(Function)
    })

    it('should accept event handler function', () => {
      const $ = createTestContext({ nouns: ['Order'] })
      const handler = vi.fn()

      // Should not throw
      expect(() => $.on.Order.created(handler)).not.toThrow()
    })

    it('should support built-in lifecycle events', () => {
      const $ = createTestContext({ nouns: ['Customer'] })

      // created, updated, deleted are built-in
      expect($.on.Customer.created).toBeInstanceOf(Function)
      expect($.on.Customer.updated).toBeInstanceOf(Function)
      expect($.on.Customer.deleted).toBeInstanceOf(Function)
    })

    it('should support custom verb events', () => {
      const $ = createTestContext({
        nouns: ['Order'],
        verbs: { Order: ['pay', 'ship', 'cancel'] },
      })

      // Custom verbs become events
      expect($.on.Order.paid).toBeInstanceOf(Function)
      expect($.on.Order.shipped).toBeInstanceOf(Function)
      expect($.on.Order.cancelled).toBeInstanceOf(Function)
    })
  })

  describe('$.every - Schedule Registration', () => {
    it('should provide every property for schedule registration', () => {
      const $ = createTestContext()

      expect($.every).toBeDefined()
    })

    it('should support day schedules', () => {
      const $ = createTestContext()

      expect($.every.day).toBeDefined()
      expect($.every.day.at).toBeInstanceOf(Function)
    })

    it('should support time specification', () => {
      const $ = createTestContext()
      const handler = vi.fn()

      const schedule = $.every.day.at('9am')
      expect(schedule).toBeDefined()
    })

    it('should support day.at6am shorthand', () => {
      const $ = createTestContext()

      // From README: $.every.day.at6am
      expect($.every.day.at6am).toBeInstanceOf(Function)
    })

    it('should support named day schedules', () => {
      const $ = createTestContext()

      expect($.every.Monday).toBeDefined()
      expect($.every.Tuesday).toBeDefined()
      expect($.every.Wednesday).toBeDefined()
      expect($.every.Thursday).toBeDefined()
      expect($.every.Friday).toBeDefined()
      expect($.every.Saturday).toBeDefined()
      expect($.every.Sunday).toBeDefined()
    })

    it('should support Monday.at9am shorthand', () => {
      const $ = createTestContext()

      // From README: $.every.Monday.at9am
      expect($.every.Monday.at9am).toBeInstanceOf(Function)
    })

    it('should support hour and minute schedules', () => {
      const $ = createTestContext()

      expect($.every.hour).toBeDefined()
      expect($.every.minute).toBeDefined()
    })
  })

  describe('Integration: Full Context Usage', () => {
    it('should support typical verb handler pattern', async () => {
      const $ = createTestContext({
        nouns: ['Order', 'Customer'],
        id: 'ord_123',
        record: { id: 'ord_123', total: 100, status: 'pending' },
        input: { status: 'paid' },
        user: { id: 'usr_1', email: 'admin@test.com' },
      })

      // Typical verb handler would:
      // 1. Access record and input
      expect($.record.total).toBe(100)
      expect($.input.status).toBe('paid')

      // 2. Make database updates
      expect($.db.Order.update).toBeInstanceOf(Function)

      // 3. Call external APIs
      expect($.api.stripe.charges.create).toBeInstanceOf(Function)

      // 4. Send events
      expect($.send).toBeInstanceOf(Function)
    })

    it('should support event handler pattern', () => {
      const $ = createTestContext({
        nouns: ['Order'],
      })

      // Event handlers register via $.on
      const handler = vi.fn()
      $.on.Order.paid(handler)

      // And can use full context
      expect($.api.slack.send).toBeInstanceOf(Function)
      expect($.db.Order.get).toBeInstanceOf(Function)
    })

    it('should support scheduled task pattern', () => {
      const $ = createTestContext({
        nouns: ['Order', 'Metric'],
      })

      // Scheduled tasks use $.every for registration
      const schedule = $.every.day.at('9am')
      expect(schedule).toBeDefined()

      // And have access to full context
      expect($.db.Order.find).toBeInstanceOf(Function)
      expect($.api.emails.send).toBeInstanceOf(Function)
      expect($.time.daysAgo).toBeInstanceOf(Function)
    })
  })

  describe('Type Safety', () => {
    it('should provide typed db accessors based on nouns', () => {
      // Type system should enforce that only defined nouns are accessible
      const $ = createTestContext({ nouns: ['Customer', 'Order'] as const })

      // These should work (in types)
      expect($.db.Customer).toBeDefined()
      expect($.db.Order).toBeDefined()
    })

    it('should provide typed input based on verb definition', () => {
      interface CreateCustomerInput {
        name: string
        email: string
      }

      const $ = createTestContext({
        input: { name: 'John', email: 'john@test.com' } as CreateCustomerInput,
      })

      expect($.input.name).toBe('John')
      expect($.input.email).toBe('john@test.com')
    })

    it('should provide typed record based on noun schema', () => {
      interface CustomerRecord {
        id: string
        name: string
        email: string
        plan: string
      }

      const $ = createTestContext({
        record: { id: 'cus_1', name: 'John', email: 'john@test.com', plan: 'pro' } as CustomerRecord,
      })

      expect($.record.id).toBe('cus_1')
      expect($.record.plan).toBe('pro')
    })
  })
})
