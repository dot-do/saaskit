import type { ReactNode } from 'react'

/**
 * Webhook entity
 */
export interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  secret?: string // Only shown once at creation
  enabled: boolean
  lastDeliveryAt?: string
  lastDeliveryStatus?: 'success' | 'failed'
  createdAt: string
  updatedAt: string
}

/**
 * Webhook delivery log entry
 */
export interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  payload: unknown
  responseStatus?: number
  responseBody?: string
  deliveredAt: string
  duration: number // milliseconds
  success: boolean
}

/**
 * Props for the Webhooks page component
 */
export interface WebhooksPageProps {
  /**
   * Pre-loaded webhooks data
   */
  webhooks?: Webhook[]

  /**
   * Callback when a webhook is created
   * Returns the webhook with secret (only shown once)
   */
  onCreate?: (data: { name: string; url: string; events: string[] }) => Promise<Webhook & { secretKey: string }>

  /**
   * Callback when a webhook is updated
   */
  onUpdate?: (id: string, data: Partial<Webhook>) => Promise<Webhook>

  /**
   * Callback when a webhook is deleted
   */
  onDelete?: (id: string) => Promise<void>

  /**
   * Callback to test a webhook
   */
  onTest?: (id: string, event: string) => Promise<WebhookDelivery>

  /**
   * Callback to view delivery logs
   */
  onViewLogs?: (id: string) => void

  /**
   * Available events that can be subscribed to
   */
  availableEvents?: Array<{
    id: string
    name: string
    description?: string
    category?: string
  }>

  /**
   * Enable webhook creation
   * @default true
   */
  allowCreate?: boolean

  /**
   * Custom empty state component
   */
  emptyState?: ReactNode
}

/**
 * WebhooksPage - Webhook configuration interface
 *
 * Provides a complete UI for managing webhooks in your SaaS app.
 *
 * ## Features
 *
 * - List all webhooks with status indicators
 * - Create new webhooks with event selection
 * - Edit webhook URL and events
 * - Enable/disable webhooks
 * - Test webhook delivery
 * - View delivery logs and retry failed deliveries
 *
 * ## Webhook Flow
 *
 * 1. User creates webhook with URL and events
 * 2. System generates signing secret
 * 3. When events occur, system POSTs to webhook URL
 * 4. Payload includes signature for verification
 *
 * @example
 * ```tsx
 * <WebhooksPage
 *   webhooks={webhooks}
 *   availableEvents={[
 *     { id: 'user.created', name: 'User Created', category: 'Users' },
 *     { id: 'user.updated', name: 'User Updated', category: 'Users' },
 *     { id: 'order.created', name: 'Order Created', category: 'Orders' },
 *   ]}
 *   onCreate={async (data) => {
 *     const result = await api.webhooks.create(data)
 *     return result
 *   }}
 * />
 * ```
 */
export function WebhooksPage({
  webhooks = [],
  onCreate,
  onUpdate,
  onDelete,
  onTest,
  onViewLogs,
  availableEvents = [],
  allowCreate = true,
  emptyState,
}: WebhooksPageProps): ReactNode {
  // TODO: Implement webhook list view
  // TODO: Implement create webhook modal with event picker
  // TODO: Implement edit webhook modal
  // TODO: Implement webhook toggle (enable/disable)
  // TODO: Implement test webhook functionality
  // TODO: Implement delivery logs view
  // TODO: Integrate with useResource hook for data fetching

  // Group events by category
  const eventsByCategory = availableEvents.reduce(
    (acc, event) => {
      const category = event.category || 'General'
      if (!acc[category]) acc[category] = []
      acc[category].push(event)
      return acc
    },
    {} as Record<string, typeof availableEvents>
  )

  return (
    <div data-page="webhooks">
      <header>
        <h1>Webhooks</h1>
        {allowCreate && (
          <button type="button" onClick={() => onCreate?.({ name: '', url: '', events: [] })}>
            Create Webhook
          </button>
        )}
      </header>

      <div data-info-banner>
        <p>
          Webhooks allow external services to be notified when events happen.
          When an event occurs, we&apos;ll send a POST request to the configured URL.
        </p>
      </div>

      {webhooks.length === 0 ? (
        emptyState || (
          <div data-empty-state>
            <p>No webhooks configured.</p>
            {allowCreate && (
              <p>Create a webhook to receive real-time notifications.</p>
            )}
          </div>
        )
      ) : (
        <div data-webhook-list>
          {webhooks.map((webhook) => (
            <div key={webhook.id} data-webhook-card>
              <div data-webhook-header>
                <div data-webhook-info>
                  <h3>{webhook.name}</h3>
                  <code data-webhook-url>{webhook.url}</code>
                </div>
                <label data-webhook-toggle>
                  <input
                    type="checkbox"
                    checked={webhook.enabled}
                    onChange={(e) =>
                      onUpdate?.(webhook.id, { enabled: e.target.checked })
                    }
                  />
                  <span>{webhook.enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>

              <div data-webhook-events>
                <strong>Events:</strong>
                <span>{webhook.events.join(', ')}</span>
              </div>

              <div data-webhook-status>
                {webhook.lastDeliveryAt && (
                  <>
                    <span>Last delivery: {webhook.lastDeliveryAt}</span>
                    <span data-status={webhook.lastDeliveryStatus}>
                      {webhook.lastDeliveryStatus}
                    </span>
                  </>
                )}
              </div>

              <div data-webhook-actions>
                <button type="button" onClick={() => onTest?.(webhook.id, webhook.events[0])}>
                  Test
                </button>
                <button type="button" onClick={() => onViewLogs?.(webhook.id)}>
                  View Logs
                </button>
                <button type="button" onClick={() => onUpdate?.(webhook.id, {})}>
                  Edit
                </button>
                <button type="button" onClick={() => onDelete?.(webhook.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {availableEvents.length > 0 && (
        <div data-events-reference>
          <h3>Available Events</h3>
          {Object.entries(eventsByCategory).map(([category, events]) => (
            <div key={category} data-event-category>
              <h4>{category}</h4>
              <ul>
                {events.map((event) => (
                  <li key={event.id}>
                    <code>{event.id}</code>
                    {event.description && <span> - {event.description}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default WebhooksPage
