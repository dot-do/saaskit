/**
 * Webhooks Page Generator
 *
 * Creates a webhooks management page with create, test, and delivery history.
 */

import { createElement, useState, type ComponentType, type ReactNode, type ChangeEvent } from 'react'
import type { ParsedNoun, AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'
import { generateWebhookEvents } from '../parser'

/**
 * Create a Webhooks page component
 */
export function createWebhooksPage(
  nouns: ParsedNoun[],
  config: AppGeneratorConfig
): ComponentType<unknown> {
  const availableEvents = generateWebhookEvents(nouns, config.verbs)

  return function WebhooksPage() {
    const ctx = useTestContext()
    const { data, mutations } = ctx

    const webhooks = data.webhooks as Array<{
      id: string
      url: string
      events: string[]
      status: string
      deliveries?: Array<{
        id: string
        event: string
        statusCode: number
        timestamp: string
      }>
    }> | undefined

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newWebhookUrl, setNewWebhookUrl] = useState('')
    const [selectedEvents, setSelectedEvents] = useState<string[]>([])
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
    const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null)
    const [testResult, setTestResult] = useState<{ success: boolean; statusCode: number } | null>(null)

    const handleCreate = async () => {
      const createFn = mutations?.webhooks?.create
      if (createFn) {
        await createFn({ url: newWebhookUrl, events: selectedEvents })
      }
      setShowCreateModal(false)
      setNewWebhookUrl('')
      setSelectedEvents([])
    }

    const handleDelete = async (webhookId: string) => {
      const removeFn = mutations?.webhooks?.remove
      if (removeFn) {
        await removeFn(webhookId)
      }
      setShowDeleteConfirm(null)
    }

    const handleTest = async (webhookId: string) => {
      const testFn = mutations?.webhooks?.test
      if (testFn) {
        const result = await testFn(webhookId)
        setTestResult(result as { success: boolean; statusCode: number })
      }
    }

    const children: ReactNode[] = []

    // Title
    children.push(createElement('h1', { key: 'title' }, 'Webhooks'))

    // Create button
    children.push(
      createElement(
        'button',
        {
          key: 'create-btn',
          type: 'button',
          onClick: () => {
            setShowCreateModal(true)
            setNewWebhookUrl('')
            setSelectedEvents([])
          },
        },
        'Add Webhook'
      )
    )

    // Webhooks list
    if (webhooks && webhooks.length > 0) {
      const webhookElements = webhooks.map((webhook) =>
        createElement('div', { key: webhook.id, className: 'webhook' }, [
          createElement('span', { key: 'url' }, webhook.url),
          createElement('span', { key: 'events' }, webhook.events.join(', ')),
          createElement('span', { key: 'status' }, webhook.status),
          createElement(
            'button',
            {
              key: 'test',
              type: 'button',
              onClick: () => handleTest(webhook.id),
            },
            'Test'
          ),
          createElement(
            'button',
            {
              key: 'expand',
              type: 'button',
              'data-testid': `expand-${webhook.id}`,
              onClick: () => setExpandedWebhook(expandedWebhook === webhook.id ? null : webhook.id),
            },
            'Expand'
          ),
          createElement(
            'button',
            {
              key: 'delete',
              type: 'button',
              onClick: () => setShowDeleteConfirm(webhook.id),
            },
            'Delete'
          ),
          // Delivery history
          expandedWebhook === webhook.id && webhook.deliveries && webhook.deliveries.length > 0 &&
            createElement('div', { key: 'deliveries' },
              webhook.deliveries.map((delivery) =>
                createElement('div', { key: delivery.id }, [
                  createElement('span', { key: 'event' }, delivery.event),
                  createElement('span', { key: 'status' }, String(delivery.statusCode)),
                  createElement('span', { key: 'time' }, delivery.timestamp),
                ])
              )
            ),
        ])
      )

      children.push(createElement('div', { key: 'webhooks-list' }, webhookElements))
    }

    // Test result display
    if (testResult) {
      children.push(
        createElement('div', { key: 'test-result' }, [
          createElement('span', { key: 'success' }, testResult.success ? 'Success' : 'Failed'),
          createElement('span', { key: 'status' }, `Status: ${testResult.statusCode}`),
        ])
      )
    }

    // Create modal
    if (showCreateModal) {
      const modalContent: ReactNode[] = [
        createElement('h2', { key: 'title' }, 'Add Webhook'),
        createElement('label', { key: 'url-label', htmlFor: 'webhook-url' }, 'URL'),
        createElement('input', {
          key: 'url-input',
          id: 'webhook-url',
          type: 'url',
          'aria-label': 'URL',
          value: newWebhookUrl,
          onChange: (e: ChangeEvent<HTMLInputElement>) => setNewWebhookUrl(e.target.value),
        }),
        createElement('label', { key: 'events-label' }, 'Events'),
        createElement('div', { key: 'events' },
          availableEvents.map((event) =>
            createElement('label', { key: event }, [
              createElement('input', {
                key: 'checkbox',
                type: 'checkbox',
                'aria-label': event,
                checked: selectedEvents.includes(event),
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                  if (e.target.checked) {
                    setSelectedEvents([...selectedEvents, event])
                  } else {
                    setSelectedEvents(selectedEvents.filter((ev) => ev !== event))
                  }
                },
              }),
              createElement('span', { key: 'name' }, event),
            ])
          )
        ),
        createElement(
          'button',
          { key: 'create', type: 'button', onClick: handleCreate },
          'Create'
        ),
        createElement(
          'button',
          { key: 'cancel', type: 'button', onClick: () => setShowCreateModal(false) },
          'Cancel'
        ),
      ]

      children.push(
        createElement('div', { key: 'create-modal', role: 'dialog' }, modalContent)
      )
    }

    // Delete confirmation dialog
    if (showDeleteConfirm) {
      children.push(
        createElement('div', { key: 'delete-confirm', role: 'dialog' }, [
          createElement('p', { key: 'message' }, 'Are you sure you want to delete this webhook?'),
          createElement(
            'button',
            { key: 'confirm', type: 'button', onClick: () => handleDelete(showDeleteConfirm) },
            'Confirm'
          ),
          createElement(
            'button',
            { key: 'cancel', type: 'button', onClick: () => setShowDeleteConfirm(null) },
            'Cancel'
          ),
        ])
      )
    }

    return createElement('div', { 'data-page': 'webhooks' }, children)
  }
}
