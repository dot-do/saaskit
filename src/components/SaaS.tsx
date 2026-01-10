import type { ReactNode } from 'react'
import type { ResolvedApp } from '../types/app'

/**
 * Resource configuration for auto-generated admin routes
 */
export interface ResourceConfig {
  /**
   * Resource name (matches a noun from the app)
   */
  name: string

  /**
   * Custom label for display (defaults to noun name)
   */
  label?: string

  /**
   * Icon component to display in navigation
   */
  icon?: ReactNode

  /**
   * Custom list view component
   */
  list?: ReactNode

  /**
   * Custom detail/edit view component
   */
  edit?: ReactNode

  /**
   * Custom create view component
   */
  create?: ReactNode

  /**
   * Fields to display in list view
   */
  listFields?: string[]

  /**
   * Fields to include in forms
   */
  formFields?: string[]

  /**
   * Disable specific CRUD operations
   */
  disableCreate?: boolean
  disableEdit?: boolean
  disableDelete?: boolean
}

/**
 * Props for the SaaS component
 *
 * The SaaS component is a batteries-included admin that extends mdxui's App.
 * It auto-generates routes for all nouns and includes built-in pages for
 * common SaaS functionality.
 *
 * @example
 * ```tsx
 * import { defineApp, SaaS } from 'saaskit'
 *
 * const app = defineApp({
 *   nouns: ['User', 'Product', 'Order'],
 *   verbs: {
 *     User: ['create', 'update', 'delete'],
 *     Product: ['create', 'update', 'delete'],
 *     Order: ['create', 'fulfill', 'cancel'],
 *   },
 * })
 *
 * export default function App() {
 *   return (
 *     <SaaS
 *       app={app}
 *       dashboard={<CustomDashboard />}
 *     />
 *   )
 * }
 * ```
 */
export interface SaaSProps {
  /**
   * The resolved app configuration from defineApp()
   */
  app: ResolvedApp

  /**
   * Custom dashboard component to render on the home route
   */
  dashboard?: ReactNode

  /**
   * Custom sidebar component (replaces auto-generated sidebar)
   */
  sidebar?: ReactNode

  /**
   * Custom header component
   */
  header?: ReactNode

  /**
   * Resource configurations for customizing noun routes
   */
  resources?: ResourceConfig[]

  /**
   * Additional routes/pages to include
   */
  children?: ReactNode

  /**
   * Base path for the admin routes
   * @default '/admin'
   */
  basePath?: string

  /**
   * Theme configuration
   */
  theme?: {
    preset?: string
    mode?: 'light' | 'dark' | 'system'
  }

  /**
   * Enable/disable built-in pages
   */
  features?: {
    /** Show organizations page (multi-tenant) */
    organizations?: boolean
    /** Show users management page */
    users?: boolean
    /** Show teams management page */
    teams?: boolean
    /** Show API keys management page */
    apiKeys?: boolean
    /** Show webhooks configuration page */
    webhooks?: boolean
    /** Show billing/subscription page */
    billing?: boolean
    /** Show audit log page */
    auditLog?: boolean
    /** Show settings page */
    settings?: boolean
  }
}

/**
 * Route configuration generated from app nouns
 */
interface GeneratedRoute {
  path: string
  noun: string
  component: 'list' | 'edit' | 'create'
}

/**
 * Generate routes for all nouns in the app
 */
function generateRoutes(app: ResolvedApp, basePath: string): GeneratedRoute[] {
  const routes: GeneratedRoute[] = []

  for (const noun of app.nouns) {
    const nounPath = noun.toLowerCase()

    // List route
    routes.push({
      path: `${basePath}/${nounPath}`,
      noun,
      component: 'list',
    })

    // Create route
    if (app.hasVerb(noun, 'create')) {
      routes.push({
        path: `${basePath}/${nounPath}/new`,
        noun,
        component: 'create',
      })
    }

    // Edit route
    if (app.hasVerb(noun, 'update')) {
      routes.push({
        path: `${basePath}/${nounPath}/:id`,
        noun,
        component: 'edit',
      })
    }
  }

  return routes
}

