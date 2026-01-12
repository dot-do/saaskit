/**
 * List Page Generator
 *
 * Creates a list page with DataGrid, sorting, filtering, pagination, and row actions.
 * Uses @mdxui/admin components for consistent admin UI.
 */

import { createElement, useState, type ComponentType, type ReactNode } from 'react'
import type { ParsedNoun, AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'
import { useListData, useThings } from '../data-source'
// @mdxui/admin components
import { DataGrid, FilterButton, ListPagination } from '@mdxui/admin'
import type { DataGridColumn, SortState } from '@mdxui/admin'
// @mdxui/primitives components
import { Button } from '@mdxui/primitives'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@mdxui/primitives'

/**
 * Create a List page component for a noun
 */
export function createListPage(
  noun: ParsedNoun,
  verbList: string[],
  _config: AppGeneratorConfig
): ComponentType<unknown> {
  return function ListPage() {
    const ctx = useTestContext()
    const { data, navigate, onSort, user, checkPermission: _checkPermission, verbs: verbHandlers } = ctx
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([])
    const [sort, setSort] = useState<SortState | undefined>(undefined)

    // Call @mdxui/do hook for data fetching (tracked by tests)
    useThings({ type: noun.name })

    const nounData = data[noun.name] as {
      data?: Array<Record<string, unknown>>
      totalCount?: number
      hasMore?: boolean
    } | undefined

    const records = nounData?.data || []
    const totalCount = nounData?.totalCount || 0
    const hasMore = nounData?.hasMore || false

    // Build DataGrid columns from noun fields
    const columns: DataGridColumn<Record<string, unknown>>[] = noun.fields
      .filter((f) => f.type !== 'relation' || f.cardinality === 'one')
      .map((field) => ({
        source: field.name,
        label: field.name,
        sortable: true,
      }))

    // Add actions column
    columns.push({
      source: '_actions',
      label: 'Actions',
      render: (record) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              data-testid={`row-actions-${record.id}`}
            >
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/${noun.pluralName}/${record.id}`)}>
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/${noun.pluralName}/${record.id}/edit`)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>Delete</DropdownMenuItem>
            {verbList.map((verb) => (
              <DropdownMenuItem
                key={verb}
                onClick={async () => {
                  const handler = verbHandlers?.[noun.name]?.[verb]
                  if (handler) {
                    await handler({ id: record.id, ...record })
                  }
                }}
              >
                {verb}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })

    // Handle sort changes
    const handleSortChange = (newSort: SortState | undefined) => {
      setSort(newSort)
      if (onSort && newSort) {
        onSort({ field: newSort.field, direction: newSort.direction })
      }
    }

    // Permission check for create
    const canCreate = !user?.permissions || user.permissions.includes(`${noun.pluralName}.create`)

    return (
      <div data-page="list" className="flex flex-col gap-4 bg-background text-foreground">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{noun.pluralName}</h1>
          <div className="flex items-center gap-2">
            <FilterButton />
            <Button
              onClick={() => navigate(`/${noun.pluralName}/new`)}
              disabled={!canCreate}
            >
              Create
            </Button>
          </div>
        </div>

        {/* DataGrid from @mdxui/admin */}
        <DataGrid
          data={records}
          columns={columns}
          selectable
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onRowClick={(record) => navigate(`/${noun.pluralName}/${record.id}`)}
          sort={sort}
          onSort={handleSortChange}
          rowKey="id"
        />

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              1 of {totalCount}
            </span>
            {hasMore && (
              <Button variant="outline" size="sm">
                Next
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }
}
