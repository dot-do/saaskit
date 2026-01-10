/**
 * Built-in SaaS Nouns Tests (RED Phase - TDD)
 *
 * These tests define the expected behavior for built-in SaaS nouns that should be
 * auto-registered when `withBuiltIns: true` is set. All tests should FAIL initially
 * because the implementation doesn't exist yet.
 *
 * Built-in nouns represent common SaaS patterns:
 * - User: Authentication and identity
 * - Organization: Multi-tenancy
 * - Plan: Subscription tiers
 * - APIKey: Developer access
 * - Webhook: Event subscriptions
 * - Usage: Metered billing
 * - Metric: Analytics tracking
 *
 * Relationships:
 * - User ↔ Organization (membership)
 * - Organization ↔ Plan (subscription)
 * - APIKey ↔ Organization (ownership)
 * - Webhook ↔ Organization (ownership)
 * - Usage ↔ Organization (tracking)
 */

import { describe, it, expect, beforeEach } from 'vitest'

// These imports will fail until implementation exists
// @ts-expect-error - Implementation not yet created
import { createSaaS, withBuiltIns } from '../core'
// @ts-expect-error - Implementation not yet created
import type { BuiltInNouns } from '../core/built-ins'

describe('Built-in SaaS Nouns', () => {
  describe('Auto-registration with withBuiltIns: true', () => {
    it('should auto-register all built-in nouns when withBuiltIns is true', () => {
      const $ = createSaaS({ withBuiltIns: true })

      // All built-in nouns should be available on $.db
      expect($.db).toHaveProperty('User')
      expect($.db).toHaveProperty('Organization')
      expect($.db).toHaveProperty('Plan')
      expect($.db).toHaveProperty('APIKey')
      expect($.db).toHaveProperty('Webhook')
      expect($.db).toHaveProperty('Usage')
      expect($.db).toHaveProperty('Metric')
    })

    it('should NOT auto-register built-in nouns when withBuiltIns is false', () => {
      const $ = createSaaS({ withBuiltIns: false })

      // Built-in nouns should not be present
      expect($.db.User).toBeUndefined()
      expect($.db.Organization).toBeUndefined()
      expect($.db.Plan).toBeUndefined()
    })

    it('should default to withBuiltIns: true when not specified', () => {
      const $ = createSaaS()

      // Built-ins should be available by default
      expect($.db).toHaveProperty('User')
      expect($.db).toHaveProperty('Organization')
    })

    it('should allow extending built-in nouns with custom fields', () => {
      const $ = createSaaS({ withBuiltIns: true })

      $.nouns({
        User: {
          // Extend the built-in User with custom fields
          avatarUrl: 'string?',
          preferredLanguage: 'string?',
        },
      })

      // Both built-in and custom fields should exist
      expect($._registeredNouns.User.email).toBeDefined()
      expect($._registeredNouns.User.avatarUrl).toBeDefined()
    })

    it('should allow custom nouns alongside built-ins', () => {
      const $ = createSaaS({ withBuiltIns: true })

      $.nouns({
        Customer: { name: 'string', company: 'string' },
        Product: { title: 'string', price: 'number' },
      })

      // Both built-in and custom nouns should be available
      expect($.db).toHaveProperty('User')
      expect($.db).toHaveProperty('Customer')
      expect($.db).toHaveProperty('Product')
    })
  })

  describe('User Noun', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS({ withBuiltIns: true })
    })

    it('should have email field (required, unique)', () => {
      const userSchema = $._registeredNouns.User

      expect(userSchema.email).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have name field (required)', () => {
      const userSchema = $._registeredNouns.User

      expect(userSchema.name).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have role field with union type', () => {
      const userSchema = $._registeredNouns.User

      // role should be a union type: admin | member | owner
      expect(userSchema.role).toMatchObject({
        type: 'admin | member | owner',
        optional: false,
      })
    })

    it('should have organization relationship (->Organization)', () => {
      const userSchema = $._registeredNouns.User

      expect(userSchema.organization).toMatchObject({
        type: 'relation',
        target: 'Organization',
        direction: 'forward',
        cardinality: 'one',
      })
    })

    it('should have optional passwordHash field', () => {
      const userSchema = $._registeredNouns.User

      expect(userSchema.passwordHash).toMatchObject({
        type: 'string',
        optional: true,
      })
    })

    it('should have emailVerified field (boolean)', () => {
      const userSchema = $._registeredNouns.User

      expect(userSchema.emailVerified).toMatchObject({
        type: 'boolean',
        optional: false,
      })
    })

    it('should have createdAt and updatedAt timestamps', () => {
      const userSchema = $._registeredNouns.User

      expect(userSchema.createdAt).toMatchObject({ type: 'datetime', optional: false })
      expect(userSchema.updatedAt).toMatchObject({ type: 'datetime', optional: false })
    })

    describe('User CRUD Operations', () => {
      it('should create a user with required fields', async () => {
        const user = await $.db.User.create({
          email: 'john@example.com',
          name: 'John Doe',
          role: 'member',
        })

        expect(user).toHaveProperty('id')
        expect(user.email).toBe('john@example.com')
        expect(user.name).toBe('John Doe')
        expect(user.role).toBe('member')
      })

      it('should enforce unique email constraint', async () => {
        await $.db.User.create({
          email: 'unique@example.com',
          name: 'First User',
          role: 'member',
        })

        await expect(
          $.db.User.create({
            email: 'unique@example.com',
            name: 'Second User',
            role: 'member',
          })
        ).rejects.toThrow(/duplicate|already exists|unique constraint/i)
      })

      it('should validate email format', async () => {
        await expect(
          $.db.User.create({
            email: 'not-an-email',
            name: 'Invalid',
            role: 'member',
          })
        ).rejects.toThrow(/invalid email|email format/i)
      })

      it('should validate role enum values', async () => {
        await expect(
          $.db.User.create({
            email: 'test@example.com',
            name: 'Test',
            role: 'superadmin', // Invalid role
          })
        ).rejects.toThrow(/invalid role|enum|must be one of/i)
      })
    })
  })

  describe('Organization Noun', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS({ withBuiltIns: true })
    })

    it('should have name field (required)', () => {
      const orgSchema = $._registeredNouns.Organization

      expect(orgSchema.name).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have plan relationship (->Plan)', () => {
      const orgSchema = $._registeredNouns.Organization

      expect(orgSchema.plan).toMatchObject({
        type: 'relation',
        target: 'Plan',
        direction: 'forward',
        cardinality: 'one',
      })
    })

    it('should have stripeCustomerId field (optional)', () => {
      const orgSchema = $._registeredNouns.Organization

      expect(orgSchema.stripeCustomerId).toMatchObject({
        type: 'string',
        optional: true,
      })
    })

    it('should have members reverse relationship (<-User)', () => {
      const orgSchema = $._registeredNouns.Organization

      expect(orgSchema.members).toMatchObject({
        type: 'relation',
        target: 'User',
        direction: 'reverse',
        cardinality: 'many',
      })
    })

    it('should have slug field (unique)', () => {
      const orgSchema = $._registeredNouns.Organization

      expect(orgSchema.slug).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have apiKeys reverse relationship (<-APIKey)', () => {
      const orgSchema = $._registeredNouns.Organization

      expect(orgSchema.apiKeys).toMatchObject({
        type: 'relation',
        target: 'APIKey',
        direction: 'reverse',
        cardinality: 'many',
      })
    })

    describe('Organization CRUD Operations', () => {
      it('should create an organization', async () => {
        const org = await $.db.Organization.create({
          name: 'Acme Corp',
          slug: 'acme-corp',
        })

        expect(org).toHaveProperty('id')
        expect(org.name).toBe('Acme Corp')
        expect(org.slug).toBe('acme-corp')
      })

      it('should enforce unique slug constraint', async () => {
        await $.db.Organization.create({
          name: 'First Org',
          slug: 'unique-slug',
        })

        await expect(
          $.db.Organization.create({
            name: 'Second Org',
            slug: 'unique-slug',
          })
        ).rejects.toThrow(/duplicate|already exists|unique constraint/i)
      })
    })
  })

  describe('Plan Noun', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS({ withBuiltIns: true })
    })

    it('should have name field (required)', () => {
      const planSchema = $._registeredNouns.Plan

      expect(planSchema.name).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have price field (number, in cents)', () => {
      const planSchema = $._registeredNouns.Plan

      expect(planSchema.price).toMatchObject({
        type: 'number',
        optional: false,
      })
    })

    it('should have interval field with union type', () => {
      const planSchema = $._registeredNouns.Plan

      // interval should be: month | year | one-time
      expect(planSchema.interval).toMatchObject({
        type: 'month | year | one-time',
        optional: false,
      })
    })

    it('should have features field (string array or JSON)', () => {
      const planSchema = $._registeredNouns.Plan

      // Features can be stored as JSON array
      expect(planSchema.features).toMatchObject({
        type: 'json',
        optional: true,
      })
    })

    it('should have stripePriceId field (optional)', () => {
      const planSchema = $._registeredNouns.Plan

      expect(planSchema.stripePriceId).toMatchObject({
        type: 'string',
        optional: true,
      })
    })

    it('should have isActive field (boolean)', () => {
      const planSchema = $._registeredNouns.Plan

      expect(planSchema.isActive).toMatchObject({
        type: 'boolean',
        optional: false,
      })
    })

    describe('Plan CRUD Operations', () => {
      it('should create a plan', async () => {
        const plan = await $.db.Plan.create({
          name: 'Pro',
          price: 2999, // $29.99 in cents
          interval: 'month',
          features: ['Unlimited API calls', '10 team members', 'Priority support'],
          isActive: true,
        })

        expect(plan).toHaveProperty('id')
        expect(plan.name).toBe('Pro')
        expect(plan.price).toBe(2999)
        expect(plan.features).toContain('Unlimited API calls')
      })

      it('should validate interval enum values', async () => {
        await expect(
          $.db.Plan.create({
            name: 'Invalid',
            price: 0,
            interval: 'weekly', // Invalid interval
            isActive: true,
          })
        ).rejects.toThrow(/invalid interval|enum|must be one of/i)
      })
    })
  })

  describe('APIKey Noun', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS({ withBuiltIns: true })
    })

    it('should have key field (unique, hashed)', () => {
      const apiKeySchema = $._registeredNouns.APIKey

      expect(apiKeySchema.key).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have name/label field for identification', () => {
      const apiKeySchema = $._registeredNouns.APIKey

      expect(apiKeySchema.name).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have organization relationship (->Organization)', () => {
      const apiKeySchema = $._registeredNouns.APIKey

      expect(apiKeySchema.organization).toMatchObject({
        type: 'relation',
        target: 'Organization',
        direction: 'forward',
        cardinality: 'one',
      })
    })

    it('should have permissions field (json array)', () => {
      const apiKeySchema = $._registeredNouns.APIKey

      expect(apiKeySchema.permissions).toMatchObject({
        type: 'json',
        optional: true,
      })
    })

    it('should have expiresAt field (optional datetime)', () => {
      const apiKeySchema = $._registeredNouns.APIKey

      expect(apiKeySchema.expiresAt).toMatchObject({
        type: 'datetime',
        optional: true,
      })
    })

    it('should have lastUsedAt field (optional datetime)', () => {
      const apiKeySchema = $._registeredNouns.APIKey

      expect(apiKeySchema.lastUsedAt).toMatchObject({
        type: 'datetime',
        optional: true,
      })
    })

    it('should have isActive field (boolean)', () => {
      const apiKeySchema = $._registeredNouns.APIKey

      expect(apiKeySchema.isActive).toMatchObject({
        type: 'boolean',
        optional: false,
      })
    })

    describe('APIKey Generation and Validation', () => {
      it('should generate a secure API key on create', async () => {
        const org = await $.db.Organization.create({
          name: 'Test Org',
          slug: 'test-org',
        })

        const apiKey = await $.db.APIKey.create({
          name: 'Production Key',
          organization: org.id,
          isActive: true,
        })

        expect(apiKey).toHaveProperty('id')
        expect(apiKey).toHaveProperty('key')
        // Key should be prefixed (e.g., sk_live_ or api_)
        expect(apiKey.key).toMatch(/^(sk_|api_|key_)/)
        // Key should be sufficiently long
        expect(apiKey.key.length).toBeGreaterThan(20)
      })

      it('should hash the API key before storage', async () => {
        const org = await $.db.Organization.create({
          name: 'Test Org',
          slug: 'hash-test-org',
        })

        const apiKey = await $.db.APIKey.create({
          name: 'Test Key',
          organization: org.id,
          isActive: true,
        })

        // The original key should be returned on creation
        const originalKey = apiKey.key

        // When retrieved from DB, the key should be hashed
        const retrieved = await $.db.APIKey.get(apiKey.id)
        expect(retrieved?.key).not.toBe(originalKey)
        // Or key should not be retrievable after creation
        expect(retrieved?.key).toBeUndefined()
      })

      it('should validate an API key', async () => {
        const org = await $.db.Organization.create({
          name: 'Validation Org',
          slug: 'validation-org',
        })

        const apiKey = await $.db.APIKey.create({
          name: 'Validation Key',
          organization: org.id,
          isActive: true,
        })

        const originalKey = apiKey.key

        // Validate the key
        const validationResult = await $.auth.validateAPIKey(originalKey)

        expect(validationResult).toMatchObject({
          valid: true,
          organizationId: org.id,
          apiKeyId: apiKey.id,
        })
      })

      it('should reject invalid API keys', async () => {
        const validationResult = await $.auth.validateAPIKey('invalid_key_12345')

        expect(validationResult).toMatchObject({
          valid: false,
          error: expect.stringMatching(/invalid|not found/i),
        })
      })

      it('should reject expired API keys', async () => {
        const org = await $.db.Organization.create({
          name: 'Expiry Org',
          slug: 'expiry-org',
        })

        const apiKey = await $.db.APIKey.create({
          name: 'Expired Key',
          organization: org.id,
          isActive: true,
          expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
        })

        const validationResult = await $.auth.validateAPIKey(apiKey.key)

        expect(validationResult).toMatchObject({
          valid: false,
          error: expect.stringMatching(/expired/i),
        })
      })

      it('should reject inactive API keys', async () => {
        const org = await $.db.Organization.create({
          name: 'Inactive Org',
          slug: 'inactive-org',
        })

        const apiKey = await $.db.APIKey.create({
          name: 'Inactive Key',
          organization: org.id,
          isActive: false,
        })

        const validationResult = await $.auth.validateAPIKey(apiKey.key)

        expect(validationResult).toMatchObject({
          valid: false,
          error: expect.stringMatching(/inactive|disabled/i),
        })
      })

      it('should update lastUsedAt on validation', async () => {
        const org = await $.db.Organization.create({
          name: 'LastUsed Org',
          slug: 'lastused-org',
        })

        const apiKey = await $.db.APIKey.create({
          name: 'Active Key',
          organization: org.id,
          isActive: true,
        })

        const before = new Date()
        await $.auth.validateAPIKey(apiKey.key)
        const after = new Date()

        const updated = await $.db.APIKey.get(apiKey.id)
        expect(updated?.lastUsedAt).toBeDefined()
        expect(new Date(updated?.lastUsedAt).getTime()).toBeGreaterThanOrEqual(before.getTime())
        expect(new Date(updated?.lastUsedAt).getTime()).toBeLessThanOrEqual(after.getTime())
      })
    })
  })

  describe('Webhook Noun', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS({ withBuiltIns: true })
    })

    it('should have url field (required, validated)', () => {
      const webhookSchema = $._registeredNouns.Webhook

      expect(webhookSchema.url).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have events field (json array of event types)', () => {
      const webhookSchema = $._registeredNouns.Webhook

      expect(webhookSchema.events).toMatchObject({
        type: 'json',
        optional: false,
      })
    })

    it('should have secret field (auto-generated)', () => {
      const webhookSchema = $._registeredNouns.Webhook

      expect(webhookSchema.secret).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have organization relationship (->Organization)', () => {
      const webhookSchema = $._registeredNouns.Webhook

      expect(webhookSchema.organization).toMatchObject({
        type: 'relation',
        target: 'Organization',
        direction: 'forward',
        cardinality: 'one',
      })
    })

    it('should have isActive field (boolean)', () => {
      const webhookSchema = $._registeredNouns.Webhook

      expect(webhookSchema.isActive).toMatchObject({
        type: 'boolean',
        optional: false,
      })
    })

    it('should have failureCount field (number)', () => {
      const webhookSchema = $._registeredNouns.Webhook

      expect(webhookSchema.failureCount).toMatchObject({
        type: 'number',
        optional: false,
      })
    })

    describe('Webhook CRUD Operations', () => {
      it('should create a webhook with auto-generated secret', async () => {
        const org = await $.db.Organization.create({
          name: 'Webhook Org',
          slug: 'webhook-org',
        })

        const webhook = await $.db.Webhook.create({
          url: 'https://example.com/webhook',
          events: ['order.created', 'order.paid'],
          organization: org.id,
          isActive: true,
        })

        expect(webhook).toHaveProperty('id')
        expect(webhook.url).toBe('https://example.com/webhook')
        expect(webhook.secret).toBeDefined()
        // Secret should be sufficiently long for HMAC signing
        expect(webhook.secret.length).toBeGreaterThan(20)
      })

      it('should validate URL format', async () => {
        const org = await $.db.Organization.create({
          name: 'URL Test Org',
          slug: 'url-test-org',
        })

        await expect(
          $.db.Webhook.create({
            url: 'not-a-valid-url',
            events: ['test.event'],
            organization: org.id,
            isActive: true,
          })
        ).rejects.toThrow(/invalid url|url format/i)
      })

      it('should require HTTPS in production', async () => {
        const org = await $.db.Organization.create({
          name: 'HTTPS Test Org',
          slug: 'https-test-org',
        })

        // In production, HTTP should be rejected
        await expect(
          $.db.Webhook.create({
            url: 'http://example.com/webhook',
            events: ['test.event'],
            organization: org.id,
            isActive: true,
          })
        ).rejects.toThrow(/https required|secure url/i)
      })
    })
  })

  describe('Usage Noun', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS({ withBuiltIns: true })
    })

    it('should have organization relationship (->Organization)', () => {
      const usageSchema = $._registeredNouns.Usage

      expect(usageSchema.organization).toMatchObject({
        type: 'relation',
        target: 'Organization',
        direction: 'forward',
        cardinality: 'one',
      })
    })

    it('should have metric field (string - what is being tracked)', () => {
      const usageSchema = $._registeredNouns.Usage

      expect(usageSchema.metric).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have value field (number)', () => {
      const usageSchema = $._registeredNouns.Usage

      expect(usageSchema.value).toMatchObject({
        type: 'number',
        optional: false,
      })
    })

    it('should have period field (datetime - billing period start)', () => {
      const usageSchema = $._registeredNouns.Usage

      expect(usageSchema.period).toMatchObject({
        type: 'datetime',
        optional: false,
      })
    })

    describe('Usage Tracking', () => {
      it('should track API call usage', async () => {
        const org = await $.db.Organization.create({
          name: 'Usage Org',
          slug: 'usage-org',
        })

        const usage = await $.db.Usage.create({
          organization: org.id,
          metric: 'api_calls',
          value: 1,
          period: new Date('2024-01-01'),
        })

        expect(usage).toHaveProperty('id')
        expect(usage.metric).toBe('api_calls')
        expect(usage.value).toBe(1)
      })

      it('should increment existing usage for same period', async () => {
        const org = await $.db.Organization.create({
          name: 'Increment Org',
          slug: 'increment-org',
        })

        const period = new Date('2024-01-01')

        // First usage record
        await $.db.Usage.create({
          organization: org.id,
          metric: 'api_calls',
          value: 100,
          period,
        })

        // Increment via helper method
        await $.usage.increment(org.id, 'api_calls', 50)

        const records = await $.db.Usage.find({
          organization: org.id,
          metric: 'api_calls',
          period,
        })

        expect(records[0].value).toBe(150)
      })

      it('should aggregate usage for a period', async () => {
        const org = await $.db.Organization.create({
          name: 'Aggregate Org',
          slug: 'aggregate-org',
        })

        // Create multiple usage records
        await $.db.Usage.create({
          organization: org.id,
          metric: 'api_calls',
          value: 100,
          period: new Date('2024-01-01'),
        })

        await $.db.Usage.create({
          organization: org.id,
          metric: 'api_calls',
          value: 200,
          period: new Date('2024-01-15'),
        })

        // Aggregate for January
        const total = await $.usage.aggregate(org.id, 'api_calls', {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        })

        expect(total).toBe(300)
      })

      it('should get usage by metric type', async () => {
        const org = await $.db.Organization.create({
          name: 'Metric Type Org',
          slug: 'metric-type-org',
        })

        await $.db.Usage.create({
          organization: org.id,
          metric: 'api_calls',
          value: 100,
          period: new Date('2024-01-01'),
        })

        await $.db.Usage.create({
          organization: org.id,
          metric: 'storage_bytes',
          value: 1000000,
          period: new Date('2024-01-01'),
        })

        const apiUsage = await $.usage.getByMetric(org.id, 'api_calls')
        const storageUsage = await $.usage.getByMetric(org.id, 'storage_bytes')

        expect(apiUsage).toBe(100)
        expect(storageUsage).toBe(1000000)
      })
    })
  })

  describe('Metric Noun', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS({ withBuiltIns: true })
    })

    it('should have name field (string - metric identifier)', () => {
      const metricSchema = $._registeredNouns.Metric

      expect(metricSchema.name).toMatchObject({
        type: 'string',
        optional: false,
      })
    })

    it('should have value field (number)', () => {
      const metricSchema = $._registeredNouns.Metric

      expect(metricSchema.value).toMatchObject({
        type: 'number',
        optional: false,
      })
    })

    it('should have date field (datetime)', () => {
      const metricSchema = $._registeredNouns.Metric

      expect(metricSchema.date).toMatchObject({
        type: 'datetime',
        optional: false,
      })
    })

    it('should have optional organization relationship', () => {
      const metricSchema = $._registeredNouns.Metric

      expect(metricSchema.organization).toMatchObject({
        type: 'relation',
        target: 'Organization',
        direction: 'forward',
        cardinality: 'one',
      })
    })

    it('should have optional dimensions field (json for tags/labels)', () => {
      const metricSchema = $._registeredNouns.Metric

      expect(metricSchema.dimensions).toMatchObject({
        type: 'json',
        optional: true,
      })
    })

    describe('Metric Recording', () => {
      it('should record a metric data point', async () => {
        const metric = await $.db.Metric.create({
          name: 'revenue',
          value: 29.99,
          date: new Date(),
        })

        expect(metric).toHaveProperty('id')
        expect(metric.name).toBe('revenue')
        expect(metric.value).toBe(29.99)
      })

      it('should record metrics with dimensions', async () => {
        const metric = await $.db.Metric.create({
          name: 'page_views',
          value: 1,
          date: new Date(),
          dimensions: {
            page: '/pricing',
            referrer: 'google',
            country: 'US',
          },
        })

        expect(metric.dimensions).toMatchObject({
          page: '/pricing',
          referrer: 'google',
        })
      })

      it('should query metrics by name and date range', async () => {
        await $.db.Metric.create({
          name: 'signups',
          value: 10,
          date: new Date('2024-01-15'),
        })

        await $.db.Metric.create({
          name: 'signups',
          value: 15,
          date: new Date('2024-01-20'),
        })

        await $.db.Metric.create({
          name: 'signups',
          value: 5,
          date: new Date('2024-02-01'),
        })

        const januarySignups = await $.metrics.query({
          name: 'signups',
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        })

        expect(januarySignups.length).toBe(2)
        expect(januarySignups.reduce((sum, m) => sum + m.value, 0)).toBe(25)
      })

      it('should aggregate metrics (sum, avg, min, max)', async () => {
        await $.db.Metric.create({ name: 'orders', value: 100, date: new Date('2024-01-01') })
        await $.db.Metric.create({ name: 'orders', value: 200, date: new Date('2024-01-02') })
        await $.db.Metric.create({ name: 'orders', value: 150, date: new Date('2024-01-03') })

        const sum = await $.metrics.sum('orders')
        const avg = await $.metrics.avg('orders')
        const min = await $.metrics.min('orders')
        const max = await $.metrics.max('orders')

        expect(sum).toBe(450)
        expect(avg).toBe(150)
        expect(min).toBe(100)
        expect(max).toBe(200)
      })
    })
  })

  describe('Relationships', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS({ withBuiltIns: true })
    })

    describe('User ↔ Organization Relationship', () => {
      it('should link user to organization on create', async () => {
        const org = await $.db.Organization.create({
          name: 'Test Org',
          slug: 'test-org',
        })

        const user = await $.db.User.create({
          email: 'user@example.com',
          name: 'Test User',
          role: 'member',
          organization: org.id,
        })

        expect(user.organization).toBe(org.id)
      })

      it('should load user with organization populated', async () => {
        const org = await $.db.Organization.create({
          name: 'Populate Org',
          slug: 'populate-org',
        })

        const user = await $.db.User.create({
          email: 'populate@example.com',
          name: 'Populate User',
          role: 'member',
          organization: org.id,
        })

        // Use populate/include to load relationships
        const loadedUser = await $.db.User.get(user.id, { include: ['organization'] })

        expect(loadedUser?.organization).toMatchObject({
          id: org.id,
          name: 'Populate Org',
        })
      })

      it('should get all users in an organization (reverse)', async () => {
        const org = await $.db.Organization.create({
          name: 'Multi User Org',
          slug: 'multi-user-org',
        })

        await $.db.User.create({
          email: 'user1@example.com',
          name: 'User One',
          role: 'admin',
          organization: org.id,
        })

        await $.db.User.create({
          email: 'user2@example.com',
          name: 'User Two',
          role: 'member',
          organization: org.id,
        })

        const loadedOrg = await $.db.Organization.get(org.id, { include: ['members'] })

        expect(loadedOrg?.members).toHaveLength(2)
        expect(loadedOrg?.members.map((u: { email: string }) => u.email)).toContain('user1@example.com')
      })
    })

    describe('Organization ↔ Plan Relationship', () => {
      it('should link organization to plan', async () => {
        const plan = await $.db.Plan.create({
          name: 'Pro',
          price: 2999,
          interval: 'month',
          isActive: true,
        })

        const org = await $.db.Organization.create({
          name: 'Pro Org',
          slug: 'pro-org',
          plan: plan.id,
        })

        expect(org.plan).toBe(plan.id)
      })

      it('should load organization with plan populated', async () => {
        const plan = await $.db.Plan.create({
          name: 'Enterprise',
          price: 9999,
          interval: 'month',
          isActive: true,
        })

        const org = await $.db.Organization.create({
          name: 'Enterprise Org',
          slug: 'enterprise-org',
          plan: plan.id,
        })

        const loadedOrg = await $.db.Organization.get(org.id, { include: ['plan'] })

        expect(loadedOrg?.plan).toMatchObject({
          id: plan.id,
          name: 'Enterprise',
        })
      })

      it('should allow organization without plan (free tier)', async () => {
        const org = await $.db.Organization.create({
          name: 'Free Org',
          slug: 'free-org',
        })

        expect(org.plan).toBeUndefined()
      })
    })

    describe('APIKey ↔ Organization Relationship', () => {
      it('should require organization for API key', async () => {
        await expect(
          $.db.APIKey.create({
            name: 'Orphan Key',
            isActive: true,
            // No organization specified
          })
        ).rejects.toThrow(/organization.*required|missing.*organization/i)
      })

      it('should load API keys for an organization', async () => {
        const org = await $.db.Organization.create({
          name: 'API Org',
          slug: 'api-org',
        })

        await $.db.APIKey.create({
          name: 'Key 1',
          organization: org.id,
          isActive: true,
        })

        await $.db.APIKey.create({
          name: 'Key 2',
          organization: org.id,
          isActive: true,
        })

        const loadedOrg = await $.db.Organization.get(org.id, { include: ['apiKeys'] })

        expect(loadedOrg?.apiKeys).toHaveLength(2)
      })

      it('should cascade delete API keys when organization is deleted', async () => {
        const org = await $.db.Organization.create({
          name: 'Delete Org',
          slug: 'delete-org',
        })

        const apiKey = await $.db.APIKey.create({
          name: 'Doomed Key',
          organization: org.id,
          isActive: true,
        })

        await $.db.Organization.delete(org.id)

        const deletedKey = await $.db.APIKey.get(apiKey.id)
        expect(deletedKey).toBeNull()
      })
    })
  })

  describe('Built-in Verbs', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS({ withBuiltIns: true })
    })

    it('should have User verbs: invite, verify, deactivate', () => {
      expect($._registeredVerbs.User).toHaveProperty('invite')
      expect($._registeredVerbs.User).toHaveProperty('verify')
      expect($._registeredVerbs.User).toHaveProperty('deactivate')
    })

    it('should have Organization verbs: upgrade, downgrade', () => {
      expect($._registeredVerbs.Organization).toHaveProperty('upgrade')
      expect($._registeredVerbs.Organization).toHaveProperty('downgrade')
    })

    it('should have APIKey verbs: revoke, rotate', () => {
      expect($._registeredVerbs.APIKey).toHaveProperty('revoke')
      expect($._registeredVerbs.APIKey).toHaveProperty('rotate')
    })

    it('should have Webhook verbs: test, disable', () => {
      expect($._registeredVerbs.Webhook).toHaveProperty('test')
      expect($._registeredVerbs.Webhook).toHaveProperty('disable')
    })
  })

  describe('Built-in Events', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS({ withBuiltIns: true })
    })

    it('should emit User.invited event on invite verb', async () => {
      const eventLog: string[] = []

      $.on.User.invited(async (user) => {
        eventLog.push(`invited:${(user as { email: string }).email}`)
      })

      await $.verbs.User.invite({ email: 'newuser@example.com' })

      expect(eventLog).toContain('invited:newuser@example.com')
    })

    it('should emit Organization.upgraded event on plan change', async () => {
      const eventLog: string[] = []

      $.on.Organization.upgraded(async (org, { previousPlan, newPlan }) => {
        eventLog.push(`upgraded:${previousPlan}:${newPlan}`)
      })

      const freePlan = await $.db.Plan.create({
        name: 'Free',
        price: 0,
        interval: 'month',
        isActive: true,
      })

      const proPlan = await $.db.Plan.create({
        name: 'Pro',
        price: 2999,
        interval: 'month',
        isActive: true,
      })

      const org = await $.db.Organization.create({
        name: 'Upgrading Org',
        slug: 'upgrading-org',
        plan: freePlan.id,
      })

      await $.verbs.Organization.upgrade(org.id, { plan: proPlan.id })

      expect(eventLog).toContain('upgraded:Free:Pro')
    })

    it('should emit APIKey.revoked event', async () => {
      const eventLog: string[] = []

      $.on.APIKey.revoked(async (apiKey) => {
        eventLog.push(`revoked:${(apiKey as { id: string }).id}`)
      })

      const org = await $.db.Organization.create({
        name: 'Revoke Org',
        slug: 'revoke-org',
      })

      const apiKey = await $.db.APIKey.create({
        name: 'To Be Revoked',
        organization: org.id,
        isActive: true,
      })

      await $.verbs.APIKey.revoke(apiKey.id)

      expect(eventLog).toContain(`revoked:${apiKey.id}`)
    })
  })
})
