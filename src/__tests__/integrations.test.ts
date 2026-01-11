/**
 * Integrations Layer Tests - APIs.do Integration
 *
 * Tests for the $.integrate() and $.api.* proxy system that provides
 * access to 9000+ integrations via APIs.do.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createContext } from '../core'
import type { IntegrationConfigOptions, ApiProxy } from '../types'

// Helper to cast $.api.* to typed APIs
type ApiService<T> = T
const emails = <T>(api: unknown) => api as ApiService<{ send: (opts: T) => Promise<unknown> }>
const texts = <T>(api: unknown) => api as ApiService<{ send: (opts: T) => Promise<unknown> }>
const calls = <T>(api: unknown) => api as ApiService<{ initiate: (opts: T) => Promise<unknown> }>
const slack = (api: unknown) => api as ApiService<{ send: (...args: unknown[]) => Promise<unknown> }>
const stripe = (api: unknown) => api as ApiService<{
  charges: { create: (opts: unknown) => Promise<unknown> }
  customers: {
    retrieve: (id: string) => Promise<unknown>
    subscriptions: { list: (opts: unknown) => Promise<unknown> }
  }
}>
const apollo = (api: unknown) => api as ApiService<{ people: { enrich: (opts: unknown) => Promise<unknown> } }>
const hubspot = (api: unknown) => api as ApiService<{ contacts: { create: (opts: unknown) => Promise<unknown> } }>
const salesforce = (api: unknown) => api as ApiService<{ objects: { create: (opts: unknown) => Promise<unknown> }; query: (q: string) => Promise<unknown> }>

describe('Integrations Layer', () => {
  describe('$.integrate() - Integration Registration', () => {
    it('registers an integration with API key config', () => {
      // $.integrate() should store the config for later use by $.api.*
      const $ = createContext()

      $.integrate('apollo', { apiKey: 'test-apollo-key' })

      // Internal registry should have the config
      expect($.getIntegration('apollo')).toEqual({
        name: 'apollo',
        config: { apiKey: 'test-apollo-key' },
      })
    })

    it('registers an integration with webhook config', () => {
      const $ = createContext()

      $.integrate('slack', { webhook: 'https://hooks.slack.com/services/xxx' })

      expect($.getIntegration('slack')).toEqual({
        name: 'slack',
        config: { webhook: 'https://hooks.slack.com/services/xxx' },
      })
    })

    it('registers an integration with secret key config', () => {
      const $ = createContext()

      $.integrate('stripe', { secretKey: 'sk_test_xxx' })

      expect($.getIntegration('stripe')).toEqual({
        name: 'stripe',
        config: { secretKey: 'sk_test_xxx' },
      })
    })

    it('registers multiple integrations', () => {
      const $ = createContext()

      $.integrate('apollo', { apiKey: 'apollo-key' })
      $.integrate('slack', { webhook: 'slack-webhook' })
      $.integrate('stripe', { secretKey: 'stripe-key' })

      expect($.getIntegration('apollo')).toBeDefined()
      expect($.getIntegration('slack')).toBeDefined()
      expect($.getIntegration('stripe')).toBeDefined()
    })

    it('overwrites integration config when registered again', () => {
      const $ = createContext()

      $.integrate('apollo', { apiKey: 'old-key' })
      $.integrate('apollo', { apiKey: 'new-key' })

      expect($.getIntegration('apollo')?.config.apiKey).toBe('new-key')
    })

    it('validates integration config - requires at least one credential', () => {
      const $ = createContext()

      expect(() => $.integrate('apollo', {})).toThrow(
        'Integration "apollo" requires at least one credential (apiKey, secretKey, webhook, or oauth)'
      )
    })

    it('validates integration config - rejects unknown config keys', () => {
      const $ = createContext()

      expect(() =>
        $.integrate('apollo', {
          apiKey: 'valid',
          invalidKey: 'should-fail',
        } as any)
      ).toThrow('Unknown config key "invalidKey" for integration "apollo"')
    })
  })

  describe('$.env - Environment Variable Access', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('provides access to environment variables', () => {
      process.env.APOLLO_API_KEY = 'env-apollo-key'
      const $ = createContext()

      expect($.env.APOLLO_API_KEY).toBe('env-apollo-key')
    })

    it('returns undefined for missing environment variables', () => {
      const $ = createContext()

      expect($.env.NONEXISTENT_VAR).toBeUndefined()
    })

    it('works with $.integrate() for dynamic config', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_from_env'
      const $ = createContext()

      $.integrate('stripe', { secretKey: $.env.STRIPE_SECRET_KEY })

      expect($.getIntegration('stripe')?.config.secretKey).toBe('sk_test_from_env')
    })

    it('is read-only - cannot modify environment variables', () => {
      const $ = createContext()

      expect(() => {
        ;($.env as any).NEW_VAR = 'should-fail'
      }).toThrow()
    })
  })

  describe('$.api - Integration Proxy', () => {
    it('returns a proxy for registered integrations', () => {
      const $ = createContext()
      $.integrate('apollo', { apiKey: 'test-key' })

      expect($.api.apollo).toBeDefined()
      expect(typeof $.api.apollo).toBe('object')
    })

    it('throws helpful error for unregistered integrations', () => {
      const $ = createContext()

      expect(() => $.api.hubspot).toThrow(
        'Integration "hubspot" is not registered. Call $.integrate("hubspot", { ... }) first.'
      )
    })

    it('throws helpful error with suggestions for similar integration names', () => {
      const $ = createContext()
      $.integrate('stripe', { secretKey: 'key' })

      expect(() => $.api.stripee).toThrow(
        'Integration "stripee" is not registered. Did you mean "stripe"?'
      )
    })
  })

  describe('$.api.emails - Emails.do Platform Integration', () => {
    it('is available as a built-in Platform.do integration', () => {
      const $ = createContext()

      // Built-in integrations should be available without $.integrate()
      expect($.api.emails).toBeDefined()
    })

    it('send() makes request to Emails.do', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'email-123', status: 'sent' }),
      })
      $.setFetch(mockFetch)

      const result = await emails($.api.emails).send({
        to: 'user@example.com',
        subject: 'Hello',
        body: 'Test email body',
      })

      expect(mockFetch).toHaveBeenCalledWith('https://emails.do/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: expect.stringContaining('Bearer'),
        },
        body: JSON.stringify({
          to: 'user@example.com',
          subject: 'Hello',
          body: 'Test email body',
        }),
      })
      expect(result).toEqual({ id: 'email-123', status: 'sent' })
    })

    it('send() supports multiple recipients', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'email-123', status: 'sent' }),
      })
      $.setFetch(mockFetch)

      await emails($.api.emails).send({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Hello',
        body: 'Test email body',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://emails.do/api/send',
        expect.objectContaining({
          body: expect.stringContaining('["user1@example.com","user2@example.com"]'),
        })
      )
    })

    it('send() supports templates', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'email-123', status: 'sent' }),
      })
      $.setFetch(mockFetch)

      await emails($.api.emails).send({
        to: 'user@example.com',
        template: 'welcome',
        data: { name: 'John' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://emails.do/api/send',
        expect.objectContaining({
          body: expect.stringContaining('"template":"welcome"'),
        })
      )
    })
  })

  describe('$.api.texts - Texts.do Platform Integration', () => {
    it('is available as a built-in Platform.do integration', () => {
      const $ = createContext()
      expect($.api.texts).toBeDefined()
    })

    it('send() makes request to Texts.do', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'sms-123', status: 'sent' }),
      })
      $.setFetch(mockFetch)

      const result = await texts($.api.texts).send({
        to: '+1234567890',
        message: 'Hello from SaaSkit',
      })

      expect(mockFetch).toHaveBeenCalledWith('https://texts.do/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: expect.stringContaining('Bearer'),
        },
        body: JSON.stringify({
          to: '+1234567890',
          message: 'Hello from SaaSkit',
        }),
      })
      expect(result).toEqual({ id: 'sms-123', status: 'sent' })
    })
  })

  describe('$.api.calls - Calls.do Platform Integration', () => {
    it('is available as a built-in Platform.do integration', () => {
      const $ = createContext()
      expect($.api.calls).toBeDefined()
    })

    it('initiate() makes request to Calls.do', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'call-123', status: 'initiated' }),
      })
      $.setFetch(mockFetch)

      const result = await calls($.api.calls).initiate({
        to: '+1234567890',
        from: '+0987654321',
        script: 'greeting',
      })

      expect(mockFetch).toHaveBeenCalledWith('https://calls.do/api/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: expect.stringContaining('Bearer'),
        },
        body: JSON.stringify({
          to: '+1234567890',
          from: '+0987654321',
          script: 'greeting',
        }),
      })
      expect(result).toEqual({ id: 'call-123', status: 'initiated' })
    })
  })

  describe('$.api.slack - Slack Webhook Integration', () => {
    it('requires registration before use', () => {
      const $ = createContext()

      expect(() => slack($.api.slack).send('#general', 'Hello')).toThrow(
        'Integration "slack" is not registered'
      )
    })

    it('send() makes request to configured webhook', async () => {
      const $ = createContext()
      const webhookUrl = 'https://hooks.slack.com/services/T00/B00/xxx'
      $.integrate('slack', { webhook: webhookUrl })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('ok'),
      })
      $.setFetch(mockFetch)

      await slack($.api.slack).send('#general', 'Hello from SaaSkit')

      expect(mockFetch).toHaveBeenCalledWith(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: '#general',
          text: 'Hello from SaaSkit',
        }),
      })
    })

    it('send() supports blocks and attachments', async () => {
      const $ = createContext()
      $.integrate('slack', { webhook: 'https://hooks.slack.com/services/xxx' })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('ok'),
      })
      $.setFetch(mockFetch)

      await slack($.api.slack).send('#general', 'Hello', {
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '*Bold*' } }],
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"blocks"'),
        })
      )
    })
  })

  describe('$.api.stripe - Stripe/Payments.do Integration', () => {
    it('is available as built-in Payments.do integration', () => {
      const $ = createContext()
      expect($.api.stripe).toBeDefined()
    })

    it('supports nested method calls (stripe($.api.stripe).charges.create)', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'ch_123', amount: 1000 }),
      })
      $.setFetch(mockFetch)

      const result = await stripe($.api.stripe).charges.create({
        amount: 1000,
        currency: 'usd',
        customer: 'cus_123',
      })

      expect(mockFetch).toHaveBeenCalledWith('https://payments.do/api/stripe/charges/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: expect.stringContaining('Bearer'),
        },
        body: JSON.stringify({
          amount: 1000,
          currency: 'usd',
          customer: 'cus_123',
        }),
      })
      expect(result).toEqual({ id: 'ch_123', amount: 1000 })
    })

    it('supports deeply nested method calls (stripe($.api.stripe).customers.subscriptions.list)', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'sub_123' }] }),
      })
      $.setFetch(mockFetch)

      const result = await stripe($.api.stripe).customers.subscriptions.list({
        customer: 'cus_123',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://payments.do/api/stripe/customers/subscriptions/list',
        expect.objectContaining({
          method: 'POST',
        })
      )
      expect((result as { data: unknown[] }).data).toHaveLength(1)
    })

    it('maps retrieve methods correctly', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'cus_123', email: 'test@example.com' }),
      })
      $.setFetch(mockFetch)

      const result = await stripe($.api.stripe).customers.retrieve('cus_123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://payments.do/api/stripe/customers/retrieve',
        expect.objectContaining({
          body: JSON.stringify({ id: 'cus_123' }),
        })
      )
      expect((result as { id: string }).id).toBe('cus_123')
    })
  })

  describe('$.api.apollo - Third-Party API Integration', () => {
    it('requires registration before use', () => {
      const $ = createContext()

      expect(() => apollo($.api.apollo).people.enrich({ email: 'test@example.com' })).toThrow(
        'Integration "apollo" is not registered'
      )
    })

    it('proxies to APIs.do with registered credentials', async () => {
      const $ = createContext()
      $.integrate('apollo', { apiKey: 'apollo-api-key' })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            person: { name: 'John Doe', title: 'CEO' },
          }),
      })
      $.setFetch(mockFetch)

      const result = await apollo($.api.apollo).people.enrich({
        email: 'john@example.com',
      })

      expect(mockFetch).toHaveBeenCalledWith('https://apis.do/apollo/people/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: expect.stringContaining('Bearer'),
          'X-Integration-Key': 'apollo-api-key',
        },
        body: JSON.stringify({ email: 'john@example.com' }),
      })
      expect((result as { person: { name: string } }).person.name).toBe('John Doe')
    })
  })

  describe('$.api.hubspot - Third-Party CRM Integration', () => {
    it('proxies to APIs.do with registered credentials', async () => {
      const $ = createContext()
      $.integrate('hubspot', { apiKey: 'hubspot-api-key' })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'contact-123' }),
      })
      $.setFetch(mockFetch)

      const result = await hubspot($.api.hubspot).contacts.create({
        email: 'john@example.com',
        firstname: 'John',
        lastname: 'Doe',
      })

      expect(mockFetch).toHaveBeenCalledWith('https://apis.do/hubspot/contacts/create', {
        method: 'POST',
        headers: expect.objectContaining({
          'X-Integration-Key': 'hubspot-api-key',
        }),
        body: expect.any(String),
      })
      expect((result as { id: string }).id).toBe('contact-123')
    })
  })

  describe('Integration Error Handling', () => {
    it('wraps API errors with helpful context', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Invalid API key' }),
      })
      $.setFetch(mockFetch)

      await expect(
        emails($.api.emails).send({ to: 'test@example.com', subject: 'Test', body: 'Test' })
      ).rejects.toThrow('Emails.do API error (401): Invalid API key')
    })

    it('handles network errors gracefully', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      $.setFetch(mockFetch)

      await expect(
        emails($.api.emails).send({ to: 'test@example.com', subject: 'Test', body: 'Test' })
      ).rejects.toThrow('Failed to connect to Emails.do: Network error')
    })

    it('handles rate limiting with retry info', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '60' }),
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      })
      $.setFetch(mockFetch)

      await expect(
        emails($.api.emails).send({ to: 'test@example.com', subject: 'Test', body: 'Test' })
      ).rejects.toThrow('Rate limit exceeded for Emails.do. Retry after 60 seconds.')
    })

    it('handles timeout errors', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out')), 100)
          })
      )
      $.setFetch(mockFetch)

      await expect(
        emails($.api.emails).send({ to: 'test@example.com', subject: 'Test', body: 'Test' })
      ).rejects.toThrow('Request to Emails.do timed out')
    })
  })

  describe('Integration Type Safety', () => {
    it('provides typed responses for built-in integrations', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'email-123', status: 'sent' }),
      })
      $.setFetch(mockFetch)

      const result = await emails($.api.emails).send({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
      })

      // TypeScript should know result has id and status
      const id: string = (result as { id: string }).id
      const status: string = (result as { status: string }).status
      expect(id).toBe('email-123')
      expect(status).toBe('sent')
    })

    it('provides typed methods for Stripe integration', async () => {
      const $ = createContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'ch_123', amount: 1000, currency: 'usd' }),
      })
      $.setFetch(mockFetch)

      // TypeScript should know these methods exist
      const charge = await stripe($.api.stripe).charges.create({
        amount: 1000,
        currency: 'usd',
        customer: 'cus_123',
      }) as { id: string; amount: number }

      expect(charge.id).toBe('ch_123')
      expect(charge.amount).toBe(1000)
    })
  })

  describe('OAuth Flow Support', () => {
    it('supports OAuth configuration for integrations that require it', () => {
      const $ = createContext()

      $.integrate('salesforce', {
        oauth: {
          clientId: 'sf-client-id',
          clientSecret: 'sf-client-secret',
          refreshToken: 'sf-refresh-token',
        },
      })

      const config = $.getIntegration('salesforce')?.config
      expect(config?.oauth).toBeDefined()
      expect(config?.oauth?.clientId).toBe('sf-client-id')
    })

    it('automatically refreshes tokens when expired', async () => {
      const $ = createContext()
      $.integrate('salesforce', {
        oauth: {
          clientId: 'sf-client-id',
          clientSecret: 'sf-client-secret',
          refreshToken: 'sf-refresh-token',
          accessToken: 'expired-token',
          expiresAt: Date.now() - 1000, // Expired
        },
      })

      const mockFetch = vi
        .fn()
        // First call: token refresh
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'new-access-token',
              expires_in: 3600,
            }),
        })
        // Second call: actual API request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ records: [] }),
        })
      $.setFetch(mockFetch)

      await salesforce($.api.salesforce).query('SELECT Id FROM Account')

      // Should have made 2 requests: token refresh + actual query
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('oauth'),
        expect.any(Object)
      )
    })
  })
})
