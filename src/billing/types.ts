/**
 * Stripe Billing Types
 *
 * This module provides comprehensive type definitions for Stripe billing integration,
 * including subscription management, dunning/payment recovery, trial management,
 * coupons/discounts, and revenue metrics.
 */

/**
 * Plan definition for SaaSkit
 *
 * Represents a pricing plan that can be synced to Stripe as a Product with Price.
 *
 * @example
 * ```ts
 * const proPlan: Plan = {
 *   id: 'pro',
 *   name: 'Pro Plan',
 *   price: 2900, // $29.00 in cents
 *   currency: 'usd',
 *   interval: 'month',
 *   features: ['Unlimited projects', '10GB storage'],
 *   limits: { projects: -1, storage: 10737418240 }
 * }
 * ```
 */
export interface Plan {
  /** Unique identifier for the plan */
  id: string
  /** Display name for the plan */
  name: string
  /** Optional description shown to customers */
  description?: string
  /** Price in cents (e.g., 2900 = $29.00) */
  price: number
  /** Three-letter ISO currency code */
  currency: string
  /** Billing interval */
  interval: 'month' | 'year'
  /** List of features included in this plan */
  features: string[]
  /** Resource limits for this plan (use -1 for unlimited) */
  limits?: Record<string, number>
  /** Stripe Product ID (set after sync) */
  stripeProductId?: string
  /** Stripe Price ID (set after sync) */
  stripePriceId?: string
  /** Trial period in days for this plan */
  trialDays?: number
}

/**
 * Subscription entity
 *
 * Represents a customer's subscription to a plan. Includes status tracking
 * for active subscriptions, trials, and payment failures.
 */
export interface Subscription {
  /** Local subscription ID */
  id: string
  /** Stripe Customer ID */
  customerId: string
  /** Plan/Price ID this subscription is for */
  planId: string
  /** Stripe Subscription ID */
  stripeSubscriptionId: string
  /** Current subscription status */
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired'
  /** Start of current billing period */
  currentPeriodStart: Date
  /** End of current billing period */
  currentPeriodEnd: Date
  /** Whether subscription will cancel at period end */
  cancelAtPeriodEnd: boolean
  /** When trial period ends (if trialing) */
  trialEnd?: Date
  /** Credit issued from proration (in cents) */
  creditIssued?: number
  /** Number of failed payment attempts */
  failedPaymentAttempts?: number
  /** Date of last failed payment attempt */
  lastPaymentFailedAt?: Date
  /** Default payment method ID */
  defaultPaymentMethod?: string
}

/**
 * Create subscription options
 */
export interface CreateSubscriptionOptions {
  customerId: string
  priceId: string
  trialDays?: number
  couponId?: string
}

/**
 * Upgrade subscription options
 */
export interface UpgradeSubscriptionOptions {
  subscriptionId: string
  newPriceId: string
  prorate?: boolean
  scheduleForNextCycle?: boolean
}

/**
 * Downgrade subscription options
 */
export interface DowngradeSubscriptionOptions {
  subscriptionId: string
  newPriceId: string
  atPeriodEnd?: boolean
  immediate?: boolean
}

/**
 * Cancel subscription options
 */
export interface CancelSubscriptionOptions {
  subscriptionId: string
  immediately?: boolean
  reason?: string
  comment?: string
}

/**
 * Reactivate subscription options
 */
export interface ReactivateSubscriptionOptions {
  subscriptionId: string
}

/**
 * Portal session options
 */
export interface PortalSessionOptions {
  customerId: string
  returnUrl: string
  configurationId?: string
  flowType?: string
}

/**
 * Usage report options
 */
export interface UsageReportOptions {
  subscriptionItemId: string
  quantity: number
  action?: 'increment' | 'set'
  timestamp?: number
}

/**
 * Usage summary options
 */
export interface UsageSummaryOptions {
  subscriptionItemId: string
}

/**
 * Usage summary result
 */
export interface UsageSummary {
  totalUsage: number
  period?: {
    start: number
    end: number
  }
}

/**
 * All usage meters options
 */
export interface AllUsageMetersOptions {
  subscriptionId: string
}

/**
 * Webhook signature verification options
 */
export interface WebhookSignatureOptions {
  payload: string
  signature: string
  secret: string
}

/**
 * Revenue metrics
 */
export interface RevenueMetrics {
  mrr: number
  arr: number
  activeSubscriptions: number
  churnRate: number
  averageRevenuePerUser?: number
  lifetimeValue?: number
}

