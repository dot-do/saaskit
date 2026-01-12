import type { Meta, StoryObj } from '@storybook/react'
import { WebhooksPage } from './webhooks'
import type { Webhook } from './webhooks'

/**
 * Mock webhooks data for stories
 */
const mockWebhooks: Webhook[] = [
  {
    id: 'wh-1',
    name: 'Production Notifications',
    url: 'https://api.example.com/webhooks/prod',
    events: ['user.created', 'user.updated', 'order.created'],
    enabled: true,
    lastDeliveryAt: '2024-01-15T14:30:00Z',
    lastDeliveryStatus: 'success',
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
  },
  {
    id: 'wh-2',
    name: 'Slack Integration',
    url: 'https://hooks.slack.com/services/xxx/yyy/zzz',
    events: ['user.created', 'subscription.renewed'],
    enabled: true,
    lastDeliveryAt: '2024-01-15T12:00:00Z',
    lastDeliveryStatus: 'success',
    createdAt: '2023-08-15T00:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
  },
  {
    id: 'wh-3',
    name: 'Analytics Pipeline',
    url: 'https://analytics.example.com/ingest',
    events: ['*'],
    enabled: false,
    lastDeliveryAt: '2024-01-10T00:00:00Z',
    lastDeliveryStatus: 'failed',
    createdAt: '2023-10-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'wh-4',
    name: 'Billing Updates',
    url: 'https://billing.example.com/events',
    events: ['subscription.renewed', 'subscription.canceled', 'invoice.paid'],
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

const mockAvailableEvents = [
  { id: 'user.created', name: 'User Created', description: 'When a new user is created', category: 'Users' },
  { id: 'user.updated', name: 'User Updated', description: 'When a user is updated', category: 'Users' },
  { id: 'user.deleted', name: 'User Deleted', description: 'When a user is deleted', category: 'Users' },
  { id: 'order.created', name: 'Order Created', description: 'When a new order is placed', category: 'Orders' },
  { id: 'order.fulfilled', name: 'Order Fulfilled', description: 'When an order is shipped', category: 'Orders' },
  { id: 'order.canceled', name: 'Order Canceled', description: 'When an order is canceled', category: 'Orders' },
  { id: 'subscription.renewed', name: 'Subscription Renewed', description: 'When a subscription renews', category: 'Billing' },
  { id: 'subscription.canceled', name: 'Subscription Canceled', description: 'When a subscription is canceled', category: 'Billing' },
  { id: 'invoice.paid', name: 'Invoice Paid', description: 'When an invoice is paid', category: 'Billing' },
  { id: 'invoice.failed', name: 'Invoice Failed', description: 'When payment fails', category: 'Billing' },
]

const meta: Meta<typeof WebhooksPage> = {
  title: 'SaaSKit/Pages/Webhooks',
  component: WebhooksPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof WebhooksPage>

/**
 * Default state with multiple webhooks
 */
export const Default: Story = {
  args: {
    webhooks: mockWebhooks,
    availableEvents: mockAvailableEvents,
    allowCreate: true,
    onCreate: async (data) => {
      console.log('Create webhook:', data)
      return {
        id: 'new-wh',
        name: data.name,
        url: data.url,
        events: data.events,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        secretKey: 'whsec_newwebhooksecret123',
      }
    },
    onUpdate: async (id, data) => {
      console.log('Update webhook:', id, data)
      return mockWebhooks.find((w) => w.id === id)!
    },
    onDelete: async (id) => {
      console.log('Delete webhook:', id)
    },
    onTest: async (id, event) => {
      console.log('Test webhook:', id, event)
      return {
        id: 'delivery-1',
        webhookId: id,
        event,
        payload: { test: true },
        responseStatus: 200,
        responseBody: '{"success": true}',
        deliveredAt: new Date().toISOString(),
        duration: 150,
        success: true,
      }
    },
    onViewLogs: (id) => {
      console.log('View logs for webhook:', id)
    },
  },
}

/**
 * Empty state when no webhooks exist
 */
export const Empty: Story = {
  args: {
    webhooks: [],
    availableEvents: mockAvailableEvents,
    allowCreate: true,
  },
}

/**
 * Read-only mode (no create)
 */
export const ReadOnly: Story = {
  args: {
    webhooks: mockWebhooks,
    availableEvents: mockAvailableEvents,
    allowCreate: false,
  },
}

/**
 * Single webhook
 */
export const SingleWebhook: Story = {
  args: {
    webhooks: [mockWebhooks[0]],
    availableEvents: mockAvailableEvents,
    allowCreate: true,
  },
}

/**
 * All webhooks disabled
 */
export const AllDisabled: Story = {
  args: {
    webhooks: mockWebhooks.map((wh) => ({ ...wh, enabled: false })),
    availableEvents: mockAvailableEvents,
    allowCreate: true,
  },
}

/**
 * Webhooks with failed deliveries
 */
export const WithFailures: Story = {
  args: {
    webhooks: mockWebhooks.map((wh) => ({
      ...wh,
      lastDeliveryStatus: 'failed' as const,
      lastDeliveryAt: '2024-01-15T14:00:00Z',
    })),
    availableEvents: mockAvailableEvents,
    allowCreate: true,
  },
}

/**
 * Without available events (simple mode)
 */
export const NoEventsList: Story = {
  args: {
    webhooks: mockWebhooks,
    availableEvents: [],
    allowCreate: true,
  },
}

/**
 * Custom empty state component
 */
export const CustomEmptyState: Story = {
  args: {
    webhooks: [],
    availableEvents: mockAvailableEvents,
    allowCreate: true,
    emptyState: (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>Set Up Webhooks</h3>
        <p>Configure webhooks to receive real-time notifications when events occur in your app.</p>
      </div>
    ),
  },
}
