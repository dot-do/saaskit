/**
 * App Generator
 *
 * Generates a complete React admin dashboard from noun/verb definitions.
 */

import type { ComponentType } from 'react'
import type { AppGeneratorConfig, GeneratedApp, AppRoute } from './types'
import { parseNouns, getVerbsForNoun } from './parser'
import { createDashboardPage } from './pages/dashboard'
import { createListPage } from './pages/list'
import { createCreatePage } from './pages/create'
import { createEditPage } from './pages/edit'
import { createShowPage } from './pages/show'
import { createSettingsPage } from './pages/settings'
import { createTeamPage } from './pages/team'
import { createBillingPage } from './pages/billing'
import { createAPIKeysPage } from './pages/api-keys'
import { createWebhooksPage } from './pages/webhooks'
import { createAppShell } from './pages/shell'

/**
 * Generate a complete React admin app from noun/verb configuration
 */
export function generateApp(config: AppGeneratorConfig): GeneratedApp {
  const parsedNouns = parseNouns(config.nouns)
  const routes: AppRoute[] = []
  const pages = new Map<string, ComponentType<unknown>>()

  // Dashboard route
  const DashboardPage = createDashboardPage(parsedNouns, config.verbs)
  routes.push({ path: '/dashboard', component: DashboardPage })
  pages.set('dashboard', DashboardPage)

  // Generate routes for each noun
  for (const noun of parsedNouns) {
    const verbList = getVerbsForNoun(config.verbs, noun.name)

    // List page
    const ListPage = createListPage(noun, verbList, config)
    routes.push({ path: `/${noun.pluralName}`, component: ListPage })
    pages.set(noun.pluralName, ListPage)

    // Create page
    const CreatePage = createCreatePage(noun, config)
    routes.push({ path: `/${noun.pluralName}/new`, component: CreatePage })
    pages.set(`${noun.pluralName}/new`, CreatePage)

    // Show page
    const ShowPage = createShowPage(noun, verbList, config)
    routes.push({ path: `/${noun.pluralName}/:id`, component: ShowPage })
    pages.set(`${noun.pluralName}/:id`, ShowPage)

    // Edit page
    const EditPage = createEditPage(noun, config)
    routes.push({ path: `/${noun.pluralName}/:id/edit`, component: EditPage })
    pages.set(`${noun.pluralName}/:id/edit`, EditPage)
  }

  // Built-in pages
  const SettingsPage = createSettingsPage(config)
  routes.push({ path: '/settings', component: SettingsPage })
  pages.set('settings', SettingsPage)

  const TeamPage = createTeamPage(config)
  routes.push({ path: '/team', component: TeamPage })
  pages.set('team', TeamPage)

  const BillingPage = createBillingPage(config)
  routes.push({ path: '/billing', component: BillingPage })
  pages.set('billing', BillingPage)

  const APIKeysPage = createAPIKeysPage(config)
  routes.push({ path: '/api-keys', component: APIKeysPage })
  pages.set('api-keys', APIKeysPage)

  const WebhooksPage = createWebhooksPage(parsedNouns, config)
  routes.push({ path: '/webhooks', component: WebhooksPage })
  pages.set('webhooks', WebhooksPage)

  // Shell component
  const Shell = createAppShell(parsedNouns, config)

  return {
    routes,
    getPage(name: string): ComponentType<unknown> {
      const page = pages.get(name)
      if (!page) {
        throw new Error(`Page "${name}" not found`)
      }
      return page
    },
    getShell(): ComponentType<unknown> {
      return Shell
    },
  }
}
