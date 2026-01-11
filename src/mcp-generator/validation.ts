/**
 * MCP Tool Schema Validation
 *
 * Provides validation utilities for MCP tool inputs using Zod schemas.
 * Supports both JSON Schema and Zod schema definitions.
 */

import type { JSONSchema, JSONSchemaProperty } from './types'

/**
 * Validation error details
 */
export interface ValidationError {
  path: string[]
  message: string
  code: string
}

/**
 * Validation result
 */
export interface SchemaValidationResult {
  success: boolean
  data?: unknown
  errors?: ValidationError[]
}

/**
 * Field schema definition for building JSON schemas
 */
export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  required?: boolean
  default?: unknown
  enum?: string[]
  pattern?: string
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  items?: FieldSchema
  properties?: Record<string, FieldSchema>
}

/**
 * Schema builder for creating JSON schemas fluently
 */
export class SchemaBuilder {
  private properties: Record<string, JSONSchemaProperty> = {}
  private required: string[] = []
  private description?: string

  /**
   * Set schema description
   */
  describe(description: string): this {
    this.description = description
    return this
  }

  /**
   * Add a string field
   */
  string(
    name: string,
    options: {
      description?: string
      required?: boolean
      default?: string
      enum?: string[]
      pattern?: string
      minLength?: number
      maxLength?: number
    } = {}
  ): this {
    this.properties[name] = {
      type: 'string',
      description: options.description,
      enum: options.enum,
      default: options.default,
    }
    if (options.required) {
      this.required.push(name)
    }
    return this
  }

  /**
   * Add a number field
   */
  number(
    name: string,
    options: {
      description?: string
      required?: boolean
      default?: number
      min?: number
      max?: number
    } = {}
  ): this {
    this.properties[name] = {
      type: 'number',
      description: options.description,
      default: options.default,
    }
    if (options.required) {
      this.required.push(name)
    }
    return this
  }

  /**
   * Add a boolean field
   */
  boolean(
    name: string,
    options: {
      description?: string
      required?: boolean
      default?: boolean
    } = {}
  ): this {
    this.properties[name] = {
      type: 'boolean',
      description: options.description,
      default: options.default,
    }
    if (options.required) {
      this.required.push(name)
    }
    return this
  }

  /**
   * Add an array field
   */
  array(
    name: string,
    itemType: 'string' | 'number' | 'boolean' | 'object',
    options: {
      description?: string
      required?: boolean
    } = {}
  ): this {
    this.properties[name] = {
      type: 'array',
      description: options.description,
      items: { type: itemType } as JSONSchema,
    }
    if (options.required) {
      this.required.push(name)
    }
    return this
  }

  /**
   * Add an object field
   */
  object(
    name: string,
    builder: SchemaBuilder,
    options: {
      description?: string
      required?: boolean
    } = {}
  ): this {
    const nested = builder.build()
    // Spread nested but let explicit type override
    const { type: _nestedType, ...nestedRest } = nested
    this.properties[name] = {
      type: 'object',
      description: options.description,
      ...nestedRest,
    } as unknown as JSONSchemaProperty
    if (options.required) {
      this.required.push(name)
    }
    return this
  }

  /**
   * Add an ID field (common pattern)
   */
  id(options: { description?: string; required?: boolean } = {}): this {
    return this.string('id', {
      description: options.description || 'The unique identifier',
      required: options.required,
    })
  }

  /**
   * Build the JSON schema
   */
  build(): JSONSchema {
    return {
      type: 'object',
      description: this.description,
      properties: this.properties,
      required: this.required.length > 0 ? this.required : undefined,
    }
  }
}

/**
 * Create a new schema builder
 */
export function schema(): SchemaBuilder {
  return new SchemaBuilder()
}

/**
 * Validate data against a JSON schema (basic implementation)
 */