/**
 * SaaS - Batteries-included admin component
 *
 * Extends mdxui's App with auto-generated routes for all nouns and
 * built-in pages for common SaaS functionality.
 *
 * ## Features
 *
 * - **Auto-generated routes**: Creates list, create, and edit routes for all nouns
 * - **Built-in pages**: Organizations, Users, Teams, API Keys, Webhooks, Billing, Audit Log, Settings
 * - **Customizable**: Override any component with custom implementations
 * - **Theme support**: Integrates with mdxui theming
 *
 * ## Auto-generated Routes
 *
 * For each noun in your app, SaaS generates:
 * - `/{basePath}/{noun}` - List view
 * - `/{basePath}/{noun}/new` - Create view (if 'create' verb is allowed)
 * - `/{basePath}/{noun}/:id` - Edit view (if 'update' verb is allowed)
 *
 * ## Built-in Pages
 *
 * | Page | Path | Description |
 * |------|------|-------------|
 * | Organizations | /organizations | Multi-tenant org management |
 * | Users | /users | User management |
 * | Teams | /teams | Team management |
 * | API Keys | /api-keys | API key management |
 * | Webhooks | /webhooks | Webhook configuration |
 * | Billing | /billing | Billing/subscription management |
 * | Audit Log | /audit-log | Activity audit log |
 * | Settings | /settings | App settings |
 *
 * @example
 * ```tsx
 * // Basic usage with all defaults
 * <SaaS app={app} />
 *
 * // With custom dashboard and disabled features
 * <SaaS
 *   app={app}
 *   dashboard={<MyDashboard />}
 *   features={{
 *     billing: false,
 *     auditLog: false,
 *   }}
 * />
 *
 * // With custom resource configuration
 * <SaaS
 *   app={app}
 *   resources={[
 *     {
 *       name: 'Product',
 *       icon: <ProductIcon />,
 *       listFields: ['name', 'price', 'status'],
 *     },
 *   ]}
 * />
 * ```
 */
export function SaaS({
  app,
  dashboard,
  sidebar,
  header,
  resources = [],
  children,
  basePath = '/admin',
  theme,
  features = {},
}: SaaSProps): ReactNode {
  // Default features (all enabled)
  const enabledFeatures = {
    organizations: features.organizations ?? true,
    users: features.users ?? true,
    teams: features.teams ?? true,
    apiKeys: features.apiKeys ?? true,
    webhooks: features.webhooks ?? true,
    billing: features.billing ?? true,
    auditLog: features.auditLog ?? true,
    settings: features.settings ?? true,
  }

  // Generate routes from app nouns
  const generatedRoutes = generateRoutes(app, basePath)

  // Create resource map for quick lookup
  const resourceMap = new Map<string, ResourceConfig>()
  for (const resource of resources) {
    resourceMap.set(resource.name, resource)
  }

  // TODO: Integrate with mdxui's App component
  // TODO: Set up routing (TanStack Router or React Router)
  // TODO: Render auto-generated routes
  // TODO: Render built-in pages based on enabled features
  // TODO: Set up providers (SaaSProvider, AppProvider)

  return (
    <div data-saas-admin data-base-path={basePath}>
      {/* TODO: Replace with actual implementation */}
      <div>
        {/* Shell wrapper */}
        {header}

        <div style={{ display: 'flex' }}>
          {/* Sidebar */}
          {sidebar || (
            <nav data-saas-sidebar>
              {/* TODO: Auto-generate navigation from nouns */}
              <ul>
                {Array.from(app.nouns).map((noun) => (
                  <li key={noun}>
                    <a href={`${basePath}/${noun.toLowerCase()}`}>{noun}</a>
                  </li>
                ))}
              </ul>

              {/* Built-in page links */}
              {enabledFeatures.organizations && (
                <a href={`${basePath}/organizations`}>Organizations</a>
              )}
              {enabledFeatures.users && <a href={`${basePath}/users`}>Users</a>}
              {enabledFeatures.teams && <a href={`${basePath}/teams`}>Teams</a>}
              {enabledFeatures.apiKeys && (
                <a href={`${basePath}/api-keys`}>API Keys</a>
              )}
              {enabledFeatures.webhooks && (
                <a href={`${basePath}/webhooks`}>Webhooks</a>
              )}
              {enabledFeatures.billing && (
                <a href={`${basePath}/billing`}>Billing</a>
              )}
              {enabledFeatures.auditLog && (
                <a href={`${basePath}/audit-log`}>Audit Log</a>
              )}
              {enabledFeatures.settings && (
                <a href={`${basePath}/settings`}>Settings</a>
              )}
            </nav>
          )}

          {/* Main content */}
          <main data-saas-content>
            {/* Dashboard or route content */}
            {dashboard}

            {/* Additional routes from children */}
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default SaaS
