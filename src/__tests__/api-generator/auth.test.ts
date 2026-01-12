/**
 * Authentication Module Tests
 *
 * Tests for the API key extraction, validation, and CORS handling.
 *
 * @module api-generator/auth.test
 */

import { describe, it, expect, vi } from 'vitest'
import { extractAndValidateApiKey, getCorsHeaders } from '../../api-generator/auth'
import type { APIRequest, APIKeyAuth } from '../../api-generator/types'

describe('Authentication Module', () => {
  const createRequest = (overrides: Partial<APIRequest> = {}): APIRequest => ({
    method: 'GET',
    path: '/todos',
    query: {},
    body: null,
    headers: {},
    ...overrides,
  })

  describe('extractAndValidateApiKey', () => {
    describe('when no authentication is configured', () => {
      it('should return valid result', async () => {
        const request = createRequest()
        const result = await extractAndValidateApiKey(request, undefined)

        expect(result.valid).toBe(true)
      })

      it('should return valid result when apiKeys is false', async () => {
        const request = createRequest()
        const auth: APIKeyAuth = { apiKeys: false }
        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(true)
      })
    })

    describe('public endpoints', () => {
      it('should allow access to exact match public endpoints', async () => {
        const request = createRequest({ method: 'GET', path: '/todos' })
        const auth: APIKeyAuth = {
          apiKeys: true,
          publicEndpoints: ['GET /todos'],
        }

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(true)
      })

      it('should allow access to pattern matched public endpoints', async () => {
        const request = createRequest({ method: 'GET', path: '/todos/123' })
        const auth: APIKeyAuth = {
          apiKeys: true,
          publicEndpoints: ['GET /todos/{id}'],
        }

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(true)
      })

      it('should not allow access to non-matching public endpoints', async () => {
        const request = createRequest({ method: 'POST', path: '/todos' })
        const auth: APIKeyAuth = {
          apiKeys: true,
          publicEndpoints: ['GET /todos'],
        }

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('missing')
      })
    })

    describe('API key extraction from headers', () => {
      const auth: APIKeyAuth = { apiKeys: true }

      it('should extract API key from X-API-Key header', async () => {
        const request = createRequest({
          headers: { 'X-API-Key': 'test_key_123' },
        })

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(true)
      })

      it('should extract API key from Authorization Bearer header', async () => {
        const request = createRequest({
          headers: { 'Authorization': 'Bearer test_key_123' },
        })

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(true)
      })

      it('should prefer X-API-Key over Authorization header', async () => {
        const validateKey = vi.fn().mockResolvedValue(true)
        const request = createRequest({
          headers: {
            'X-API-Key': 'x-api-key-value',
            'Authorization': 'Bearer bearer-value',
          },
        })
        const authWithValidation: APIKeyAuth = { apiKeys: true, validateKey }

        await extractAndValidateApiKey(request, authWithValidation)

        expect(validateKey).toHaveBeenCalledWith('x-api-key-value')
      })

      it('should return missing reason when no key is provided', async () => {
        const request = createRequest()

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('missing')
      })
    })

    describe('API key extraction from query parameter', () => {
      it('should extract API key from query when allowed', async () => {
        const auth: APIKeyAuth = { apiKeys: true, allowQueryParam: true }
        const request = createRequest({
          query: { api_key: 'query_key_123' },
        })

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(true)
      })

      it('should not extract from query when not allowed', async () => {
        const auth: APIKeyAuth = { apiKeys: true }
        const request = createRequest({
          query: { api_key: 'query_key_123' },
        })

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('missing')
      })

      it('should prefer header over query parameter', async () => {
        const validateKey = vi.fn().mockResolvedValue(true)
        const auth: APIKeyAuth = {
          apiKeys: true,
          allowQueryParam: true,
          validateKey,
        }
        const request = createRequest({
          headers: { 'X-API-Key': 'header-key' },
          query: { api_key: 'query-key' },
        })

        await extractAndValidateApiKey(request, auth)

        expect(validateKey).toHaveBeenCalledWith('header-key')
      })
    })

    describe('custom validation function', () => {
      it('should call validateKey with the extracted key', async () => {
        const validateKey = vi.fn().mockResolvedValue(true)
        const auth: APIKeyAuth = { apiKeys: true, validateKey }
        const request = createRequest({
          headers: { 'X-API-Key': 'test_key' },
        })

        await extractAndValidateApiKey(request, auth)

        expect(validateKey).toHaveBeenCalledWith('test_key')
      })

      it('should handle boolean true response', async () => {
        const auth: APIKeyAuth = {
          apiKeys: true,
          validateKey: async () => true,
        }
        const request = createRequest({
          headers: { 'X-API-Key': 'valid_key' },
        })

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(true)
        expect(result.keyInfo).toEqual({ valid: true })
      })

      it('should handle boolean false response', async () => {
        const auth: APIKeyAuth = {
          apiKeys: true,
          validateKey: async () => false,
        }
        const request = createRequest({
          headers: { 'X-API-Key': 'invalid_key' },
        })

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('invalid')
      })

      it('should handle validation result object', async () => {
        const auth: APIKeyAuth = {
          apiKeys: true,
          validateKey: async () => ({
            valid: true,
            keyId: 'key_123',
            tier: 'pro',
            organizationId: 'org_456',
          }),
        }
        const request = createRequest({
          headers: { 'X-API-Key': 'valid_key' },
        })

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(true)
        expect(result.keyInfo).toEqual({
          valid: true,
          keyId: 'key_123',
          tier: 'pro',
          organizationId: 'org_456',
        })
      })

      it('should handle invalid validation result object', async () => {
        const auth: APIKeyAuth = {
          apiKeys: true,
          validateKey: async () => ({ valid: false }),
        }
        const request = createRequest({
          headers: { 'X-API-Key': 'invalid_key' },
        })

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('invalid')
      })
    })

    describe('tier extraction from API key prefix', () => {
      it('should extract tier from key prefix format', async () => {
        const auth: APIKeyAuth = { apiKeys: true }
        const request = createRequest({
          headers: { 'X-API-Key': 'pro_key_abc123' },
        })

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(true)
        expect(result.keyInfo?.tier).toBe('pro')
      })

      it('should extract tier from different prefixes', async () => {
        const auth: APIKeyAuth = { apiKeys: true }

        const basicRequest = createRequest({
          headers: { 'X-API-Key': 'basic_key_xyz' },
        })
        const enterpriseRequest = createRequest({
          headers: { 'X-API-Key': 'enterprise_key_xyz' },
        })

        const basicResult = await extractAndValidateApiKey(basicRequest, auth)
        const enterpriseResult = await extractAndValidateApiKey(enterpriseRequest, auth)

        expect(basicResult.keyInfo?.tier).toBe('basic')
        expect(enterpriseResult.keyInfo?.tier).toBe('enterprise')
      })

      it('should not extract tier from non-matching format', async () => {
        const auth: APIKeyAuth = { apiKeys: true }
        const request = createRequest({
          headers: { 'X-API-Key': 'random-api-key-123' },
        })

        const result = await extractAndValidateApiKey(request, auth)

        expect(result.valid).toBe(true)
        expect(result.keyInfo?.tier).toBeUndefined()
      })
    })
  })

  describe('getCorsHeaders', () => {
    it('should return empty object when no CORS config', () => {
      const headers = getCorsHeaders(undefined)

      expect(headers).toEqual({})
    })

    it('should set Access-Control-Allow-Origin', () => {
      const headers = getCorsHeaders({ origin: 'https://example.com' })

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com')
    })

    it('should set wildcard origin', () => {
      const headers = getCorsHeaders({ origin: '*' })

      expect(headers['Access-Control-Allow-Origin']).toBe('*')
    })

    it('should set default methods when not specified', () => {
      const headers = getCorsHeaders({ origin: '*' })

      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS')
    })

    it('should set custom methods', () => {
      const headers = getCorsHeaders({
        origin: '*',
        methods: ['GET', 'POST'],
      })

      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST')
    })

    it('should set allowed headers', () => {
      const headers = getCorsHeaders({
        origin: '*',
        allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
      })

      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, X-API-Key, Authorization')
    })

    it('should not include allowed headers when not specified', () => {
      const headers = getCorsHeaders({ origin: '*' })

      expect(headers['Access-Control-Allow-Headers']).toBeUndefined()
    })

    it('should set exposed headers', () => {
      const headers = getCorsHeaders({
        origin: '*',
        exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      })

      expect(headers['Access-Control-Expose-Headers']).toBe('X-RateLimit-Limit, X-RateLimit-Remaining')
    })

    it('should set credentials to true', () => {
      const headers = getCorsHeaders({
        origin: '*',
        credentials: true,
      })

      expect(headers['Access-Control-Allow-Credentials']).toBe('true')
    })

    it('should not include credentials when false', () => {
      const headers = getCorsHeaders({
        origin: '*',
        credentials: false,
      })

      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined()
    })

    it('should set max age', () => {
      const headers = getCorsHeaders({
        origin: '*',
        maxAge: 86400,
      })

      expect(headers['Access-Control-Max-Age']).toBe('86400')
    })

    it('should set max age of 0', () => {
      const headers = getCorsHeaders({
        origin: '*',
        maxAge: 0,
      })

      expect(headers['Access-Control-Max-Age']).toBe('0')
    })

    it('should combine all CORS options', () => {
      const headers = getCorsHeaders({
        origin: 'https://example.com',
        methods: ['GET', 'POST', 'PUT'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Request-Id'],
        credentials: true,
        maxAge: 3600,
      })

      expect(headers).toEqual({
        'Access-Control-Allow-Origin': 'https://example.com',
        'Access-Control-Allow-Methods': 'GET, POST, PUT',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Expose-Headers': 'X-Request-Id',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '3600',
      })
    })
  })
})
