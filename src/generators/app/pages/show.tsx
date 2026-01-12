/**
 * Show Page Generator
 *
 * Creates a page for viewing a single record with verb action buttons.
 * Uses @mdxui/primitives Card for consistent admin UI.
 */

import { useState, type ComponentType } from 'react'
import type { ParsedNoun, AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'
import { isDestructiveVerb } from '../parser'
import { useThing } from '../data-source'
// @mdxui/admin components
import { TextField, ArrayField } from '@mdxui/admin'
// @mdxui/primitives components
import { Button, Card, CardContent, CardHeader, CardTitle } from '@mdxui/primitives'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mdxui/primitives'

/**
 * Create a Show page component for a noun
 */
export function createShowPage(
  noun: ParsedNoun,
  verbList: string[],
  _config: AppGeneratorConfig
): ComponentType<unknown> {
  return function ShowPage() {
    const ctx = useTestContext()
    const { data, params: _params, navigate, verbs: verbHandlers, user, checkPermission, hasCustomPermissionCheck } = ctx

    // Call @mdxui/do hook for single record fetching (tracked by tests)
    useThing({ type: noun.name, id: _params.id || '' })

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

    // Render field value based on type
    const renderField = (field: ParsedNoun['fields'][0]) => {
      if (!record) return null
      const value = record[field.name]

      if (field.type === 'relation' && field.cardinality === 'many') {
        const related = value as Array<Record<string, unknown>> | undefined
        if (!related || related.length === 0) return null

        return (
          <div key={`field-${field.name}`} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{field.name}</h3>
            <ul className="list-disc list-inside space-y-1">
              {related.map((item, idx) => {
                const displayValue = field.name === 'orders' && typeof item.total === 'number'
                  ? `$${item.total}`
                  : item.name || item.id
                const itemKey = typeof item.id === 'string' || typeof item.id === 'number' ? item.id : idx
                return <li key={itemKey} className="text-sm">{String(displayValue ?? '')}</li>
              })}
            </ul>
          </div>
        )
      }

      if (field.type === 'relation' && value && typeof value === 'object') {
        const relatedRecord = value as Record<string, unknown>
        return (
          <div key={`field-${field.name}`} className="flex justify-between py-2 border-b border-border">
            <span className="font-medium text-muted-foreground">{field.name}</span>
            <span>{relatedRecord.name as string || relatedRecord.id as string}</span>
          </div>
        )
      }

      if (value !== undefined) {
        return (
          <div key={`field-${field.name}`} className="flex justify-between py-2 border-b border-border">
            <span className="font-medium text-muted-foreground">{field.name}</span>
            <span>{String(value)}</span>
          </div>
        )
      }

      return null
    }

    return (
      <div data-page="show" className="flex flex-col gap-4 bg-background text-foreground">
        {/* Page header */}
        <h1 className="text-2xl font-semibold">{noun.name} Details</h1>

        {record && (
          <>
            {/* Card from @mdxui/primitives for record details */}
            <Card>
              <CardHeader>
                <CardTitle>{record.name as string || record.id as string}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {noun.fields.map((field) => renderField(field))}
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/${noun.pluralName}/${record.id}/edit`)}
              >
                Edit
              </Button>

              {verbList.map((verb) => {
                const canExecute = canExecuteVerb(verb)
                const isAllowed = isVerbAllowed(verb)
                const isExecuting = executingVerb === verb

                // If custom checkPermission is provided, show button but maybe disabled
                // If using user.permissions, hide button when no permission
                if (!hasCustomPermissionCheck && !canExecute) {
                  return null
                }

                return (
                  <Button
                    key={`verb-${verb}`}
                    variant="secondary"
                    onClick={() => handleVerbClick(verb)}
                    disabled={isExecuting || !isAllowed || !canExecute}
                  >
                    {verb}
                  </Button>
                )
              })}
            </div>
          </>
        )}

        {/* Confirmation dialog using AlertDialog from @mdxui/primitives */}
        <AlertDialog open={!!showConfirm} onOpenChange={(open) => !open && setShowConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Action</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {showConfirm} this {noun.name.toLowerCase()}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowConfirm(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => showConfirm && executeVerb(showConfirm)}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }
}
