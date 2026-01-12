/**
 * saaskit hooks
 *
 * React hooks for interacting with the SaaS backend.
 */

import type { ListOptions } from '../types/context'

/**
 * Resource data returned by useResource hook
 */
export interface ResourceData<T> {
  /** The data items */
  data: T[]
  /** Whether the data is currently loading */
  isLoading: boolean
  /** Error if the request failed */
  error: Error | null
  /** Total count for pagination */
  totalCount?: number
  /** Whether there are more items */
  hasMore?: boolean
}

/**
 * Resource mutation functions returned by useResource hook
 */
export interface ResourceMutations<T> {
  /** Create a new resource */
  create: (data: Partial<T>) => Promise<T>
  /** Update an existing resource */
  update: (id: string, data: Partial<T>) => Promise<T>
  /** Delete a resource */
  remove: (id: string) => Promise<void>
  /** Refetch the data */
  refetch: () => Promise<void>
}

/**
 * Options for useResource hook
 */
export interface UseResourceOptions extends ListOptions {
  /** Whether to fetch data immediately */
  enabled?: boolean
  /** Poll interval in milliseconds */
  pollInterval?: number
  /** Callback when data changes */
  onSuccess?: (data: unknown[]) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

/**
 * useResource - CRUD operations for a noun
 *
 * Provides data fetching and mutations for a specific noun in your app.
 * Integrates with TanStack Query for caching and synchronization.
 *
 * ## Features
 *
 * - Automatic data fetching
 * - Optimistic updates
 * - Pagination support
 * - Filter and sort support
 * - Real-time updates (with useRealtime)
 *
 * @example
 * ```tsx
 * function ProductList() {
 *   const { data, isLoading, create, update, remove } = useResource<Product>('Product', {
 *     filter: { status: 'active' },
 *     orderBy: 'createdAt',
 *     order: 'desc',
 *   })
 *
 *   if (isLoading) return <Loading />
 *
 *   return (
 *     <ul>
 *       {data.map(product => (
 *         <li key={product.id}>{product.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useResource<T extends { id: string }>(
  noun: string,
  _options: UseResourceOptions = {}
): ResourceData<T> & ResourceMutations<T> {
  // TODO: Implement with TanStack Query
  // TODO: Connect to dotdo backend via app context
  // TODO: Implement optimistic updates
  // TODO: Implement pagination
  // TODO: Implement polling

  // Stub implementation - returns noop functions for development
  return {
    data: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    hasMore: false,

    async create(data: Partial<T>): Promise<T> {
      console.warn(`[saaskit] useResource.create called for "${noun}" - not connected to backend`)
      return { id: `${noun.toLowerCase()}_${Date.now()}`, ...data } as T
    },

    async update(id: string, data: Partial<T>): Promise<T> {
      console.warn(`[saaskit] useResource.update called for "${noun}/${id}" - not connected to backend`)
      return { id, ...data } as T
    },

    async remove(id: string): Promise<void> {
      console.warn(`[saaskit] useResource.remove called for "${noun}/${id}" - not connected to backend`)
    },

    async refetch(): Promise<void> {
      console.warn(`[saaskit] useResource.refetch called for "${noun}" - not connected to backend`)
    },
  }
}

/**
 * Realtime subscription status
 */
export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Realtime event from server
 */
export interface RealtimeEvent<T = unknown> {
  type: 'created' | 'updated' | 'deleted'
  noun: string
  id: string
  data?: T
  timestamp: string
}

/**
 * Options for useRealtime hook
 */
export interface UseRealtimeOptions {
  /** Nouns to subscribe to */
  nouns?: string[]
  /** Event types to listen for */
  events?: ('created' | 'updated' | 'deleted')[]
  /** Callback when an event is received */
  onEvent?: (event: RealtimeEvent) => void
  /** Whether the subscription is enabled */
  enabled?: boolean
}

/**
 * Return value of useRealtime hook
 */
export interface UseRealtimeResult {
  /** Current connection status */
  status: RealtimeStatus
  /** Last error if any */
  error: Error | null
  /** Manually reconnect */
  reconnect: () => void
  /** Disconnect the subscription */
  disconnect: () => void
}

/**
 * useRealtime - Live updates subscription
 *
 * Subscribes to real-time events from the dotdo backend.
 * Events are pushed via WebSocket or SSE.
 *
 * ## Features
 *
 * - WebSocket connection management
 * - Automatic reconnection
 * - Event filtering by noun and type
 * - Integration with useResource for automatic cache updates
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { status } = useRealtime({
 *     nouns: ['Order', 'User'],
 *     events: ['created', 'updated'],
 *     onEvent: (event) => {
 *       console.log('New event:', event)
 *       toast(`${event.noun} ${event.type}!`)
 *     },
 *   })
 *
 *   return (
 *     <div>
 *       <span data-status={status}>{status}</span>
 *       {/* Dashboard content *\/}
 *     </div>
 *   )
 * }
 * ```
 */
export function useRealtime(_options: UseRealtimeOptions = {}): UseRealtimeResult {
  // TODO: Implement WebSocket/SSE connection
  // TODO: Implement event filtering
  // TODO: Implement reconnection logic
  // TODO: Integrate with TanStack Query cache

  // Stub implementation - noop functions for development
  return {
    status: 'disconnected',
    error: null,

    reconnect() {
      console.warn('[saaskit] useRealtime.reconnect called - not connected to backend')
    },

    disconnect() {
      console.warn('[saaskit] useRealtime.disconnect called - not connected to backend')
    },
  }
}

/**
 * Current user data
 */
export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar?: string
  role: string
  permissions?: string[]
  organizationId?: string
  organizationRole?: string
}

