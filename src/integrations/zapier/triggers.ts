/**
 * Zapier Trigger Generator
 *
 * Generates Zapier triggers from SaaSkit event patterns.
 * Maps $.on.Noun.event patterns to Zapier triggers.
 */

import type { ZapierTrigger, ZapierField, ZapierGeneratorOptions } from './types'
import { toZapierKey, toDisplayLabel } from './types'

/**
 * Built-in event verbs that generate triggers
 */
export const TRIGGER_EVENT_VERBS = ['created', 'updated', 'deleted', 'archived', 'restored'] as const
export type TriggerEventVerb = (typeof TRIGGER_EVENT_VERBS)[number]

/**
 * Options for generating a single trigger
 */
export interface GenerateTriggerOptions {
  /** The noun name (e.g., 'User', 'Order') */
  nounName: string
  /** The event name (e.g., 'created', 'updated') */
  eventName: string
  /** Base API URL for webhooks */
  apiBaseUrl: string
  /** Webhook base URL for subscriptions (optional, enables instant triggers) */
  webhookBaseUrl?: string
  /** Additional input fields to include */
  inputFields?: ZapierField[]
  /** Additional output fields to include */
  outputFields?: ZapierField[]
  /** Sample data for testing */
  sample?: Record<string, unknown>
  /** Whether this trigger should be marked as important */
  important?: boolean
  /** Whether this trigger should be hidden */
  hidden?: boolean
}

/**
 * Generate a placeholder webhook URL for a trigger
 */
export function generateWebhookUrl(
  webhookBaseUrl: string,
  nounName: string,
  eventName: string
): string {
  const key = toZapierKey(nounName)
  return `${webhookBaseUrl}/webhooks/zapier/${key}/${eventName}`
}

/**
 * Generate a Zapier trigger from a noun and event name
 *
 * @example
 * ```ts
 * const trigger = generateTrigger({
 *   nounName: 'Order',
 *   eventName: 'created',
 *   apiBaseUrl: 'https://api.example.com',
 *   webhookBaseUrl: 'https://hooks.example.com',
 * })
 * // Returns a ZapierTrigger for "New Order" with webhook support
 * ```
 */
export function generateTrigger(options: GenerateTriggerOptions): ZapierTrigger {
  const {
    nounName,
    eventName,
    apiBaseUrl,
    webhookBaseUrl,
    inputFields = [],
    outputFields = [],
    sample,
    important = false,
    hidden = false,
  } = options

  const key = `${toZapierKey(nounName)}_${eventName}`
  const displayLabel = toDisplayLabel(nounName)
  const isInstant = !!webhookBaseUrl

  // Generate trigger label based on event type
  const labelMap: Record<string, string> = {
    created: `New ${displayLabel}`,
    updated: `Updated ${displayLabel}`,
    deleted: `Deleted ${displayLabel}`,
    archived: `Archived ${displayLabel}`,
    restored: `Restored ${displayLabel}`,
  }
  const label = labelMap[eventName] || `${displayLabel} ${eventName}`

  // Generate description
  const descriptionMap: Record<string, string> = {
    created: `Triggers when a new ${displayLabel.toLowerCase()} is created.`,
    updated: `Triggers when an existing ${displayLabel.toLowerCase()} is updated.`,
    deleted: `Triggers when a ${displayLabel.toLowerCase()} is deleted.`,
    archived: `Triggers when a ${displayLabel.toLowerCase()} is archived.`,
    restored: `Triggers when a ${displayLabel.toLowerCase()} is restored.`,
  }
  const description = descriptionMap[eventName] || `Triggers when ${displayLabel.toLowerCase()} ${eventName} event occurs.`

  // Base trigger configuration
  const trigger: ZapierTrigger = {
    key,
    noun: displayLabel,
    display: {
      label,
      description,
      important,
      hidden,
    },
    operation: {
      type: isInstant ? 'hook' : 'polling',
      inputFields: [
        // Add any input fields for filtering (none by default for triggers)
        ...inputFields,
      ],
      outputFields: [
        // Standard output fields
        {
          key: 'id',
          label: 'ID',
          type: 'string',
        },
        ...outputFields,
      ],
      sample: sample || {
        id: `${toZapierKey(nounName)}_sample_123`,
      },
      perform: {
        // For polling triggers: endpoint to fetch recent items
        url: `${apiBaseUrl}/${toZapierKey(nounName)}s`,
        method: 'GET',
        params: {
          event: eventName,
          limit: '100',
        },
      },
    },
  }

  // Add webhook subscription endpoints for instant triggers
  if (isInstant && webhookBaseUrl) {
    const webhookUrl = generateWebhookUrl(webhookBaseUrl, nounName, eventName)

    trigger.operation.performSubscribe = {
      url: `${apiBaseUrl}/webhooks/subscribe`,
      method: 'POST',
      body: {
        event: `${nounName}.${eventName}`,
        target_url: '{{bundle.targetUrl}}',
      },
    }

    trigger.operation.performUnsubscribe = {
      url: `${apiBaseUrl}/webhooks/unsubscribe`,
      method: 'DELETE',
      body: {
        subscription_id: '{{bundle.subscribeData.id}}',
      },
    }
  }

  return trigger
}

