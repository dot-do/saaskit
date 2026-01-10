import type { ReactNode } from 'react'

/**
 * Audit log entry entity
 */
export interface AuditLogEntry {
  id: string
  timestamp: string
  actor: {
    id: string
    type: 'user' | 'api_key' | 'system'
    name?: string
    email?: string
  }
  action: string
  resource: {
    type: string
    id: string
    name?: string
  }
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
  location?: {
    country?: string
    city?: string
  }
}

/**
 * Audit log filter options
 */
export interface AuditLogFilters {
  startDate?: string
  endDate?: string
  actorId?: string
  actorType?: 'user' | 'api_key' | 'system'
  action?: string
  resourceType?: string
  resourceId?: string
}

/**
 * Props for the Audit Log page component
 */
export interface AuditLogPageProps {
  /**
   * Pre-loaded audit log entries
   */
  entries?: AuditLogEntry[]

  /**
   * Total count for pagination
   */
  totalCount?: number

  /**
   * Current page
   */
  page?: number

  /**
   * Items per page
   */
  pageSize?: number

  /**
   * Current filter values
   */
  filters?: AuditLogFilters

  /**
   * Callback when filters change
   */
  onFilterChange?: (filters: AuditLogFilters) => void

  /**
   * Callback when page changes
   */
  onPageChange?: (page: number) => void

  /**
   * Callback to view entry details
   */
  onViewDetails?: (id: string) => void

  /**
   * Callback to export audit logs
   */
  onExport?: (filters: AuditLogFilters, format: 'csv' | 'json') => Promise<void>

  /**
   * Available action types for filtering
   */
  availableActions?: string[]

  /**
   * Available resource types for filtering
   */
  availableResourceTypes?: string[]

  /**
   * Custom empty state component
   */
  emptyState?: ReactNode
}

/**
 * AuditLogPage - Activity audit log interface
 *
 * Provides a complete UI for viewing and searching audit logs.
 *
 * ## Features
 *
 * - View all activity in the system
 * - Filter by date range, actor, action, resource
 * - Search audit logs
 * - Export logs to CSV or JSON
 * - View detailed entry information
 * - IP and location tracking
 *
 * ## Audit Events
 *
 * Typical events tracked:
 * - User login/logout
 * - Resource CRUD operations
 * - Permission changes
 * - API key usage
 * - Configuration changes
 *
 * @example
 * ```tsx
 * <AuditLogPage
 *   entries={logs}
 *   totalCount={totalLogs}
 *   page={currentPage}
 *   onFilterChange={(filters) => {
 *     setFilters(filters)
 *     refetchLogs(filters)
 *   }}
 *   onExport={async (filters, format) => {
 *     const data = await api.auditLogs.export(filters, format)
 *     downloadFile(data, `audit-log.${format}`)
 *   }}
 * />
 * ```
 */
export function AuditLogPage({
  entries = [],
  totalCount = 0,
  page = 1,
  pageSize = 50,
  filters = {},
  onFilterChange,
  onPageChange,
  onViewDetails,
  onExport,
  availableActions = [],
  availableResourceTypes = [],
  emptyState,
}: AuditLogPageProps): ReactNode {
  // TODO: Implement audit log list view
  // TODO: Implement filter controls (date picker, dropdowns)
  // TODO: Implement search functionality
  // TODO: Implement pagination
  // TODO: Implement entry detail modal
  // TODO: Implement export functionality
  // TODO: Integrate with useResource hook for data fetching

  const totalPages = Math.ceil(totalCount / pageSize)

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getActorDisplay = (actor: AuditLogEntry['actor']) => {
    if (actor.type === 'system') return 'System'
    if (actor.type === 'api_key') return `API Key: ${actor.name || actor.id}`
    return actor.name || actor.email || actor.id
  }

  return (
    <div data-page="audit-log">
      <header>
        <h1>Audit Log</h1>
        <div data-header-actions>
          <button type="button" onClick={() => onExport?.(filters, 'csv')}>
            Export CSV
          </button>
          <button type="button" onClick={() => onExport?.(filters, 'json')}>
            Export JSON
          </button>
        </div>
      </header>

      {/* Filters */}
      <div data-filters>
        <div data-date-range>
          <label>
            From:
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) =>
                onFilterChange?.({ ...filters, startDate: e.target.value })
              }
            />
          </label>
          <label>
            To:
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) =>
                onFilterChange?.({ ...filters, endDate: e.target.value })
              }
            />
          </label>
        </div>

        <select
          value={filters.actorType || ''}
          onChange={(e) =>
            onFilterChange?.({
              ...filters,
              actorType: e.target.value as AuditLogFilters['actorType'],
            })
          }
        >
          <option value="">All actors</option>
          <option value="user">Users</option>
          <option value="api_key">API Keys</option>
          <option value="system">System</option>
        </select>

        {availableActions.length > 0 && (
          <select
            value={filters.action || ''}
            onChange={(e) =>
              onFilterChange?.({ ...filters, action: e.target.value })
            }
          >
            <option value="">All actions</option>
            {availableActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        )}

        {availableResourceTypes.length > 0 && (
          <select
            value={filters.resourceType || ''}
            onChange={(e) =>
              onFilterChange?.({ ...filters, resourceType: e.target.value })
            }
          >
            <option value="">All resources</option>
            {availableResourceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => onFilterChange?.({})}
          disabled={Object.keys(filters).length === 0}
        >
          Clear Filters
        </button>
      </div>

      {/* Results count */}
      <div data-results-count>
        Showing {entries.length} of {totalCount} entries
      </div>

      {entries.length === 0 ? (
        emptyState || (
          <div data-empty-state>
            <p>No audit log entries found.</p>
            {Object.keys(filters).length > 0 && (
              <p>Try adjusting your filters.</p>
            )}
          </div>
        )
      ) : (
        <>
          <table data-audit-log-table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>IP Address</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} data-audit-log-row>
                  <td>
                    <time dateTime={entry.timestamp}>
                      {formatTimestamp(entry.timestamp)}
                    </time>
                  </td>
                  <td>
                    <div data-actor>
                      <span data-actor-type={entry.actor.type}>
                        {entry.actor.type}
                      </span>
                      <span>{getActorDisplay(entry.actor)}</span>
                    </div>
                  </td>
                  <td>
                    <code data-action>{entry.action}</code>
                  </td>
                  <td>
                    <div data-resource>
                      <span data-resource-type>{entry.resource.type}</span>
                      <span>{entry.resource.name || entry.resource.id}</span>
                    </div>
                  </td>
                  <td>
                    {entry.ip && (
                      <div data-location>
                        <span>{entry.ip}</span>
                        {entry.location && (
                          <span>
                            {entry.location.city}, {entry.location.country}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onViewDetails?.(entry.id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav data-pagination>
              <button
                type="button"
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}

export default AuditLogPage
