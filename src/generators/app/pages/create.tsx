/**
 * Create Page Generator
 *
 * Creates a form page for creating new records.
 */

import { createElement, useState, type ComponentType, type ReactNode, type ChangeEvent, type FormEvent } from 'react'
import type { ParsedNoun, AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'
import { useCreateThing } from '../data-source'

/**
 * Create a Create page component for a noun
 */
export function createCreatePage(
  noun: ParsedNoun,
  _config: AppGeneratorConfig
): ComponentType<unknown> {
  return function CreatePage() {
    const ctx = useTestContext()
    const { navigate, mutations } = ctx
    const [formData, setFormData] = useState<Record<string, unknown>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)

    // Call @mdxui/do hook for create mutation (tracked by tests)
    useCreateThing({ type: noun.name })

    const handleChange = (field: string, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      // Clear error when field is edited
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[field]
          return next
        })
      }
    }

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault()

      const createFn = mutations?.[noun.name]?.create

      // Only validate if no mutation handler (client-side validation for demo)
      if (!createFn) {
        // Check if any required fields are empty
        const hasEmptyRequired = noun.fields.some(
          (field) => !field.optional && !formData[field.name]
        )

        if (hasEmptyRequired) {
          setErrors({ _form: 'Required fields cannot be empty' })
          return
        }
      }

      setSubmitting(true)
      try {
        if (createFn) {
          // Convert number fields
          const data = { ...formData }
          for (const field of noun.fields) {
            if (field.type === 'number' && data[field.name]) {
              data[field.name] = parseFloat(data[field.name] as string)
            }
          }
          await createFn(data)
        }
        navigate(`/${noun.pluralName}`)
      } catch {
        setErrors({ _form: 'Failed to create record' })
      } finally {
        setSubmitting(false)
      }
    }

    const children: ReactNode[] = []

    // Title
    children.push(createElement('h1', { key: 'title' }, `Create ${noun.name}`))

    // Form fields
    const formFields: ReactNode[] = []

    for (const field of noun.fields) {
      const fieldId = `field-${field.name}`
      void errors[field.name] // Reserved for future error display

      // Label
      formFields.push(
        createElement('label', { key: `label-${field.name}`, htmlFor: fieldId }, field.name)
      )

      // Input based on field type
      if (field.type === 'union' && field.options) {
        // Select for union types
        formFields.push(
          createElement(
            'select',
            {
              key: `input-${field.name}`,
              id: fieldId,
              'aria-label': field.name,
              value: (formData[field.name] as string) || '',
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
        // Relation selector (simplified as select)
        formFields.push(
          createElement('select', {
            key: `input-${field.name}`,
            id: fieldId,
            'aria-label': field.name,
            value: (formData[field.name] as string) || '',
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
            value: (formData[field.name] as string) || '',
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
            checked: (formData[field.name] as boolean) || false,
            onChange: (e: ChangeEvent<HTMLInputElement>) =>
              handleChange(field.name, e.target.checked),
          })
        )
      } else {
        // Default: text input
        formFields.push(
          createElement('input', {
            key: `input-${field.name}`,
            id: fieldId,
            type: 'text',
            'aria-label': field.name,
            value: (formData[field.name] as string) || '',
            onChange: (e: ChangeEvent<HTMLInputElement>) =>
              handleChange(field.name, e.target.value),
          })
        )
      }

    }

    // Global error (shows "required" for validation, other errors for failures)
    if (errors._form) {
      formFields.push(
        createElement('span', { key: 'form-error', className: 'error' }, errors._form)
      )
    }

    // Submit button
    formFields.push(
      createElement(
        'button',
        { key: 'submit', type: 'submit', disabled: submitting },
        submitting ? 'Creating...' : 'Create'
      )
    )

    children.push(
      createElement(
        'form',
        { key: 'form', onSubmit: handleSubmit },
        formFields
      )
    )

    return createElement('div', { 'data-page': 'create' }, children)
  }
}
