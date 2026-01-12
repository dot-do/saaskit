/**
 * API Generator Utilities
 *
 * Shared utility functions for the API generator modules.
 *
 * @module api-generator/utilities
 */

import type { FieldType } from './types'

/**
 * Generates a unique identifier for records
 * @returns A random string ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Converts a noun to its plural form
 * Handles common English pluralization rules
 * @param noun - The singular noun to pluralize
 * @returns The plural form of the noun
 */
export function pluralize(noun: string): string {
  const lower = noun.toLowerCase()
  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') || lower.endsWith('ch') || lower.endsWith('sh')) {
    return lower + 'es'
  }
  if (lower.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lower[lower.length - 2])) {
    return lower.slice(0, -1) + 'ies'
  }
  return lower + 's'
}

/**
 * Returns the lowercase singular form of a noun
 * @param noun - The noun to singularize
 * @returns The singular form (lowercase)
 */
export function singularize(noun: string): string {
  return noun.toLowerCase()
}

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Parses a time window string into milliseconds
 * @param window - Time window string (e.g., '1m', '30s', '1h', '1d')
 * @returns The time window in milliseconds
 */
export function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/)
  if (!match) return 60000 // default 1 minute
  const [, num, unit] = match
  const ms = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  }[unit] || 60000
  return parseInt(num) * ms
}

/**
 * Maps a field type to OpenAPI schema type
 * @param fieldType - The field type from noun definition
 * @returns OpenAPI schema type with optional enum values
 */
export function mapFieldTypeToOpenAPI(fieldType: FieldType): { type: string; enum?: string[] } {
  if (fieldType.includes('|')) {
    const values = fieldType.split('|').map(v => v.trim())
    return { type: 'string', enum: values }
  }
  const baseType = fieldType.replace('?', '')
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
  }
  return { type: typeMap[baseType] || 'string' }
}

/**
 * Validates a field value against its expected type
 * @param value - The value to validate
 * @param expectedType - The expected type (e.g., 'string', 'number?', 'active | inactive')
 * @returns True if the value matches the expected type
 */
export function validateField(value: unknown, expectedType: FieldType): boolean {
  const isOptional = expectedType.endsWith('?')
  const baseType = expectedType.replace('?', '')

  if (value === undefined || value === null) {
    return isOptional
  }

  if (baseType.includes('|')) {
    const allowedValues = baseType.split('|').map(v => v.trim())
    return allowedValues.includes(String(value))
  }

  const actualType = typeof value
  return actualType === baseType
}

/**
 * Matches a URL path pattern against an actual path
 * @param pattern - The URL pattern with :param placeholders
 * @param actual - The actual URL path
 * @returns Whether the paths match and extracted params
 */
export function matchPath(pattern: string, actual: string): { match: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/')
  const actualParts = actual.split('/')

  if (patternParts.length !== actualParts.length) {
    return { match: false, params: {} }
  }

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = actualParts[i]
    } else if (patternParts[i] !== actualParts[i]) {
      return { match: false, params: {} }
    }
  }

  return { match: true, params }
}
