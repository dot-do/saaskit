/**
 * Edit Page Generator
 *
 * Creates a form page for editing existing records.
 */

import { createElement, useState, useEffect, type ComponentType, type ReactNode, type ChangeEvent, type FormEvent } from 'react'
import type { ParsedNoun, AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'

/**
 * Create an Edit page component for a noun
 */
export function createEditPage(
  noun: ParsedNoun,
  config: AppGeneratorConfig
): ComponentType<unknown> {
  return function EditPage() {
    const ctx = useTestContext()
    const { data, params, navigate, mutations, user, checkPermission } = ctx

    const nounData = data[noun.name] as {
      record?: Record<string, unknown>
      isLoading?: boolean
    } | undefined

    const record = nounData?.record
    const isLoading = nounData?.isLoading

    const [formData, setFormData] = useState<Record<string, unknown>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Initialize form data from record
    useEffect(() => {
      if (record) {
        setFormData(record)
      }
    }, [record])

    const handleChange = (field: string, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        const updateFn = mutations?.[noun.name]?.update
        if (updateFn && params.id) {
          // Convert number fields
          const submitData = { ...formData }
          for (const field of noun.fields) {
            if (field.type === 'number' && submitData[field.name]) {
              submitData[field.name] = parseFloat(submitData[field.name] as string)
            }
          }
          await updateFn(params.id, submitData)
        }
        navigate(`/${noun.pluralName}`)
      } catch (error) {
        setErrors({ _form: 'Failed to update record' })
      } finally {
        setSubmitting(false)
      }
    }

    const handleDelete = async () => {
      const removeFn = mutations?.[noun.name]?.remove
      if (removeFn && params.id) {
        await removeFn(params.id)
        navigate(`/${noun.pluralName}`)
      }
    }

    // Check delete permission
    const canDelete = user?.permissions
      ? user.permissions.includes(`${noun.pluralName}.delete`)
      : true

    // Loading state
    if (isLoading) {
      return createElement('div', { 'data-page': 'edit' }, [
        createElement('div', { key: 'loading', 'data-testid': 'loading-spinner' }, 'Loading...'),
      ])
    }

    const children: ReactNode[] = []

    // Title
    children.push(createElement('h1', { key: 'title' }, `Edit ${noun.name}`))

    // Form fields
    const formFields: ReactNode[] = []

    for (const field of noun.fields) {
      const fieldId = `field-${field.name}`
      const currentValue = formData[field.name]

      // Label
      formFields.push(
        createElement('label', { key: `label-${field.name}`, htmlFor: fieldId }, field.name)
      )

      // Input based on field type
      if (field.type === 'union' && field.options) {
        formFields.push(
          createElement(
            'select',
            {
              key: `input-${field.name}`,
              id: fieldId,
              'aria-label': field.name,
              value: (currentValue as string) || '',
              onChange: (e: ChangeEvent<HTMLSelectElement>) =>
                handleChange(field.name, e.target.value),
            },
            [
              createElement('option', { key: 'empty', value: '' }, '-- Select --'),
              ...field.options.map((opt) =>
                createElement('option', { key: opt, value: opt }, opt)
              ),
            ]
          )
        )
      } else if (field.type === 'relation') {
        formFields.push(
          createElement('select', {
            key: `input-${field.name}`,
            id: fieldId,
            'aria-label': field.name,
            value: (currentValue as string) || '',
            onChange: (e: ChangeEvent<HTMLSelectElement>) =>
              handleChange(field.name, e.target.value),
          })
        )
      } else if (field.type === 'number') {
        formFields.push(
          createElement('input', {
            key: `input-${field.name}`,
            id: fieldId,
            type: 'number',
            'aria-label': field.name,
            value: currentValue !== undefined ? String(currentValue) : '',
            onChange: (e: ChangeEvent<HTMLInputElement>) =>
              handleChange(field.name, e.target.value),
          })
        )
      } else if (field.type === 'boolean') {
        formFields.push(
          createElement('input', {
            key: `input-${field.name}`,
            id: fieldId,
            type: 'checkbox',
            'aria-label': field.name,
            checked: (currentValue as boolean) || false,
            onChange: (e: ChangeEvent<HTMLInputElement>) =>
              handleChange(field.name, e.target.checked),
          })
        )
      } else {
        formFields.push(
          createElement('input', {
            key: `input-${field.name}`,
            id: fieldId,
            type: 'text',
            'aria-label': field.name,
            value: (currentValue as string) || '',
            onChange: (e: ChangeEvent<HTMLInputElement>) =>
              handleChange(field.name, e.target.value),
          })
        )
      }
    }

    // Submit button
    formFields.push(
      createElement(
        'button',
        { key: 'submit', type: 'submit', disabled: submitting },
        submitting ? 'Saving...' : 'Save'
      )
    )

    children.push(
      createElement('form', { key: 'form', onSubmit: handleSubmit }, formFields)
    )

    // Delete button (only if has permission)
    if (canDelete) {
      children.push(
        createElement(
          'button',
          {
            key: 'delete',
            type: 'button',
            onClick: () => setShowDeleteConfirm(true),
          },
          'Delete'
        )
      )
    }

    // Delete confirmation dialog
    if (showDeleteConfirm) {
      children.push(
        createElement('div', { key: 'confirm-dialog', role: 'dialog' }, [
          createElement('p', { key: 'message' }, 'Are you sure you want to delete this record?'),
          createElement(
            'button',
            { key: 'confirm', type: 'button', onClick: handleDelete },
            'Confirm'
          ),
          createElement(
            'button',
            { key: 'cancel', type: 'button', onClick: () => setShowDeleteConfirm(false) },
            'Cancel'
          ),
        ])
      )
    }

    return createElement('div', { 'data-page': 'edit' }, children)
  }
}
