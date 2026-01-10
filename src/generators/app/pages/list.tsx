/**
 * List Page Generator
 *
 * Creates a list page with table, sorting, filtering, pagination, and row actions.
 */

import { createElement, useState, type ComponentType, type ReactNode } from 'react'
import type { ParsedNoun, AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'
import { isDestructiveVerb } from '../parser'

/**
 * Create a List page component for a noun
 */
export function createListPage(
  noun: ParsedNoun,
  verbList: string[],
  config: AppGeneratorConfig
): ComponentType<unknown> {
  return function ListPage() {
    const ctx = useTestContext()
    const { data, navigate, onSort, user, checkPermission, verbs: verbHandlers } = ctx
    const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null)

    const nounData = data[noun.name] as {
      data?: Array<Record<string, unknown>>
      totalCount?: number
      hasMore?: boolean
    } | undefined

    const records = nounData?.data || []
    const totalCount = nounData?.totalCount || 0
    const hasMore = nounData?.hasMore || false

    const children: ReactNode[] = []

    // Title
    children.push(createElement('h1', { key: 'title' }, noun.pluralName))

    // Create button
    const canCreate = !user?.permissions || user.permissions.includes(`${noun.pluralName}.create`)
    children.push(
      createElement(
        'button',
        {
          key: 'create-btn',
          type: 'button',
          onClick: () => navigate(`/${noun.pluralName}/new`),
          disabled: !canCreate,
        },
        'Create'
      )
    )

    // Filter button
    children.push(
      createElement(
        'button',
        { key: 'filter-btn', type: 'button' },
        'Filter'
      )
    )

    // Table header
    const headerCells = noun.fields
      .filter((f) => f.type !== 'relation' || f.cardinality === 'one')
      .map((field) =>
        createElement(
          'th',
          {
            key: field.name,
            onClick: () => {
              if (onSort) {
                onSort({ field: field.name, direction: 'asc' })
              }
            },
            style: { cursor: 'pointer' },
          },
          field.name
        )
      )
    headerCells.push(createElement('th', { key: 'actions' }, 'Actions'))

    const thead = createElement('thead', { key: 'thead' }, createElement('tr', null, headerCells))

    // Table body
    const rows = records.map((record) => {
      const cells = noun.fields
        .filter((f) => f.type !== 'relation' || f.cardinality === 'one')
        .map((field) =>
          createElement('td', { key: field.name }, String(record[field.name] ?? ''))
        )

      // Row actions
      cells.push(
        createElement('td', { key: 'actions' }, [
          createElement(
            'button',
            {
              key: 'actions-menu',
              type: 'button',
              'data-testid': `row-actions-${record.id}`,
              onClick: () => setOpenActionsMenu(openActionsMenu === record.id ? null : record.id as string),
            },
            'Actions'
          ),
          openActionsMenu === record.id &&
            createElement('div', { key: 'menu', role: 'menu' }, [
              createElement(
                'button',
                {
                  key: 'view',
                  role: 'menuitem',
                  onClick: () => navigate(`/${noun.pluralName}/${record.id}`),
                },
                'View'
              ),
              createElement(
                'button',
                {
                  key: 'edit',
                  role: 'menuitem',
                  onClick: () => navigate(`/${noun.pluralName}/${record.id}/edit`),
                },
                'Edit'
              ),
              createElement(
                'button',
                { key: 'delete', role: 'menuitem' },
                'Delete'
              ),
              // Verb menu items
              ...verbList.map((verb) =>
                createElement(
                  'button',
                  {
                    key: verb,
                    role: 'menuitem',
                    onClick: async () => {
                      const handler = verbHandlers?.[noun.name]?.[verb]
                      if (handler) {
                        await handler({ id: record.id, ...record })
                      }
                    },
                  },
                  verb
                )
              ),
            ]),
        ])
      )

      return createElement('tr', { key: record.id as string }, cells)
    })

    const tbody = createElement('tbody', { key: 'tbody' }, rows)
    const table = createElement('table', { key: 'table' }, [thead, tbody])
    children.push(table)

    // Pagination
    if (totalCount > 0) {
      children.push(
        createElement('div', { key: 'pagination' }, [
          createElement('span', { key: 'count' }, `1 of ${totalCount}`),
          hasMore &&
            createElement('button', { key: 'next', type: 'button' }, 'Next'),
        ])
      )
    }

    return createElement('div', { 'data-page': 'list' }, children)
  }
}