/**
 * Revenue by plan
 */
export interface RevenueByPlan {
  [planId: string]: {
    mrr: number
    subscribers: number
  }
}

/**
 * Stripe Connect account creation options
 */
export interface CreateConnectAccountOptions {
  type: 'express' | 'standard' | 'custom'
  email: string
  country: string
}

/**
 * Stripe Connect account link options
 */
export interface CreateAccountLinkOptions {
  accountId: string
  refreshUrl: string
  returnUrl: string
}

/**
 * Payment with fee options
 */
export interface CreatePaymentWithFeeOptions {
  amount: number
  applicationFee: number
  destinationAccount: string
  currency: string
}

/**
 * Split payment options
 */
export interface SplitPaymentOptions {
  amount: number
  platformShare: number
  destinationAccount: string
  currency: string
}

/**
 * Transfer options
 */
export interface TransferOptions {
  amount: number
  destinationAccount: string
  currency: string
}

/**
 * Account balance options
 */
export interface AccountBalanceOptions {
  accountId: string
}

/**
 * Revenue share configuration options
 */
export interface RevenueShareOptions {
  accountId: string
  platformPercentage: number
}

/**
 * Stripe Connect interface
 */
export interface StripeConnect {
  createAccount: (options: CreateConnectAccountOptions) => Promise<{ id: string; type: string; charges_enabled: boolean }>
  createAccountLink: (options: CreateAccountLinkOptions) => Promise<{ url: string }>
  createPaymentWithFee: (options: CreatePaymentWithFeeOptions) => Promise<{ id: string; applicationFeeAmount: number }>
  createSplitPayment: (options: SplitPaymentOptions) => Promise<{ id: string; transferData: { amount: number } }>
  createTransfer: (options: TransferOptions) => Promise<{ id: string; amount: number }>
  getAccountBalance: (options: AccountBalanceOptions) => Promise<{ available: number; pending: number }>
  configureRevenueShare: (options: RevenueShareOptions) => Promise<void>
}

/**
 * Webhook handler function type
 */
export type WebhookHandler = (event: Record<string, unknown>, previousAttributes?: Record<string, unknown>) => void | Promise<void>

// ============================================================================
// DUNNING & PAYMENT RECOVERY TYPES
// ============================================================================

/**
 * Dunning email types sent during payment recovery
 */
export type DunningEmailType =
  | 'payment_failed'
  | 'payment_retry_scheduled'
  | 'payment_retry_failed'
  | 'payment_method_expiring'
  | 'final_warning'
  | 'subscription_canceled'

/**
 * Dunning configuration for automatic payment recovery
 *
 * Configures the retry schedule and email notifications for failed payments.
 *
 * @example
 * ```ts
 * const dunningConfig: DunningConfig = {
 *   retrySchedule: [1, 3, 5, 7], // days after initial failure
 *   maxRetries: 4,
 *   cancelAfterDays: 14,
 *   sendEmails: true,
 *   emailTypes: ['payment_failed', 'payment_retry_failed', 'final_warning']
 * }
 * ```
 */
export interface DunningConfig {
  /** Days after initial failure to retry (e.g., [1, 3, 5, 7]) */
  retrySchedule: number[]
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Days after which to cancel subscription if payment fails */
  cancelAfterDays: number
  /** Whether to send dunning emails */
  sendEmails: boolean
  /** Which email types to send */
  emailTypes: DunningEmailType[]
}

/**
 * Failed payment event with recovery context
 */
export interface FailedPayment {
  /** Invoice ID */
  invoiceId: string
  /** Subscription ID */
  subscriptionId: string
  /** Customer ID */
  customerId: string
  /** Amount that failed to charge (in cents) */
  amount: number
  /** Currency code */
  currency: string
  /** Number of attempt (1 = first attempt) */
  attemptNumber: number
  /** Error code from payment processor */
  errorCode?: string
  /** Human-readable error message */
  errorMessage?: string
  /** Next retry date (if scheduled) */
  nextRetryDate?: Date
  /** Whether this is the final attempt before cancellation */
  isFinalAttempt: boolean
}

/**
 * Payment recovery status for a subscription
 */