/**
 * Generate all triggers for a noun (created, updated, deleted, etc.)
 *
 * @example
 * ```ts
 * const triggers = generateTriggersForNoun('Order', {
 *   apiBaseUrl: 'https://api.example.com',
 *   events: ['created', 'updated', 'fulfilled'],
 * })
 * // Returns triggers for Order.created, Order.updated, Order.fulfilled
 * ```
 */
export function generateTriggersForNoun(
  nounName: string,
  options: {
    apiBaseUrl: string
    webhookBaseUrl?: string
    events?: string[]
    outputFields?: ZapierField[]
    sample?: Record<string, unknown>
  }
): ZapierTrigger[] {
  const { apiBaseUrl, webhookBaseUrl, events, outputFields, sample } = options

  // Use provided events or default to built-in event verbs
  const eventNames = events || [...TRIGGER_EVENT_VERBS]

  return eventNames.map((eventName) =>
    generateTrigger({
      nounName,
      eventName,
      apiBaseUrl,
      webhookBaseUrl,
      outputFields,
      sample,
      // Mark 'created' as important by default
      important: eventName === 'created',
    })
  )
}

/**
 * Generate triggers from a SaaSkit events config
 *
 * @example
 * ```ts
 * const triggers = generateTriggersFromEvents(
 *   {
 *     'Order.created': handler,
 *     'Order.fulfilled': handler,
 *     'User.invited': handler,
 *   },
 *   { apiBaseUrl: 'https://api.example.com' }
 * )
 * // Returns triggers for each event
 * ```
 */
export function generateTriggersFromEvents(
  events: Record<string, unknown>,
  options: {
    apiBaseUrl: string
    webhookBaseUrl?: string
  }
): ZapierTrigger[] {
  const { apiBaseUrl, webhookBaseUrl } = options
  const triggers: ZapierTrigger[] = []

  for (const eventKey of Object.keys(events)) {
    // Parse event key (e.g., 'Order.created')
    const [nounName, eventName] = eventKey.split('.')
    if (!nounName || !eventName) continue

    triggers.push(
      generateTrigger({
        nounName,
        eventName,
        apiBaseUrl,
        webhookBaseUrl,
      })
    )
  }

  return triggers
}

/**
 * Convert triggers array to Zapier record format
 */
export function triggersToRecord(triggers: ZapierTrigger[]): Record<string, ZapierTrigger> {
  const record: Record<string, ZapierTrigger> = {}
  for (const trigger of triggers) {
    record[trigger.key] = trigger
  }
  return record
}
