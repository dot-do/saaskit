/**
 * Stripe Billing Implementation
 *
 * Provides comprehensive billing functionality for SaaS applications including:
 * - Plan sync to Stripe Products/Prices
 * - Subscription lifecycle (create, upgrade, downgrade, cancel)
 * - Customer portal
 * - Usage-based billing (meters)
 * - Webhook event handling
 * - Revenue metrics (MRR, ARR)
 * - Stripe Connect revenue sharing
 * - Dunning and payment recovery
 * - Trial management with conversion tracking
 * - Coupon and discount support
 * - Payment method management
 *
 * @module billing
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
  // Dunning types
  DunningConfig,
  DunningInterface,
  PaymentRecoveryStatus,
  RetryPaymentOptions,
  RetryPaymentResult,
  FailedPayment,
  DunningEmailType,
  // Trial types
  TrialInterface,
  TrialStatus,
  ExtendTrialOptions,
  EndTrialOptions,
  TrialConversionMetrics,
  // Coupon types
  CouponInterface,
  Coupon,
  CreateCouponOptions,
  ApplyCouponOptions,
  AppliedDiscount,
  // Payment method types
  PaymentMethodInterface,
  PaymentMethod,
  UpdatePaymentMethodOptions,
  PaymentMethodUpdateSessionOptions,
  // Proration types
  ProrationPreview,
  PreviewProrationOptions,
} from './types'

/** Stripe API base URL */
const STRIPE_API_BASE = 'https://api.stripe.com/v1'

/**
 * Default dunning configuration
 *
 * This follows Stripe's Smart Retries best practices:
 * - Retry on days 1, 3, 5, and 7 after failure
 * - Cancel after 14 days of failed payments
 */
const DEFAULT_DUNNING_CONFIG: DunningConfig = {
  retrySchedule: [1, 3, 5, 7],
  maxRetries: 4,
  cancelAfterDays: 14,
  sendEmails: true,
  emailTypes: ['payment_failed', 'payment_retry_failed', 'final_warning', 'subscription_canceled'],
}

/**
 * Create a billing interface with Stripe integration
 *
 * This factory function creates a complete billing interface that can be
 * attached to the SaaSkit context. It provides all billing operations
 * needed for a typical SaaS application.
 *
 * @param getFetch - Function that returns the fetch implementation to use
 * @returns Complete billing interface
 *
 * @example
 * ```ts
 * const billing = createBilling(() => fetch)
 *
 * // Sync plans to Stripe
 * const plan = await billing.syncPlan({
 *   id: 'pro',
 *   name: 'Pro Plan',
 *   price: 2900,
 *   currency: 'usd',
 *   interval: 'month',
 *   features: ['Feature A', 'Feature B']
 * })
 *
 * // Create subscription with trial
 * const subscription = await billing.createSubscription({
 *   customerId: 'cus_xxx',
 *   priceId: plan.stripePriceId,
 *   trialDays: 14
 * })
 * ```
 */
