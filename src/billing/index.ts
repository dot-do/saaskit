/**
 * Billing module exports
 *
 * This module provides comprehensive Stripe billing integration including:
 * - Plan management and sync
 * - Subscription lifecycle (create, upgrade, downgrade, cancel)
 * - Dunning and payment recovery
 * - Trial management
 * - Coupon and discount support
 * - Usage-based billing
 * - Revenue metrics (MRR, ARR, churn)
 * - Stripe Connect for marketplaces
 */

export { createBilling } from './billing'

// Core types
export type {
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
  WebhookHandler,
  BillingInterface,
} from './types'

// Stripe Connect types
export type {
  CreateConnectAccountOptions,
  CreateAccountLinkOptions,
  CreatePaymentWithFeeOptions,
  SplitPaymentOptions,
  TransferOptions,
  AccountBalanceOptions,
  RevenueShareOptions,
  StripeConnect,
} from './types'

// Dunning & Payment Recovery types
export type {
  DunningEmailType,
  DunningConfig,
  FailedPayment,
  PaymentRecoveryStatus,
  RetryPaymentOptions,
  RetryPaymentResult,
  DunningInterface,
} from './types'

// Payment Method types
export type {
  PaymentMethod,
  UpdatePaymentMethodOptions,
  PaymentMethodUpdateSessionOptions,
  PaymentMethodInterface,
} from './types'

// Proration types
export type {
  ProrationPreview,
  PreviewProrationOptions,
} from './types'

// Trial Management types
export type {
  TrialStatus,
  ExtendTrialOptions,
  EndTrialOptions,
  TrialConversionMetrics,
  TrialInterface,
} from './types'

// Coupon & Discount types
export type {
  Coupon,
  CreateCouponOptions,
  ApplyCouponOptions,
  AppliedDiscount,
  CouponInterface,
} from './types'