export function validateSchema(
  data: unknown,
  jsonSchema: JSONSchema
): SchemaValidationResult {
  const errors: ValidationError[] = []

  if (jsonSchema.type !== 'object') {
    return { success: true, data }
  }

  if (typeof data !== 'object' || data === null) {
    return {
      success: false,
      errors: [{ path: [], message: 'Expected object', code: 'invalid_type' }],
    }
  }

  const obj = data as Record<string, unknown>
  const validatedData: Record<string, unknown> = {}

  // Check required fields
  if (jsonSchema.required) {
    for (const field of jsonSchema.required) {
      if (!(field in obj)) {
        errors.push({
          path: [field],
          message: `Required field '${field}' is missing`,
          code: 'required',
        })
      }
    }
  }

  // Validate each property
  if (jsonSchema.properties) {
    for (const [name, prop] of Object.entries(jsonSchema.properties)) {
      const value = obj[name]

      if (value === undefined) {
        // Use default if available
        if (prop.default !== undefined) {
          validatedData[name] = prop.default
        }
        continue
      }

      const fieldResult = validateField(value, prop, [name])
      if (fieldResult.errors) {
        errors.push(...fieldResult.errors)
      } else {
        validatedData[name] = fieldResult.data
      }
    }
  }

  // Include extra fields that aren't in schema
  for (const [name, value] of Object.entries(obj)) {
    if (!jsonSchema.properties || !(name in jsonSchema.properties)) {
      validatedData[name] = value
    }
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return { success: true, data: validatedData }
}

/**
 * Validate a single field
 */
function validateField(
  value: unknown,
  prop: JSONSchemaProperty,
  path: string[]
): SchemaValidationResult {
  const errors: ValidationError[] = []

  switch (prop.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push({
          path,
          message: `Expected string, got ${typeof value}`,
          code: 'invalid_type',
        })
      } else if (prop.enum && !prop.enum.includes(value)) {
        errors.push({
          path,
          message: `Value must be one of: ${prop.enum.join(', ')}`,
          code: 'invalid_enum',
        })
      }
      break

    case 'number':
      if (typeof value !== 'number') {
        errors.push({
          path,
          message: `Expected number, got ${typeof value}`,
          code: 'invalid_type',
        })
      }
      break

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({
          path,
          message: `Expected boolean, got ${typeof value}`,
          code: 'invalid_type',
        })
      }
      break

    case 'array':
      if (!Array.isArray(value)) {
        errors.push({
          path,
          message: `Expected array, got ${typeof value}`,
          code: 'invalid_type',
        })
      } else if (prop.items) {
        for (let i = 0; i < value.length; i++) {
          const itemResult = validateField(
            value[i],
            prop.items as unknown as JSONSchemaProperty,
            [...path, String(i)]
          )
          if (itemResult.errors) {
            errors.push(...itemResult.errors)
          }
        }
      }
      break

    case 'object':
      if (typeof value !== 'object' || value === null) {
        errors.push({
          path,
          message: `Expected object, got ${typeof value}`,
          code: 'invalid_type',
        })
      }
      break
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return { success: true, data: value }
}

/**
 * Create a tool input validator
 */
export function createToolValidator(inputSchema: JSONSchema): (data: unknown) => SchemaValidationResult {
  return (data: unknown) => validateSchema(data, inputSchema)
}

/**
 * Middleware-style validation wrapper for tool execution
 */
export function withValidation<T>(
  inputSchema: JSONSchema,
  handler: (validatedInput: Record<string, unknown>) => Promise<T>
): (input: unknown) => Promise<T> {
  return async (input: unknown) => {
    const result = validateSchema(input, inputSchema)
    if (!result.success) {
      throw new ValidationException(result.errors || [])
    }
    return handler(result.data as Record<string, unknown>)
  }
}

/**
 * Validation exception
 */
export class ValidationException extends Error {
  public readonly errors: ValidationError[]

  constructor(errors: ValidationError[]) {
    const message = errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    super(`Validation failed: ${message}`)
    this.name = 'ValidationException'
    this.errors = errors
  }
}

/**
 * Coerce input data to match expected types
 */
export function coerceInput(
  data: Record<string, unknown>,
  schema: JSONSchema
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data }

  if (!schema.properties) {
    return result
  }

  for (const [name, prop] of Object.entries(schema.properties)) {
    const value = result[name]
    if (value === undefined) continue

    switch (prop.type) {
      case 'number':
        if (typeof value === 'string') {
          const num = Number(value)
          if (!isNaN(num)) {
            result[name] = num
          }
        }
        break

      case 'boolean':
        if (typeof value === 'string') {
          if (value === 'true' || value === '1') {
            result[name] = true
          } else if (value === 'false' || value === '0') {
            result[name] = false
          }
        }
        break

      case 'array':
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed)) {
              result[name] = parsed
            }
          } catch {
            // Keep original value if parsing fails
          }
        }
        break

      case 'object':
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value)
            if (typeof parsed === 'object' && parsed !== null) {
              result[name] = parsed
            }
          } catch {
            // Keep original value if parsing fails
          }
        }
        break
    }
  }

  return result
}
