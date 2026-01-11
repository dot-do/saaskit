/**
 * Stripe Integration Tests - Billing, Subscriptions, and Revenue Metrics
 *
 * Tests for Stripe integration including:
 * - Plans syncing to Stripe Products/Prices
 * - Subscription lifecycle (create, upgrade, downgrade, cancel)
 * - Customer portal
 * - Usage-based billing (meters)
 * - Webhook event handling
 * - Revenue metrics (MRR, ARR)
 * - Stripe Connect revenue sharing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createContext, type ExtendedContext } from '../core/context'

/**
 * Plan definition for SaaSkit
 */
interface Plan {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  limits?: Record<string, number>
  stripeProductId?: string
  stripePriceId?: string
}

/**
 * Subscription entity
 */
interface Subscription {
  id: string
  customerId: string
  planId: string
  stripeSubscriptionId: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
}

/**
 * Usage meter record
 */
interface UsageMeter {
  id: string
  subscriptionId: string
  metric: string
  quantity: number
  timestamp: Date
}

/**
 * Revenue metrics
 */
interface RevenueMetrics {
  mrr: number // Monthly Recurring Revenue in cents
  arr: number // Annual Recurring Revenue in cents
  activeSubscriptions: number
  churnRate: number
}

describe('Stripe Integration', () => {
  /**
   * Factory function for creating test contexts with Stripe integration
   */
  const createStripeContext = (config: Partial<Record<string, unknown>> = {}): ExtendedContext => {
    const $ = createContext({
      nouns: ['Customer', 'Subscription', 'Plan', 'Invoice', 'UsageMeter'],
      ...config,
    })
    // Stripe is a built-in integration, no registration needed
    return $
  }

  describe('Plans Sync to Stripe Products/Prices', () => {
    it('should sync a plan to Stripe as a Product with Price', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            product: { id: 'prod_test123', name: 'Pro Plan' },
            price: { id: 'price_test123', unit_amount: 2900 },
          }),
      })
      $.setFetch(mockFetch)

      const plan: Plan = {
        id: 'pro',
        name: 'Pro Plan',
        description: 'Best for growing teams',
        price: 2900, // $29.00 in cents
        currency: 'usd',
        interval: 'month',
        features: ['Unlimited projects', '10GB storage', 'Priority support'],
      }

      const result = await $.billing.syncPlan(plan)

      expect(result.stripeProductId).toBe('prod_test123')
      expect(result.stripePriceId).toBe('price_test123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/products'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Pro Plan'),
        })
      )
    })

    it('should update existing Stripe Product when plan changes', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            product: { id: 'prod_existing', name: 'Pro Plan Updated' },
            price: { id: 'price_new', unit_amount: 3900 },
          }),
      })
      $.setFetch(mockFetch)

      const plan: Plan = {
        id: 'pro',
        name: 'Pro Plan Updated',
        price: 3900, // Price increased
        currency: 'usd',
        interval: 'month',
        features: ['Unlimited projects', '20GB storage'],
        stripeProductId: 'prod_existing',
        stripePriceId: 'price_old',
      }

      const result = await $.billing.syncPlan(plan)

      expect(result.stripePriceId).toBe('price_new')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/products/prod_existing'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should sync multiple plans in batch', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            products: [
              { id: 'prod_free', name: 'Free' },
              { id: 'prod_pro', name: 'Pro' },
              { id: 'prod_enterprise', name: 'Enterprise' },
            ],
          }),
      })
      $.setFetch(mockFetch)

      const plans: Plan[] = [
        { id: 'free', name: 'Free', price: 0, currency: 'usd', interval: 'month', features: [] },
        { id: 'pro', name: 'Pro', price: 2900, currency: 'usd', interval: 'month', features: [] },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 9900,
          currency: 'usd',
          interval: 'month',
          features: [],
        },
      ]

      const results = await $.billing.syncPlans(plans)

      expect(results).toHaveLength(3)
      expect(results.every((r: Plan) => r.stripeProductId)).toBe(true)
    })

    it('should handle annual pricing intervals', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            product: { id: 'prod_annual', name: 'Pro Annual' },
            price: { id: 'price_annual', unit_amount: 29000, recurring: { interval: 'year' } },
          }),
      })
      $.setFetch(mockFetch)

      const plan: Plan = {
        id: 'pro-annual',
        name: 'Pro Annual',
        price: 29000, // $290/year
        currency: 'usd',
        interval: 'year',
        features: ['All Pro features', '2 months free'],
      }

      const result = await $.billing.syncPlan(plan)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"interval":"year"'),
        })
      )
    })
  })

  describe('Subscription Creation', () => {
    it('should create a subscription for a customer', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
            current_period_start: 1704067200,
            current_period_end: 1706745600,
          }),
      })
      $.setFetch(mockFetch)

      const subscription = await $.billing.createSubscription({
        customerId: 'cus_test123',
        priceId: 'price_pro',
      })

      expect(subscription.stripeSubscriptionId).toBe('sub_test123')
      expect(subscription.status).toBe('active')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should create a subscription with trial period', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_trial123',
            status: 'trialing',
            trial_end: 1705276800,
          }),
      })
      $.setFetch(mockFetch)

      const subscription = await $.billing.createSubscription({
        customerId: 'cus_test123',
        priceId: 'price_pro',
        trialDays: 14,
      })

      expect(subscription.status).toBe('trialing')
      expect(subscription.trialEnd).toBeDefined()
    })

    it('should create a subscription with coupon applied', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_discounted',
            discount: { coupon: { id: 'SAVE20', percent_off: 20 } },
          }),
      })
      $.setFetch(mockFetch)

      const subscription = await $.billing.createSubscription({
        customerId: 'cus_test123',
        priceId: 'price_pro',
        couponId: 'SAVE20',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('SAVE20'),
        })
      )
    })

    it('should handle subscription creation failure', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        json: () =>
          Promise.resolve({
            error: { message: 'Card was declined', code: 'card_declined' },
          }),
      })
      $.setFetch(mockFetch)

      await expect(
        $.billing.createSubscription({
          customerId: 'cus_test123',
          priceId: 'price_pro',
        })
      ).rejects.toThrow('Card was declined')
    })
  })

  describe('Subscription Upgrade', () => {
    it('should upgrade a subscription to a higher tier', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            items: { data: [{ price: { id: 'price_enterprise' } }] },
            status: 'active',
          }),
      })
      $.setFetch(mockFetch)

      const subscription = await $.billing.upgradeSubscription({
        subscriptionId: 'sub_test123',
        newPriceId: 'price_enterprise',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions/sub_test123'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('price_enterprise'),
        })
      )
    })

    it('should prorate charges when upgrading mid-cycle', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            proration_behavior: 'create_prorations',
          }),
      })
      $.setFetch(mockFetch)

      await $.billing.upgradeSubscription({
        subscriptionId: 'sub_test123',
        newPriceId: 'price_enterprise',
        prorate: true,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('create_prorations'),
        })
      )
    })

    it('should schedule upgrade for next billing cycle', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            schedule: { id: 'sub_sched_123' },
          }),
      })
      $.setFetch(mockFetch)

      await $.billing.upgradeSubscription({
        subscriptionId: 'sub_test123',
        newPriceId: 'price_enterprise',
        scheduleForNextCycle: true,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscription_schedules'),
        expect.any(Object)
      )
    })
  })

  describe('Subscription Downgrade', () => {
    it('should downgrade a subscription to a lower tier', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            items: { data: [{ price: { id: 'price_basic' } }] },
          }),
      })
      $.setFetch(mockFetch)

      const subscription = await $.billing.downgradeSubscription({
        subscriptionId: 'sub_test123',
        newPriceId: 'price_basic',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions/sub_test123'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should schedule downgrade for end of billing period', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            pending_update: { billing_cycle_anchor: 'unchanged' },
          }),
      })
      $.setFetch(mockFetch)

      await $.billing.downgradeSubscription({
        subscriptionId: 'sub_test123',
        newPriceId: 'price_basic',
        atPeriodEnd: true,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('billing_cycle_anchor'),
        })
      )
    })

    it('should issue credit for unused portion when immediate downgrade', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            proration_behavior: 'create_prorations',
            latest_invoice: { amount_due: -1500 }, // Credit of $15
          }),
      })
      $.setFetch(mockFetch)

      const result = await $.billing.downgradeSubscription({
        subscriptionId: 'sub_test123',
        newPriceId: 'price_basic',
        immediate: true,
      })

      expect(result.creditIssued).toBeGreaterThan(0)
    })
  })

  describe('Subscription Cancellation', () => {
    it('should cancel a subscription at period end', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            cancel_at_period_end: true,
            current_period_end: 1706745600,
          }),
      })
      $.setFetch(mockFetch)

      const subscription = await $.billing.cancelSubscription({
        subscriptionId: 'sub_test123',
      })

      expect(subscription.cancelAtPeriodEnd).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions/sub_test123'),
        expect.objectContaining({
          body: expect.stringContaining('cancel_at_period_end'),
        })
      )
    })

    it('should cancel a subscription immediately', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            status: 'canceled',
            canceled_at: 1704067200,
          }),
      })
      $.setFetch(mockFetch)

      const subscription = await $.billing.cancelSubscription({
        subscriptionId: 'sub_test123',
        immediately: true,
      })

      expect(subscription.status).toBe('canceled')
    })

    it('should track cancellation reason', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            cancellation_details: {
              reason: 'too_expensive',
              comment: 'Moving to a competitor',
            },
          }),
      })
      $.setFetch(mockFetch)

      await $.billing.cancelSubscription({
        subscriptionId: 'sub_test123',
        reason: 'too_expensive',
        comment: 'Moving to a competitor',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('too_expensive'),
        })
      )
    })

    it('should allow reactivating a canceled subscription before period end', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'sub_test123',
            cancel_at_period_end: false,
            status: 'active',
          }),
      })
      $.setFetch(mockFetch)

      const subscription = await $.billing.reactivateSubscription({
        subscriptionId: 'sub_test123',
      })

      expect(subscription.cancelAtPeriodEnd).toBe(false)
      expect(subscription.status).toBe('active')
    })
  })

  describe('Customer Portal URL Generation', () => {
    it('should generate a customer portal URL', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            url: 'https://billing.stripe.com/session/test_session_123',
          }),
      })
      $.setFetch(mockFetch)

      const portalUrl = await $.billing.createPortalSession({
        customerId: 'cus_test123',
        returnUrl: 'https://myapp.com/billing',
      })

      expect(portalUrl).toContain('billing.stripe.com')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/billing_portal/sessions'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should generate portal URL with specific configuration', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            url: 'https://billing.stripe.com/session/configured_123',
          }),
      })
      $.setFetch(mockFetch)

      await $.billing.createPortalSession({
        customerId: 'cus_test123',
        returnUrl: 'https://myapp.com/billing',
        configurationId: 'bpc_config_123',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('bpc_config_123'),
        })
      )
    })

    it('should generate portal URL for specific flow type', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            url: 'https://billing.stripe.com/session/update_payment',
          }),
      })
      $.setFetch(mockFetch)

      await $.billing.createPortalSession({
        customerId: 'cus_test123',
        returnUrl: 'https://myapp.com/billing',
        flowType: 'payment_method_update',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('payment_method_update'),
        })
      )
    })
  })

  describe('Usage Meters', () => {
    it('should report usage for a metered subscription', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'mbur_test123',
            quantity: 100,
            subscription_item: 'si_test123',
          }),
      })
      $.setFetch(mockFetch)

      const usage = await $.billing.reportUsage({
        subscriptionItemId: 'si_test123',
        quantity: 100,
        action: 'increment',
      })

      expect(usage.quantity).toBe(100)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscription_items/si_test123/usage_records'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should set absolute usage value', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'mbur_test123',
            quantity: 500,
          }),
      })
      $.setFetch(mockFetch)

      await $.billing.reportUsage({
        subscriptionItemId: 'si_test123',
        quantity: 500,
        action: 'set',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"action":"set"'),
        })
      )
    })

    it('should report usage with timestamp', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'mbur_test123' }),
      })
      $.setFetch(mockFetch)

      const timestamp = Math.floor(Date.now() / 1000)
      await $.billing.reportUsage({
        subscriptionItemId: 'si_test123',
        quantity: 50,
        timestamp,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(timestamp.toString()),
        })
      )
    })

    it('should retrieve usage summary for billing period', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { total_usage: 1500, period: { start: 1704067200, end: 1706745600 } },
            ],
          }),
      })
      $.setFetch(mockFetch)

      const summary = await $.billing.getUsageSummary({
        subscriptionItemId: 'si_test123',
      })

      expect(summary.totalUsage).toBe(1500)
    })

    it('should handle multiple usage meters per subscription', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            meters: [
              { id: 'si_api_calls', total_usage: 10000 },
              { id: 'si_storage', total_usage: 5000 },
              { id: 'si_bandwidth', total_usage: 20000 },
            ],
          }),
      })
      $.setFetch(mockFetch)

      const usage = await $.billing.getAllUsageMeters({
        subscriptionId: 'sub_test123',
      })

      expect(usage.meters).toHaveLength(3)
    })
  })

  describe('Webhook Event Handling', () => {
    it('should handle invoice.paid event', async () => {
      const $ = createStripeContext()
      const handler = vi.fn()

      $.billing.onWebhook('invoice.paid', handler)

      await $.billing.processWebhook({
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_test123',
            customer: 'cus_test123',
            amount_paid: 2900,
            subscription: 'sub_test123',
          },
        },
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'in_test123',
          amountPaid: 2900,
        })
      )
    })

    it('should handle invoice.payment_failed event', async () => {
      const $ = createStripeContext()
      const handler = vi.fn()

      $.billing.onWebhook('invoice.payment_failed', handler)

      await $.billing.processWebhook({
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test123',
            customer: 'cus_test123',
            attempt_count: 1,
          },
        },
      })

      expect(handler).toHaveBeenCalled()
    })

    it('should handle customer.subscription.created event', async () => {
      const $ = createStripeContext()
      const handler = vi.fn()

      $.billing.onWebhook('customer.subscription.created', handler)

      await $.billing.processWebhook({
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_new123',
            customer: 'cus_test123',
            status: 'active',
          },
        },
      })

      expect(handler).toHaveBeenCalled()
    })

    it('should handle customer.subscription.updated event', async () => {
      const $ = createStripeContext()
      const handler = vi.fn()

      $.billing.onWebhook('customer.subscription.updated', handler)

      await $.billing.processWebhook({
        type: 'customer.subscription.updated',
        data: {
          object: { id: 'sub_test123', status: 'active' },
          previous_attributes: { status: 'trialing' },
        },
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sub_test123' }),
        expect.objectContaining({ previousStatus: 'trialing' })
      )
    })

    it('should handle customer.subscription.deleted event', async () => {
      const $ = createStripeContext()
      const handler = vi.fn()

      $.billing.onWebhook('customer.subscription.deleted', handler)

      await $.billing.processWebhook({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'canceled',
          },
        },
      })

      expect(handler).toHaveBeenCalled()
    })

    it('should handle checkout.session.completed event', async () => {
      const $ = createStripeContext()
      const handler = vi.fn()

      $.billing.onWebhook('checkout.session.completed', handler)

      await $.billing.processWebhook({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test123',
            customer: 'cus_test123',
            subscription: 'sub_new123',
            mode: 'subscription',
          },
        },
      })

      expect(handler).toHaveBeenCalled()
    })

    it('should verify webhook signature', async () => {
      const $ = createStripeContext()

      const payload = JSON.stringify({ type: 'invoice.paid', data: {} })
      const signature = 't=1704067200,v1=valid_signature'

      const isValid = await $.billing.verifyWebhookSignature({
        payload,
        signature,
        secret: 'whsec_test123',
      })

      expect(isValid).toBeDefined()
    })

    it('should reject invalid webhook signatures', async () => {
      const $ = createStripeContext()

      const payload = JSON.stringify({ type: 'invoice.paid', data: {} })
      const invalidSignature = 't=1704067200,v1=invalid'

      await expect(
        $.billing.verifyWebhookSignature({
          payload,
          signature: invalidSignature,
          secret: 'whsec_test123',
        })
      ).rejects.toThrow('Invalid webhook signature')
    })
  })

  describe('MRR (Monthly Recurring Revenue) Calculation', () => {
    it('should calculate MRR from active subscriptions', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { id: 'sub_1', items: { data: [{ price: { unit_amount: 2900 } }] } },
              { id: 'sub_2', items: { data: [{ price: { unit_amount: 2900 } }] } },
              { id: 'sub_3', items: { data: [{ price: { unit_amount: 9900 } }] } },
            ],
          }),
      })
      $.setFetch(mockFetch)

      const mrr = await $.billing.calculateMRR()

      // $29 + $29 + $99 = $157 = 15700 cents
      expect(mrr).toBe(15700)
    })

    it('should normalize annual subscriptions to monthly for MRR', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'sub_annual',
                items: {
                  data: [{ price: { unit_amount: 29000, recurring: { interval: 'year' } } }],
                },
              },
            ],
          }),
      })
      $.setFetch(mockFetch)

      const mrr = await $.billing.calculateMRR()

      // $290/year = $24.17/month = 2417 cents (rounded)
      expect(mrr).toBeCloseTo(2417, -1)
    })

    it('should exclude canceled subscriptions from MRR', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'sub_active',
                status: 'active',
                items: { data: [{ price: { unit_amount: 2900 } }] },
              },
              {
                id: 'sub_canceled',
                status: 'canceled',
                items: { data: [{ price: { unit_amount: 2900 } }] },
              },
            ],
          }),
      })
      $.setFetch(mockFetch)

      const mrr = await $.billing.calculateMRR()

      expect(mrr).toBe(2900) // Only active subscription
    })

    it('should include trialing subscriptions in MRR', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'sub_trialing',
                status: 'trialing',
                items: { data: [{ price: { unit_amount: 2900 } }] },
              },
            ],
          }),
      })
      $.setFetch(mockFetch)

      const mrr = await $.billing.calculateMRR()

      expect(mrr).toBe(2900)
    })

    it('should handle subscriptions with quantity > 1', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'sub_team',
                items: { data: [{ price: { unit_amount: 1000 }, quantity: 5 }] },
              },
            ],
          }),
      })
      $.setFetch(mockFetch)

      const mrr = await $.billing.calculateMRR()

      // $10/seat * 5 seats = $50 = 5000 cents
      expect(mrr).toBe(5000)
    })
  })

  describe('ARR (Annual Recurring Revenue) Calculation', () => {
    it('should calculate ARR from MRR', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { id: 'sub_1', items: { data: [{ price: { unit_amount: 10000 } }] } }, // $100/mo
            ],
          }),
      })
      $.setFetch(mockFetch)

      const arr = await $.billing.calculateARR()

      // $100/mo * 12 = $1200 = 120000 cents
      expect(arr).toBe(120000)
    })

    it('should handle mixed monthly and annual subscriptions', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: 'sub_monthly',
                items: {
                  data: [{ price: { unit_amount: 2900, recurring: { interval: 'month' } } }],
                },
              },
              {
                id: 'sub_annual',
                items: {
                  data: [{ price: { unit_amount: 29000, recurring: { interval: 'year' } } }],
                },
              },
            ],
          }),
      })
      $.setFetch(mockFetch)

      const arr = await $.billing.calculateARR()

      // $29/mo * 12 + $290/year = $348 + $290 = $638 = 63800 cents
      expect(arr).toBe(63800)
    })
  })

  describe('Stripe Connect Revenue Share', () => {
    it('should create a connected account', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'acct_connect123',
            type: 'express',
            charges_enabled: false,
          }),
      })
      $.setFetch(mockFetch)

      const account = await $.billing.connect.createAccount({
        type: 'express',
        email: 'partner@example.com',
        country: 'US',
      })

      expect(account.id).toBe('acct_connect123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/accounts'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should generate account onboarding link', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            url: 'https://connect.stripe.com/setup/e/acct_connect123/abc123',
          }),
      })
      $.setFetch(mockFetch)

      const link = await $.billing.connect.createAccountLink({
        accountId: 'acct_connect123',
        refreshUrl: 'https://myapp.com/connect/refresh',
        returnUrl: 'https://myapp.com/connect/complete',
      })

      expect(link.url).toContain('connect.stripe.com')
    })

    it('should create a payment with application fee', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'pi_test123',
            amount: 10000,
            application_fee_amount: 1000,
            transfer_data: { destination: 'acct_connect123' },
          }),
      })
      $.setFetch(mockFetch)

      const payment = await $.billing.connect.createPaymentWithFee({
        amount: 10000, // $100
        applicationFee: 1000, // 10% = $10
        destinationAccount: 'acct_connect123',
        currency: 'usd',
      })

      expect(payment.applicationFeeAmount).toBe(1000)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('application_fee_amount'),
        })
      )
    })

    it('should split payment between platform and connected account', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'pi_test123',
            amount: 10000,
            transfer_data: {
              destination: 'acct_connect123',
              amount: 8000, // Connected account receives $80
            },
          }),
      })
      $.setFetch(mockFetch)

      const payment = await $.billing.connect.createSplitPayment({
        amount: 10000,
        platformShare: 2000, // Platform keeps $20
        destinationAccount: 'acct_connect123',
        currency: 'usd',
      })

      expect(payment.transferData.amount).toBe(8000)
    })

    it('should create transfer to connected account', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'tr_test123',
            amount: 5000,
            destination: 'acct_connect123',
          }),
      })
      $.setFetch(mockFetch)

      const transfer = await $.billing.connect.createTransfer({
        amount: 5000,
        destinationAccount: 'acct_connect123',
        currency: 'usd',
      })

      expect(transfer.id).toBe('tr_test123')
    })

    it('should retrieve connected account balance', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            available: [{ amount: 50000, currency: 'usd' }],
            pending: [{ amount: 10000, currency: 'usd' }],
          }),
      })
      $.setFetch(mockFetch)

      const balance = await $.billing.connect.getAccountBalance({
        accountId: 'acct_connect123',
      })

      expect(balance.available).toBe(50000)
      expect(balance.pending).toBe(10000)
    })

    it('should configure revenue share percentage', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      $.setFetch(mockFetch)

      await $.billing.connect.configureRevenueShare({
        accountId: 'acct_connect123',
        platformPercentage: 15, // Platform takes 15%
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('15'),
        })
      )
    })
  })

  describe('Complete Billing Metrics', () => {
    it('should return complete revenue metrics', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            mrr: 15700,
            arr: 188400,
            activeSubscriptions: 3,
            churnRate: 2.5,
            averageRevenuePerUser: 5233,
            lifetimeValue: 62800,
          }),
      })
      $.setFetch(mockFetch)

      const metrics = await $.billing.getMetrics()

      expect(metrics).toMatchObject({
        mrr: expect.any(Number),
        arr: expect.any(Number),
        activeSubscriptions: expect.any(Number),
        churnRate: expect.any(Number),
      })
    })

    it('should calculate churn rate', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            canceledThisMonth: 2,
            activeAtStartOfMonth: 100,
          }),
      })
      $.setFetch(mockFetch)

      const churnRate = await $.billing.calculateChurnRate()

      // 2/100 = 2%
      expect(churnRate).toBe(2)
    })

    it('should track revenue by plan', async () => {
      const $ = createStripeContext()
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            byPlan: {
              free: { mrr: 0, subscribers: 50 },
              pro: { mrr: 14500, subscribers: 5 },
              enterprise: { mrr: 29700, subscribers: 3 },
            },
          }),
      })
      $.setFetch(mockFetch)

      const revenueByPlan = await $.billing.getRevenueByPlan()

      expect(revenueByPlan.pro.mrr).toBe(14500)
      expect(revenueByPlan.enterprise.subscribers).toBe(3)
    })
  })
})