export interface PaymentRecoveryStatus {
  /** Subscription ID */
  subscriptionId: string
  /** Whether subscription is in recovery mode */
  inRecovery: boolean
  /** Number of failed attempts */
  failedAttempts: number
  /** Total amount past due (in cents) */
  amountPastDue: number
  /** Date recovery started */
  recoveryStartedAt?: Date
  /** Next scheduled retry */
  nextRetryAt?: Date
  /** Date subscription will be canceled if not recovered */
  willCancelAt?: Date
  /** Recovery emails sent */
  emailsSent: Array<{ type: DunningEmailType; sentAt: Date }>
}

/**
 * Options for retrying a failed payment
 */
export interface RetryPaymentOptions {
  /** Invoice ID to retry */
  invoiceId: string
  /** Payment method ID to use (optional, uses default if not specified) */
  paymentMethodId?: string
}

/**
 * Result of a payment retry attempt
 */
export interface RetryPaymentResult {
  /** Whether payment succeeded */
  success: boolean
  /** Invoice ID */
  invoiceId: string
  /** Error message if failed */
  error?: string
  /** Error code if failed */
  errorCode?: string
  /** Next retry date if scheduled */
  nextRetryAt?: Date
}

// ============================================================================
// PAYMENT METHOD TYPES
// ============================================================================

/**
 * Payment method information
 */
export interface PaymentMethod {
  /** Stripe Payment Method ID */
  id: string
  /** Type of payment method */
  type: 'card' | 'bank_account' | 'sepa_debit' | 'us_bank_account'
  /** Whether this is the default payment method */
  isDefault: boolean
  /** Card details (if type is 'card') */
  card?: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  /** Bank account details (if applicable) */
  bankAccount?: {
    bankName: string
    last4: string
  }
  /** Date created */
  createdAt: Date
}

/**
 * Options for updating the default payment method
 */
export interface UpdatePaymentMethodOptions {
  /** Customer ID */
  customerId: string
  /** New payment method ID to set as default */
  paymentMethodId: string
}

/**
 * Options for creating a payment method update session
 */
export interface PaymentMethodUpdateSessionOptions {
  /** Customer ID */
  customerId: string
  /** URL to return to after update */
  returnUrl: string
  /** Subscription ID (optional, to update payment method for specific subscription) */
  subscriptionId?: string
}

// ============================================================================
// PRORATION TYPES
// ============================================================================

/**
 * Proration preview showing costs of a plan change
 */
export interface ProrationPreview {
  /** Credit for unused time on current plan (positive number in cents) */
  credit: number
  /** Charge for new plan prorated to end of billing period (in cents) */
  newPlanCharge: number
  /** Net amount due (positive = charge, negative = credit) */
  netAmount: number
  /** Currency code */
  currency: string
  /** Date proration was calculated for */
  prorationDate: Date
  /** Line items breakdown */
  lineItems: Array<{
    description: string
    amount: number
    quantity: number
  }>
}

/**
 * Options for previewing proration
 */
export interface PreviewProrationOptions {
  /** Subscription ID */
  subscriptionId: string
  /** New price ID to change to */
  newPriceId: string
  /** Date to calculate proration for (defaults to now) */
  prorationDate?: Date
}

// ============================================================================
// TRIAL MANAGEMENT TYPES
// ============================================================================

/**
 * Trial status and conversion tracking
 */
export interface TrialStatus {
  /** Subscription ID */
  subscriptionId: string
  /** Whether currently in trial */
  isTrialing: boolean
  /** Trial start date */
  trialStart?: Date
  /** Trial end date */
  trialEnd?: Date
  /** Days remaining in trial */
  daysRemaining?: number
  /** Whether trial has been extended */
  hasBeenExtended: boolean
  /** Number of times trial was extended */
  extensionCount: number
  /** Whether card is on file */
  hasPaymentMethod: boolean
}

/**
 * Options for extending a trial
 */
export interface ExtendTrialOptions {
  /** Subscription ID */
  subscriptionId: string
  /** Number of additional days */
  additionalDays: number
  /** Reason for extension */
  reason?: string
}

/**
 * Options for ending a trial early
 */
export interface EndTrialOptions {
  /** Subscription ID */
  subscriptionId: string
  /** Whether to invoice immediately or wait for period end */
  invoiceImmediately?: boolean
}

/**
 * Trial conversion metrics
 */
export interface TrialConversionMetrics {
  /** Total trials started in period */
  trialsStarted: number
  /** Trials converted to paid */
  trialsConverted: number
  /** Trials that churned (expired without converting) */
  trialsChurned: number
  /** Conversion rate (0-100) */
  conversionRate: number
  /** Average trial length in days */
  averageTrialLength: number
  /** Trials currently active */
  activeTrials: number
}

