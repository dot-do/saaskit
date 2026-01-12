/**
 * Settings Page Generator
 *
 * Creates an organization settings page with form.
 */

import { createElement, useState, useEffect, type ComponentType, type ReactNode, type ChangeEvent, type FormEvent } from 'react'
import type { AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'

/**
 * Create a Settings page component
 */
export function createSettingsPage(_config: AppGeneratorConfig): ComponentType<unknown> {
  return function SettingsPage() {
    const ctx = useTestContext()
    const { data, mutations, user, checkPermission: _checkPermission } = ctx

    const settings = data.settings as Record<string, unknown> | undefined

    const [formData, setFormData] = useState<Record<string, unknown>>({})
    const [submitting, setSubmitting] = useState(false)

    // Initialize form data
    useEffect(() => {
      if (settings) {
        setFormData(settings)
      }
    }, [settings])

    // Check permissions
    const canView = !user?.permissions || user.permissions.includes('settings.read')
    const canEdit = !user?.permissions || user.permissions.includes('settings.update')

    // RBAC: Show 403 if no permission
    if (user && !canView) {
      return createElement('div', { 'data-page': 'settings' }, [
        createElement('h1', { key: 'title' }, '403 Forbidden'),
        createElement('p', { key: 'message' }, 'Access denied. You do not have permission to view settings.'),
      ])
    }

    const handleChange = (field: string, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        const updateFn = mutations?.settings?.update
        if (updateFn) {
          await updateFn(formData)
        }
      } finally {
        setSubmitting(false)
      }
    }

    const children: ReactNode[] = []

    // Title
    children.push(createElement('h1', { key: 'title' }, 'Settings'))

    // Form
    const formFields: ReactNode[] = []

    // Organization name field
    formFields.push(
      createElement('label', { key: 'label-name', htmlFor: 'org-name' }, 'Organization Name')
    )
    formFields.push(
      createElement('input', {
        key: 'input-name',
        id: 'org-name',
        type: 'text',
        'aria-label': 'Organization Name',
        value: (formData.name as string) || '',
        onChange: (e: ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value),
        disabled: !canEdit,
      })
    )

    // Save button
    formFields.push(
      createElement(
        'button',
        {
          key: 'submit',
          type: 'submit',
          disabled: submitting || !canEdit,
        },
        submitting ? 'Saving...' : 'Save'
      )
    )

    children.push(
      createElement('form', { key: 'form', onSubmit: handleSubmit }, formFields)
    )

    return createElement('div', { 'data-page': 'settings' }, children)
  }
}
