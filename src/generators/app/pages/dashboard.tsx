/**
 * Dashboard Page Generator
 *
 * Creates a dashboard page with metrics, quick actions, and real-time status.
 */

import { createElement, useState, useEffect, type ComponentType, type ReactNode } from 'react'
import type { ParsedNoun, VerbsConfig } from '../types'
import { useTestContext } from '../test-utils'

/**
 * Create a Dashboard page component
 */
export function createDashboardPage(
  nouns: ParsedNoun[],
  verbs?: VerbsConfig
): ComponentType<unknown> {
  return function DashboardPage() {
    const ctx = useTestContext()
    const { data, navigate, realtimeStatus } = ctx

    const children: ReactNode[] = []

    // Title
    children.push(createElement('h1', { key: 'title' }, 'Dashboard'))

    // Real-time status indicator
    children.push(
      createElement('div', {
        key: 'realtime',
        'data-testid': 'realtime-status',
        'data-status': realtimeStatus,
      })
    )

    // Metrics for each noun
    for (const noun of nouns) {
      const nounData = data[noun.name] as { totalCount?: number } | undefined
      if (nounData?.totalCount !== undefined) {
        children.push(
          createElement('div', { key: `metric-${noun.name}` }, [
            createElement('span', { key: 'label' }, `${noun.name}: `),
            createElement('span', { key: 'value' }, String(nounData.totalCount)),
          ])
        )
      }
    }

    // Recent activity section
    children.push(
      createElement('div', { key: 'activity' }, 'Recent Activity')
    )

    // Quick action buttons
    for (const noun of nouns) {
      children.push(
        createElement(
          'button',
          {
            key: `new-${noun.name}`,
            type: 'button',
            onClick: () => navigate(`/${noun.pluralName}/new`),
          },
          `New ${noun.name}`
        )
      )
    }

    return createElement('div', { 'data-page': 'dashboard' }, children)
  }
}
