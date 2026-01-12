/**
 * App Shell Generator
 *
 * Creates the app shell with navigation and RBAC-based menu visibility.
 */

import { createElement, type ComponentType, type ReactNode } from 'react'
import type { ParsedNoun, AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'

/**
 * Create an App Shell component
 */
export function createAppShell(
  nouns: ParsedNoun[],
  _config: AppGeneratorConfig
): ComponentType<unknown> {
  return function AppShell() {
    const ctx = useTestContext()
    const { navigate, user } = ctx

    // Check permissions for built-in pages
    const canViewSettings = !user?.permissions || user.permissions.includes('settings.read')
    const canViewTeam = !user?.permissions || user.permissions.includes('team.read')
    const canViewBilling = !user?.permissions || user.permissions.includes('billing.read')
    const canViewAPIKeys = !user?.permissions || user.permissions.includes('api-keys.read')
    const canViewWebhooks = !user?.permissions || user.permissions.includes('webhooks.read')

    const children: ReactNode[] = []

    // Navigation
    const navItems: ReactNode[] = []

    // Dashboard link
    navItems.push(
      createElement(
        'a',
        { key: 'dashboard', href: '/dashboard', onClick: () => navigate('/dashboard') },
        'Dashboard'
      )
    )

    // Noun links
    for (const noun of nouns) {
      const canView = !user?.permissions || user.permissions.includes(`${noun.pluralName}.read`)
      if (canView) {
        navItems.push(
          createElement(
            'a',
            {
              key: noun.name,
              href: `/${noun.pluralName}`,
              onClick: () => navigate(`/${noun.pluralName}`),
            },
            noun.name
          )
        )
      }
    }

    // Built-in page links (with RBAC)
    if (canViewSettings) {
      navItems.push(
        createElement(
          'a',
          { key: 'settings', href: '/settings', onClick: () => navigate('/settings') },
          'Settings'
        )
      )
    }

    if (canViewTeam) {
      navItems.push(
        createElement(
          'a',
          { key: 'team', href: '/team', onClick: () => navigate('/team') },
          'Team'
        )
      )
    }

    if (canViewBilling) {
      navItems.push(
        createElement(
          'a',
          { key: 'billing', href: '/billing', onClick: () => navigate('/billing') },
          'Billing'
        )
      )
    }

    if (canViewAPIKeys) {
      navItems.push(
        createElement(
          'a',
          { key: 'api-keys', href: '/api-keys', onClick: () => navigate('/api-keys') },
          'API Keys'
        )
      )
    }

    if (canViewWebhooks) {
      navItems.push(
        createElement(
          'a',
          { key: 'webhooks', href: '/webhooks', onClick: () => navigate('/webhooks') },
          'Webhooks'
        )
      )
    }

    children.push(createElement('nav', { key: 'nav' }, navItems))

    return createElement('div', { 'data-component': 'shell' }, children)
  }
}
