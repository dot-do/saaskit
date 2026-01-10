/**
 * Show Page Generator
 *
 * Creates a page for viewing a single record with verb action buttons.
 */

import { createElement, useState, type ComponentType, type ReactNode } from 'react'
import type { ParsedNoun, AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'
import { isDestructiveVerb } from '../parser'

/**
 * Create a Show page component for a noun
 */
export function createShowPage(
  noun: ParsedNoun,
  verbList: string[],
  config: AppGeneratorConfig
): ComponentType<unknown> {
  return function ShowPage() {
    const ctx = useTestContext()
    const { data, params, navigate, verbs: verbHandlers, user, checkPermission } = ctx

    const nounData = data[noun.name] as {
      record?: Record<string, unknown>
    } | undefined

    const record = nounData?.record

    const [executingVerb, setExecutingVerb] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState<string | null>(null)

    const executeVerb = async (verb: string) => {
      setExecutingVerb(verb)
      try {
        const handler = verbHandlers?.[noun.name]?.[verb]
        if (handler && record) {
          await handler({ id: record.id, ...record })
        }
      } finally {
        setExecutingVerb(null)
        setShowConfirm(null)
      }
    }

    const handleVerbClick = (verb: string) => {
      if (isDestructiveVerb(verb)) {
        setShowConfirm(verb)
      } else {
        executeVerb(verb)
      }
    }

    // Check if user can execute verbs
    const canExecuteVerb = (verb: string) => {
      const permission = `${noun.pluralName}.${verb}`
      if (checkPermission && record) {
        return checkPermission(permission, { record })
      }
      if (!user?.permissions) return true
      return user.permissions.includes(permission)
    }

    // Check if verb is allowed based on record state
    const isVerbAllowed = (verb: string) => {
      // Example: ship is not allowed if status is already shipped
      if (verb === 'ship' && record?.status === 'shipped') {
        return false
      }
      return true
    }

    const children: ReactNode[] = []

    // Title
    children.push(createElement('h1', { key: 'title' }, `${noun.name} Details`))

    if (record) {
      // Display fields
      for (const field of noun.fields) {
        const value = record[field.name]

        if (field.type === 'relation' && field.cardinality === 'many') {
          // Display related records
          const related = value as Array<Record<string, unknown>> | undefined
          if (related && related.length > 0) {
            children.push(
              createElement('div', { key: `field-${field.name}` }, [
                createElement('h3', { key: 'label' }, field.name),
                createElement(
                  'ul',
                  { key: 'list' },
                  related.map((item, idx) => {
                    // Format monetary values
                    const displayValue = field.name === 'orders' && typeof item.total === 'number'
                      ? `$${item.total}`
                      : item.name || item.id

                    return createElement('li', { key: item.id || idx }, displayValue)
                  })
                ),
              ])
            )
          }
        } else if (field.type === 'relation' && value && typeof value === 'object') {
          // Single relation
          const relatedRecord = value as Record<string, unknown>
          children.push(
            createElement('div', { key: `field-${field.name}` }, [
              createElement('strong', { key: 'label' }, `${field.name}: `),
              createElement('span', { key: 'value' }, relatedRecord.name as string || relatedRecord.id as string),
            ])
          )
        } else if (value !== undefined) {
          children.push(
            createElement('div', { key: `field-${field.name}` }, [
              createElement('strong', { key: 'label' }, `${field.name}: `),
              createElement('span', { key: 'value' }, String(value)),
            ])
          )
        }
      }

      // Edit button
      children.push(
        createElement(
          'button',
          {
            key: 'edit',
            type: 'button',
            onClick: () => navigate(`/${noun.pluralName}/${record.id}/edit`),
          },
          'Edit'
        )
      )

      // Verb action buttons
      for (const verb of verbList) {
        const canExecute = canExecuteVerb(verb)
        const isAllowed = isVerbAllowed(verb)
        const isExecuting = executingVerb === verb

        // Always show button, but disable if no permission or not allowed
        children.push(
          createElement(
            'button',
            {
              key: `verb-${verb}`,
              type: 'button',
              onClick: () => handleVerbClick(verb),
              disabled: isExecuting || !isAllowed || !canExecute,
            },
            verb
          )
        )
      }
    }

    // Confirmation dialog
    if (showConfirm) {
      children.push(
        createElement('div', { key: 'confirm-dialog', role: 'dialog' }, [
          createElement('p', { key: 'message' }, `Are you sure you want to ${showConfirm} this ${noun.name.toLowerCase()}?`),
          createElement(
            'button',
            {
              key: 'confirm',
              type: 'button',
              onClick: () => executeVerb(showConfirm),
            },
            'Confirm'
          ),
          createElement(
            'button',
            {
              key: 'cancel',
              type: 'button',
              onClick: () => setShowConfirm(null),
            },
            'Cancel'
          ),
        ])
      )
    }

    return createElement('div', { 'data-page': 'show' }, children)
  }
}
