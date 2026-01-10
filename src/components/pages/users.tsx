import type { ReactNode } from 'react'

/**
 * User entity for user management
 */
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  role: string
  status: 'active' | 'invited' | 'suspended' | 'deleted'
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * Props for the Users page component
 */
export interface UsersPageProps {
  /**
   * Pre-loaded users data
   */
  users?: User[]

  /**
   * Callback when a user is invited
   */
  onInvite?: (email: string, role: string) => Promise<User>

  /**
   * Callback when a user is updated
   */
  onUpdate?: (id: string, data: Partial<User>) => Promise<User>

  /**
   * Callback when a user is deleted/removed
   */
  onDelete?: (id: string) => Promise<void>

  /**
   * Callback when impersonating a user
   */
  onImpersonate?: (id: string) => Promise<void>

  /**
   * Current user ID (to prevent self-deletion, etc.)
   */
  currentUserId?: string

  /**
   * Available roles for assignment
   */
  availableRoles?: string[]

  /**
   * Enable user invitation
   * @default true
   */
  allowInvite?: boolean

  /**
   * Enable user deletion
   * @default true
   */
  allowDelete?: boolean

  /**
   * Enable user impersonation
   * @default false
   */
  allowImpersonate?: boolean

  /**
   * Custom empty state component
   */
  emptyState?: ReactNode
}

/**
 * UsersPage - User management interface
 *
 * Provides a complete UI for managing users in your SaaS app.
 *
 * ## Features
 *
 * - List all users with search and filters
 * - Invite new users by email
 * - Edit user details and roles
 * - Suspend/activate users
 * - Impersonate users (admin feature)
 * - View user activity
 *
 * ## Permissions
 *
 * This page typically requires admin-level permissions.
 * Use with authorization middleware to protect access.
 *
 * @example
 * ```tsx
 * <UsersPage
 *   users={users}
 *   currentUserId={session.user.id}
 *   availableRoles={['admin', 'member', 'viewer']}
 *   onInvite={async (email, role) => {
 *     const user = await api.users.invite({ email, role })
 *     return user
 *   }}
 * />
 * ```
 */
export function UsersPage({
  users = [],
  onInvite,
  onUpdate,
  onDelete,
  onImpersonate,
  currentUserId,
  availableRoles = ['admin', 'member', 'viewer'],
  allowInvite = true,
  allowDelete = true,
  allowImpersonate = false,
  emptyState,
}: UsersPageProps): ReactNode {
  // TODO: Implement user list view with search/filter
  // TODO: Implement invite user modal
  // TODO: Implement edit user modal
  // TODO: Implement role assignment dropdown
  // TODO: Implement user status management
  // TODO: Implement impersonation flow
  // TODO: Integrate with useResource hook for data fetching

  return (
    <div data-page="users">
      <header>
        <h1>Users</h1>
        {allowInvite && (
          <button type="button" onClick={() => onInvite?.('', 'member')}>
            Invite User
          </button>
        )}
      </header>

      {/* Search and filters */}
      <div data-filters>
        <input type="search" placeholder="Search users..." />
        <select>
          <option value="">All roles</option>
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <select>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {users.length === 0 ? (
        emptyState || (
          <div data-empty-state>
            <p>No users found.</p>
            {allowInvite && <p>Invite your first team member to get started.</p>}
          </div>
        )
      ) : (
        <table data-user-table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} data-user-row>
                <td>
                  <div data-user-info>
                    {user.avatar && <img src={user.avatar} alt={user.name} />}
                    <div>
                      <span>{user.name || 'Unnamed'}</span>
                      <span>{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => onUpdate?.(user.id, { role: e.target.value })}
                    disabled={user.id === currentUserId}
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span data-status={user.status}>{user.status}</span>
                </td>
                <td>{user.lastLoginAt || 'Never'}</td>
                <td>
                  {allowImpersonate && user.id !== currentUserId && (
                    <button type="button" onClick={() => onImpersonate?.(user.id)}>
                      Impersonate
                    </button>
                  )}
                  {allowDelete && user.id !== currentUserId && (
                    <button type="button" onClick={() => onDelete?.(user.id)}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default UsersPage
