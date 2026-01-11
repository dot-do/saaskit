/**
 * Zapier Action Generator
 *
 * Generates Zapier actions from SaaSkit verb configurations.
 * Maps $.verbs to Zapier actions (creates/updates/deletes).
 */

import type { ZapierAction, ZapierField } from './types'
import { toZapierKey, toDisplayLabel, FIELD_TYPE_MAP } from './types'

/**
 * Built-in CRUD verbs
 */
export const CRUD_VERBS = ['create', 'read', 'update', 'delete'] as const
export type CrudVerb = (typeof CRUD_VERBS)[number]

/**
 * Parameter definition for a verb
 */
export interface VerbParameter {
  /** Parameter name */
  name: string
  /** Parameter type */
  type?: string
  /** Whether the parameter is required */
  required?: boolean
  /** Help text */
  description?: string
  /** Default value */
  default?: unknown
  /** Choices for enum-like parameters */
  choices?: Array<{ value: string; label: string }>
}

/**
 * Options for generating a single action
 */
export interface GenerateActionOptions {
  /** The noun name (e.g., 'User', 'Order') */
  nounName: string
  /** The verb name (e.g., 'create', 'fulfill') */
  verbName: string
  /** Base API URL */
  apiBaseUrl: string
  /** Verb parameters (become input fields) */
  parameters?: VerbParameter[]
  /** Additional output fields */
  outputFields?: ZapierField[]
  /** Sample response data */
  sample?: Record<string, unknown>
  /** Whether this action should be marked as important */
  important?: boolean
  /** Whether this action should be hidden */
  hidden?: boolean
}

/**
 * Convert a verb parameter to a Zapier field
 */
export function parameterToField(param: VerbParameter): ZapierField {
  const field: ZapierField = {
    key: param.name,
    label: toDisplayLabel(param.name),
    required: param.required,
    helpText: param.description,
  }

  // Map type
  if (param.type && FIELD_TYPE_MAP[param.type]) {
    field.type = FIELD_TYPE_MAP[param.type]
  }

  // Add default value
  if (param.default !== undefined) {
    field.default = param.default as string | number | boolean
  }

  // Add choices
  if (param.choices) {
    field.choices = param.choices
  }

  return field
}

/**
 * Generate HTTP method based on verb name
 */
export function getHttpMethodForVerb(verbName: string): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' {
  switch (verbName) {
    case 'read':
    case 'get':
    case 'fetch':
    case 'retrieve':
      return 'GET'
    case 'create':
    case 'add':
    case 'new':
      return 'POST'
    case 'update':
    case 'modify':
    case 'edit':
      return 'PUT'
    case 'patch':
      return 'PATCH'
    case 'delete':
    case 'remove':
    case 'destroy':
      return 'DELETE'
    default:
      // Custom verbs default to POST
      return 'POST'
  }
}

/**
 * Generate a Zapier action from a noun and verb name
 *
 * @example
 * ```ts
 * const action = generateAction({
 *   nounName: 'Order',
 *   verbName: 'fulfill',
 *   apiBaseUrl: 'https://api.example.com.ai',
 *   parameters: [
 *     { name: 'orderId', type: 'string', required: true },
 *     { name: 'trackingNumber', type: 'string' },
 *   ],
 * })
 * // Returns a ZapierAction for "Fulfill Order"
 * ```
 */