/**
 * Authentication state
 */
export interface AuthState {
  /** Current user if authenticated */
  user: AuthUser | null
  /** Whether authentication is being checked */
  isLoading: boolean
  /** Whether the user is authenticated */
  isAuthenticated: boolean
  /** Error if authentication failed */
  error: Error | null
}

/**
 * Authentication actions
 */
export interface AuthActions {
  /** Sign in with email/password */
  signIn: (email: string, password: string) => Promise<AuthUser>
  /** Sign up with email/password */
  signUp: (email: string, password: string, name?: string) => Promise<AuthUser>
  /** Sign out */
  signOut: () => Promise<void>
  /** Request password reset */
  resetPassword: (email: string) => Promise<void>
  /** Update current user profile */
  updateProfile: (data: Partial<AuthUser>) => Promise<AuthUser>
  /** Refresh the authentication session */
  refreshSession: () => Promise<void>
}

/**
 * useAuth - Authentication hook
 *
 * Provides authentication state and actions for the current user.
 * Integrates with the SaaS authentication provider.
 *
 * ## Features
 *
 * - Current user state
 * - Sign in/up/out actions
 * - Password reset
 * - Profile updates
 * - Session management
 * - Permission checking
 *
 * @example
 * ```tsx
 * function Header() {
 *   const { user, isAuthenticated, signOut } = useAuth()
 *
 *   if (!isAuthenticated) {
 *     return <LoginButton />
 *   }
 *
 *   return (
 *     <header>
 *       <span>Welcome, {user.name}!</span>
 *       <button onClick={signOut}>Sign Out</button>
 *     </header>
 *   )
 * }
 * ```
 */
export function useAuth(): AuthState & AuthActions {
  // TODO: Implement with auth provider context
  // TODO: Implement session persistence
  // TODO: Implement token refresh
  // TODO: Implement permission helpers

  // Stub implementation - noop functions for development
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,

    async signIn(email: string, _password: string): Promise<AuthUser> {
      console.warn(`[saaskit] useAuth.signIn called for "${email}" - not connected to backend`)
      return {
        id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0],
        role: 'user',
      }
    },

    async signUp(email: string, _password: string, name?: string): Promise<AuthUser> {
      console.warn(`[saaskit] useAuth.signUp called for "${email}" - not connected to backend`)
      return {
        id: `user_${Date.now()}`,
        email,
        name: name ?? email.split('@')[0],
        role: 'user',
      }
    },

    async signOut(): Promise<void> {
      console.warn('[saaskit] useAuth.signOut called - not connected to backend')
    },

    async resetPassword(email: string): Promise<void> {
      console.warn(`[saaskit] useAuth.resetPassword called for "${email}" - not connected to backend`)
    },

    async updateProfile(data: Partial<AuthUser>): Promise<AuthUser> {
      console.warn('[saaskit] useAuth.updateProfile called - not connected to backend')
      return {
        id: 'user_stub',
        email: 'stub@example.com.ai',
        role: 'user',
        ...data,
      }
    },

    async refreshSession(): Promise<void> {
      console.warn('[saaskit] useAuth.refreshSession called - not connected to backend')
    },
  }
}

/**
 * usePermission - Permission checking hook
 *
 * Checks if the current user has a specific permission.
 *
 * @example
 * ```tsx
 * function DeleteButton({ id }) {
 *   const canDelete = usePermission('products.delete')
 *
 *   if (!canDelete) return null
 *
 *   return <button onClick={() => deleteProduct(id)}>Delete</button>
 * }
 * ```
 */
export function usePermission(_permission: string): boolean {
  // TODO: Implement permission checking
  // For now, return false (no permission)
  return false
}

/**
 * useOrganization - Current organization hook
 *
 * Provides the current organization context for multi-tenant apps.
 *
 * @example
 * ```tsx
 * function OrgBanner() {
 *   const { organization, switchOrganization } = useOrganization()
 *
 *   return (
 *     <div>
 *       <span>{organization?.name}</span>
 *       <button onClick={() => switchOrganization('other-org')}>
 *         Switch
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useOrganization(): {
  organization: { id: string; name: string; slug: string } | null
  isLoading: boolean
  switchOrganization: (id: string) => Promise<void>
} {
  // Stub implementation - noop functions for development
  return {
    organization: null,
    isLoading: false,
    async switchOrganization(id: string): Promise<void> {
      console.warn(`[saaskit] useOrganization.switchOrganization called for "${id}" - not connected to backend`)
    },
  }
}
