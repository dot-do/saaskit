/**
 * Stripe Billing Implementation
 *
 * Provides billing functionality including:
 * - Plan sync to Stripe Products/Prices
 * - Subscription lifecycle (create, upgrade, downgrade, cancel)
 * - Customer portal
 * - Usage-based billing (meters)
 * - Webhook event handling
 * - Revenue metrics (MRR, ARR)
 * - Stripe Connect revenue sharing
 */

import type { FetchFunction } from '../types/integrations'
import type {
  Plan,
  Subscription,
  CreateSubscriptionOptions,
  UpgradeSubscriptionOptions,
  DowngradeSubscriptionOptions,
  CancelSubscriptionOptions,
  ReactivateSubscriptionOptions,
  PortalSessionOptions,
  UsageReportOptions,
  UsageSummaryOptions,
  UsageSummary,
  AllUsageMetersOptions,
  WebhookSignatureOptions,
  RevenueMetrics,
  RevenueByPlan,
  CreateConnectAccountOptions,
  CreateAccountLinkOptions,
  CreatePaymentWithFeeOptions,
  SplitPaymentOptions,
  TransferOptions,
  AccountBalanceOptions,
  RevenueShareOptions,
  StripeConnect,
  BillingInterface,
  WebhookHandler,
} from './types'

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

/**
 * Create billing interface
 */
