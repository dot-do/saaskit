import type { Meta, StoryObj } from '@storybook/react'
import { BillingPage } from './billing'
import type { Subscription, Plan, Invoice, PaymentMethod, UsageRecord } from './billing'

/**
 * Mock subscription data
 */
const mockSubscription: Subscription = {
  id: 'sub-123',
  planId: 'pro',
  planName: 'Pro Plan',
  status: 'active',
  currentPeriodStart: '2024-01-01',
  currentPeriodEnd: '2024-02-01',
  cancelAtPeriodEnd: false,
}

const mockTrialSubscription: Subscription = {
  id: 'sub-456',
  planId: 'pro',
  planName: 'Pro Plan',
  status: 'trialing',
  currentPeriodStart: '2024-01-01',
  currentPeriodEnd: '2024-02-01',
  cancelAtPeriodEnd: false,
  trialEnd: '2024-01-15',
}

const mockCanceledSubscription: Subscription = {
  ...mockSubscription,
  status: 'active',
  cancelAtPeriodEnd: true,
}

/**
 * Mock plans data
 */
const mockPlans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For individuals and small projects',
    price: 0,
    currency: 'usd',
    interval: 'month',
    features: ['1 project', '100 API calls/day', 'Community support'],
    limits: { projects: 1, apiCalls: 100 },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams',
    price: 2900,
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited projects',
      '10,000 API calls/day',
      'Priority support',
      'Custom domains',
    ],
    highlighted: true,
    limits: { projects: -1, apiCalls: 10000 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 9900,
    currency: 'usd',
    interval: 'month',
    features: [
      'Everything in Pro',
      'Unlimited API calls',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
    ],
    limits: { projects: -1, apiCalls: -1 },
  },
]

/**
 * Mock invoices data
 */
const mockInvoices: Invoice[] = [
  {
    id: 'inv-001',
    number: 'INV-2024-001',
    status: 'paid',
    amount: 2900,
    currency: 'usd',
    paidAt: '2024-01-01T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    pdfUrl: '/invoices/inv-001.pdf',
  },
  {
    id: 'inv-002',
    number: 'INV-2023-012',
    status: 'paid',
    amount: 2900,
    currency: 'usd',
    paidAt: '2023-12-01T10:00:00Z',
    createdAt: '2023-12-01T00:00:00Z',
    pdfUrl: '/invoices/inv-002.pdf',
  },
  {
    id: 'inv-003',
    number: 'INV-2023-011',
    status: 'paid',
    amount: 2900,
    currency: 'usd',
    paidAt: '2023-11-01T10:00:00Z',
    createdAt: '2023-11-01T00:00:00Z',
    pdfUrl: '/invoices/inv-003.pdf',
  },
]

/**
 * Mock payment methods data
 */
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm-1',
    type: 'card',
    last4: '4242',
    brand: 'Visa',
    expiryMonth: 12,
    expiryYear: 2025,
    isDefault: true,
  },
  {
    id: 'pm-2',
    type: 'card',
    last4: '5555',
    brand: 'Mastercard',
    expiryMonth: 6,
    expiryYear: 2026,
    isDefault: false,
  },
]

/**
 * Mock usage data
 */
const mockUsage: UsageRecord[] = [
  {
    metric: 'API Calls',
    used: 7500,
    limit: 10000,
    unit: 'calls',
  },
  {
    metric: 'Storage',
    used: 45,
    limit: 100,
    unit: 'GB',
  },
  {
    metric: 'Team Members',
    used: 8,
    limit: 10,
    unit: 'seats',
  },
]

const meta: Meta<typeof BillingPage> = {
  title: 'SaaSKit/Pages/Billing',
  component: BillingPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof BillingPage>

/**
 * Default state with active subscription
 */
export const Default: Story = {
  args: {
    subscription: mockSubscription,
    plans: mockPlans,
    invoices: mockInvoices,
    paymentMethods: mockPaymentMethods,
    usage: mockUsage,
    onChangePlan: async (planId) => {
      console.log('Change plan to:', planId)
    },
    onCancelSubscription: async () => {
      console.log('Cancel subscription')
    },
    onAddPaymentMethod: async () => {
      console.log('Add payment method')
    },
    onRemovePaymentMethod: async (id) => {
      console.log('Remove payment method:', id)
    },
    onSetDefaultPaymentMethod: async (id) => {
      console.log('Set default payment method:', id)
    },
    onDownloadInvoice: async (id) => {
      console.log('Download invoice:', id)
    },
  },
}

/**
 * Trial subscription state
 */
export const Trial: Story = {
  args: {
    subscription: mockTrialSubscription,
    plans: mockPlans,
    invoices: [],
    paymentMethods: [],
    usage: mockUsage,
  },
}

/**
 * Canceled subscription (will end at period end)
 */
export const Canceled: Story = {
  args: {
    subscription: mockCanceledSubscription,
    plans: mockPlans,
    invoices: mockInvoices,
    paymentMethods: mockPaymentMethods,
    usage: mockUsage,
    onResumeSubscription: async () => {
      console.log('Resume subscription')
    },
  },
}

/**
 * No active subscription
 */
export const NoSubscription: Story = {
  args: {
    subscription: undefined,
    plans: mockPlans,
    invoices: [],
    paymentMethods: [],
    usage: [],
  },
}

/**
 * Without usage tracking
 */
export const NoUsage: Story = {
  args: {
    subscription: mockSubscription,
    plans: mockPlans,
    invoices: mockInvoices,
    paymentMethods: mockPaymentMethods,
    usage: [],
  },
}

/**
 * High usage (near limits)
 */
export const HighUsage: Story = {
  args: {
    subscription: mockSubscription,
    plans: mockPlans,
    invoices: mockInvoices,
    paymentMethods: mockPaymentMethods,
    usage: [
      { metric: 'API Calls', used: 9800, limit: 10000, unit: 'calls' },
      { metric: 'Storage', used: 95, limit: 100, unit: 'GB' },
      { metric: 'Team Members', used: 10, limit: 10, unit: 'seats' },
    ],
  },
}

/**
 * Custom empty state
 */
export const CustomEmptyState: Story = {
  args: {
    subscription: undefined,
    plans: mockPlans,
    emptyState: (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>Start Your Free Trial</h3>
        <p>No credit card required. Get started with 14 days free.</p>
      </div>
    ),
  },
}

/**
 * Past due subscription
 */
export const PastDue: Story = {
  args: {
    subscription: {
      ...mockSubscription,
      status: 'past_due',
    },
    plans: mockPlans,
    invoices: [
      {
        ...mockInvoices[0],
        status: 'open',
        dueDate: '2024-01-15',
      },
    ],
    paymentMethods: mockPaymentMethods,
    usage: mockUsage,
  },
}
