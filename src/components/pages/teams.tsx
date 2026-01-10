import type { ReactNode } from 'react'

/**
 * Team entity for team management
 */
export interface Team {
  id: string
  name: string
  description?: string
  memberCount: number
  createdAt: string
  updatedAt: string
}

/**
 * Team member entity
 */
export interface TeamMember {
  id: string
  userId: string
  teamId: string
  role: 'owner' | 'admin' | 'member'
  user?: {
    id: string
    name?: string
    email: string
    avatar?: string
  }
  joinedAt: string
}

/**
 * Props for the Teams page component
 */
export interface TeamsPageProps {
  /**
   * Pre-loaded teams data
   */
  teams?: Team[]

  /**
   * Callback when a team is created
   */
  onCreate?: (data: Partial<Team>) => Promise<Team>

  /**
   * Callback when a team is updated
   */
  onUpdate?: (id: string, data: Partial<Team>) => Promise<Team>

  /**
   * Callback when a team is deleted
   */
  onDelete?: (id: string) => Promise<void>

  /**
   * Callback to view team details
   */
  onView?: (id: string) => void

  /**
   * Enable team creation
   * @default true
   */
  allowCreate?: boolean

  /**
   * Enable team deletion
   * @default true
   */
  allowDelete?: boolean

  /**
   * Custom empty state component
   */
  emptyState?: ReactNode
}

/**
 * TeamsPage - Team management interface
 *
 * Provides a complete UI for managing teams within an organization.
 *
 * ## Features
 *
 * - List all teams
 * - Create new teams
 * - Edit team details
 * - View team members
 * - Add/remove team members
 * - Assign team roles
 *
 * ## Team Structure
 *
 * Teams provide a way to group users within an organization for:
 * - Access control (team-based permissions)
 * - Collaboration (shared resources)
 * - Organization (department/project structure)
 *
 * @example
 * ```tsx
 * <TeamsPage
 *   teams={teams}
 *   onCreate={async (data) => {
 *     const team = await api.teams.create(data)
 *     return team
 *   }}
 *   onView={(id) => router.push(`/teams/${id}`)}
 * />
 * ```
 */
export function TeamsPage({
  teams = [],
  onCreate,
  onUpdate,
  onDelete,
  onView,
  allowCreate = true,
  allowDelete = true,
  emptyState,
}: TeamsPageProps): ReactNode {
  // TODO: Implement team list view
  // TODO: Implement create team modal
  // TODO: Implement edit team modal
  // TODO: Implement team member management
  // TODO: Integrate with useResource hook for data fetching

  return (
    <div data-page="teams">
      <header>
        <h1>Teams</h1>
        {allowCreate && (
          <button type="button" onClick={() => onCreate?.({})}>
            Create Team
          </button>
        )}
      </header>

      {teams.length === 0 ? (
        emptyState || (
          <div data-empty-state>
            <p>No teams found.</p>
            {allowCreate && <p>Create your first team to organize your members.</p>}
          </div>
        )
      ) : (
        <div data-team-grid>
          {teams.map((team) => (
            <div key={team.id} data-team-card onClick={() => onView?.(team.id)}>
              <div data-team-header>
                <h3>{team.name}</h3>
                <span data-member-count>{team.memberCount} members</span>
              </div>

              {team.description && <p data-team-description>{team.description}</p>}

              <div data-team-actions>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdate?.(team.id, {})
                  }}
                >
                  Edit
                </button>
                {allowDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete?.(team.id)
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TeamsPage
