/**
 * Zapier Search Generator
 *
 * Generates Zapier searches from SaaSkit noun definitions.
 * Maps noun.find() to Zapier searches for use in dropdown fields.
 */

import type { ZapierSearch, ZapierField } from './types'
import { toZapierKey, toDisplayLabel, FIELD_TYPE_MAP } from './types'

/**
 * Schema field definition for a noun
 */
export interface NounSchemaField {
  /** Field name */
  name: string
  /** Field type */
  type?: string
  /** Whether the field is searchable */
  searchable?: boolean
  /** Whether the field is unique (good for lookups) */
  unique?: boolean
  /** Help text */
  description?: string
}

/**
 * Options for generating a single search
 */
export interface GenerateSearchOptions {
  /** The noun name (e.g., 'User', 'Order') */
  nounName: string
  /** Base API URL */
  apiBaseUrl: string
  /** Schema fields (used to generate search input fields) */
  schemaFields?: NounSchemaField[]
  /** Additional output fields */
  outputFields?: ZapierField[]
  /** Sample response data */
  sample?: Record<string, unknown>
  /** Whether this search should be marked as important */
  important?: boolean
  /** Whether this search should be hidden */
  hidden?: boolean
}

/**
 * Convert a schema field to a Zapier search field
 */
export function schemaFieldToZapierField(field: NounSchemaField): ZapierField {
  const zapierField: ZapierField = {
    key: field.name,
    label: toDisplayLabel(field.name),
    helpText: field.description,
    required: false, // Search fields are typically optional
  }

  // Map type
  if (field.type && FIELD_TYPE_MAP[field.type]) {
    zapierField.type = FIELD_TYPE_MAP[field.type]
  }

  return zapierField
}

/**
 * Generate default search fields for a noun
 */
export function getDefaultSearchFields(nounName: string): ZapierField[] {
  const displayLabel = toDisplayLabel(nounName)

  return [
    {
      key: 'id',
      label: `${displayLabel} ID`,
      type: 'string',
      required: false,
      helpText: `Search by ${displayLabel.toLowerCase()} ID.`,
    },
    {
      key: 'query',
      label: 'Search Query',
      type: 'string',
      required: false,
      helpText: `Search ${displayLabel.toLowerCase()}s by name or other text fields.`,
    },
  ]
}

/**
 * Generate a Zapier search from a noun
 *
 * @example
 * ```ts
 * const search = generateSearch({
 *   nounName: 'User',
 *   apiBaseUrl: 'https://api.example.com',
 *   schemaFields: [
 *     { name: 'email', type: 'string', searchable: true },
 *     { name: 'name', type: 'string', searchable: true },
 *   ],
 * })
 * // Returns a ZapierSearch for "Find User"
 * ```
 */
export function generateSearch(options: GenerateSearchOptions): ZapierSearch {
  const {
    nounName,
    apiBaseUrl,
    schemaFields = [],
    outputFields = [],
    sample,
    important = false,
    hidden = false,
  } = options

  const key = `find_${toZapierKey(nounName)}`
  const displayLabel = toDisplayLabel(nounName)
  const nounKey = toZapierKey(nounName)

  // Generate input fields from schema
  const searchableFields = schemaFields.filter((f) => f.searchable || f.unique)
  const inputFields: ZapierField[] =
    searchableFields.length > 0
      ? searchableFields.map(schemaFieldToZapierField)
      : getDefaultSearchFields(nounName)

  return {
    key,
    noun: displayLabel,
    display: {
      label: `Find ${displayLabel}`,
      description: `Finds a ${displayLabel.toLowerCase()} by searching.`,
      important,
      hidden,
    },
    operation: {
      inputFields,
      outputFields: [
        {
          key: 'id',
          label: 'ID',
          type: 'string',
        },
        ...outputFields,
      ],
      sample: sample || {
        id: `${nounKey}_sample_123`,
      },
      perform: {
        url: `${apiBaseUrl}/${nounKey}s/search`,
        method: 'GET',
        params: {
          // Zapier will add input field values as params
        },
      },
    },
  }
}

/**
 * Generate a "Find or Create" action/search combo
 * This is a common Zapier pattern that searches for a record and creates it if not found
 */
