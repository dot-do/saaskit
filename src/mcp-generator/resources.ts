/**
 * MCP Resource Generation
 *
 * Generates MCP resources from noun definitions with support for:
 * - Static resources for noun collections
 * - Parameterized templates with validation
 * - Query parameter support with type coercion
 * - Custom resource handlers
 */

import type { MCPResource, MCPResourceTemplate, MCPResourceContent } from './types'
import { toMCPKey, generateResourceDescription } from './types'
import type { DataStore } from './tools'

/**
 * URI parameter validation rule
 */
export interface URIParameterRule {
  /** Parameter name */
  name: string
  /** Parameter type for validation */
  type: 'string' | 'number' | 'boolean' | 'uuid' | 'date'
  /** Whether the parameter is required */
  required?: boolean
  /** Pattern for string validation (regex) */
  pattern?: string
  /** Minimum value for numbers */
  min?: number
  /** Maximum value for numbers */
  max?: number
  /** Enum of allowed values */
  enum?: string[]
  /** Default value if not provided */
  default?: unknown
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  coercedValue?: unknown
}

/**
 * URI parameter validator
 */
export class URIParameterValidator {
  private rules: Map<string, URIParameterRule> = new Map()

  constructor(rules?: URIParameterRule[]) {
    if (rules) {
      for (const rule of rules) {
        this.rules.set(rule.name, rule)
      }
    }
  }

  /**
   * Add a validation rule
   */
  addRule(rule: URIParameterRule): this {
    this.rules.set(rule.name, rule)
    return this
  }

  /**
   * Validate a parameter value
   */
  validateParameter(name: string, value: string | undefined): ValidationResult {
    const rule = this.rules.get(name)

    if (!rule) {
      // No rule means any value is valid
      return { valid: true, errors: [], coercedValue: value }
    }

    // Check required
    if (rule.required && (value === undefined || value === '')) {
      return { valid: false, errors: [`Parameter '${name}' is required`] }
    }

    // Use default if not provided
    if (value === undefined || value === '') {
      if (rule.default !== undefined) {
        return { valid: true, errors: [], coercedValue: rule.default }
      }
      return { valid: true, errors: [], coercedValue: undefined }
    }

    const errors: string[] = []
    let coercedValue: unknown = value

    switch (rule.type) {
      case 'number': {
        const num = Number(value)
        if (isNaN(num)) {
          errors.push(`Parameter '${name}' must be a number`)
        } else {
          coercedValue = num
          if (rule.min !== undefined && num < rule.min) {
            errors.push(`Parameter '${name}' must be >= ${rule.min}`)
          }
          if (rule.max !== undefined && num > rule.max) {
            errors.push(`Parameter '${name}' must be <= ${rule.max}`)
          }
        }
        break
      }

      case 'boolean': {
        if (value === 'true' || value === '1') {
          coercedValue = true
        } else if (value === 'false' || value === '0') {
          coercedValue = false
        } else {
          errors.push(`Parameter '${name}' must be a boolean (true/false)`)
        }
        break
      }

      case 'uuid': {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidPattern.test(value)) {
          errors.push(`Parameter '${name}' must be a valid UUID`)
        }
        break
      }

      case 'date': {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          errors.push(`Parameter '${name}' must be a valid date`)
        } else {
          coercedValue = date.toISOString()
        }
        break
      }

      case 'string':
      default: {
        if (rule.pattern) {
          const regex = new RegExp(rule.pattern)
          if (!regex.test(value)) {
            errors.push(`Parameter '${name}' does not match required pattern`)
          }
        }
        break
      }
    }

    // Check enum
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`Parameter '${name}' must be one of: ${rule.enum.join(', ')}`)
    }

    return { valid: errors.length === 0, errors, coercedValue }
  }

  /**
   * Validate all parameters
   */
  validate(params: Record<string, string | undefined>): {
    valid: boolean
    errors: string[]
    coercedParams: Record<string, unknown>
  } {
    const errors: string[] = []
    const coercedParams: Record<string, unknown> = {}

    // Check all rules
    for (const [name, _rule] of this.rules.entries()) {
      const result = this.validateParameter(name, params[name])
      if (!result.valid) {
        errors.push(...result.errors)
      } else if (result.coercedValue !== undefined) {
        coercedParams[name] = result.coercedValue
      }
    }

    // Include extra params that don't have rules
    for (const [name, value] of Object.entries(params)) {
      if (!this.rules.has(name) && value !== undefined) {
        coercedParams[name] = value
      }
    }

    return { valid: errors.length === 0, errors, coercedParams }
  }
}

/**
 * Create default validators for common ID patterns
 */
export function createIdValidator(idType: 'string' | 'uuid' | 'number' = 'string'): URIParameterValidator {
  return new URIParameterValidator([
    {
      name: 'id',
      type: idType,
      required: true,
    },
  ])
}

