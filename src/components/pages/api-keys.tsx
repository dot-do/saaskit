import type { ReactNode } from 'react'

/**
 * API Key entity
 */
export interface APIKey {
  id: string
  name: string
  key: string // Only shown once at creation, masked afterward
  prefix: string // e.g., 'sk_live_' or 'sk_test_'
  lastUsedAt?: string
  expiresAt?: string
  scopes?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Props for the API Keys page component
 */
export interface APIKeysPageProps {
  /**
   * Pre-loaded API keys data
   */
  apiKeys?: APIKey[]

  /**
   * Callback when an API key is created
   * Returns the full key (only shown once)
   */
  onCreate?: (data: { name: string; scopes?: string[]; expiresAt?: string }) => Promise<APIKey & { secretKey: string }>

  /**
   * Callback when an API key is revoked/deleted
   */
  onRevoke?: (id: string) => Promise<void>

  /**
   * Callback when an API key is regenerated
   * Returns the new full key (only shown once)
   */
  onRegenerate?: (id: string) => Promise<APIKey & { secretKey: string }>

  /**
   * Available scopes for API keys
   */
  availableScopes?: Array<{
    id: string
    name: string
    description?: string
  }>

  /**
   * Enable key creation
   * @default true
   */
  allowCreate?: boolean

  /**
   * Custom empty state component
   */
  emptyState?: ReactNode
}

/**
 * APIKeysPage - API key management interface
 *
 * Provides a complete UI for managing API keys in your SaaS app.
 *
 * ## Features
 *
 * - List all API keys with masked values
 * - Create new API keys with optional scopes
 * - Copy key to clipboard (only at creation)
 * - Revoke/delete API keys
 * - View last used timestamp
 * - Set key expiration
 *
 * ## Security
 *
 * - Full API key is only shown once at creation
 * - Keys are stored hashed, not plaintext
 * - Support for scoped keys (limit permissions)
 * - Automatic expiration support
 *
 * @example
 * ```tsx
 * <APIKeysPage
 *   apiKeys={keys}
 *   availableScopes={[
 *     { id: 'read', name: 'Read', description: 'Read-only access' },
 *     { id: 'write', name: 'Write', description: 'Read and write access' },
 *   ]}
 *   onCreate={async (data) => {
 *     const result = await api.apiKeys.create(data)
 *     return result
 *   }}
 * />
 * ```
 */
export function APIKeysPage({
  apiKeys = [],
  onCreate,
  onRevoke,
  onRegenerate,
  availableScopes = [],
  allowCreate = true,
  emptyState,
}: APIKeysPageProps): ReactNode {
  // TODO: Implement API key list view
  // TODO: Implement create key modal with scope selection
  // TODO: Implement key reveal/copy UI (one-time display)
  // TODO: Implement revoke confirmation dialog
  // TODO: Implement key regeneration flow
  // TODO: Integrate with useResource hook for data fetching

  const maskKey = (key: string): string => {
    if (key.length <= 8) return '••••••••'
    return `${key.slice(0, 7)}••••••••${key.slice(-4)}`
  }

  return (
    <div data-page="api-keys">
      <header>
        <h1>API Keys</h1>
        {allowCreate && (
          <button type="button" onClick={() => onCreate?.({ name: '' })}>
            Create API Key
          </button>
        )}
      </header>

      <div data-info-banner>
        <p>
          API keys are used to authenticate API requests. Keep your keys secure
          and never share them publicly.
        </p>
      </div>

      {apiKeys.length === 0 ? (
        emptyState || (
          <div data-empty-state>
            <p>No API keys found.</p>
            {allowCreate && (
              <p>Create an API key to start making authenticated requests.</p>
            )}
          </div>
        )
      ) : (
        <table data-api-key-table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Scopes</th>
              <th>Last Used</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((apiKey) => (
              <tr key={apiKey.id} data-api-key-row>
                <td>{apiKey.name}</td>
                <td>
                  <code data-masked-key>{maskKey(apiKey.key)}</code>
                </td>
                <td>
                  {apiKey.scopes?.length ? (
                    <span data-scopes>{apiKey.scopes.join(', ')}</span>
                  ) : (
                    <span data-scopes-all>All scopes</span>
                  )}
                </td>
                <td>{apiKey.lastUsedAt || 'Never'}</td>
                <td>{apiKey.expiresAt || 'Never'}</td>
                <td>
                  <button type="button" onClick={() => onRegenerate?.(apiKey.id)}>
                    Regenerate
                  </button>
                  <button type="button" onClick={() => onRevoke?.(apiKey.id)}>
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {availableScopes.length > 0 && (
        <div data-scopes-reference>
          <h3>Available Scopes</h3>
          <ul>
            {availableScopes.map((scope) => (
              <li key={scope.id}>
                <strong>{scope.name}</strong>
                {scope.description && <span> - {scope.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default APIKeysPage
