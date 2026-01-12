/**
 * REST Handler Module Tests
 *
 * Tests for REST endpoint generation, CRUD operations, custom verbs,
 * pagination, and error handling.
 *
 * @module api-generator/rest.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createRESTHandler } from '../../api-generator/rest'
import { InMemoryStorage } from '../../api-generator/storage'
import { EventEmitter } from '../../api-generator/events'
import type { APIRequest, NounDefinitions, VerbDefinitions } from '../../api-generator/types'

describe('REST Handler', () => {
  // Test nouns definition
  const nouns: NounDefinitions = {
    Todo: { title: 'string', done: 'boolean', priority: 'number?' },
    Project: { name: 'string', description: 'string?' },
  }

  // Test verbs definition
  const verbs: VerbDefinitions = {
    Todo: {
      complete: async ($) => {
        await $.db.Todo.update($.id, { done: true })
      },
      archive: async ($) => {
        await $.db.Todo.update($.id, { archived: true })
      },
    },
  }

  let storage: InMemoryStorage
  let events: EventEmitter

  beforeEach(() => {
    storage = new InMemoryStorage(Object.keys(nouns))
    events = new EventEmitter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Endpoint Generation', () => {
    it('generates CRUD endpoints for nouns', () => {
      const handler = createRESTHandler({ nouns }, storage, events)

      // List endpoints
      expect(handler.getEndpoint('GET', '/todos')).toEqual({
        method: 'GET',
        path: '/todos',
        noun: 'Todo',
        operation: 'list',
      })

      // Create endpoints
      expect(handler.getEndpoint('POST', '/todos')).toEqual({
        method: 'POST',
        path: '/todos',
        noun: 'Todo',
        operation: 'create',
      })

      // Get single endpoints
      expect(handler.getEndpoint('GET', '/todos/:id')).toEqual({
        method: 'GET',
        path: '/todos/:id',
        noun: 'Todo',
        operation: 'get',
      })

      // Update endpoints
      expect(handler.getEndpoint('PUT', '/todos/:id')).toEqual({
        method: 'PUT',
        path: '/todos/:id',
        noun: 'Todo',
        operation: 'update',
      })

      // Delete endpoints
      expect(handler.getEndpoint('DELETE', '/todos/:id')).toEqual({
        method: 'DELETE',
        path: '/todos/:id',
        noun: 'Todo',
        operation: 'delete',
      })
    })

    it('generates endpoints for multiple nouns', () => {
      const handler = createRESTHandler({ nouns }, storage, events)

      expect(handler.getEndpoint('GET', '/projects')).toBeDefined()
      expect(handler.getEndpoint('POST', '/projects')).toBeDefined()
      expect(handler.getEndpoint('GET', '/projects/:id')).toBeDefined()
      expect(handler.getEndpoint('PUT', '/projects/:id')).toBeDefined()
      expect(handler.getEndpoint('DELETE', '/projects/:id')).toBeDefined()
    })

    it('generates verb endpoints', () => {
      const handler = createRESTHandler({ nouns, verbs }, storage, events)

      expect(handler.getEndpoint('POST', '/todos/:id/complete')).toEqual({
        method: 'POST',
        path: '/todos/:id/complete',
        noun: 'Todo',
        operation: 'verb',
        verb: 'complete',
      })

      expect(handler.getEndpoint('POST', '/todos/:id/archive')).toEqual({
        method: 'POST',
        path: '/todos/:id/archive',
        noun: 'Todo',
        operation: 'verb',
        verb: 'archive',
      })
    })

    it('returns undefined for non-existent endpoints', () => {
      const handler = createRESTHandler({ nouns }, storage, events)

      expect(handler.getEndpoint('GET', '/nonexistent')).toBeUndefined()
      expect(handler.getEndpoint('POST', '/todos/:id/nonexistent')).toBeUndefined()
    })
  })

  describe('CRUD Operations', () => {
    describe('List', () => {
      it('returns empty list for empty collection', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)
        const request: APIRequest = {
          method: 'GET',
          path: '/todos',
          query: {},
          body: null,
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({
          data: [],
          pagination: { limit: 20, offset: 0, total: 0 },
        })
      })

      it('handles pagination', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)

        // Create test data
        for (let i = 0; i < 15; i++) {
          storage.create('Todo', { id: `todo-${i}`, title: `Todo ${i}`, done: false })
        }

        const request: APIRequest = {
          method: 'GET',
          path: '/todos',
          query: { limit: '5', offset: '5' },
          body: null,
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(200)
        const body = response.body as { data: unknown[]; pagination: { limit: number; offset: number; total: number } }
        expect(body.data.length).toBe(5)
        expect(body.pagination).toEqual({ limit: 5, offset: 5, total: 15 })
      })

      it('filters by field values', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)

        storage.create('Todo', { id: 'todo-1', title: 'Todo 1', done: false })
        storage.create('Todo', { id: 'todo-2', title: 'Todo 2', done: true })
        storage.create('Todo', { id: 'todo-3', title: 'Todo 3', done: false })

        const request: APIRequest = {
          method: 'GET',
          path: '/todos',
          query: { done: 'true' },
          body: null,
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(200)
        const body = response.body as { data: Array<{ done: boolean }> }
        expect(body.data.length).toBe(1)
        expect(body.data[0].done).toBe(true)
      })

      it('converts number query params', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)

        storage.create('Todo', { id: 'todo-1', title: 'Todo 1', done: false, priority: 1 })
        storage.create('Todo', { id: 'todo-2', title: 'Todo 2', done: false, priority: 2 })

        const request: APIRequest = {
          method: 'GET',
          path: '/todos',
          query: { priority: '1' },
          body: null,
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(200)
        const body = response.body as { data: Array<{ priority: number }> }
        expect(body.data.length).toBe(1)
        expect(body.data[0].priority).toBe(1)
      })
    })

    describe('Get', () => {
      it('returns record by ID', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)
        storage.create('Todo', { id: 'todo-123', title: 'Test Todo', done: false })

        const request: APIRequest = {
          method: 'GET',
          path: '/todos/todo-123',
          query: {},
          body: null,
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ id: 'todo-123', title: 'Test Todo', done: false })
      })

      it('returns 404 for non-existent record', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)

        const request: APIRequest = {
          method: 'GET',
          path: '/todos/nonexistent',
          query: {},
          body: null,
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(404)
        expect(response.body).toEqual({
          error: 'Todo not found',
          code: 'NOT_FOUND',
          requestId: undefined,
        })
      })
    })

    describe('Create', () => {
      it('creates a new record', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)

        const request: APIRequest = {
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'New Todo', done: false },
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(201)
        const body = response.body as { id: string; title: string; done: boolean }
        expect(body.title).toBe('New Todo')
        expect(body.done).toBe(false)
        expect(body.id).toBeDefined()
      })

      it('creates with custom ID', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)

        const request: APIRequest = {
          method: 'POST',
          path: '/todos',
          query: {},
          body: { id: 'custom-id', title: 'New Todo', done: false },
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(201)
        expect((response.body as { id: string }).id).toBe('custom-id')
      })

      it('returns 409 for duplicate ID', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)
        storage.create('Todo', { id: 'existing-id', title: 'Existing', done: false })

        const request: APIRequest = {
          method: 'POST',
          path: '/todos',
          query: {},
          body: { id: 'existing-id', title: 'New Todo', done: false },
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(409)
        expect(response.body).toEqual({
          error: 'Todo with id existing-id already exists',
          code: 'DUPLICATE',
          requestId: undefined,
        })
      })

      it('emits create event', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)
        const emittedEvents: unknown[] = []
        events.on('todoCreated', (data: unknown) => emittedEvents.push(data))

        const request: APIRequest = {
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'New Todo', done: false },
        }

        await handler.handleRequest(request)
        vi.runAllTimers()

        expect(emittedEvents.length).toBe(1)
        expect((emittedEvents[0] as { title: string }).title).toBe('New Todo')
      })
    })

    describe('Update', () => {
      it('updates an existing record', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)
        storage.create('Todo', { id: 'todo-123', title: 'Original', done: false })

        const request: APIRequest = {
          method: 'PUT',
          path: '/todos/todo-123',
          query: {},
          body: { title: 'Updated' },
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(200)
        expect((response.body as { title: string }).title).toBe('Updated')
        expect((response.body as { done: boolean }).done).toBe(false)
      })

      it('returns 404 for non-existent record', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)

        const request: APIRequest = {
          method: 'PUT',
          path: '/todos/nonexistent',
          query: {},
          body: { title: 'Updated' },
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(404)
      })

      it('emits update event', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)
        storage.create('Todo', { id: 'todo-123', title: 'Original', done: false })
        const emittedEvents: unknown[] = []
        events.on('todoUpdated', (data: unknown) => emittedEvents.push(data))

        const request: APIRequest = {
          method: 'PUT',
          path: '/todos/todo-123',
          query: {},
          body: { title: 'Updated' },
        }

        await handler.handleRequest(request)
        vi.runAllTimers()

        expect(emittedEvents.length).toBe(1)
        expect((emittedEvents[0] as { title: string }).title).toBe('Updated')
      })
    })

    describe('Delete', () => {
      it('deletes an existing record', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)
        storage.create('Todo', { id: 'todo-123', title: 'To Delete', done: false })

        const request: APIRequest = {
          method: 'DELETE',
          path: '/todos/todo-123',
          query: {},
          body: null,
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(204)
        expect(response.body).toBeNull()
        expect(storage.get('Todo', 'todo-123')).toBeUndefined()
      })

      it('returns 404 for non-existent record', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)

        const request: APIRequest = {
          method: 'DELETE',
          path: '/todos/nonexistent',
          query: {},
          body: null,
        }

        const response = await handler.handleRequest(request)

        expect(response.status).toBe(404)
      })

      it('emits delete event', async () => {
        const handler = createRESTHandler({ nouns }, storage, events)
        storage.create('Todo', { id: 'todo-123', title: 'To Delete', done: false })
        const emittedEvents: unknown[] = []
        events.on('todoDeleted', (data: unknown) => emittedEvents.push(data))

        const request: APIRequest = {
          method: 'DELETE',
          path: '/todos/todo-123',
          query: {},
          body: null,
        }

        await handler.handleRequest(request)
        vi.runAllTimers()

        expect(emittedEvents.length).toBe(1)
        expect((emittedEvents[0] as { id: string }).id).toBe('todo-123')
      })
    })
  })

  describe('Custom Verbs', () => {
    it('handles custom verb actions', async () => {
      const handler = createRESTHandler({ nouns, verbs }, storage, events)
      storage.create('Todo', { id: 'todo-123', title: 'Test', done: false })

      const request: APIRequest = {
        method: 'POST',
        path: '/todos/todo-123/complete',
        query: {},
        body: {},
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(200)
      expect((response.body as { done: boolean }).done).toBe(true)
    })

    it('returns 404 for verb on non-existent record', async () => {
      const handler = createRESTHandler({ nouns, verbs }, storage, events)

      const request: APIRequest = {
        method: 'POST',
        path: '/todos/nonexistent/complete',
        query: {},
        body: {},
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(404)
    })

    it('emits verb events', async () => {
      const handler = createRESTHandler({ nouns, verbs }, storage, events)
      storage.create('Todo', { id: 'todo-123', title: 'Test', done: false })
      const emittedEvents: unknown[] = []
      events.on('todoCompleted', (data: unknown) => emittedEvents.push(data))

      const request: APIRequest = {
        method: 'POST',
        path: '/todos/todo-123/complete',
        query: {},
        body: {},
      }

      await handler.handleRequest(request)
      vi.runAllTimers()

      expect(emittedEvents.length).toBe(1)
      expect((emittedEvents[0] as { done: boolean }).done).toBe(true)
    })

    it('handles verb with input', async () => {
      const verbsWithInput: VerbDefinitions = {
        Todo: {
          updatePriority: async ($) => {
            const input = $.input as { priority: number }
            await $.db.Todo.update($.id, { priority: input.priority })
          },
        },
      }

      const handler = createRESTHandler({ nouns, verbs: verbsWithInput }, storage, events)
      storage.create('Todo', { id: 'todo-123', title: 'Test', done: false, priority: 1 })

      const request: APIRequest = {
        method: 'POST',
        path: '/todos/todo-123/updatePriority',
        query: {},
        body: { priority: 5 },
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(200)
      expect((response.body as { priority: number }).priority).toBe(5)
    })
  })

  describe('Validation', () => {
    it('validates required body is object', async () => {
      const handler = createRESTHandler({ nouns }, storage, events)

      const request: APIRequest = {
        method: 'POST',
        path: '/todos',
        query: {},
        body: null,
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(400)
      expect((response.body as { code: string }).code).toBe('VALIDATION_ERROR')
    })

    it('rejects unknown fields', async () => {
      const handler = createRESTHandler({ nouns }, storage, events)

      const request: APIRequest = {
        method: 'POST',
        path: '/todos',
        query: {},
        body: { title: 'Test', unknown: 'field' },
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(400)
      expect((response.body as { code: string }).code).toBe('VALIDATION_ERROR')
      const details = (response.body as { details: Array<{ field: string }> }).details
      expect(details.some((d) => d.field === 'unknown')).toBe(true)
    })

    it('validates field types', async () => {
      const handler = createRESTHandler({ nouns }, storage, events)

      const request: APIRequest = {
        method: 'POST',
        path: '/todos',
        query: {},
        body: { title: 123, done: 'not-boolean' },
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(400)
      expect((response.body as { code: string }).code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Error Handling', () => {
    it('returns 404 for unknown paths', async () => {
      const handler = createRESTHandler({ nouns }, storage, events)

      const request: APIRequest = {
        method: 'GET',
        path: '/unknown',
        query: {},
        body: null,
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        error: 'Not found',
        code: 'NOT_FOUND',
        requestId: undefined,
      })
    })

    it('includes request ID in error responses', async () => {
      const handler = createRESTHandler({ nouns }, storage, events)

      const request: APIRequest = {
        method: 'GET',
        path: '/unknown',
        query: {},
        body: null,
        headers: { 'X-Request-ID': 'req-12345' },
      }

      const response = await handler.handleRequest(request)

      expect((response.body as { requestId: string }).requestId).toBe('req-12345')
    })

    it('handles verb execution errors', async () => {
      const failingVerbs: VerbDefinitions = {
        Todo: {
          fail: async () => {
            throw new Error('Intentional failure')
          },
        },
      }

      const handler = createRESTHandler({ nouns, verbs: failingVerbs }, storage, events)
      storage.create('Todo', { id: 'todo-123', title: 'Test', done: false })

      const request: APIRequest = {
        method: 'POST',
        path: '/todos/todo-123/fail',
        query: {},
        body: {},
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(500)
      expect((response.body as { code: string }).code).toBe('INTERNAL_ERROR')
    })
  })

  describe('CORS', () => {
    it('handles OPTIONS preflight request', async () => {
      const handler = createRESTHandler(
        {
          nouns,
          cors: { origin: '*' },
        },
        storage,
        events
      )

      const request: APIRequest = {
        method: 'OPTIONS',
        path: '/todos',
        query: {},
        body: null,
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(204)
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(response.headers['Access-Control-Allow-Headers']).toBe('Content-Type, X-API-Key, Authorization')
    })

    it('includes CORS headers in responses', async () => {
      const handler = createRESTHandler(
        {
          nouns,
          cors: { origin: 'https://example.com', methods: ['GET', 'POST'] },
        },
        storage,
        events
      )

      const request: APIRequest = {
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
      }

      const response = await handler.handleRequest(request)

      expect(response.headers['Access-Control-Allow-Origin']).toBe('https://example.com')
      expect(response.headers['Access-Control-Allow-Methods']).toBe('GET, POST')
    })
  })

  describe('Rate Limiting', () => {
    it('includes rate limit headers', async () => {
      const handler = createRESTHandler(
        {
          nouns,
          rateLimiting: { requests: 100, window: '1m' },
        },
        storage,
        events
      )

      const request: APIRequest = {
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(200)
      expect(response.headers['X-RateLimit-Limit']).toBeDefined()
      expect(response.headers['X-RateLimit-Remaining']).toBeDefined()
      expect(response.headers['X-RateLimit-Reset']).toBeDefined()
    })

    it('returns 429 when rate limited', async () => {
      const handler = createRESTHandler(
        {
          nouns,
          rateLimiting: { requests: 2, window: '1m' },
        },
        storage,
        events
      )

      const request: APIRequest = {
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
      }

      // First two requests should succeed
      await handler.handleRequest(request)
      await handler.handleRequest(request)

      // Third request should be rate limited
      const response = await handler.handleRequest(request)

      expect(response.status).toBe(429)
      expect((response.body as { code: string }).code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('gets rate limit config for endpoint', () => {
      const handler = createRESTHandler(
        {
          nouns,
          rateLimiting: {
            default: { requests: 100, window: '1m' },
            endpoints: {
              'POST /todos': { requests: 10, window: '1m' },
            },
          },
        },
        storage,
        events
      )

      expect(handler.getRateLimitConfig('POST /todos')).toEqual({ requests: 10, window: '1m' })
      expect(handler.getRateLimitConfig('GET /todos')).toEqual({ requests: 100, window: '1m' })
    })
  })

  describe('Authentication', () => {
    it('requires API key when configured', async () => {
      const handler = createRESTHandler(
        {
          nouns,
          authentication: { apiKeys: true },
        },
        storage,
        events
      )

      const request: APIRequest = {
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(401)
      expect((response.body as { error: string }).error).toBe('API key required')
    })

    it('accepts valid API key in header', async () => {
      const handler = createRESTHandler(
        {
          nouns,
          authentication: {
            apiKeys: true,
            validateKey: async () => ({ valid: true }),
          },
        },
        storage,
        events
      )

      const request: APIRequest = {
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
        headers: { 'X-API-Key': 'valid-key' },
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(200)
    })

    it('accepts Bearer token', async () => {
      const handler = createRESTHandler(
        {
          nouns,
          authentication: {
            apiKeys: true,
            validateKey: async () => ({ valid: true }),
          },
        },
        storage,
        events
      )

      const request: APIRequest = {
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
        headers: { Authorization: 'Bearer valid-token' },
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(200)
    })

    it('allows public endpoints without auth', async () => {
      const handler = createRESTHandler(
        {
          nouns,
          authentication: {
            apiKeys: true,
            publicEndpoints: ['GET /todos'],
          },
        },
        storage,
        events
      )

      const request: APIRequest = {
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(200)
    })

    it('returns 401 for invalid API key', async () => {
      const handler = createRESTHandler(
        {
          nouns,
          authentication: {
            apiKeys: true,
            validateKey: async () => ({ valid: false }),
          },
        },
        storage,
        events
      )

      const request: APIRequest = {
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
        headers: { 'X-API-Key': 'invalid-key' },
      }

      const response = await handler.handleRequest(request)

      expect(response.status).toBe(401)
      expect((response.body as { error: string }).error).toBe('Invalid API key')
    })
  })
})