/**
 * Create a pagination validator
 */
export function createPaginationValidator(): URIParameterValidator {
  return new URIParameterValidator([
    {
      name: 'limit',
      type: 'number',
      required: false,
      min: 1,
      max: 100,
      default: 20,
    },
    {
      name: 'offset',
      type: 'number',
      required: false,
      min: 0,
      default: 0,
    },
  ])
}

/**
 * Generate resources for a noun
 */
export function generateNounResource(noun: string, uriScheme: string): MCPResource {
  const nounKey = toMCPKey(noun)

  return {
    uri: `${uriScheme}://${nounKey}`,
    name: noun,
    description: generateResourceDescription(noun),
    mimeType: 'application/json',
  }
}

/**
 * Generate resource template for individual items
 */
export function generateNounResourceTemplate(noun: string, uriScheme: string): MCPResourceTemplate {
  const nounKey = toMCPKey(noun)

  return {
    uriTemplate: `${uriScheme}://${nounKey}/{id}`,
    name: `${noun} by ID`,
    description: `Get a specific ${noun.toLowerCase()} by its ID`,
    mimeType: 'application/json',
  }
}

/**
 * Generate all resources from noun configuration
 */
export function generateResources(
  nouns: Record<string, Record<string, string>>,
  uriScheme: string
): {
  resources: MCPResource[]
  templates: MCPResourceTemplate[]
} {
  const resources: MCPResource[] = []
  const templates: MCPResourceTemplate[] = []

  for (const noun of Object.keys(nouns)) {
    resources.push(generateNounResource(noun, uriScheme))
    templates.push(generateNounResourceTemplate(noun, uriScheme))
  }

  return { resources, templates }
}

/**
 * Parse a resource URI
 */
export function parseResourceUri(
  uri: string,
  uriScheme: string
): {
  noun: string | null
  id: string | null
  query: Record<string, string>
} {
  const schemePrefix = `${uriScheme}://`

  if (!uri.startsWith(schemePrefix)) {
    return { noun: null, id: null, query: {} }
  }

  const path = uri.slice(schemePrefix.length)
  const [pathPart, queryPart] = path.split('?')
  const parts = pathPart.split('/')

  const noun = parts[0] || null
  const id = parts[1] || null

  // Parse query parameters
  const query: Record<string, string> = {}
  if (queryPart) {
    const params = new URLSearchParams(queryPart)
    params.forEach((value, key) => {
      query[key] = value
    })
  }

  return { noun, id, query }
}

/**
 * Resource reader
 */
export class ResourceReader {
  private store: DataStore
  private nouns: Record<string, Record<string, string>>
  private uriScheme: string

  constructor(
    store: DataStore,
    nouns: Record<string, Record<string, string>>,
    uriScheme: string
  ) {
    this.store = store
    this.nouns = nouns
    this.uriScheme = uriScheme
  }

  /**
   * Read a resource
   */
  read(uri: string): MCPResourceContent {
    const { noun: nounKey, id, query } = parseResourceUri(uri, this.uriScheme)

    if (!nounKey) {
      return {
        contents: [],
        error: 'Invalid resource URI',
      }
    }

    // Find the noun (convert snake_case back to PascalCase)
    const noun = Object.keys(this.nouns).find((n) => toMCPKey(n) === nounKey)

    if (!noun) {
      return {
        contents: [],
        error: `Unknown resource: ${nounKey}`,
      }
    }

    if (id) {
      // Read individual item
      return this.readItem(noun, nounKey, id, uri)
    } else {
      // Read collection
      return this.readCollection(noun, nounKey, query, uri)
    }
  }

  /**
   * Read a single item
   */
  private readItem(noun: string, _nounKey: string, id: string, uri: string): MCPResourceContent {
    const item = this.store.get(noun, id)

    if (!item) {
      return {
        contents: [],
        error: `${noun} not found: ${id}`,
      }
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(item),
        },
      ],
    }
  }

  /**
   * Read a collection
   */
  private readCollection(
    noun: string,
    _nounKey: string,
    query: Record<string, string>,
    uri: string
  ): MCPResourceContent {
    // Convert query string values to appropriate types
    const filter: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(query)) {
      if (value === 'true') {
        filter[key] = true
      } else if (value === 'false') {
        filter[key] = false
      } else if (!isNaN(Number(value))) {
        filter[key] = Number(value)
      } else {
        filter[key] = value
      }
    }

    const items = this.store.list(noun, Object.keys(filter).length > 0 ? filter : undefined)

    // Use the base URI without query params for the response
    const baseUri = uri.split('?')[0]

    return {
      contents: [
        {
          uri: baseUri,
          mimeType: 'application/json',
          text: JSON.stringify(items),
        },
      ],
    }
  }
}