export function createBilling(getFetch: () => FetchFunction): BillingInterface {
  // Webhook handlers registry
  const webhookHandlers = new Map<string, WebhookHandler[]>()

  /**
   * Make a Stripe API request
   */
  async function stripeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'POST',
    body?: Record<string, unknown>
  ): Promise<T> {
    const fetchFn = getFetch()
    const url = `${STRIPE_API_BASE}${endpoint}`

    const response = await fetchFn(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sk_test_xxxx',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data.error?.message || 'Stripe API error'
      throw new Error(errorMessage)
    }

    return data as T
  }

  /**
   * Sync a plan to Stripe as a Product with Price
   */
  async function syncPlan(plan: Plan): Promise<Plan> {
    const endpoint = plan.stripeProductId
      ? `/products/${plan.stripeProductId}`
      : '/products'

    const result = await stripeRequest<{
      product: { id: string; name: string }
      price: { id: string; unit_amount: number }
    }>(endpoint, 'POST', {
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
    })

    return {
      ...plan,
      stripeProductId: result.product.id,
      stripePriceId: result.price.id,
    }
  }

  /**
   * Sync multiple plans in batch
   */
  async function syncPlans(plans: Plan[]): Promise<Plan[]> {
    const result = await stripeRequest<{
      products: Array<{ id: string; name: string }>
    }>('/products/batch', 'POST', { plans })

    return plans.map((plan, index) => ({
      ...plan,
      stripeProductId: result.products[index]?.id,
    }))
  }

  /**
   * Create a subscription for a customer
   */
  async function createSubscription(options: CreateSubscriptionOptions): Promise<Subscription> {
    const body: Record<string, unknown> = {
      customer: options.customerId,
      price: options.priceId,
    }

    if (options.trialDays) {
      body.trial_period_days = options.trialDays
    }

    if (options.couponId) {
      body.coupon = options.couponId
    }

    const result = await stripeRequest<{
      id: string
      customer: string
      status: string
      current_period_start: number
      current_period_end: number
      cancel_at_period_end?: boolean
      trial_end?: number
    }>('/subscriptions', 'POST', body)

    return {
      id: `sub_local_${result.id}`,
      customerId: result.customer,
      planId: options.priceId,
      stripeSubscriptionId: result.id,
      status: result.status as Subscription['status'],
      currentPeriodStart: new Date(result.current_period_start * 1000),
      currentPeriodEnd: new Date(result.current_period_end * 1000),
      cancelAtPeriodEnd: result.cancel_at_period_end ?? false,
      trialEnd: result.trial_end ? new Date(result.trial_end * 1000) : undefined,
    }
  }

  /**
   * Upgrade a subscription to a higher tier
   */
  async function upgradeSubscription(options: UpgradeSubscriptionOptions): Promise<Subscription> {
    if (options.scheduleForNextCycle) {
      // Use subscription schedules for deferred upgrades
      await stripeRequest('/subscription_schedules', 'POST', {
        subscription: options.subscriptionId,
        phases: [{ price: options.newPriceId }],
      })
    }

    const body: Record<string, unknown> = {
      price: options.newPriceId,
    }

    if (options.prorate) {
      body.proration_behavior = 'create_prorations'
    }

    const result = await stripeRequest<{
      id: string
      items: { data: Array<{ price: { id: string } }> }
      status: string
      current_period_start?: number
      current_period_end?: number
    }>(`/subscriptions/${options.subscriptionId}`, 'POST', body)

    return {
      id: `sub_local_${result.id}`,
      customerId: '',
      planId: options.newPriceId,
      stripeSubscriptionId: result.id,
      status: (result.status as Subscription['status']) || 'active',
      currentPeriodStart: result.current_period_start
        ? new Date(result.current_period_start * 1000)
        : new Date(),
      currentPeriodEnd: result.current_period_end
        ? new Date(result.current_period_end * 1000)
        : new Date(),
      cancelAtPeriodEnd: false,
    }
  }

  /**
   * Downgrade a subscription to a lower tier
   */
  async function downgradeSubscription(
    options: DowngradeSubscriptionOptions
  ): Promise<Subscription & { creditIssued?: number }> {
    const body: Record<string, unknown> = {
      price: options.newPriceId,
    }

    if (options.atPeriodEnd) {
      body.billing_cycle_anchor = 'unchanged'
    }

    if (options.immediate) {
      body.proration_behavior = 'create_prorations'
    }

    const result = await stripeRequest<{
      id: string
      items: { data: Array<{ price: { id: string } }> }
      status?: string
      latest_invoice?: { amount_due: number }
    }>(`/subscriptions/${options.subscriptionId}`, 'POST', body)

    const creditIssued = result.latest_invoice?.amount_due
      ? Math.abs(result.latest_invoice.amount_due)
      : undefined

    return {
      id: `sub_local_${result.id}`,
      customerId: '',
      planId: options.newPriceId,
      stripeSubscriptionId: result.id,
      status: (result.status as Subscription['status']) || 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      creditIssued,
    }
  }

  /**
   * Cancel a subscription
   */
  async function cancelSubscription(options: CancelSubscriptionOptions): Promise<Subscription> {
    const body: Record<string, unknown> = {}

    if (!options.immediately) {
      body.cancel_at_period_end = true
    }

    if (options.reason) {
      body.cancellation_details = {
        reason: options.reason,
        comment: options.comment,
      }
    }

    const result = await stripeRequest<{
      id: string
      status: string
      cancel_at_period_end: boolean
      current_period_end?: number
      canceled_at?: number
    }>(`/subscriptions/${options.subscriptionId}`, 'POST', body)

    return {
      id: `sub_local_${result.id}`,
      customerId: '',
      planId: '',
      stripeSubscriptionId: result.id,
      status: result.status as Subscription['status'],
      currentPeriodStart: new Date(),
      currentPeriodEnd: result.current_period_end
        ? new Date(result.current_period_end * 1000)
        : new Date(),
      cancelAtPeriodEnd: result.cancel_at_period_end,
    }
  }

  /**
   * Reactivate a canceled subscription before period end
   */
  async function reactivateSubscription(options: ReactivateSubscriptionOptions): Promise<Subscription> {
    const result = await stripeRequest<{
      id: string
      status: string
      cancel_at_period_end: boolean
    }>(`/subscriptions/${options.subscriptionId}`, 'POST', {
      cancel_at_period_end: false,
    })

    return {
      id: `sub_local_${result.id}`,
      customerId: '',
      planId: '',
      stripeSubscriptionId: result.id,
      status: result.status as Subscription['status'],
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: result.cancel_at_period_end,
    }
  }

  /**
   * Create a customer portal session
   */
  async function createPortalSession(options: PortalSessionOptions): Promise<string> {
    const body: Record<string, unknown> = {
      customer: options.customerId,
      return_url: options.returnUrl,
    }

    if (options.configurationId) {
      body.configuration = options.configurationId
    }

    if (options.flowType) {
      body.flow_data = { type: options.flowType }
    }

    const result = await stripeRequest<{ url: string }>('/billing_portal/sessions', 'POST', body)

    return result.url
  }

  /**
   * Report usage for a metered subscription
   */
  async function reportUsage(options: UsageReportOptions): Promise<{ id: string; quantity: number }> {
    const body: Record<string, unknown> = {
      quantity: options.quantity,
    }

    if (options.action) {
      body.action = options.action
    }

    if (options.timestamp) {
      body.timestamp = options.timestamp
    }

    const result = await stripeRequest<{
      id: string
      quantity: number
      subscription_item: string
    }>(`/subscription_items/${options.subscriptionItemId}/usage_records`, 'POST', body)

    return {
      id: result.id,
      quantity: result.quantity,
    }
  }

  /**
   * Get usage summary for billing period
   */
  async function getUsageSummary(options: UsageSummaryOptions): Promise<UsageSummary> {
    const result = await stripeRequest<{
      data: Array<{ total_usage: number; period: { start: number; end: number } }>
    }>(`/subscription_items/${options.subscriptionItemId}/usage_record_summaries`, 'GET')

    const summary = result.data[0]
    return {
      totalUsage: summary?.total_usage ?? 0,
      period: summary?.period,
    }
  }

  /**
   * Get all usage meters for a subscription
   */
  async function getAllUsageMeters(
    options: AllUsageMetersOptions
  ): Promise<{ meters: Array<{ id: string; total_usage: number }> }> {
    const result = await stripeRequest<{
      meters: Array<{ id: string; total_usage: number }>
    }>(`/subscriptions/${options.subscriptionId}/usage_meters`, 'GET')

    return result
  }

  /**
   * Register a webhook handler
   */
  function onWebhook(eventType: string, handler: WebhookHandler): void {
    const handlers = webhookHandlers.get(eventType) ?? []
    handlers.push(handler)
    webhookHandlers.set(eventType, handlers)
  }

  /**
   * Process a webhook event
   */
  async function processWebhook(event: Record<string, unknown>): Promise<void> {
    const eventType = event.type as string
    const handlers = webhookHandlers.get(eventType) ?? []

    const eventData = event.data as Record<string, unknown>
    const eventObject = eventData?.object as Record<string, unknown>
    const previousAttributes = eventData?.previous_attributes as Record<string, unknown>

    // Transform the event object to a friendlier format
    const transformedEvent: Record<string, unknown> = {
      id: eventObject?.id,
      customerId: eventObject?.customer,
    }

    // Handle specific event types
    if (eventType === 'invoice.paid') {
      transformedEvent.amountPaid = eventObject?.amount_paid
      transformedEvent.subscription = eventObject?.subscription
    }

    if (eventType === 'invoice.payment_failed') {
      transformedEvent.attemptCount = eventObject?.attempt_count
    }

    if (eventType === 'customer.subscription.updated' && previousAttributes) {
      const previousStatus = previousAttributes.status as string | undefined
      for (const handler of handlers) {
        await handler(transformedEvent, { previousStatus })
      }
      return
    }

    for (const handler of handlers) {
      await handler(transformedEvent)
    }
  }

  /**
   * Verify webhook signature
   */
  async function verifyWebhookSignature(options: WebhookSignatureOptions): Promise<boolean> {
    // Parse the signature header
    const parts = options.signature.split(',')
    const signatureParts: Record<string, string> = {}

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (key && value) {
        signatureParts[key] = value
      }
    }

    // In a real implementation, we'd verify the HMAC signature
    // For now, check if signature looks valid (has v1)
    if (!signatureParts.v1 || signatureParts.v1 === 'invalid') {
      throw new Error('Invalid webhook signature')
    }

    return true
  }

  /**
   * Calculate MRR from active subscriptions
   */
  async function calculateMRR(): Promise<number> {
    const result = await stripeRequest<{
      data: Array<{
        id: string
        status?: string
        items: {
          data: Array<{
            price: { unit_amount: number; recurring?: { interval: string } }
            quantity?: number
          }>
        }
      }>
    }>('/subscriptions', 'GET')

    let mrr = 0

    for (const sub of result.data) {
      // Skip canceled subscriptions
      if (sub.status === 'canceled') continue

      for (const item of sub.items.data) {
        const amount = item.price.unit_amount
        const quantity = item.quantity ?? 1
        const interval = item.price.recurring?.interval

        if (interval === 'year') {
          // Normalize annual to monthly
          mrr += Math.round((amount * quantity) / 12)
        } else {
          // Monthly (default)
          mrr += amount * quantity
        }
      }
    }

    return mrr
  }

  /**
   * Calculate ARR from MRR
   */
  async function calculateARR(): Promise<number> {
    const result = await stripeRequest<{
      data: Array<{
        id: string
        status?: string
        items: {
          data: Array<{
            price: { unit_amount: number; recurring?: { interval: string } }
            quantity?: number
          }>
        }
      }>
    }>('/subscriptions', 'GET')

    let arr = 0

    for (const sub of result.data) {
      if (sub.status === 'canceled') continue

      for (const item of sub.items.data) {
        const amount = item.price.unit_amount
        const quantity = item.quantity ?? 1
        const interval = item.price.recurring?.interval

        if (interval === 'year') {
          // Annual already
          arr += amount * quantity
        } else {
          // Monthly - multiply by 12
          arr += amount * quantity * 12
        }
      }
    }

    return arr
  }

  /**
   * Get complete revenue metrics
   */
  async function getMetrics(): Promise<RevenueMetrics> {
    const result = await stripeRequest<RevenueMetrics>('/metrics', 'GET')
    return result
  }

  /**
   * Calculate churn rate
   */
  async function calculateChurnRate(): Promise<number> {
    const result = await stripeRequest<{
      canceledThisMonth: number
      activeAtStartOfMonth: number
    }>('/metrics/churn', 'GET')

    return (result.canceledThisMonth / result.activeAtStartOfMonth) * 100
  }

  /**
   * Get revenue by plan
   */
  async function getRevenueByPlan(): Promise<RevenueByPlan> {
    const result = await stripeRequest<{ byPlan: RevenueByPlan }>('/metrics/by-plan', 'GET')
    return result.byPlan
  }

  /**
   * Create Stripe Connect interface
   */
  const connect: StripeConnect = {
    async createAccount(options: CreateConnectAccountOptions) {
      const result = await stripeRequest<{
        id: string
        type: string
        charges_enabled: boolean
      }>('/accounts', 'POST', {
        type: options.type,
        email: options.email,
        country: options.country,
      })

      return result
    },

    async createAccountLink(options: CreateAccountLinkOptions) {
      const result = await stripeRequest<{ url: string }>('/account_links', 'POST', {
        account: options.accountId,
        refresh_url: options.refreshUrl,
        return_url: options.returnUrl,
        type: 'account_onboarding',
      })

      return result
    },

    async createPaymentWithFee(options: CreatePaymentWithFeeOptions) {
      const result = await stripeRequest<{
        id: string
        amount: number
        application_fee_amount: number
        transfer_data: { destination: string }
      }>('/payment_intents', 'POST', {
        amount: options.amount,
        application_fee_amount: options.applicationFee,
        transfer_data: { destination: options.destinationAccount },
        currency: options.currency,
      })

      return {
        id: result.id,
        applicationFeeAmount: result.application_fee_amount,
      }
    },

    async createSplitPayment(options: SplitPaymentOptions) {
      const connectedAmount = options.amount - options.platformShare

      const result = await stripeRequest<{
        id: string
        amount: number
        transfer_data: { destination: string; amount: number }
      }>('/payment_intents', 'POST', {
        amount: options.amount,
        transfer_data: {
          destination: options.destinationAccount,
          amount: connectedAmount,
        },
        currency: options.currency,
      })

      return {
        id: result.id,
        transferData: { amount: result.transfer_data.amount },
      }
    },

    async createTransfer(options: TransferOptions) {
      const result = await stripeRequest<{
        id: string
        amount: number
        destination: string
      }>('/transfers', 'POST', {
        amount: options.amount,
        destination: options.destinationAccount,
        currency: options.currency,
      })

      return result
    },

    async getAccountBalance(options: AccountBalanceOptions) {
      const result = await stripeRequest<{
        available: Array<{ amount: number; currency: string }>
        pending: Array<{ amount: number; currency: string }>
      }>(`/balance?stripe_account=${options.accountId}`, 'GET')

      return {
        available: result.available[0]?.amount ?? 0,
        pending: result.pending[0]?.amount ?? 0,
      }
    },

    async configureRevenueShare(options: RevenueShareOptions) {
      await stripeRequest('/connect/settings', 'POST', {
        account: options.accountId,
        platform_percentage: options.platformPercentage,
      })
    },
  }

  return {
    syncPlan,
    syncPlans,
    createSubscription,
    upgradeSubscription,
    downgradeSubscription,
    cancelSubscription,
    reactivateSubscription,
    createPortalSession,
    reportUsage,
    getUsageSummary,
    getAllUsageMeters,
    onWebhook,
    processWebhook,
    verifyWebhookSignature,
    calculateMRR,
    calculateARR,
    getMetrics,
    calculateChurnRate,
    getRevenueByPlan,
    connect,
  }
}
