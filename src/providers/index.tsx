/**
 * saaskit providers
 *
 * React context providers for the SaaS framework.
 * Integrates with @dotdo/react when available for real backend operations.
 */

import { createContext, useContext, useMemo, type ReactNode, type ComponentType } from 'react'
import type { ResolvedApp } from '../types/app'
import type { AppContext } from '../types/context'

// =============================================================================
// @dotdo/react integration types (for optional dependency)
// =============================================================================

/**
 * Workflow context from @dotdo/react
 * Provides durable operations, scheduling, and Cap'n Web RPC access
 */
export interface WorkflowContext {
  /** Fire-and-forget event */
  send: <T>(event: T) => void
  /** Single attempt operation */
  try: <T>(action: () => Promise<T>) => Promise<T>
  /** Durable operation with retries */
  do: <T>(action: () => Promise<T>) => Promise<T>
  /** Schedule an action for later */
  in: (delay: string | number) => WorkflowContext
  /** Access to underlying client for direct RPC */
  client: unknown
  /** Dynamic property access for Noun.verb pattern */
  [key: string]: unknown
}

/**
 * DataProvider from @dotdo/react/admin
 */
export interface DataProvider {
  getList: (params: unknown) => Promise<unknown>
  getOne: (params: unknown) => Promise<unknown>
  getMany: (params: unknown) => Promise<unknown>
  create: (params: unknown) => Promise<unknown>
  update: (params: unknown) => Promise<unknown>
  delete: (params: unknown) => Promise<unknown>
  deleteMany: (params: unknown) => Promise<unknown>
  subscribe?: (resource: string, callback: (event: unknown) => void) => () => void
}

/**
 * Configuration for DotdoDataProvider
 */
export interface DotdoDataProviderConfig {
  /** Namespace URL for the Durable Object */
  ns: string
  /** Custom headers for requests */
  headers?: Record<string, string>
  /** Request timeout in milliseconds */
  timeout?: number
  /** Enable real-time subscriptions */
  realtime?: boolean
}

// Type definitions for @dotdo/react components
type DOProviderComponent = ComponentType<{ ns: string; config?: unknown; children: ReactNode }>
type AdminProviderComponent = ComponentType<{ dataProvider: DataProvider; children: ReactNode }>
type DotdoDataProviderFactory = (config: DotdoDataProviderConfig) => DataProvider
type Use$Hook = () => WorkflowContext

// Dynamic imports for optional @dotdo/react dependency
let DOProvider: DOProviderComponent | null = null
let DotdoAdminProvider: AdminProviderComponent | null = null
let DotdoDataProviderFn: DotdoDataProviderFactory | null = null
let use$Hook: Use$Hook | null = null
let dotdoAvailable = false

// Try to import @dotdo/react at module load time
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotdoReact = require('@dotdo/react')
  DOProvider = dotdoReact.DO
  use$Hook = dotdoReact.use$

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotdoReactAdmin = require('@dotdo/react/admin')
  DotdoAdminProvider = dotdoReactAdmin.AdminProvider
  DotdoDataProviderFn = dotdoReactAdmin.DotdoDataProvider

  dotdoAvailable = true
} catch {
  // @dotdo/react is not installed, will use stub context
}

// =============================================================================
// App Provider - Provides the app configuration to all children
// =============================================================================

/**
 * App context value
 */
export interface AppContextValue {
  /** The resolved app configuration */
  app: ResolvedApp
  /** The dotdo endpoint URL */
  endpoint?: string
  /** Current namespace for multi-tenant isolation */
  namespace?: string
}

const AppContext = createContext<AppContextValue | null>(null)

/**
 * Props for AppProvider
 */
export interface AppProviderProps {
  /** The resolved app from defineApp() */
  app: ResolvedApp
  /** Children to render */
  children: ReactNode
}