// ============================================================================
// COUPON & DISCOUNT TYPES
// ============================================================================

/**
 * Coupon definition
 */
export interface Coupon {
  /** Coupon ID */
  id: string
  /** Display name */
  name: string
  /** Discount type */
  discountType: 'percent' | 'fixed'
  /** Discount value (percentage 0-100 or amount in cents) */
  discountValue: number
  /** Currency for fixed amount discounts */
  currency?: string
  /** Duration of discount */
  duration: 'once' | 'repeating' | 'forever'
  /** Number of months for repeating duration */
  durationInMonths?: number
  /** Maximum redemptions allowed */
  maxRedemptions?: number
  /** Current number of redemptions */
  timesRedeemed: number
  /** Expiration date */
  expiresAt?: Date
  /** Whether coupon is active */
  isActive: boolean
  /** Stripe Coupon ID */
  stripeCouponId?: string
}

/**
 * Options for creating a coupon
 */
export interface CreateCouponOptions {
  /** Coupon ID (optional, generated if not provided) */
  id?: string
  /** Display name */
  name: string
  /** Discount type */
  discountType: 'percent' | 'fixed'
  /** Discount value */
  discountValue: number
  /** Currency for fixed discounts */
  currency?: string
  /** Duration of discount */
  duration: 'once' | 'repeating' | 'forever'
  /** Months for repeating duration */
  durationInMonths?: number
  /** Maximum redemptions */
  maxRedemptions?: number
  /** Expiration date */
  expiresAt?: Date
}

/**
 * Options for applying a coupon to a subscription
 */
export interface ApplyCouponOptions {
  /** Subscription ID */
  subscriptionId: string
  /** Coupon ID to apply */
  couponId: string
}

/**
 * Discount applied to a subscription
 */
export interface AppliedDiscount {
  /** Coupon ID */
  couponId: string
  /** Coupon name */
  couponName: string
  /** Discount type */
  discountType: 'percent' | 'fixed'
  /** Discount value */
  discountValue: number
  /** Currency (for fixed discounts) */
  currency?: string
  /** When discount started */
  startedAt: Date
  /** When discount ends (for repeating/once) */
  endsAt?: Date
  /** Amount saved so far (in cents) */
  totalSaved: number
}

// ============================================================================
// DUNNING INTERFACE
// ============================================================================

/**
 * Dunning management interface for payment recovery
 *
 * Provides methods for configuring and managing the dunning process,
 * including retry schedules, email notifications, and recovery status.
 */
export interface DunningInterface {
  /**
   * Configure dunning settings
   */
  configure: (config: DunningConfig) => Promise<void>

  /**
   * Get current dunning configuration
   */
  getConfig: () => Promise<DunningConfig>

  /**
   * Get recovery status for a subscription
   */
  getRecoveryStatus: (subscriptionId: string) => Promise<PaymentRecoveryStatus>

  /**
   * Manually retry a failed payment
   */
  retryPayment: (options: RetryPaymentOptions) => Promise<RetryPaymentResult>

  /**
   * Mark subscription as recovered (payment successful)
   */
  markRecovered: (subscriptionId: string) => Promise<void>

  /**
   * Get all subscriptions in recovery
   */
  getSubscriptionsInRecovery: () => Promise<PaymentRecoveryStatus[]>

  /**
   * Handle a failed payment webhook event
   */
  handleFailedPayment: (failedPayment: FailedPayment) => Promise<void>
}

// ============================================================================
// TRIAL INTERFACE
// ============================================================================

/**
 * Trial management interface
 *
 * Provides methods for managing subscription trials including
 * status tracking, extensions, and conversion metrics.
 */
export interface TrialInterface {
  /**
   * Get trial status for a subscription
   */
  getStatus: (subscriptionId: string) => Promise<TrialStatus>

  /**
   * Extend a trial period
   */
  extend: (options: ExtendTrialOptions) => Promise<TrialStatus>

  /**
   * End a trial early and start billing
   */
  end: (options: EndTrialOptions) => Promise<Subscription>

  /**
   * Get trial conversion metrics
   */
  getConversionMetrics: (options?: { startDate?: Date; endDate?: Date }) => Promise<TrialConversionMetrics>