export function generateFindOrCreate(options: GenerateSearchOptions): ZapierSearch {
  const {
    nounName,
    apiBaseUrl,
    schemaFields = [],
    outputFields = [],
    sample,
    important = true, // Find or Create is typically important
    hidden = false,
  } = options

  const key = `find_or_create_${toZapierKey(nounName)}`
  const displayLabel = toDisplayLabel(nounName)
  const nounKey = toZapierKey(nounName)

  // For find or create, we need both search and create fields
  const searchableFields = schemaFields.filter((f) => f.searchable || f.unique)
  const inputFields: ZapierField[] =
    searchableFields.length > 0
      ? searchableFields.map(schemaFieldToZapierField)
      : getDefaultSearchFields(nounName)

  // Add "create if not found" fields
  const createFields = schemaFields
    .filter((f) => !f.searchable && !f.unique)
    .map((f) => ({
      ...schemaFieldToZapierField(f),
      helpText: `Used when creating a new ${displayLabel.toLowerCase()}. ${f.description || ''}`.trim(),
    }))

  return {
    key,
    noun: displayLabel,
    display: {
      label: `Find or Create ${displayLabel}`,
      description: `Finds a ${displayLabel.toLowerCase()} or creates one if not found.`,
      important,
      hidden,
    },
    operation: {
      inputFields: [...inputFields, ...createFields],
      outputFields: [
        {
          key: 'id',
          label: 'ID',
          type: 'string',
        },
        {
          key: '_created',
          label: 'Was Created',
          type: 'boolean',
        },
        ...outputFields,
      ],
      sample: sample || {
        id: `${nounKey}_sample_123`,
        _created: false,
      },
      perform: {
        url: `${apiBaseUrl}/${nounKey}s/find-or-create`,
        method: 'POST',
        body: {
          // Zapier will include input field values
        },
      },
    },
  }
}

/**
 * Generate all searches for a noun
 *
 * @example
 * ```ts
 * const searches = generateSearchesForNoun('User', {
 *   apiBaseUrl: 'https://api.example.com',
 *   includeFindOrCreate: true,
 * })
 * // Returns [FindUser, FindOrCreateUser] searches
 * ```
 */
export function generateSearchesForNoun(
  nounName: string,
  options: {
    apiBaseUrl: string
    schemaFields?: NounSchemaField[]
    outputFields?: ZapierField[]
    sample?: Record<string, unknown>
    includeFindOrCreate?: boolean
  }
): ZapierSearch[] {
  const { apiBaseUrl, schemaFields, outputFields, sample, includeFindOrCreate = false } = options

  const searches: ZapierSearch[] = [
    generateSearch({
      nounName,
      apiBaseUrl,
      schemaFields,
      outputFields,
      sample,
    }),
  ]

  if (includeFindOrCreate) {
    searches.push(
      generateFindOrCreate({
        nounName,
        apiBaseUrl,
        schemaFields,
        outputFields,
        sample,
      })
    )
  }

  return searches
}

/**
 * Generate searches from a list of nouns
 *
 * @example
 * ```ts
 * const searches = generateSearchesFromNouns(
 *   ['User', 'Order', 'Product'],
 *   { apiBaseUrl: 'https://api.example.com' }
 * )
 * // Returns searches for each noun
 * ```
 */
export function generateSearchesFromNouns(
  nouns: string[],
  options: {
    apiBaseUrl: string
    nounSchemas?: Record<string, NounSchemaField[]>
    includeFindOrCreate?: boolean
  }
): ZapierSearch[] {
  const { apiBaseUrl, nounSchemas = {}, includeFindOrCreate = false } = options
  const searches: ZapierSearch[] = []

  for (const nounName of nouns) {
    const nounSearches = generateSearchesForNoun(nounName, {
      apiBaseUrl,
      schemaFields: nounSchemas[nounName],
      includeFindOrCreate,
    })
    searches.push(...nounSearches)
  }

  return searches
}

/**
 * Convert searches array to Zapier record format
 */
export function searchesToRecord(searches: ZapierSearch[]): Record<string, ZapierSearch> {
  const record: Record<string, ZapierSearch> = {}
  for (const search of searches) {
    record[search.key] = search
  }
  return record
}