/**
 * AppProvider - Provides app configuration to the component tree
 *
 * Wraps your application to provide access to the app configuration
 * from any component via the useApp hook.
 *
 * @example
 * ```tsx
 * import { defineApp, AppProvider } from 'saaskit'
 *
 * const app = defineApp({
 *   nouns: ['User', 'Product'],
 * })
 *
 * function Root() {
 *   return (
 *     <AppProvider app={app}>
 *       <App />
 *     </AppProvider>
 *   )
 * }
 * ```
 */
export function AppProvider({ app, children }: AppProviderProps): ReactNode {
  const value: AppContextValue = {
    app,
    endpoint: app.config.do,
    namespace: app.config.ns,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/**
 * useApp - Access the app configuration
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { app, namespace } = useApp()
 *
 *   return (
 *     <div>
 *       <p>Nouns: {Array.from(app.nouns).join(', ')}</p>
 *       <p>Namespace: {namespace}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// =============================================================================
// SaaS Provider - Main provider that combines all necessary providers
// =============================================================================

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Auth provider type */
  provider?: 'custom' | 'clerk' | 'auth0' | 'supabase'
  /** Custom sign in handler */
  onSignIn?: (email: string, password: string) => Promise<unknown>
  /** Custom sign out handler */
  onSignOut?: () => Promise<void>
  /** Token refresh interval in milliseconds */
  tokenRefreshInterval?: number
}

/**
 * Realtime configuration
 */
export interface RealtimeConfig {
  /** Enable realtime updates */
  enabled?: boolean
  /** WebSocket endpoint (defaults to app endpoint + /ws) */
  endpoint?: string
  /** Reconnection settings */
  reconnect?: {
    enabled?: boolean
    maxAttempts?: number
    delay?: number
  }
}

/**
 * SaaS context value
 */
export interface SaaSContextValue {
  /** App configuration */
  app: ResolvedApp
  /** Runtime context for backend operations */
  $: AppContext
  /** Current organization */
  organization?: {
    id: string
    name: string
    slug: string
  }
  /** Current user */
  user?: {
    id: string
    email: string
    name?: string
    role: string
  }
  /** Whether the user is authenticated */
  isAuthenticated: boolean
  /** Whether data is loading */
  isLoading: boolean
}

const SaaSContext = createContext<SaaSContextValue | null>(null)

/**
 * Props for SaaSProvider
 */
export interface SaaSProviderProps {
  /** The resolved app from defineApp() */
  app: ResolvedApp
  /** Authentication configuration */
  auth?: AuthConfig
  /** Realtime configuration */
  realtime?: RealtimeConfig
  /** Initial organization ID for multi-tenant */
  organizationId?: string
  /**
   * Pre-configured DataProvider instance.
   * Use this for custom data provider configurations.
   * Takes precedence over `app.config.do` if provided.
   */
  dataProvider?: DataProvider
  /**
   * Additional configuration for DotdoDataProvider.
   * Only used when `app.config.do` is provided and no `dataProvider` is passed.
   */
  dotdoConfig?: Omit<DotdoDataProviderConfig, 'ns'>
  /** Children to render */
  children: ReactNode
}

/**
 * Create a stub AppContext for development
 */
function createStubAppContext(): AppContext {
  return {
    async notify(userId: string, message: string) {
      console.log(`[notify] ${userId}: ${message}`)
    },
    email: {
      async send(options) {
        console.log('[email.send]', options)
      },
    },
    slack: {
      async send(channel, message) {
        console.log(`[slack.send] #${channel}: ${message}`)
      },
    },
    db: {
      async get(noun, id) {
        console.log(`[db.get] ${noun}/${id}`)
        return null
      },
      async list(noun, options) {
        console.log(`[db.list] ${noun}`, options)
        return []
      },
      async create(noun, data) {
        console.log(`[db.create] ${noun}`, data)
        return { id: 'stub-id', ...data } as never
      },
      async update(noun, id, data) {
        console.log(`[db.update] ${noun}/${id}`, data)
        return { id, ...data } as never
      },
      async delete(noun, id) {
        console.log(`[db.delete] ${noun}/${id}`)
      },
    },
    kv: {
      async get(key) {
        console.log(`[kv.get] ${key}`)
        return null
      },
      async set(key, value) {
        console.log(`[kv.set] ${key}`, value)
      },
      async delete(key) {
        console.log(`[kv.delete] ${key}`)
      },
    },
    queue: {
      async send(queueName, message) {
        console.log(`[queue.send] ${queueName}`, message)
      },
    },
    log: {
      info(message, data) {
        console.log(`[info] ${message}`, data)
      },
      warn(message, data) {
        console.warn(`[warn] ${message}`, data)
      },
      error(message, data) {
        console.error(`[error] ${message}`, data)
      },
    },
    every: {} as never, // Schedule builder not needed at runtime
    api: {}, // Integration API access stub
    send(event, payload) {
      console.log(`[send] ${event}`, payload)
    },
    async do(action, payload) {
      console.log(`[do] ${action}`, payload)
      return {}
    },
  }
}

/**
 * SaaSProvider - Main provider for saaskit applications
 *
 * Combines all necessary providers and context for a SaaS application:
 * - App configuration
 * - Authentication
 * - Organization context
 * - Realtime subscriptions
 * - Backend operations ($)
 *
 * @example
 * ```tsx
 * import { defineApp, SaaSProvider, SaaS } from 'saaskit'
 *
 * const app = defineApp({
 *   do: 'https://api.myapp.do',
 *   ns: 'tenant-123',
 *   nouns: ['User', 'Product', 'Order'],
 * })
 *
 * function Root() {
 *   return (
 *     <SaaSProvider
 *       app={app}
 *       auth={{
 *         provider: 'clerk',
 *       }}
 *       realtime={{
 *         enabled: true,
 *       }}
 *     >
 *       <SaaS app={app} />
 *     </SaaSProvider>
 *   )
 * }
 * ```
 */
export function SaaSProvider({
  app,
  auth,
  realtime,
  organizationId,
  children,
}: SaaSProviderProps): ReactNode {
  // TODO: Implement authentication state management
  // TODO: Implement organization context
  // TODO: Implement realtime WebSocket connection
  // TODO: Connect to dotdo backend

  // Create stub context for now
  const $ = createStubAppContext()

  const value: SaaSContextValue = {
    app,
    $,
    organization: organizationId
      ? { id: organizationId, name: 'Organization', slug: 'org' }
      : undefined,
    user: undefined,
    isAuthenticated: false,
    isLoading: false,
  }

  return (
    <SaaSContext.Provider value={value}>
      <AppContext.Provider value={{ app, endpoint: app.config.do, namespace: app.config.ns }}>
        {children}
      </AppContext.Provider>
    </SaaSContext.Provider>
  )
}

/**
 * useSaaS - Access the full SaaS context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { app, $, user, organization } = useSaaS()
 *
 *   const handleCreate = async () => {
 *     await $.db.create('Product', { name: 'New Product' })
 *   }
 *
 *   return (
 *     <div>
 *       <p>User: {user?.name}</p>
 *       <p>Org: {organization?.name}</p>
 *       <button onClick={handleCreate}>Create Product</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useSaaS(): SaaSContextValue {
  const context = useContext(SaaSContext)
  if (!context) {
    throw new Error('useSaaS must be used within a SaaSProvider')
  }
  return context
}

/**
 * useAppContext - Access the $ runtime context
 *
 * Shortcut to get just the AppContext for backend operations.
 *
 * @example
 * ```tsx
 * function CreateProduct() {
 *   const $ = useAppContext()
 *
 *   const handleCreate = async () => {
 *     const product = await $.db.create('Product', {
 *       name: 'New Product',
 *       price: 99,
 *     })
 *     console.log('Created:', product)
 *   }
 *
 *   return <button onClick={handleCreate}>Create</button>
 * }
 * ```
 */
export function useAppContext(): AppContext {
  const { $ } = useSaaS()
  return $
}