  /**
   * Get all active trials
   */
  getActiveTrials: () => Promise<TrialStatus[]>
}

// ============================================================================
// COUPON INTERFACE
// ============================================================================

/**
 * Coupon management interface
 *
 * Provides methods for creating and managing discount coupons.
 */
export interface CouponInterface {
  /**
   * Create a new coupon
   */
  create: (options: CreateCouponOptions) => Promise<Coupon>

  /**
   * Get a coupon by ID
   */
  get: (couponId: string) => Promise<Coupon | null>

  /**
   * List all coupons
   */
  list: (options?: { active?: boolean }) => Promise<Coupon[]>

  /**
   * Apply a coupon to a subscription
   */
  apply: (options: ApplyCouponOptions) => Promise<AppliedDiscount>

  /**
   * Remove a coupon from a subscription
   */
  remove: (subscriptionId: string) => Promise<void>

  /**
   * Get discount applied to a subscription
   */
  getAppliedDiscount: (subscriptionId: string) => Promise<AppliedDiscount | null>

  /**
   * Deactivate a coupon
   */
  deactivate: (couponId: string) => Promise<void>

  /**
   * Delete a coupon
   */
  delete: (couponId: string) => Promise<void>
}

// ============================================================================
// PAYMENT METHOD INTERFACE
// ============================================================================

/**
 * Payment method management interface
 */
export interface PaymentMethodInterface {
  /**
   * List payment methods for a customer
   */
  list: (customerId: string) => Promise<PaymentMethod[]>

  /**
   * Get the default payment method for a customer
   */
  getDefault: (customerId: string) => Promise<PaymentMethod | null>

  /**
   * Set the default payment method
   */
  setDefault: (options: UpdatePaymentMethodOptions) => Promise<void>

  /**
   * Create a session for updating payment method
   */
  createUpdateSession: (options: PaymentMethodUpdateSessionOptions) => Promise<{ url: string }>

  /**
   * Detach a payment method from a customer
   */
  detach: (paymentMethodId: string) => Promise<void>

  /**
   * Check if a payment method is expiring soon (within 30 days)
   */
  checkExpiring: (customerId: string) => Promise<PaymentMethod[]>
}

/**
 * Billing interface available on context as $.billing
 *
 * Provides comprehensive billing functionality including subscription management,
 * payment recovery (dunning), trial management, coupons, and revenue metrics.
 */
export interface BillingInterface {
  // Plan management
  syncPlan: (plan: Plan) => Promise<Plan>
  syncPlans: (plans: Plan[]) => Promise<Plan[]>

  // Subscription lifecycle
  createSubscription: (options: CreateSubscriptionOptions) => Promise<Subscription>
  upgradeSubscription: (options: UpgradeSubscriptionOptions) => Promise<Subscription>
  downgradeSubscription: (options: DowngradeSubscriptionOptions) => Promise<Subscription & { creditIssued?: number }>
  cancelSubscription: (options: CancelSubscriptionOptions) => Promise<Subscription>
  reactivateSubscription: (options: ReactivateSubscriptionOptions) => Promise<Subscription>

  // Customer portal
  createPortalSession: (options: PortalSessionOptions) => Promise<string>

  // Usage meters
  reportUsage: (options: UsageReportOptions) => Promise<{ id: string; quantity: number }>
  getUsageSummary: (options: UsageSummaryOptions) => Promise<UsageSummary>
  getAllUsageMeters: (options: AllUsageMetersOptions) => Promise<{ meters: Array<{ id: string; total_usage: number }> }>

  // Webhooks
  onWebhook: (eventType: string, handler: WebhookHandler) => void
  processWebhook: (event: Record<string, unknown>) => Promise<void>
  verifyWebhookSignature: (options: WebhookSignatureOptions) => Promise<boolean>

  // Revenue metrics
  calculateMRR: () => Promise<number>
  calculateARR: () => Promise<number>
  getMetrics: () => Promise<RevenueMetrics>
  calculateChurnRate: () => Promise<number>
  getRevenueByPlan: () => Promise<RevenueByPlan>

  // Proration
  previewProration: (options: PreviewProrationOptions) => Promise<ProrationPreview>

  // Stripe Connect
  connect: StripeConnect

  // Dunning & Payment Recovery
  dunning: DunningInterface

  // Trial Management
  trials: TrialInterface

  // Coupon Management
  coupons: CouponInterface

  // Payment Method Management
  paymentMethods: PaymentMethodInterface
}