export function generateAction(options: GenerateActionOptions): ZapierAction {
  const {
    nounName,
    verbName,
    apiBaseUrl,
    parameters = [],
    outputFields = [],
    sample,
    important = false,
    hidden = false,
  } = options

  const key = `${verbName}_${toZapierKey(nounName)}`
  const displayLabel = toDisplayLabel(nounName)
  const verbLabel = toDisplayLabel(verbName)

  // Generate action label based on verb type
  const labelMap: Record<string, string> = {
    create: `Create ${displayLabel}`,
    update: `Update ${displayLabel}`,
    delete: `Delete ${displayLabel}`,
    read: `Get ${displayLabel}`,
    get: `Get ${displayLabel}`,
  }
  const label = labelMap[verbName] || `${verbLabel} ${displayLabel}`

  // Generate description
  const descriptionMap: Record<string, string> = {
    create: `Creates a new ${displayLabel.toLowerCase()}.`,
    update: `Updates an existing ${displayLabel.toLowerCase()}.`,
    delete: `Deletes a ${displayLabel.toLowerCase()}.`,
    read: `Retrieves a ${displayLabel.toLowerCase()} by ID.`,
    get: `Retrieves a ${displayLabel.toLowerCase()} by ID.`,
  }
  const description = descriptionMap[verbName] || `Performs the ${verbName} action on a ${displayLabel.toLowerCase()}.`

  // Convert parameters to input fields
  const inputFields: ZapierField[] = parameters.map(parameterToField)

  // For update/delete verbs, add ID field if not present
  if (['update', 'delete', 'read', 'get'].includes(verbName)) {
    const hasIdField = inputFields.some((f) => f.key === 'id' || f.key === `${toZapierKey(nounName)}Id`)
    if (!hasIdField) {
      inputFields.unshift({
        key: 'id',
        label: `${displayLabel} ID`,
        type: 'string',
        required: true,
        helpText: `The ID of the ${displayLabel.toLowerCase()} to ${verbName}.`,
      })
    }
  }

  // Determine HTTP method
  const method = getHttpMethodForVerb(verbName)

  // Build URL
  const nounKey = toZapierKey(nounName)
  let url = `${apiBaseUrl}/${nounKey}s`

  // For item-specific operations, include ID in URL
  if (['update', 'delete', 'read', 'get'].includes(verbName)) {
    url = `${apiBaseUrl}/${nounKey}s/{{bundle.inputData.id}}`
  } else if (!CRUD_VERBS.includes(verbName as CrudVerb)) {
    // Custom verb - use action endpoint
    url = `${apiBaseUrl}/${nounKey}s/{{bundle.inputData.id}}/${verbName}`
  }

  return {
    key,
    noun: displayLabel,
    display: {
      label,
      description,
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
        url,
        method,
        body: method !== 'GET' && method !== 'DELETE' ? {} : undefined,
      },
    },
  }
}

/**
 * Generate all actions for a noun based on its verbs
 *
 * @example
 * ```ts
 * const actions = generateActionsForNoun('Order', {
 *   apiBaseUrl: 'https://api.example.com.ai',
 *   verbs: ['create', 'update', 'fulfill', 'cancel'],
 * })
 * // Returns actions for each verb
 * ```
 */
export function generateActionsForNoun(
  nounName: string,
  options: {
    apiBaseUrl: string
    verbs: string[]
    verbParameters?: Record<string, VerbParameter[]>
    outputFields?: ZapierField[]
    sample?: Record<string, unknown>
  }
): ZapierAction[] {
  const { apiBaseUrl, verbs, verbParameters = {}, outputFields, sample } = options

  return verbs.map((verbName) =>
    generateAction({
      nounName,
      verbName,
      apiBaseUrl,
      parameters: verbParameters[verbName],
      outputFields,
      sample,
      // Mark 'create' as important by default
      important: verbName === 'create',
    })
  )
}

/**
 * Generate actions from a SaaSkit verbs config
 *
 * @example
 * ```ts
 * const actions = generateActionsFromVerbs(
 *   {
 *     Order: ['create', 'update', 'fulfill'],
 *     User: ['create', 'invite'],
 *   },
 *   { apiBaseUrl: 'https://api.example.com.ai' }
 * )
 * // Returns actions for each noun's verbs
 * ```
 */
export function generateActionsFromVerbs(
  verbs: Record<string, readonly string[]>,
  options: {
    apiBaseUrl: string
    verbParameters?: Record<string, Record<string, VerbParameter[]>>
  }
): ZapierAction[] {
  const { apiBaseUrl, verbParameters = {} } = options
  const actions: ZapierAction[] = []

  for (const [nounName, nounVerbs] of Object.entries(verbs)) {
    const nounActions = generateActionsForNoun(nounName, {
      apiBaseUrl,
      verbs: [...nounVerbs],
      verbParameters: verbParameters[nounName],
    })
    actions.push(...nounActions)
  }

  return actions
}

/**
 * Convert actions array to Zapier record format
 */
export function actionsToRecord(actions: ZapierAction[]): Record<string, ZapierAction> {
  const record: Record<string, ZapierAction> = {}
  for (const action of actions) {
    record[action.key] = action
  }
  return record
}
