/**
 * Billing Page Generator
 *
 * Creates a billing page with subscription info, usage, and invoices.
 */

import { createElement, type ComponentType, type ReactNode } from 'react'
import type { AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'

/**
 * Create a Billing page component
 */
export function createBillingPage(_config: AppGeneratorConfig): ComponentType<unknown> {
  return function BillingPage() {
    const ctx = useTestContext()
    const { data, mutations, user } = ctx

    const subscription = data.subscription as {
      plan?: { name: string; price: number }
      status?: string
      currentPeriodEnd?: string
    } | undefined

    const usage = data.usage as {
      apiCalls?: number
      apiLimit?: number
      storage?: number
      storageLimit?: number
    } | undefined

    const invoices = data.invoices as Array<{
      id: string
      amount: number
      status: string
      date: string
    }> | undefined

    // Check permissions
    const canView = !user?.permissions || user.permissions.includes('billing.read')

    // RBAC: Show 403 if no permission
    if (user && !canView) {
      return createElement('div', { 'data-page': 'billing' }, [
        createElement('h1', { key: 'title' }, '403 Forbidden'),
        createElement('p', { key: 'message' }, 'Access denied. You do not have permission to view billing.'),
      ])
    }

    const handleManageBilling = async () => {
      const createPortalFn = mutations?.billing?.createPortalSession
      if (createPortalFn) {
        await createPortalFn()
        // In real implementation, would redirect to the URL
      }
    }

    const children: ReactNode[] = []

    // Title
    children.push(createElement('h1', { key: 'title' }, 'Billing'))

    // Current plan
    if (subscription) {
      children.push(
        createElement('div', { key: 'plan' }, [
          createElement('h2', { key: 'plan-title' }, 'Current Plan'),
          subscription.plan && createElement('span', { key: 'plan-name' }, subscription.plan.name),
          subscription.plan && createElement('span', { key: 'plan-price' }, `$${subscription.plan.price}`),
          subscription.status && createElement('span', { key: 'status' }, subscription.status),
        ])
      )
    }

    // Usage information
    if (usage) {
      children.push(
        createElement('div', { key: 'usage' }, [
          createElement('h2', { key: 'usage-title' }, 'Usage'),
          usage.apiCalls !== undefined && usage.apiLimit !== undefined &&
            createElement('div', { key: 'api' }, `${usage.apiCalls.toLocaleString()} / ${usage.apiLimit.toLocaleString()}`),
          usage.storage !== undefined && usage.storageLimit !== undefined &&
            createElement('div', { key: 'storage' }, `${usage.storage} / ${usage.storageLimit}`),
        ])
      )
    }

    // Manage billing button (Stripe Portal)
    children.push(
      createElement(
        'button',
        { key: 'manage', type: 'button', onClick: handleManageBilling },
        'Stripe Portal'
      )
    )

    // Invoice history
    if (invoices && invoices.length > 0) {
      children.push(
        createElement('div', { key: 'invoices' }, [
          createElement('h2', { key: 'invoices-title' }, 'Invoices'),
          createElement(
            'table',
            { key: 'invoices-table' },
            [
              createElement('thead', { key: 'thead' },
                createElement('tr', null, [
                  createElement('th', { key: 'date' }, 'Date'),
                  createElement('th', { key: 'amount' }, 'Amount'),
                  createElement('th', { key: 'status' }, 'Status'),
                ])
              ),
              createElement('tbody', { key: 'tbody' },
                invoices.map((invoice) =>
                  createElement('tr', { key: invoice.id }, [
                    createElement('td', { key: 'date' }, invoice.date),
                    createElement('td', { key: 'amount' }, `$${invoice.amount}`),
                    createElement('td', { key: 'status' }, invoice.status),
                  ])
                )
              ),
            ]
          ),
        ])
      )
    }

    return createElement('div', { 'data-page': 'billing' }, children)
  }
}
