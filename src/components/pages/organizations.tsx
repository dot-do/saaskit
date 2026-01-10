import type { ReactNode } from 'react'

/**
 * Organization entity for multi-tenant management
 */
export interface Organization {
  id: string
  name: string
  slug: string
  logo?: string
  plan?: string
  status: 'active' | 'suspended' | 'pending'
  memberCount?: number
  createdAt: string
  updatedAt: string
}

/**
 * Props for the Organizations page component
 */
export interface OrganizationsPageProps {
  /**
   * Pre-loaded organizations data
   */
  organizations?: Organization[]

  /**
   * Callback when an organization is created
   */
  onCreate?: (data: Partial<Organization>) => Promise<Organization>

  /**
   * Callback when an organization is updated
   */
  onUpdate?: (id: string, data: Partial<Organization>) => Promise<Organization>

  /**
   * Callback when an organization is deleted
   */
  onDelete?: (id: string) => Promise<void>

  /**
   * Callback when switching to an organization
   */
  onSwitch?: (id: string) => Promise<void>

  /**
   * Currently active organization ID
   */
  activeOrgId?: string

  /**
   * Enable organization creation
   * @default true
   */
  allowCreate?: boolean

  /**
   * Enable organization deletion
   * @default true
   */
  allowDelete?: boolean

  /**
   * Custom empty state component
   */
  emptyState?: ReactNode
}

/**
 * OrganizationsPage - Multi-tenant organization management
 *
 * Provides a complete UI for managing organizations in a multi-tenant SaaS app.
 *
 * ## Features
 *
 * - List all organizations the user has access to
 * - Create new organizations
 * - Edit organization settings (name, logo, slug)
 * - Switch between organizations
 * - View organization members
 * - Manage organization billing/plan
 *
 * ## Data Model
 *
 * Organizations typically relate to:
 * - Users (members)
 * - Teams (within the org)
 * - All other nouns (scoped to org via namespace)
 *
 * @example
 * ```tsx
 * <OrganizationsPage
 *   organizations={orgs}
 *   activeOrgId={currentOrg.id}
 *   onSwitch={async (id) => {
 *     await setActiveOrg(id)
 *     router.push('/dashboard')
 *   }}
 * />
 * ```
 */
export function OrganizationsPage({
  organizations = [],
  onCreate,
  onUpdate,
  onDelete,
  onSwitch,
  activeOrgId,
  allowCreate = true,
  allowDelete = true,
  emptyState,
}: OrganizationsPageProps): ReactNode {
  // TODO: Implement organization list view
  // TODO: Implement create organization modal/form
  // TODO: Implement edit organization modal/form
  // TODO: Implement organization switcher
  // TODO: Implement delete confirmation dialog
  // TODO: Integrate with useResource hook for data fetching

  return (
    <div data-page="organizations">
      <header>
        <h1>Organizations</h1>
        {allowCreate && (
          <button type="button" onClick={() => onCreate?.({})}>
            Create Organization
          </button>
        )}
      </header>

      {organizations.length === 0 ? (
        emptyState || (
          <div data-empty-state>
            <p>No organizations found.</p>
            {allowCreate && <p>Create your first organization to get started.</p>}
          </div>
        )
      ) : (
        <ul data-org-list>
          {organizations.map((org) => (
            <li
              key={org.id}
              data-org-item
              data-active={org.id === activeOrgId ? 'true' : undefined}
            >
              <div data-org-info>
                {org.logo && <img src={org.logo} alt={org.name} />}
                <div>
                  <h3>{org.name}</h3>
                  <p>{org.slug}</p>
                  <span data-status={org.status}>{org.status}</span>
                </div>
              </div>

              <div data-org-actions>
                <button type="button" onClick={() => onSwitch?.(org.id)}>
                  {org.id === activeOrgId ? 'Active' : 'Switch'}
                </button>
                <button type="button" onClick={() => onUpdate?.(org.id, {})}>
                  Edit
                </button>
                {allowDelete && (
                  <button type="button" onClick={() => onDelete?.(org.id)}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default OrganizationsPage
