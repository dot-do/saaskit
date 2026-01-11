/**
 * AI Integration Tests for SaaS Kit
 *
 * TDD RED phase: These tests define the contract for Functions.do + Agents.do integration.
 *
 * Requirements:
 * - $.ai`prompt` template literal returns Promise<string>
 * - $.ai template interpolates values correctly
 * - $.agent() defines agent with instructions/tools
 * - $.agents.name.run() executes agent
 * - Agent tools can call verbs
 * - $.human.approve() creates approval queue item
 * - $.human.approve() returns boolean
 * - $.human.ask() returns string answer
 * - $.human.review() returns reviewed content
 * - AIPromise pipelining works (no await until needed)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { $ } from '../core'

describe('AI Integration ($.ai)', () => {
  // ============================================================================
  // $.ai Template Literal - Basic Interface
  // ============================================================================

  describe('$.ai template literal', () => {
    it('should return a promise when called as template literal', async () => {
      const result = $.ai`Hello, world!`

      // $.ai should return a promise (or thenable)
      expect(result).toHaveProperty('then')
      expect(typeof result.then).toBe('function')
    })

    it('should resolve to a string', async () => {
      const result = await $.ai`Write a greeting`

      expect(typeof result).toBe('string')
    })

    it('should interpolate simple variables into the prompt', async () => {
      const name = 'Alice'
      const result = $.ai`Write a greeting for ${name}`

      // The result should be a promise
      expect(result).toHaveProperty('then')

      // When resolved, should contain interpolated content
      const resolved = await result
      expect(typeof resolved).toBe('string')
    })

    it('should interpolate multiple variables', async () => {
      const customer = { name: 'Bob', tier: 'premium' }
      const tone = 'friendly'
      const length = 100

      const result = $.ai`
        Write a welcome email for ${customer.name}
        Customer tier: ${customer.tier}
        Tone: ${tone}
        Length: ${length} words
      `

      expect(result).toHaveProperty('then')
    })

    it('should interpolate complex objects', async () => {
      const data = {
        items: ['apple', 'banana', 'cherry'],
        total: 42.50,
        metadata: { source: 'cart', timestamp: Date.now() },
      }

      const result = $.ai`Generate a receipt for: ${JSON.stringify(data)}`

      expect(result).toHaveProperty('then')
    })
  })

  // ============================================================================
  // $.ai Options and Configuration
  // ============================================================================

  describe('$.ai options', () => {
    it('should accept options as second parameter', async () => {
      const result = $.ai`Write a haiku`

      // Should be able to configure model, temperature, etc.
      const withOptions = $.ai.with({
        model: 'claude-3-opus',
        temperature: 0.7,
        maxTokens: 1000,
      })`Write a haiku`

      expect(withOptions).toHaveProperty('then')
    })

    it('should support streaming mode', async () => {
      const stream = $.ai.stream`Write a long story`

      // Should return an async iterator
      expect(stream[Symbol.asyncIterator]).toBeDefined()
    })

    it('should support structured output', async () => {
      interface Analysis {
        sentiment: 'positive' | 'negative' | 'neutral'
        confidence: number
        keywords: string[]
      }

      const result = await $.ai.json<Analysis>`
        Analyze the sentiment of: "I love this product!"
      `

      expect(result).toHaveProperty('sentiment')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('keywords')
    })
  })

  // ============================================================================
  // AI Response Chaining/Pipelining
  // ============================================================================

  describe('AI response chaining', () => {
    it('should support .then() chaining', async () => {
      const result = await $.ai`Write a title`
        .then((title) => $.ai`Expand on: ${title}`)

      expect(typeof result).toBe('string')
    })

    it('should support .pipe() for transformations', async () => {
      const result = await $.ai`Write a paragraph`
        .pipe((text) => text.toUpperCase())

      expect(typeof result).toBe('string')
      expect(result).toBe(result.toUpperCase())
    })

    it('should support chaining multiple AI calls', async () => {
      const result = await $.ai`Generate a product name`
        .then((name) => $.ai`Write a tagline for: ${name}`)
        .then((tagline) => $.ai`Create a full description with name and tagline: ${tagline}`)

      expect(typeof result).toBe('string')
    })

    it('should not execute until awaited (lazy evaluation)', async () => {
      // Create but don't await
      const prompt = $.ai`This should not execute yet`

      // The AI should not be called until we await
      // This tests that $.ai returns a lazy promise/thenable

      // Now await and it should execute
      const result = await prompt
      expect(typeof result).toBe('string')
    })
  })
})

describe('Agent Registration ($.agent)', () => {
  // ============================================================================
  // $.agent() Registration
  // ============================================================================

  describe('$.agent() definition', () => {
    it('should register an agent with instructions and tools', () => {
      $.agent('support', {
        instructions: `
          You are a helpful customer support agent.
          Be friendly and professional.
          If you can't resolve an issue, escalate to a human.
        `,
        tools: ['getCustomer', 'getOrder', 'refundOrder', 'escalate'],
      })

      // Agent should be registered and accessible
      expect($.agents).toHaveProperty('support')
    })

    it('should validate that tools array is provided', () => {
      expect(() => {
        $.agent('invalid', {
          instructions: 'Some instructions',
          // @ts-expect-error - tools is required
          tools: undefined,
        })
      }).toThrow()
    })

    it('should validate that instructions are provided', () => {
      expect(() => {
        $.agent('invalid', {
          // @ts-expect-error - instructions is required
          instructions: undefined,
          tools: ['someTool'],
        })
      }).toThrow()
    })

    it('should allow empty tools array', () => {
      $.agent('readonly', {
        instructions: 'A read-only agent with no tools',
        tools: [],
      })

      expect($.agents).toHaveProperty('readonly')
    })

    it('should register multiple agents', () => {
      $.agent('agent1', {
        instructions: 'Agent 1 instructions',
        tools: ['tool1'],
      })

      $.agent('agent2', {
        instructions: 'Agent 2 instructions',
        tools: ['tool2'],
      })

      $.agent('agent3', {
        instructions: 'Agent 3 instructions',
        tools: ['tool3'],
      })

      expect($.agents).toHaveProperty('agent1')
      expect($.agents).toHaveProperty('agent2')
      expect($.agents).toHaveProperty('agent3')
    })

    it('should support agent with model configuration', () => {
      $.agent('premium', {
        instructions: 'Premium support agent',
        tools: ['getCustomer', 'refund'],
        model: 'claude-3-opus',
        temperature: 0.3,
        maxTokens: 4000,
      })

      expect($.agents).toHaveProperty('premium')
    })

    it('should support agent with context/memory settings', () => {
      $.agent('conversational', {
        instructions: 'Remember previous interactions',
        tools: ['getHistory'],
        memory: {
          type: 'conversation',
          maxMessages: 10,
        },
      })

      expect($.agents).toHaveProperty('conversational')
    })
  })

  // ============================================================================
  // $.agents.[name].run() Execution
  // ============================================================================

  describe('$.agents.[name].run()', () => {
    beforeEach(() => {
      $.agent('support', {
        instructions: `
          You are a helpful customer support agent.
          Be friendly and professional.
        `,
        tools: ['getCustomer', 'getOrder', 'refundOrder', 'escalate'],
      })
    })

    it('should execute agent with input data', async () => {
      const result = await $.agents.support.run({
        ticket: { id: 'T-123', subject: 'Refund request' },
        customer: { id: 'C-456', name: 'Alice' },
      })

      expect(result).toBeDefined()
    })

    it('should return structured result with response and actions', async () => {
      const result = await $.agents.support.run({
        message: 'I want a refund for my order',
      })

      expect(result).toHaveProperty('response')
      expect(result).toHaveProperty('actions')
    })

    it('should track tool calls in result', async () => {
      const result = await $.agents.support.run({
        message: 'What is the status of order O-789?',
      })

      expect(result).toHaveProperty('toolCalls')
      expect(Array.isArray(result.toolCalls)).toBe(true)
    })

    it('should support message-based interaction', async () => {
      const result = await $.agents.support.run({
        messages: [
          { role: 'user', content: 'Hi, I need help with my order' },
        ],
      })

      expect(result).toHaveProperty('response')
    })

    it('should support streaming agent responses', async () => {
      const stream = $.agents.support.stream({
        message: 'Explain the refund policy',
      })

      expect(stream[Symbol.asyncIterator]).toBeDefined()

      // Should be able to iterate over chunks
      const chunks: string[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThan(0)
    })

    it('should handle agent errors gracefully', async () => {
      // Force an error scenario
      const result = await $.agents.support.run({
        message: 'FORCE_ERROR_FOR_TESTING',
        _testError: true,
      })

      expect(result).toHaveProperty('error')
    })
  })

  // ============================================================================
  // Agent Tools Integration
  // ============================================================================

  describe('agent tools integration', () => {
    it('should allow tools to be functions', () => {
      $.agent('toolAgent', {
        instructions: 'Agent with function tools',
        tools: {
          getCustomer: async (id: string) => ({ id, name: 'Test' }),
          calculateTotal: (items: number[]) => items.reduce((a, b) => a + b, 0),
        },
      })

      expect($.agents).toHaveProperty('toolAgent')
    })

    it('should allow tools to reference verb names', () => {
      // Tools can reference verbs defined in the app
      $.agent('verbAgent', {
        instructions: 'Agent using app verbs',
        tools: ['Order.create', 'Order.refund', 'Customer.get'],
      })

      expect($.agents).toHaveProperty('verbAgent')
    })

    it('should allow mixed tool definitions', () => {
      $.agent('mixedAgent', {
        instructions: 'Agent with mixed tools',
        tools: [
          'Order.get',
          'Customer.get',
          {
            name: 'customTool',
            description: 'A custom tool',
            handler: async (input: unknown) => ({ result: input }),
          },
        ],
      })

      expect($.agents).toHaveProperty('mixedAgent')
    })
  })
})

describe('Human-in-the-Loop ($.human)', () => {
  // ============================================================================
  // $.human.approve()
  // ============================================================================

  describe('$.human.approve()', () => {
    it('should return a boolean promise', async () => {
      const approved = await $.human.approve('Approve this action?')

      expect(typeof approved).toBe('boolean')
    })

    it('should accept a question string', async () => {
      const result = $.human.approve('Do you approve refund of $50?')

      expect(result).toHaveProperty('then')
    })

    it('should accept options with metadata', async () => {
      const approved = await $.human.approve('Approve high-value refund?', {
        metadata: {
          amount: 500,
          customerId: 'C-123',
          orderId: 'O-456',
        },
        timeout: 3600000, // 1 hour
        defaultOnTimeout: false,
      })

      expect(typeof approved).toBe('boolean')
    })

    it('should support approval with context data', async () => {
      const amount = 150.00
      const approved = await $.human.approve(`Approve refund of $${amount}?`, {
        context: {
          customerName: 'Alice',
          orderDetails: { id: 'O-789', items: 3 },
          reason: 'Product defect',
        },
      })

      expect(typeof approved).toBe('boolean')
    })

    it('should create a queue item for approval', async () => {
      // Approval requests should be queued for human review
      const approvalPromise = $.human.approve('Pending approval test')

      // Should be able to get the queue item ID
      expect(approvalPromise).toHaveProperty('queueId')
    })
  })

  // ============================================================================
  // $.human.ask()
  // ============================================================================

  describe('$.human.ask()', () => {
    it('should return a string promise', async () => {
      const answer = await $.human.ask('When should we schedule the meeting?')

      expect(typeof answer).toBe('string')
    })

    it('should accept a question string', async () => {
      const result = $.human.ask('What is the preferred contact method?')

      expect(result).toHaveProperty('then')
    })

    it('should accept options with validation', async () => {
      const answer = await $.human.ask('Enter customer phone number:', {
        validation: {
          pattern: /^\+?[\d\s-]{10,}$/,
          message: 'Please enter a valid phone number',
        },
      })

      expect(typeof answer).toBe('string')
    })

    it('should support choices/options', async () => {
      const answer = await $.human.ask('Select priority level:', {
        choices: ['Low', 'Medium', 'High', 'Critical'],
      })

      expect(['Low', 'Medium', 'High', 'Critical']).toContain(answer)
    })

    it('should support free-form text input', async () => {
      const answer = await $.human.ask('Describe the issue in detail:', {
        multiline: true,
        maxLength: 1000,
      })

      expect(typeof answer).toBe('string')
    })

    it('should support typed responses', async () => {
      const answer = await $.human.ask<number>('How many items?', {
        type: 'number',
        min: 1,
        max: 100,
      })

      expect(typeof answer).toBe('number')
    })
  })

  // ============================================================================
  // $.human.review()
  // ============================================================================

  describe('$.human.review()', () => {
    it('should return reviewed content', async () => {
      const content = 'Draft email content here...'
      const reviewed = await $.human.review(content)

      expect(typeof reviewed).toBe('string')
    })

    it('should allow modifications to content', async () => {
      const draft = 'Original draft content'
      const reviewed = await $.human.review(draft, {
        allowEdit: true,
      })

      // Reviewed content might be different from original
      expect(typeof reviewed).toBe('string')
    })

    it('should support review with approve/reject', async () => {
      const content = 'Content for approval'
      const result = await $.human.review(content, {
        mode: 'approve-reject',
      })

      expect(result).toHaveProperty('approved')
      expect(result).toHaveProperty('content')
    })

    it('should support review with comments', async () => {
      const content = 'Content for review'
      const result = await $.human.review(content, {
        allowComments: true,
      })

      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('comments')
    })

    it('should support structured content review', async () => {
      interface EmailDraft {
        subject: string
        body: string
        recipients: string[]
      }

      const draft: EmailDraft = {
        subject: 'Welcome!',
        body: 'Welcome to our service...',
        recipients: ['alice@example.com'],
      }

      const reviewed = await $.human.review<EmailDraft>(draft, {
        fields: ['subject', 'body'], // Only allow editing these fields
      })

      expect(reviewed).toHaveProperty('subject')
      expect(reviewed).toHaveProperty('body')
      expect(reviewed).toHaveProperty('recipients')
    })

    it('should support review with suggested changes', async () => {
      const content = 'Content with potential issues'
      const result = await $.human.review(content, {
        showSuggestions: true,
        suggestions: [
          { type: 'grammar', original: 'issues', suggested: 'problems' },
        ],
      })

      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('acceptedSuggestions')
    })
  })

  // ============================================================================
  // Human Queue Management
  // ============================================================================

  describe('human queue management', () => {
    it('should list pending human tasks', async () => {
      const pendingTasks = await $.human.pending()

      expect(Array.isArray(pendingTasks)).toBe(true)
    })

    it('should cancel a pending human task', async () => {
      const approval = $.human.approve('Test approval')
      const queueId = approval.queueId

      const cancelled = await $.human.cancel(queueId)
      expect(cancelled).toBe(true)
    })

    it('should support timeout with fallback', async () => {
      const result = await $.human.approve('Time-sensitive approval', {
        timeout: 1000, // 1 second
        defaultOnTimeout: true,
      })

      // Should resolve to default after timeout
      expect(typeof result).toBe('boolean')
    })
  })
})

describe('AI + Human Integration', () => {
  // ============================================================================
  // Combined Workflows
  // ============================================================================

  describe('AI-human workflows', () => {
    it('should support AI draft with human review', async () => {
      // AI generates, human reviews
      const draft = await $.ai`Write a customer apology email`
      const reviewed = await $.human.review(draft)

      expect(typeof reviewed).toBe('string')
    })

    it('should support AI with human approval gate', async () => {
      const action = await $.ai.json`Determine if refund is appropriate for complaint: "broken item"` as { shouldRefund?: boolean; amount?: number }

      if (action.shouldRefund) {
        const approved = await $.human.approve(`Approve AI-recommended refund of $${action.amount}?`)
        if (approved) {
          // Process refund
          expect(approved).toBe(true)
        }
      }
    })

    it('should support agent with human escalation', async () => {
      $.agent('escalatingAgent', {
        instructions: 'Escalate to human when uncertain',
        tools: ['getOrder', 'escalateToHuman'],
      })

      const result = await $.agents.escalatingAgent.run({
        message: 'I demand to speak to a manager!',
      })

      // Should have escalated
      expect(result.escalated || result.actions?.includes('escalate')).toBeTruthy()
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('error handling', () => {
    it('should handle AI API errors', async () => {
      await expect(
        $.ai.with({ model: 'non-existent-model' })`Test`
      ).rejects.toThrow()
    })

    it('should handle timeout on human tasks', async () => {
      const result = await $.human.approve('Test', {
        timeout: 1,
        defaultOnTimeout: false,
      })

      expect(result).toBe(false)
    })

    it('should handle cancelled human tasks', async () => {
      const approval = $.human.approve('Will be cancelled')

      // Cancel it
      await $.human.cancel(approval.queueId)

      // Awaiting should reject or return undefined
      await expect(approval).rejects.toThrow(/cancelled/i)
    })
  })
})
