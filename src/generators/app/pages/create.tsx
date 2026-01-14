/**
 * Create Page Generator
 *
 * Creates a form page for creating new records.
 * Uses @mdxui/admin SimpleForm for consistent admin UI.
 */

import { useState, type ComponentType } from 'react'
import type { ParsedNoun, AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'
import { useCreateThing } from '../data-source'
// @mdxui/admin components
import { SimpleForm, TextInput, NumberInput, SelectInput, BooleanInput, FormToolbar } from '@mdxui/admin'
// @mdxui/primitives components
import { Button } from '@mdxui/primitives'

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

    const handleSubmit = async (data: Record<string, unknown>) => {
      const createFn = mutations?.[noun.name]?.create

      // Only validate if no mutation handler (client-side validation for demo)
      if (!createFn) {
        // Check if any required fields are empty
        const hasEmptyRequired = noun.fields.some(
          (field) => !field.optional && !data[field.name]
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
          const processedData = { ...data }
          for (const field of noun.fields) {
            if (field.type === 'number' && processedData[field.name]) {
              processedData[field.name] = parseFloat(processedData[field.name] as string)
            }
          }
          await createFn(processedData)
        }
        navigate(`/${noun.pluralName}`)
      } catch {
        setErrors({ _form: 'Failed to create record' })
      } finally {
        setSubmitting(false)
      }
    }

    // Render input component based on field type
    const renderInput = (field: ParsedNoun['fields'][0]) => {
      const value = formData[field.name]

      if (field.type === 'union' && field.options) {
        return (
          <SelectInput
            key={`input-${field.name}`}
            source={field.name}
            label={field.name}
            value={value as string | number | undefined}
            onChange={(v) => handleChange(field.name, v)}
            required={!field.optional}
            choices={field.options.map((opt) => ({ id: opt, name: opt }))}
          />
        )
      }

      if (field.type === 'relation') {
        return (
          <SelectInput
            key={`input-${field.name}`}
            source={field.name}
            label={field.name}
            value={value as string | number | undefined}
            onChange={(v) => handleChange(field.name, v)}
            required={!field.optional}
            choices={[]}
          />
        )
      }

      if (field.type === 'number') {
        return (
          <NumberInput
            key={`input-${field.name}`}
            source={field.name}
            label={field.name}
            value={value as number | '' | undefined}
            onChange={(v) => handleChange(field.name, v)}
            required={!field.optional}
          />
        )
      }

      if (field.type === 'boolean') {
        return (
          <BooleanInput
            key={`input-${field.name}`}
            source={field.name}
            label={field.name}
            value={value as boolean | undefined}
            onChange={(v) => handleChange(field.name, v)}
            required={!field.optional}
          />
        )
      }

      // Default: text input
      return (
        <TextInput
          key={`input-${field.name}`}
          source={field.name}
          label={field.name}
          value={value as string | undefined}
          onChange={(v) => handleChange(field.name, v)}
          required={!field.optional}
        />
      )
    }

    return (
      <div data-page="create" className="flex flex-col gap-4 bg-background text-foreground">
        {/* Page header */}
        <h1 className="text-2xl font-semibold">Create {noun.name}</h1>

        {/* SimpleForm from @mdxui/admin */}
        <SimpleForm
          onSubmit={handleSubmit}
          defaultValues={formData}
          className="space-y-4"
        >
          {noun.fields.map((field) => renderInput(field))}

          {/* Error display */}
          {errors._form && (
            <span className="text-destructive text-sm">{errors._form}</span>
          )}

          {/* Form toolbar with save button */}
          <FormToolbar>
            <Button type="button" variant="outline" onClick={() => navigate(`/${noun.pluralName}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </FormToolbar>
        </SimpleForm>
      </div>
    )
  }
}
