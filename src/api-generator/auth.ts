/**
 * Authentication Module
 *
 * Handles API key extraction and validation for the API generator.
 *
 * @module api-generator/auth
 */

import type { APIRequest, APIKeyAuth, APIKeyValidationResult } from './types'
import { matchPath } from './utilities'

/**
 * Result from API key extraction and validation
 */
export interface AuthResult {
  valid: boolean
  keyInfo?: APIKeyValidationResult
  reason?: 'missing' | 'invalid'
}

/**
 * Extracts and validates an API key from a request
 * @param request - The incoming API request
 * @param authentication - Authentication configuration
 * @returns The authentication result
 */
export async function extractAndValidateApiKey(
  request: APIRequest,
  authentication?: APIKeyAuth
): Promise<AuthResult> {
  if (!authentication?.apiKeys) {
    return { valid: true }
  }

  // Check public endpoints with pattern matching
  if (authentication.publicEndpoints?.some(ep => {
    const epParts = ep.split(' ')
    if (epParts.length === 2) {
      const [method, path] = epParts
      if (method !== request.method) return false
      const { match } = matchPath(path.replace('{id}', ':id'), request.path)
      return match
    }
    return false
  })) {
    return { valid: true }
  }

  // Also check exact match for public endpoints like "GET /todos"
  const basePathMatch = request.path.match(/^(\/[^/]+)/)
  if (basePathMatch) {
    const basePath = basePathMatch[1]
    if (authentication.publicEndpoints?.includes(`${request.method} ${basePath}`)) {
      return { valid: true }
    }
  }

  // Extract key from headers or query
  let apiKey: string | undefined

  if (request.headers?.['X-API-Key']) {
    apiKey = request.headers['X-API-Key']
  } else if (request.headers?.['Authorization']) {
    const auth = request.headers['Authorization']
    if (auth.startsWith('Bearer ')) {
      apiKey = auth.slice(7)
    }
  } else if (authentication.allowQueryParam && request.query.api_key) {
    apiKey = request.query.api_key
  }

  if (!apiKey) {
    return { valid: false, reason: 'missing' }
  }

  // Validate key
  if (authentication.validateKey) {
    const result = await authentication.validateKey(apiKey)
    if (typeof result === 'boolean') {
      if (!result) {
        return { valid: false, reason: 'invalid' }
      }
      return { valid: true, keyInfo: { valid: true } }
    }
    if (!result.valid) {
      return { valid: false, reason: 'invalid' }
    }
    return { valid: true, keyInfo: result }
  }

  // No validateKey function - key is accepted, try to extract tier from prefix
  // Format: "{tier}_key_..." e.g., "pro_key_123" -> tier "pro"
  const tierMatch = apiKey.match(/^(\w+)_key_/)
  const tier = tierMatch ? tierMatch[1] : undefined

  return { valid: true, keyInfo: { valid: true, tier } }
}

/**
 * Generates CORS headers from configuration
 * @param cors - CORS configuration
 * @returns Record of CORS headers
 */
export function getCorsHeaders(cors?: {
  origin: string
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
}): Record<string, string> {
  if (!cors) return {}
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': cors.origin,
    'Access-Control-Allow-Methods': cors.methods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS',
  }
  if (cors.allowedHeaders) {
    headers['Access-Control-Allow-Headers'] = cors.allowedHeaders.join(', ')
  }
  if (cors.exposedHeaders) {
    headers['Access-Control-Expose-Headers'] = cors.exposedHeaders.join(', ')
  }
  if (cors.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  if (cors.maxAge !== undefined) {
    headers['Access-Control-Max-Age'] = cors.maxAge.toString()
  }
  return headers
}
