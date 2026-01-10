import type { ReactNode } from 'react'

/**
 * Subscription entity
 */
export interface Subscription {
  id: string
  planId: string
  planName: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string
}

/**
 * Pricing plan entity
 */
export interface Plan {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  highlighted?: boolean
  limits?: Record<string, number>
}

/**
 * Invoice entity
 */
export interface Invoice {
  id: string
  number: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  amount: number
  currency: string
  paidAt?: string
  dueDate?: string
  pdfUrl?: string
  createdAt: string
}

/**
 * Payment method entity
 */
export interface PaymentMethod {
  id: string
  type: 'card' | 'bank_account' | 'paypal'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

/**
 * Usage record for metered billing
 */
export interface UsageRecord {
  metric: string
  used: number
  limit: number
  unit: string
}

/**
 * Props for the Billing page component
 */
export interface BillingPageProps {
  /**
   * Current subscription data
   */
  subscription?: Subscription

  /**
   * Available pricing plans
   */
  plans?: Plan[]

  /**
   * Invoice history
   */
  invoices?: Invoice[]

  /**
   * Payment methods on file
   */
  paymentMethods?: PaymentMethod[]

  /**
   * Current usage for metered features
   */
  usage?: UsageRecord[]

  /**
   * Callback to upgrade/downgrade plan
   */
  onChangePlan?: (planId: string) => Promise<void>

  /**
   * Callback to cancel subscription
   */
  onCancelSubscription?: () => Promise<void>

  /**
   * Callback to resume canceled subscription
   */
  onResumeSubscription?: () => Promise<void>

  /**
   * Callback to add payment method
   */
  onAddPaymentMethod?: () => Promise<void>

  /**
   * Callback to remove payment method
   */
  onRemovePaymentMethod?: (id: string) => Promise<void>

  /**
   * Callback to set default payment method
   */
  onSetDefaultPaymentMethod?: (id: string) => Promise<void>

  /**
   * Callback to download invoice PDF
   */
  onDownloadInvoice?: (id: string) => Promise<void>

