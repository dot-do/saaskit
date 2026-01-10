/**
 * Stripe Billing Types
 */

/**
 * Plan definition for SaaSkit
 */
export interface Plan {
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
export interface Subscription {
  id: string
  customerId: string
  planId: string
  stripeSubscriptionId: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
  creditIssued?: number
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

/**
 * Billing interface available on context as $.billing
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

  // Stripe Connect
  connect: StripeConnect
}