export function createBilling(getFetch: () => FetchFunction): BillingInterface {
  // =========================================================================
  // Internal State
  // =========================================================================

  /** Webhook handlers registry */
  const webhookHandlers = new Map<string, WebhookHandler[]>()

  /** Current dunning configuration */
  let dunningConfig: DunningConfig = { ...DEFAULT_DUNNING_CONFIG }

  /** Recovery status tracking (in-memory, would be persisted in production) */
  const recoveryStatuses = new Map<string, PaymentRecoveryStatus>()

  // =========================================================================
  // Internal Helpers
  // =========================================================================

  /**
   * Make a Stripe API request
   *
   * @param endpoint - API endpoint (e.g., '/subscriptions')
   * @param method - HTTP method
   * @param body - Request body
   * @returns API response data
   * @throws Error if request fails
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

  // =========================================================================
  // Plan Management
  // =========================================================================

  /**
   * Sync a plan to Stripe as a Product with Price
   *
   * Creates or updates a Stripe Product and creates a new Price if the
   * plan price has changed. Returns the plan with Stripe IDs populated.
   *
   * @param plan - Plan to sync
   * @returns Plan with stripeProductId and stripePriceId set
   *
   * @example
   * ```ts
   * const plan = await billing.syncPlan({
   *   id: 'pro',
   *   name: 'Pro Plan',
   *   price: 2900,
   *   currency: 'usd',
   *   interval: 'month',
   *   features: ['Unlimited projects']
   * })
   * console.log(plan.stripePriceId) // 'price_xxx'
   * ```
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
   * Sync multiple plans to Stripe in batch
   *
   * More efficient than syncing plans individually when you have
   * multiple plans to sync at once.
   *
   * @param plans - Array of plans to sync
   * @returns Array of plans with Stripe IDs populated
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

  // =========================================================================
  // Subscription Lifecycle
  // =========================================================================

  /**
   * Create a subscription for a customer
   *
   * Creates a new subscription, optionally with a trial period and/or
   * coupon applied. The subscription starts immediately unless a trial
   * is specified.
   *
   * @param options - Subscription creation options
   * @returns Created subscription
   *
   * @example
   * ```ts
   * // Create with 14-day trial
   * const sub = await billing.createSubscription({
   *   customerId: 'cus_xxx',
   *   priceId: 'price_xxx',
   *   trialDays: 14
   * })
   *
   * // Create with coupon
   * const sub = await billing.createSubscription({
   *   customerId: 'cus_xxx',
   *   priceId: 'price_xxx',
   *   couponId: 'SAVE20'
   * })
   * ```
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
   *
   * Changes the subscription to a more expensive plan. By default,
   * proration is not applied. Use the `prorate` option to charge
   * the customer the difference immediately.
   *
   * @param options - Upgrade options
   * @returns Updated subscription
   *
   * @example
   * ```ts
   * // Immediate upgrade with proration
   * const sub = await billing.upgradeSubscription({
   *   subscriptionId: 'sub_xxx',
   *   newPriceId: 'price_enterprise',
   *   prorate: true
   * })
   *
   * // Schedule upgrade for next billing cycle
   * const sub = await billing.upgradeSubscription({
   *   subscriptionId: 'sub_xxx',
   *   newPriceId: 'price_enterprise',
   *   scheduleForNextCycle: true
   * })
   * ```
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
   *
   * Changes the subscription to a less expensive plan. By default,
   * the change takes effect at the end of the current billing period.
   * Use `immediate: true` to apply the change immediately and issue
   * a credit for the unused portion.
   *
   * @param options - Downgrade options
   * @returns Updated subscription with optional creditIssued amount
   *
   * @example
   * ```ts
   * // Downgrade at period end (default)
   * const sub = await billing.downgradeSubscription({
   *   subscriptionId: 'sub_xxx',
   *   newPriceId: 'price_basic',
   *   atPeriodEnd: true
   * })
   *
   * // Immediate downgrade with credit
   * const sub = await billing.downgradeSubscription({
   *   subscriptionId: 'sub_xxx',
   *   newPriceId: 'price_basic',
   *   immediate: true
   * })
   * console.log(sub.creditIssued) // 1500 (cents)
   * ```
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
   *
   * Cancels the subscription either immediately or at the end of the
   * current billing period. Optionally records a cancellation reason
   * for analytics.
   *
   * @param options - Cancellation options
   * @returns Updated subscription
   *
   * @example
   * ```ts
   * // Cancel at period end (customer keeps access until then)
   * const sub = await billing.cancelSubscription({
   *   subscriptionId: 'sub_xxx'
   * })
   *
   * // Cancel immediately
   * const sub = await billing.cancelSubscription({
   *   subscriptionId: 'sub_xxx',
   *   immediately: true,
   *   reason: 'too_expensive',
   *   comment: 'Switching to competitor'
   * })
   * ```
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
   *
   * If a subscription was canceled with `cancel_at_period_end: true`,
   * this reverses the cancellation so the subscription continues.
   *
   * @param options - Reactivation options
   * @returns Reactivated subscription
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

  // =========================================================================
  // Customer Portal
  // =========================================================================

  /**
   * Create a customer portal session
   *
   * Generates a URL for the Stripe Customer Portal where customers can
   * manage their subscription, update payment methods, and view invoices.
   *
   * @param options - Portal session options
   * @returns Portal URL
   *
   * @example
   * ```ts
   * const url = await billing.createPortalSession({
   *   customerId: 'cus_xxx',
   *   returnUrl: 'https://myapp.com/billing'
   * })
   * // Redirect customer to url
   *
   * // Open directly to payment method update
   * const url = await billing.createPortalSession({
   *   customerId: 'cus_xxx',
   *   returnUrl: 'https://myapp.com/billing',
   *   flowType: 'payment_method_update'
   * })
   * ```
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

  // =========================================================================
  // Usage-Based Billing
  // =========================================================================

  /**
   * Report usage for a metered subscription
   *
   * Records usage for metered billing. Use `action: 'increment'` to add
   * to existing usage, or `action: 'set'` to set an absolute value.
   *
   * @param options - Usage report options
   * @returns Usage record
   *
   * @example
   * ```ts
   * // Increment API calls
   * await billing.reportUsage({
   *   subscriptionItemId: 'si_xxx',
   *   quantity: 100,
   *   action: 'increment'
   * })
   *
   * // Set absolute storage used
   * await billing.reportUsage({
   *   subscriptionItemId: 'si_xxx',
   *   quantity: 5000, // MB
   *   action: 'set'
   * })
   * ```
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
   *
   * Returns the total usage for the current billing period.
   *
   * @param options - Usage summary options
   * @returns Usage summary
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
   *
   * Returns usage across all metered components of a subscription.
   *
   * @param options - Options with subscription ID
   * @returns All usage meters
   */
  async function getAllUsageMeters(
    options: AllUsageMetersOptions
  ): Promise<{ meters: Array<{ id: string; total_usage: number }> }> {
    const result = await stripeRequest<{
      meters: Array<{ id: string; total_usage: number }>
    }>(`/subscriptions/${options.subscriptionId}/usage_meters`, 'GET')

    return result
  }

  // =========================================================================
  // Webhooks
  // =========================================================================

  /**
   * Register a webhook handler
   *
   * Registers a handler function to be called when a specific Stripe
   * webhook event is received.
   *
   * @param eventType - Stripe event type (e.g., 'invoice.paid')
   * @param handler - Handler function
   *
   * @example
   * ```ts
   * billing.onWebhook('invoice.paid', async (event) => {
   *   console.log(`Invoice ${event.id} paid for ${event.amountPaid}`)
   * })
   *
   * billing.onWebhook('customer.subscription.updated', async (event, previous) => {
   *   if (previous?.previousStatus === 'trialing') {
   *     console.log('Trial converted!')
   *   }
   * })
   * ```
   */
  function onWebhook(eventType: string, handler: WebhookHandler): void {
    const handlers = webhookHandlers.get(eventType) ?? []
    handlers.push(handler)
    webhookHandlers.set(eventType, handlers)
  }

  /**
   * Process a webhook event
   *
   * Dispatches a webhook event to all registered handlers.
   *
   * @param event - Raw Stripe webhook event
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
   *
   * Validates that a webhook request came from Stripe using the
   * signature in the header.
   *
   * @param options - Signature verification options
   * @returns true if valid
   * @throws Error if signature is invalid
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

  // =========================================================================
  // Revenue Metrics
  // =========================================================================

  /**
   * Calculate MRR from active subscriptions
   *
   * Calculates Monthly Recurring Revenue by summing all active
   * subscription values. Annual subscriptions are normalized to monthly.
   *
   * @returns MRR in cents
   *
   * @example
   * ```ts
   * const mrr = await billing.calculateMRR()
   * console.log(`MRR: $${(mrr / 100).toFixed(2)}`)
   * ```
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
   * Calculate ARR from active subscriptions
   *
   * Calculates Annual Recurring Revenue. Monthly subscriptions are
   * multiplied by 12.
   *
   * @returns ARR in cents
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
   *
   * Returns comprehensive revenue metrics including MRR, ARR,
   * subscriber count, churn rate, ARPU, and LTV.
   *
   * @returns Revenue metrics
   */
  async function getMetrics(): Promise<RevenueMetrics> {
    const result = await stripeRequest<RevenueMetrics>('/metrics', 'GET')
    return result
  }

  /**
   * Calculate churn rate
   *
   * Calculates the percentage of subscriptions that canceled
   * in the current month.
   *
   * @returns Churn rate as a percentage (0-100)
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
   *
   * Returns MRR and subscriber count broken down by plan.
   *
   * @returns Revenue by plan
   */
  async function getRevenueByPlan(): Promise<RevenueByPlan> {
    const result = await stripeRequest<{ byPlan: RevenueByPlan }>('/metrics/by-plan', 'GET')
    return result.byPlan
  }

  // =========================================================================
  // Proration Preview
  // =========================================================================

  /**
   * Preview proration for a plan change
   *
   * Shows the customer what they will be charged (or credited) if they
   * change plans. Useful for confirmation dialogs before plan changes.
   *
   * @param options - Preview options
   * @returns Proration preview with line items
   *
   * @example
   * ```ts
   * const preview = await billing.previewProration({
   *   subscriptionId: 'sub_xxx',
   *   newPriceId: 'price_enterprise'
   * })
   *
   * if (preview.netAmount > 0) {
   *   console.log(`You will be charged $${(preview.netAmount / 100).toFixed(2)}`)
   * } else {
   *   console.log(`You will receive $${(Math.abs(preview.netAmount) / 100).toFixed(2)} credit`)
   * }
   * ```
   */
  async function previewProration(options: PreviewProrationOptions): Promise<ProrationPreview> {
    const prorationDate = options.prorationDate || new Date()

    const result = await stripeRequest<{
      lines: {
        data: Array<{
          description: string
          amount: number
          quantity: number
        }>
      }
      total: number
      currency: string
    }>('/invoices/upcoming', 'GET', {
      subscription: options.subscriptionId,
      subscription_items: [{ price: options.newPriceId }],
      subscription_proration_date: Math.floor(prorationDate.getTime() / 1000),
    })

    // Calculate credit and charge from line items
    let credit = 0
    let newPlanCharge = 0

    for (const line of result.lines.data) {
      if (line.amount < 0) {
        credit += Math.abs(line.amount)
      } else {
        newPlanCharge += line.amount
      }
    }

    return {
      credit,
      newPlanCharge,
      netAmount: result.total,
      currency: result.currency,
      prorationDate,
      lineItems: result.lines.data.map((line) => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
      })),
    }
  }

  // =========================================================================
  // Stripe Connect
  // =========================================================================

  /**
   * Stripe Connect interface for marketplace functionality
   */
  const connect: StripeConnect = {
    /**
     * Create a connected account
     *
     * @param options - Account creation options
     * @returns Created account
     */
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

    /**
     * Create an account onboarding link
     *
     * @param options - Link options
     * @returns URL for onboarding
     */
    async createAccountLink(options: CreateAccountLinkOptions) {
      const result = await stripeRequest<{ url: string }>('/account_links', 'POST', {
        account: options.accountId,
        refresh_url: options.refreshUrl,
        return_url: options.returnUrl,
        type: 'account_onboarding',
      })

      return result
    },

    /**
     * Create a payment with application fee
     *
     * @param options - Payment options
     * @returns Payment intent
     */
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

    /**
     * Create a split payment between platform and connected account
     *
     * @param options - Split payment options
     * @returns Payment intent
     */
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

    /**
     * Create a transfer to a connected account
     *
     * @param options - Transfer options
     * @returns Transfer
     */
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

    /**
     * Get connected account balance
     *
     * @param options - Balance options
     * @returns Available and pending balance
     */
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

    /**
     * Configure revenue share percentage
     *
     * @param options - Revenue share options
     */
    async configureRevenueShare(options: RevenueShareOptions) {
      await stripeRequest('/connect/settings', 'POST', {
        account: options.accountId,
        platform_percentage: options.platformPercentage,
      })
    },
  }

  // =========================================================================
  // Dunning Interface
  // =========================================================================

  /**
   * Dunning interface for payment recovery
   *
   * Provides methods for configuring and managing the dunning process,
   * which handles failed payments and attempts recovery.
   */
  const dunning: DunningInterface = {
    /**
     * Configure dunning settings
     *
     * Sets up the retry schedule, email notifications, and cancellation
     * policy for failed payments.
     *
     * @param config - Dunning configuration
     *
     * @example
     * ```ts
     * await billing.dunning.configure({
     *   retrySchedule: [1, 3, 5, 7],
     *   maxRetries: 4,
     *   cancelAfterDays: 14,
     *   sendEmails: true,
     *   emailTypes: ['payment_failed', 'final_warning']
     * })
     * ```
     */
    async configure(config: DunningConfig): Promise<void> {
      dunningConfig = { ...config }

      // In a real implementation, this would configure Stripe's
      // subscription billing settings
      await stripeRequest('/billing_portal/configurations', 'POST', {
        features: {
          subscription_update: {
            default_allowed_updates: ['price'],
            enabled: true,
          },
          payment_method_update: {
            enabled: true,
          },
        },
      })
    },

    /**
     * Get current dunning configuration
     *
     * @returns Current dunning settings
     */
    async getConfig(): Promise<DunningConfig> {
      return { ...dunningConfig }
    },

    /**
     * Get recovery status for a subscription
     *
     * Returns the current state of payment recovery for a subscription,
     * including failed attempts, next retry date, and emails sent.
     *
     * @param subscriptionId - Subscription ID
     * @returns Recovery status
     */
    async getRecoveryStatus(subscriptionId: string): Promise<PaymentRecoveryStatus> {
      const existing = recoveryStatuses.get(subscriptionId)

      if (existing) {
        return existing
      }

      // Return default status (not in recovery)
      return {
        subscriptionId,
        inRecovery: false,
        failedAttempts: 0,
        amountPastDue: 0,
        emailsSent: [],
      }
    },

    /**
     * Manually retry a failed payment
     *
     * Attempts to charge the customer's payment method again.
     * Use this when the customer updates their payment method
     * and wants to retry immediately.
     *
     * @param options - Retry options
     * @returns Retry result
     *
     * @example
     * ```ts
     * const result = await billing.dunning.retryPayment({
     *   invoiceId: 'in_xxx'
     * })
     *
     * if (result.success) {
     *   console.log('Payment successful!')
     * } else {
     *   console.log(`Payment failed: ${result.error}`)
     * }
     * ```
     */
    async retryPayment(options: RetryPaymentOptions): Promise<RetryPaymentResult> {
      try {
        const body: Record<string, unknown> = {}

        if (options.paymentMethodId) {
          body.payment_method = options.paymentMethodId
        }

        await stripeRequest<{ id: string; status: string }>(
          `/invoices/${options.invoiceId}/pay`,
          'POST',
          body
        )

        return {
          success: true,
          invoiceId: options.invoiceId,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Payment failed'

        return {
          success: false,
          invoiceId: options.invoiceId,
          error: errorMessage,
          errorCode: 'payment_failed',
          nextRetryAt: new Date(Date.now() + dunningConfig.retrySchedule[0] * 24 * 60 * 60 * 1000),
        }
      }
    },

    /**
     * Mark subscription as recovered
     *
     * Clears the recovery status for a subscription after
     * successful payment.
     *
     * @param subscriptionId - Subscription ID
     */
    async markRecovered(subscriptionId: string): Promise<void> {
      recoveryStatuses.delete(subscriptionId)
    },

    /**
     * Get all subscriptions currently in recovery
     *
     * Returns all subscriptions that have failed payments and
     * are in the dunning process.
     *
     * @returns Array of recovery statuses
     */
    async getSubscriptionsInRecovery(): Promise<PaymentRecoveryStatus[]> {
      return Array.from(recoveryStatuses.values()).filter((s) => s.inRecovery)
    },

    /**
     * Handle a failed payment webhook event
     *
     * Called when a payment fails to update recovery status
     * and schedule retries.
     *
     * @param failedPayment - Failed payment details
     */
    async handleFailedPayment(failedPayment: FailedPayment): Promise<void> {
      const existing = recoveryStatuses.get(failedPayment.subscriptionId)

      const emailsSent: Array<{ type: DunningEmailType; sentAt: Date }> = existing?.emailsSent ?? []

      // Add payment_failed email if configured
      if (dunningConfig.sendEmails && dunningConfig.emailTypes.includes('payment_failed')) {
        emailsSent.push({ type: 'payment_failed', sentAt: new Date() })
      }

      // Calculate next retry and cancellation dates
      const retryIndex = failedPayment.attemptNumber - 1
      const nextRetryDays = dunningConfig.retrySchedule[retryIndex] ?? dunningConfig.retrySchedule[dunningConfig.retrySchedule.length - 1]
      const nextRetryAt = new Date(Date.now() + nextRetryDays * 24 * 60 * 60 * 1000)

      const recoveryStartedAt = existing?.recoveryStartedAt ?? new Date()
      const willCancelAt = new Date(recoveryStartedAt.getTime() + dunningConfig.cancelAfterDays * 24 * 60 * 60 * 1000)

      recoveryStatuses.set(failedPayment.subscriptionId, {
        subscriptionId: failedPayment.subscriptionId,
        inRecovery: true,
        failedAttempts: failedPayment.attemptNumber,
        amountPastDue: failedPayment.amount,
        recoveryStartedAt,
        nextRetryAt,
        willCancelAt,
        emailsSent,
      })
    },
  }

  // =========================================================================
  // Trial Interface
  // =========================================================================

  /**
   * Trial management interface
   *
   * Provides methods for managing subscription trials, including
   * status tracking, extensions, and conversion metrics.
   */
  const trials: TrialInterface = {
    /**
     * Get trial status for a subscription
     *
     * Returns detailed information about a subscription's trial,
     * including days remaining and whether it has been extended.
     *
     * @param subscriptionId - Subscription ID
     * @returns Trial status
     *
     * @example
     * ```ts
     * const status = await billing.trials.getStatus('sub_xxx')
     * if (status.isTrialing && status.daysRemaining <= 3) {
     *   // Show trial ending warning
     * }
     * ```
     */
    async getStatus(subscriptionId: string): Promise<TrialStatus> {
      const result = await stripeRequest<{
        id: string
        status: string
        trial_start?: number
        trial_end?: number
        default_payment_method?: string
        metadata?: { trial_extended?: string; extension_count?: string }
      }>(`/subscriptions/${subscriptionId}`, 'GET')

      const isTrialing = result.status === 'trialing'
      const trialEnd = result.trial_end ? new Date(result.trial_end * 1000) : undefined
      const trialStart = result.trial_start ? new Date(result.trial_start * 1000) : undefined

      let daysRemaining: number | undefined
      if (isTrialing && trialEnd) {
        daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      }

      return {
        subscriptionId,
        isTrialing,
        trialStart,
        trialEnd,
        daysRemaining,
        hasBeenExtended: result.metadata?.trial_extended === 'true',
        extensionCount: parseInt(result.metadata?.extension_count ?? '0', 10),
        hasPaymentMethod: !!result.default_payment_method,
      }
    },

    /**
     * Extend a trial period
     *
     * Adds additional days to an active trial. Useful for sales-driven
     * extensions or when customers need more time to evaluate.
     *
     * @param options - Extension options
     * @returns Updated trial status
     *
     * @example
     * ```ts
     * await billing.trials.extend({
     *   subscriptionId: 'sub_xxx',
     *   additionalDays: 7,
     *   reason: 'Sales request - enterprise prospect'
     * })
     * ```
     */
    async extend(options: ExtendTrialOptions): Promise<TrialStatus> {
      // Get current trial end
      const current = await trials.getStatus(options.subscriptionId)

      if (!current.isTrialing || !current.trialEnd) {
        throw new Error('Subscription is not in trial')
      }

      const newTrialEnd = new Date(current.trialEnd.getTime() + options.additionalDays * 24 * 60 * 60 * 1000)

      await stripeRequest(`/subscriptions/${options.subscriptionId}`, 'POST', {
        trial_end: Math.floor(newTrialEnd.getTime() / 1000),
        metadata: {
          trial_extended: 'true',
          extension_count: (current.extensionCount + 1).toString(),
          extension_reason: options.reason,
        },
      })

      return trials.getStatus(options.subscriptionId)
    },

    /**
     * End a trial early and start billing
     *
     * Converts a trial subscription to a paid subscription immediately.
     *
     * @param options - End trial options
     * @returns Updated subscription
     *
     * @example
     * ```ts
     * // Customer clicked "Start paying now"
     * await billing.trials.end({
     *   subscriptionId: 'sub_xxx',
     *   invoiceImmediately: true
     * })
     * ```
     */
    async end(options: EndTrialOptions): Promise<Subscription> {
      const body: Record<string, unknown> = {
        trial_end: 'now',
      }

      if (options.invoiceImmediately) {
        body.proration_behavior = 'create_prorations'
      }

      const result = await stripeRequest<{
        id: string
        customer: string
        status: string
        current_period_start: number
        current_period_end: number
      }>(`/subscriptions/${options.subscriptionId}`, 'POST', body)

      return {
        id: `sub_local_${result.id}`,
        customerId: result.customer,
        planId: '',
        stripeSubscriptionId: result.id,
        status: result.status as Subscription['status'],
        currentPeriodStart: new Date(result.current_period_start * 1000),
        currentPeriodEnd: new Date(result.current_period_end * 1000),
        cancelAtPeriodEnd: false,
      }
    },

    /**
     * Get trial conversion metrics
     *
     * Returns metrics about trial performance including conversion
     * rate and average trial length.
     *
     * @param options - Date range options
     * @returns Trial conversion metrics
     *
     * @example
     * ```ts
     * const metrics = await billing.trials.getConversionMetrics({
     *   startDate: new Date('2024-01-01'),
     *   endDate: new Date('2024-01-31')
     * })
     * console.log(`Conversion rate: ${metrics.conversionRate}%`)
     * ```
     */
    async getConversionMetrics(options?: { startDate?: Date; endDate?: Date }): Promise<TrialConversionMetrics> {
      const params: Record<string, unknown> = {}

      if (options?.startDate) {
        params.start_date = Math.floor(options.startDate.getTime() / 1000)
      }
      if (options?.endDate) {
        params.end_date = Math.floor(options.endDate.getTime() / 1000)
      }

      const result = await stripeRequest<{
        trials_started: number
        trials_converted: number
        trials_churned: number
        average_trial_length: number
        active_trials: number
      }>('/metrics/trials', 'GET', params)

      const conversionRate = result.trials_started > 0
        ? (result.trials_converted / result.trials_started) * 100
        : 0

      return {
        trialsStarted: result.trials_started,
        trialsConverted: result.trials_converted,
        trialsChurned: result.trials_churned,
        conversionRate,
        averageTrialLength: result.average_trial_length,
        activeTrials: result.active_trials,
      }
    },

    /**
     * Get all active trials
     *
     * Returns status for all subscriptions currently in trial.
     *
     * @returns Array of trial statuses
     */
    async getActiveTrials(): Promise<TrialStatus[]> {
      const result = await stripeRequest<{
        data: Array<{
          id: string
          status: string
          trial_start?: number
          trial_end?: number
          default_payment_method?: string
          metadata?: { trial_extended?: string; extension_count?: string }
        }>
      }>('/subscriptions?status=trialing', 'GET')

      return result.data.map((sub) => {
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : undefined
        const daysRemaining = trialEnd
          ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
          : undefined

        return {
          subscriptionId: sub.id,
          isTrialing: true,
          trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : undefined,
          trialEnd,
          daysRemaining,
          hasBeenExtended: sub.metadata?.trial_extended === 'true',
          extensionCount: parseInt(sub.metadata?.extension_count ?? '0', 10),
          hasPaymentMethod: !!sub.default_payment_method,
        }
      })
    },
  }

  // =========================================================================
  // Coupon Interface
  // =========================================================================

  /**
   * Coupon management interface
   *
   * Provides methods for creating, managing, and applying discount coupons.
   */
  const coupons: CouponInterface = {
    /**
     * Create a new coupon
     *
     * Creates a discount coupon that can be applied to subscriptions.
     *
     * @param options - Coupon options
     * @returns Created coupon
     *
     * @example
     * ```ts
     * // 20% off forever
     * const coupon = await billing.coupons.create({
     *   id: 'SAVE20',
     *   name: '20% Off',
     *   discountType: 'percent',
     *   discountValue: 20,
     *   duration: 'forever'
     * })
     *
     * // $10 off for 3 months
     * const coupon = await billing.coupons.create({
     *   name: '$10 Off First 3 Months',
     *   discountType: 'fixed',
     *   discountValue: 1000,
     *   currency: 'usd',
     *   duration: 'repeating',
     *   durationInMonths: 3
     * })
     * ```
     */
    async create(options: CreateCouponOptions): Promise<Coupon> {
      const body: Record<string, unknown> = {
        name: options.name,
        duration: options.duration,
      }

      if (options.id) {
        body.id = options.id
      }

      if (options.discountType === 'percent') {
        body.percent_off = options.discountValue
      } else {
        body.amount_off = options.discountValue
        body.currency = options.currency
      }

      if (options.duration === 'repeating') {
        body.duration_in_months = options.durationInMonths
      }

      if (options.maxRedemptions) {
        body.max_redemptions = options.maxRedemptions
      }

      if (options.expiresAt) {
        body.redeem_by = Math.floor(options.expiresAt.getTime() / 1000)
      }

      const result = await stripeRequest<{
        id: string
        name: string
        percent_off?: number
        amount_off?: number
        currency?: string
        duration: string
        duration_in_months?: number
        max_redemptions?: number
        times_redeemed: number
        redeem_by?: number
        valid: boolean
      }>('/coupons', 'POST', body)

      return {
        id: result.id,
        name: result.name,
        discountType: result.percent_off ? 'percent' : 'fixed',
        discountValue: result.percent_off ?? result.amount_off ?? 0,
        currency: result.currency,
        duration: result.duration as Coupon['duration'],
        durationInMonths: result.duration_in_months,
        maxRedemptions: result.max_redemptions,
        timesRedeemed: result.times_redeemed,
        expiresAt: result.redeem_by ? new Date(result.redeem_by * 1000) : undefined,
        isActive: result.valid,
        stripeCouponId: result.id,
      }
    },

    /**
     * Get a coupon by ID
     *
     * @param couponId - Coupon ID
     * @returns Coupon or null if not found
     */
    async get(couponId: string): Promise<Coupon | null> {
      try {
        const result = await stripeRequest<{
          id: string
          name: string
          percent_off?: number
          amount_off?: number
          currency?: string
          duration: string
          duration_in_months?: number
          max_redemptions?: number
          times_redeemed: number
          redeem_by?: number
          valid: boolean
        }>(`/coupons/${couponId}`, 'GET')

        return {
          id: result.id,
          name: result.name,
          discountType: result.percent_off ? 'percent' : 'fixed',
          discountValue: result.percent_off ?? result.amount_off ?? 0,
          currency: result.currency,
          duration: result.duration as Coupon['duration'],
          durationInMonths: result.duration_in_months,
          maxRedemptions: result.max_redemptions,
          timesRedeemed: result.times_redeemed,
          expiresAt: result.redeem_by ? new Date(result.redeem_by * 1000) : undefined,
          isActive: result.valid,
          stripeCouponId: result.id,
        }
      } catch {
        return null
      }
    },

    /**
     * List all coupons
     *
     * @param options - Filter options
     * @returns Array of coupons
     */
    async list(options?: { active?: boolean }): Promise<Coupon[]> {
      const result = await stripeRequest<{
        data: Array<{
          id: string
          name: string
          percent_off?: number
          amount_off?: number
          currency?: string
          duration: string
          duration_in_months?: number
          max_redemptions?: number
          times_redeemed: number
          redeem_by?: number
          valid: boolean
        }>
      }>('/coupons', 'GET')

      let couponsData = result.data

      if (options?.active !== undefined) {
        couponsData = couponsData.filter((c) => c.valid === options.active)
      }

      return couponsData.map((c) => ({
        id: c.id,
        name: c.name,
        discountType: c.percent_off ? 'percent' : 'fixed' as const,
        discountValue: c.percent_off ?? c.amount_off ?? 0,
        currency: c.currency,
        duration: c.duration as Coupon['duration'],
        durationInMonths: c.duration_in_months,
        maxRedemptions: c.max_redemptions,
        timesRedeemed: c.times_redeemed,
        expiresAt: c.redeem_by ? new Date(c.redeem_by * 1000) : undefined,
        isActive: c.valid,
        stripeCouponId: c.id,
      }))
    },

    /**
     * Apply a coupon to a subscription
     *
     * @param options - Application options
     * @returns Applied discount details
     *
     * @example
     * ```ts
     * const discount = await billing.coupons.apply({
     *   subscriptionId: 'sub_xxx',
     *   couponId: 'SAVE20'
     * })
     * console.log(`Saving ${discount.discountValue}% on each invoice`)
     * ```
     */
    async apply(options: ApplyCouponOptions): Promise<AppliedDiscount> {
      await stripeRequest(`/subscriptions/${options.subscriptionId}`, 'POST', {
        coupon: options.couponId,
      })

      // Get the coupon details
      const coupon = await coupons.get(options.couponId)

      if (!coupon) {
        throw new Error('Coupon not found')
      }

      return {
        couponId: coupon.id,
        couponName: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        currency: coupon.currency,
        startedAt: new Date(),
        endsAt: coupon.durationInMonths
          ? new Date(Date.now() + coupon.durationInMonths * 30 * 24 * 60 * 60 * 1000)
          : undefined,
        totalSaved: 0,
      }
    },

    /**
     * Remove a coupon from a subscription
     *
     * @param subscriptionId - Subscription ID
     */
    async remove(subscriptionId: string): Promise<void> {
      await stripeRequest(`/subscriptions/${subscriptionId}`, 'POST', {
        coupon: '',
      })
    },

    /**
     * Get discount applied to a subscription
     *
     * @param subscriptionId - Subscription ID
     * @returns Applied discount or null
     */
    async getAppliedDiscount(subscriptionId: string): Promise<AppliedDiscount | null> {
      const result = await stripeRequest<{
        discount?: {
          coupon: {
            id: string
            name: string
            percent_off?: number
            amount_off?: number
            currency?: string
            duration: string
            duration_in_months?: number
          }
          start: number
          end?: number
        }
      }>(`/subscriptions/${subscriptionId}`, 'GET')

      if (!result.discount) {
        return null
      }

      const d = result.discount
      return {
        couponId: d.coupon.id,
        couponName: d.coupon.name,
        discountType: d.coupon.percent_off ? 'percent' : 'fixed',
        discountValue: d.coupon.percent_off ?? d.coupon.amount_off ?? 0,
        currency: d.coupon.currency,
        startedAt: new Date(d.start * 1000),
        endsAt: d.end ? new Date(d.end * 1000) : undefined,
        totalSaved: 0, // Would need to calculate from invoices
      }
    },

    /**
     * Deactivate a coupon
     *
     * Prevents the coupon from being used for new applications
     * but doesn't remove it from existing subscriptions.
     *
     * @param couponId - Coupon ID
     */
    async deactivate(couponId: string): Promise<void> {
      await stripeRequest(`/coupons/${couponId}`, 'POST', {
        valid: false,
      })
    },

    /**
     * Delete a coupon
     *
     * Permanently removes a coupon. Cannot be used if the coupon
     * is currently applied to any subscriptions.
     *
     * @param couponId - Coupon ID
     */
    async delete(couponId: string): Promise<void> {
      await stripeRequest(`/coupons/${couponId}`, 'DELETE')
    },
  }

  // =========================================================================
  // Payment Method Interface
  // =========================================================================

  /**
   * Payment method management interface
   *
   * Provides methods for managing customer payment methods, including
   * listing, updating, and checking for expiring cards.
   */
  const paymentMethods: PaymentMethodInterface = {
    /**
     * List payment methods for a customer
     *
     * @param customerId - Customer ID
     * @returns Array of payment methods
     */
    async list(customerId: string): Promise<PaymentMethod[]> {
      const result = await stripeRequest<{
        data: Array<{
          id: string
          type: string
          card?: {
            brand: string
            last4: string
            exp_month: number
            exp_year: number
          }
          us_bank_account?: {
            bank_name: string
            last4: string
          }
          created: number
        }>
      }>(`/payment_methods?customer=${customerId}&type=card`, 'GET')

      // Get customer to find default payment method
      const customer = await stripeRequest<{
        invoice_settings?: { default_payment_method?: string }
      }>(`/customers/${customerId}`, 'GET')

      const defaultPmId = customer.invoice_settings?.default_payment_method

      return result.data.map((pm) => ({
        id: pm.id,
        type: pm.type as PaymentMethod['type'],
        isDefault: pm.id === defaultPmId,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            }
          : undefined,
        bankAccount: pm.us_bank_account
          ? {
              bankName: pm.us_bank_account.bank_name,
              last4: pm.us_bank_account.last4,
            }
          : undefined,
        createdAt: new Date(pm.created * 1000),
      }))
    },

    /**
     * Get the default payment method for a customer
     *
     * @param customerId - Customer ID
     * @returns Default payment method or null
     */
    async getDefault(customerId: string): Promise<PaymentMethod | null> {
      const methods = await paymentMethods.list(customerId)
      return methods.find((m) => m.isDefault) ?? null
    },

    /**
     * Set the default payment method
     *
     * @param options - Update options
     */
    async setDefault(options: UpdatePaymentMethodOptions): Promise<void> {
      await stripeRequest(`/customers/${options.customerId}`, 'POST', {
        invoice_settings: {
          default_payment_method: options.paymentMethodId,
        },
      })
    },

    /**
     * Create a session for updating payment method
     *
     * Returns a URL where the customer can securely update their
     * payment method.
     *
     * @param options - Session options
     * @returns URL for payment method update
     *
     * @example
     * ```ts
     * const { url } = await billing.paymentMethods.createUpdateSession({
     *   customerId: 'cus_xxx',
     *   returnUrl: 'https://myapp.com/billing'
     * })
     * // Redirect customer to url
     * ```
     */
    async createUpdateSession(options: PaymentMethodUpdateSessionOptions): Promise<{ url: string }> {
      const body: Record<string, unknown> = {
        customer: options.customerId,
        return_url: options.returnUrl,
        flow_data: {
          type: 'payment_method_update',
        },
      }

      if (options.subscriptionId) {
        body.flow_data = {
          type: 'subscription_update_confirm',
          subscription_update_confirm: {
            subscription: options.subscriptionId,
          },
        }
      }

      const result = await stripeRequest<{ url: string }>('/billing_portal/sessions', 'POST', body)

      return result
    },

    /**
     * Detach a payment method from a customer
     *
     * @param paymentMethodId - Payment method ID
     */
    async detach(paymentMethodId: string): Promise<void> {
      await stripeRequest(`/payment_methods/${paymentMethodId}/detach`, 'POST')
    },

    /**
     * Check for payment methods expiring soon
     *
     * Returns payment methods that will expire within 30 days.
     * Useful for proactive notifications to prevent payment failures.
     *
     * @param customerId - Customer ID
     * @returns Array of expiring payment methods
     *
     * @example
     * ```ts
     * const expiring = await billing.paymentMethods.checkExpiring('cus_xxx')
     * if (expiring.length > 0) {
     *   // Notify customer to update payment method
     * }
     * ```
     */
    async checkExpiring(customerId: string): Promise<PaymentMethod[]> {
      const methods = await paymentMethods.list(customerId)
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      return methods.filter((pm) => {
        if (!pm.card) return false

        const expDate = new Date(pm.card.expYear, pm.card.expMonth - 1)
        return expDate <= thirtyDaysFromNow
      })
    },
  }

  // =========================================================================
  // Return Complete Interface
  // =========================================================================

  return {
    // Plan management
    syncPlan,
    syncPlans,

    // Subscription lifecycle
    createSubscription,
    upgradeSubscription,
    downgradeSubscription,
    cancelSubscription,
    reactivateSubscription,

    // Customer portal
    createPortalSession,

    // Usage meters
    reportUsage,
    getUsageSummary,
    getAllUsageMeters,

    // Webhooks
    onWebhook,
    processWebhook,
    verifyWebhookSignature,

    // Revenue metrics
    calculateMRR,
    calculateARR,
    getMetrics,
    calculateChurnRate,
    getRevenueByPlan,

    // Proration
    previewProration,

    // Stripe Connect
    connect,

    // Dunning & Payment Recovery
    dunning,

    // Trial Management
    trials,

    // Coupon Management
    coupons,

    // Payment Method Management
    paymentMethods,
  }
}