  /**
   * Custom empty state component
   */
  emptyState?: ReactNode
}

/**
 * BillingPage - Billing and subscription management interface
 *
 * Provides a complete UI for managing billing in your SaaS app.
 *
 * ## Features
 *
 * - View current subscription status
 * - Upgrade/downgrade plans
 * - View and download invoices
 * - Manage payment methods
 * - View usage for metered features
 * - Cancel/resume subscription
 *
 * ## Integration
 *
 * Typically integrates with Stripe, Paddle, or similar billing providers.
 * The callbacks should connect to your billing backend.
 *
 * @example
 * ```tsx
 * <BillingPage
 *   subscription={subscription}
 *   plans={plans}
 *   invoices={invoices}
 *   paymentMethods={paymentMethods}
 *   onChangePlan={async (planId) => {
 *     await stripe.subscriptions.update(subscription.id, { plan: planId })
 *   }}
 * />
 * ```
 */
export function BillingPage({
  subscription,
  plans = [],
  invoices = [],
  paymentMethods = [],
  usage = [],
  onChangePlan,
  onCancelSubscription,
  onResumeSubscription,
  onAddPaymentMethod,
  onRemovePaymentMethod,
  onSetDefaultPaymentMethod,
  onDownloadInvoice,
  emptyState,
}: BillingPageProps): ReactNode {
  // TODO: Implement subscription status card
  // TODO: Implement plan comparison and upgrade UI
  // TODO: Implement invoice list with download
  // TODO: Implement payment method management
  // TODO: Implement usage meters
  // TODO: Implement cancel/resume subscription flow
  // TODO: Integrate with billing provider (Stripe, etc.)

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  return (
    <div data-page="billing">
      <header>
        <h1>Billing</h1>
      </header>

      {/* Current Subscription */}
      <section data-section="subscription">
        <h2>Current Plan</h2>
        {subscription ? (
          <div data-subscription-card>
            <div data-plan-info>
              <h3>{subscription.planName}</h3>
              <span data-status={subscription.status}>{subscription.status}</span>
            </div>

            <div data-billing-period>
              <p>
                Current period: {subscription.currentPeriodStart} -{' '}
                {subscription.currentPeriodEnd}
              </p>
              {subscription.cancelAtPeriodEnd && (
                <p data-cancel-notice>
                  Your subscription will be canceled at the end of the billing period.
                </p>
              )}
              {subscription.trialEnd && (
                <p data-trial-notice>Trial ends: {subscription.trialEnd}</p>
              )}
            </div>

            <div data-subscription-actions>
              <button type="button" onClick={() => onChangePlan?.('')}>
                Change Plan
              </button>
              {subscription.cancelAtPeriodEnd ? (
                <button type="button" onClick={() => onResumeSubscription?.()}>
                  Resume Subscription
                </button>
              ) : (
                <button type="button" onClick={() => onCancelSubscription?.()}>
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        ) : (
          emptyState || (
            <div data-empty-state>
              <p>No active subscription.</p>
              <button type="button" onClick={() => onChangePlan?.('')}>
                Choose a Plan
              </button>
            </div>
          )
        )}
      </section>

      {/* Usage */}
      {usage.length > 0 && (
        <section data-section="usage">
          <h2>Usage This Month</h2>
          <div data-usage-grid>
            {usage.map((record) => (
              <div key={record.metric} data-usage-meter>
                <div data-usage-header>
                  <span>{record.metric}</span>
                  <span>
                    {record.used} / {record.limit} {record.unit}
                  </span>
                </div>
                <div data-usage-bar>
                  <div
                    data-usage-fill
                    style={{ width: `${Math.min((record.used / record.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available Plans */}
      {plans.length > 0 && (
        <section data-section="plans">
          <h2>Available Plans</h2>
          <div data-plans-grid>
            {plans.map((plan) => (
              <div
                key={plan.id}
                data-plan-card
                data-highlighted={plan.highlighted ? 'true' : undefined}
                data-current={plan.id === subscription?.planId ? 'true' : undefined}
              >
                <h3>{plan.name}</h3>
                {plan.description && <p>{plan.description}</p>}
                <div data-price>
                  <span data-amount>
                    {formatCurrency(plan.price, plan.currency)}
                  </span>
                  <span data-interval>/ {plan.interval}</span>
                </div>
                <ul data-features>
                  {plan.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onChangePlan?.(plan.id)}
                  disabled={plan.id === subscription?.planId}
                >
                  {plan.id === subscription?.planId ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payment Methods */}
      <section data-section="payment-methods">
        <h2>Payment Methods</h2>
        <div data-payment-methods>
          {paymentMethods.map((method) => (
            <div key={method.id} data-payment-method>
              <div data-method-info>
                {method.type === 'card' && (
                  <>
                    <span data-brand>{method.brand}</span>
                    <span data-last4>**** {method.last4}</span>
                    <span data-expiry>
                      {method.expiryMonth}/{method.expiryYear}
                    </span>
                  </>
                )}
                {method.isDefault && <span data-default>Default</span>}
              </div>
              <div data-method-actions>
                {!method.isDefault && (
                  <button
                    type="button"
                    onClick={() => onSetDefaultPaymentMethod?.(method.id)}
                  >
                    Set Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemovePaymentMethod?.(method.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => onAddPaymentMethod?.()}>
            Add Payment Method
          </button>
        </div>
      </section>

      {/* Invoices */}
      <section data-section="invoices">
        <h2>Invoice History</h2>
        {invoices.length === 0 ? (
          <p>No invoices yet.</p>
        ) : (
          <table data-invoice-table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.number}</td>
                  <td>{formatCurrency(invoice.amount, invoice.currency)}</td>
                  <td>
                    <span data-status={invoice.status}>{invoice.status}</span>
                  </td>
                  <td>{invoice.createdAt}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onDownloadInvoice?.(invoice.id)}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default BillingPage
