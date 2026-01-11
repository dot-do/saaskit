/**
 * API Generator Tests (RED Phase - TDD)
 *
 * These tests define the expected API for the REST and GraphQL API generator
 * that creates endpoints from noun/verb definitions. All tests should FAIL
 * initially because the implementation doesn't exist yet.
 *
 * The API generator provides:
 * - REST endpoints for CRUD operations on nouns
 * - REST endpoints for verb execution
 * - GraphQL schema generation (queries, mutations, subscriptions)
 * - OpenAPI specification generation
 * - Rate limiting and authentication
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

import { createAPIGenerator, generateOpenAPISpec } from '../api-generator'
import type {
  APIGenerator,
  RESTEndpoint,
  GraphQLSchema,
  OpenAPISpec,
  RateLimitConfig,
  APIKeyAuth,
  CORSConfig,
  VerbDefinitions,
} from '../api-generator/types'

describe('API Generator', () => {
  /**
   * Factory function for creating test API generators
   */
  const createTestAPI = (config: {
    nouns?: Record<string, Record<string, string>>
    verbs?: VerbDefinitions
    rateLimiting?: RateLimitConfig
    authentication?: APIKeyAuth
    cors?: CORSConfig
  } = {}) => {
    return createAPIGenerator({
      nouns: config.nouns ?? {
        Todo: { title: 'string', done: 'boolean' },
        User: { name: 'string', email: 'string' },
      },
      verbs: config.verbs ?? {
        Todo: {
          complete: ($) => $.db.Todo.update($.id, { done: true }),
        },
      },
      rateLimiting: config.rateLimiting,
      authentication: config.authentication,
      cors: config.cors,
    })
  }

  describe('REST API Generation', () => {
    describe('GET /[noun] - List Records', () => {
      it('should generate GET endpoint for listing all records', () => {
        const api = createTestAPI()

        const endpoint = api.getEndpoint('GET', '/todos')

        expect(endpoint).toBeDefined()
        expect(endpoint!.method).toBe('GET')
        expect(endpoint!.path).toBe('/todos')
      })

      it('should return paginated list of records', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'GET',
          path: '/todos',
          query: {},
          body: null,
        })

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('data')
        expect(Array.isArray(response.body.data)).toBe(true)
        expect(response.body).toHaveProperty('pagination')
        expect(response.body.pagination).toHaveProperty('limit')
        expect(response.body.pagination).toHaveProperty('offset')
        expect(response.body.pagination).toHaveProperty('total')
      })

      it('should support limit and offset query parameters', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'GET',
          path: '/todos',
          query: { limit: '10', offset: '20' },
          body: null,
        })

        expect(response.status).toBe(200)
        expect(response.body.pagination.limit).toBe(10)
        expect(response.body.pagination.offset).toBe(20)
      })

      it('should support filter query parameters', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'GET',
          path: '/todos',
          query: { done: 'true' },
          body: null,
        })

        expect(response.status).toBe(200)
        // All returned records should match the filter
      })

      it('should return 404 for unknown noun', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'GET',
          path: '/unknowns',
          query: {},
          body: null,
        })

        expect(response.status).toBe(404)
        expect(response.body).toHaveProperty('error')
      })
    })

    describe('POST /[noun] - Create Record', () => {
      it('should generate POST endpoint for creating records', () => {
        const api = createTestAPI()

        const endpoint = api.getEndpoint('POST', '/todos')

        expect(endpoint).toBeDefined()
        expect(endpoint!.method).toBe('POST')
        expect(endpoint!.path).toBe('/todos')
      })

      it('should create a new record and return it', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'New Todo', done: false },
        })

        expect(response.status).toBe(201)
        expect(response.body).toHaveProperty('id')
        expect(response.body.title).toBe('New Todo')
        expect(response.body.done).toBe(false)
      })

      it('should auto-generate id if not provided', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'Auto ID Todo' },
        })

        expect(response.status).toBe(201)
        expect(response.body.id).toBeDefined()
        expect(typeof response.body.id).toBe('string')
      })

      it('should return 400 for invalid body', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { invalid: 'field' },
        })

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty('error')
        expect(response.body).toHaveProperty('details')
      })

      it('should return 409 for duplicate id', async () => {
        const api = createTestAPI()

        // Create first record
        await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { id: 'dup_123', title: 'First' },
        })

        // Try to create duplicate
        const response = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { id: 'dup_123', title: 'Duplicate' },
        })

        expect(response.status).toBe(409)
        expect(response.body.error).toMatch(/duplicate|exists/i)
      })
    })

    describe('GET /[noun]/:id - Get Single Record', () => {
      it('should generate GET endpoint for single record', () => {
        const api = createTestAPI()

        const endpoint = api.getEndpoint('GET', '/todos/:id')

        expect(endpoint).toBeDefined()
        expect(endpoint!.method).toBe('GET')
        expect(endpoint!.path).toBe('/todos/:id')
      })

      it('should return a single record by id', async () => {
        const api = createTestAPI()

        // Create a record first
        const createResponse = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'Get Test', done: false },
        })

        const id = createResponse.body.id

        // Get the record
        const response = await api.handleRequest({
          method: 'GET',
          path: `/todos/${id}`,
          query: {},
          body: null,
        })

        expect(response.status).toBe(200)
        expect(response.body.id).toBe(id)
        expect(response.body.title).toBe('Get Test')
      })

      it('should return 404 for non-existent id', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'GET',
          path: '/todos/nonexistent_123',
          query: {},
          body: null,
        })

        expect(response.status).toBe(404)
        expect(response.body).toHaveProperty('error')
      })
    })

    describe('PUT /[noun]/:id - Update Record', () => {
      it('should generate PUT endpoint for updating records', () => {
        const api = createTestAPI()

        const endpoint = api.getEndpoint('PUT', '/todos/:id')

        expect(endpoint).toBeDefined()
        expect(endpoint!.method).toBe('PUT')
        expect(endpoint!.path).toBe('/todos/:id')
      })

      it('should update an existing record', async () => {
        const api = createTestAPI()

        // Create a record first
        const createResponse = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'Original', done: false },
        })

        const id = createResponse.body.id

        // Update the record
        const response = await api.handleRequest({
          method: 'PUT',
          path: `/todos/${id}`,
          query: {},
          body: { title: 'Updated' },
        })

        expect(response.status).toBe(200)
        expect(response.body.id).toBe(id)
        expect(response.body.title).toBe('Updated')
        expect(response.body.done).toBe(false) // unchanged
      })

      it('should return 404 for non-existent id', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'PUT',
          path: '/todos/nonexistent_123',
          query: {},
          body: { title: 'Update' },
        })

        expect(response.status).toBe(404)
        expect(response.body).toHaveProperty('error')
      })

      it('should return 400 for invalid update body', async () => {
        const api = createTestAPI()

        // Create a record first
        const createResponse = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'Validation Test' },
        })

        const id = createResponse.body.id

        // Try invalid update
        const response = await api.handleRequest({
          method: 'PUT',
          path: `/todos/${id}`,
          query: {},
          body: { done: 'not-a-boolean' },
        })

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty('error')
      })
    })

    describe('DELETE /[noun]/:id - Delete Record', () => {
      it('should generate DELETE endpoint for deleting records', () => {
        const api = createTestAPI()

        const endpoint = api.getEndpoint('DELETE', '/todos/:id')

        expect(endpoint).toBeDefined()
        expect(endpoint!.method).toBe('DELETE')
        expect(endpoint!.path).toBe('/todos/:id')
      })

      it('should delete an existing record', async () => {
        const api = createTestAPI()

        // Create a record first
        const createResponse = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'To Delete' },
        })

        const id = createResponse.body.id

        // Delete the record
        const response = await api.handleRequest({
          method: 'DELETE',
          path: `/todos/${id}`,
          query: {},
          body: null,
        })

        expect(response.status).toBe(204)

        // Verify it's deleted
        const getResponse = await api.handleRequest({
          method: 'GET',
          path: `/todos/${id}`,
          query: {},
          body: null,
        })

        expect(getResponse.status).toBe(404)
      })

      it('should return 404 for non-existent id', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'DELETE',
          path: '/todos/nonexistent_123',
          query: {},
          body: null,
        })

        expect(response.status).toBe(404)
        expect(response.body).toHaveProperty('error')
      })
    })

    describe('POST /[noun]/:id/[verb] - Execute Verb', () => {
      it('should generate POST endpoint for verb execution', () => {
        const api = createTestAPI()

        const endpoint = api.getEndpoint('POST', '/todos/:id/complete')

        expect(endpoint).toBeDefined()
        expect(endpoint!.method).toBe('POST')
        expect(endpoint!.path).toBe('/todos/:id/complete')
      })

      it('should execute verb and return updated record', async () => {
        const api = createTestAPI()

        // Create a record first
        const createResponse = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'Incomplete', done: false },
        })

        const id = createResponse.body.id

        // Execute verb
        const response = await api.handleRequest({
          method: 'POST',
          path: `/todos/${id}/complete`,
          query: {},
          body: {},
        })

        expect(response.status).toBe(200)
        expect(response.body.id).toBe(id)
        expect(response.body.done).toBe(true)
      })

      it('should return 404 for non-existent id', async () => {
        const api = createTestAPI()

        const response = await api.handleRequest({
          method: 'POST',
          path: '/todos/nonexistent_123/complete',
          query: {},
          body: {},
        })

        expect(response.status).toBe(404)
        expect(response.body).toHaveProperty('error')
      })

      it('should return 404 for unknown verb', async () => {
        const api = createTestAPI()

        // Create a record first
        const createResponse = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'Test' },
        })

        const id = createResponse.body.id

        const response = await api.handleRequest({
          method: 'POST',
          path: `/todos/${id}/unknownverb`,
          query: {},
          body: {},
        })

        expect(response.status).toBe(404)
        expect(response.body.error).toMatch(/verb|not found/i)
      })

      it('should pass input body to verb handler', async () => {
        const verbHandler = vi.fn().mockResolvedValue({ updated: true })
        const api = createTestAPI({
          verbs: {
            Todo: {
              archive: verbHandler,
            },
          },
        })

        // Create a record first
        const createResponse = await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { title: 'Archive Test' },
        })

        const id = createResponse.body.id

        // Execute verb with input
        await api.handleRequest({
          method: 'POST',
          path: `/todos/${id}/archive`,
          query: {},
          body: { reason: 'completed' },
        })

        expect(verbHandler).toHaveBeenCalled()
        // The handler should receive a context with input
        const context = verbHandler.mock.calls[0][0]
        expect(context.input).toEqual({ reason: 'completed' })
      })
    })
  })

  describe('GraphQL API Generation', () => {
    describe('Query Operations', () => {
      it('should generate query for each noun (list)', () => {
        const api = createTestAPI()
        const schema = api.getGraphQLSchema()

        expect(schema.queries).toHaveProperty('todos')
        expect(schema.queries).toHaveProperty('users')
      })

      it('should generate singular query for each noun (by id)', () => {
        const api = createTestAPI()
        const schema = api.getGraphQLSchema()

        expect(schema.queries).toHaveProperty('todo')
        expect(schema.queries).toHaveProperty('user')
      })

      it('should resolve list query and return records', async () => {
        const api = createTestAPI()

        const result = await api.executeGraphQL({
          query: `
            query {
              todos {
                id
                title
                done
              }
            }
          `,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data).toHaveProperty('todos')
        expect(Array.isArray(result.data.todos)).toBe(true)
      })

      it('should resolve singular query by id', async () => {
        const api = createTestAPI()

        // Create a record first
        await api.handleRequest({
          method: 'POST',
          path: '/todos',
          query: {},
          body: { id: 'gql_123', title: 'GraphQL Test' },
        })

        const result = await api.executeGraphQL({
          query: `
            query {
              todo(id: "gql_123") {
                id
                title
              }
            }
          `,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data.todo.id).toBe('gql_123')
        expect(result.data.todo.title).toBe('GraphQL Test')
      })

      it('should return null for non-existent id', async () => {
        const api = createTestAPI()

        const result = await api.executeGraphQL({
          query: `
            query {
              todo(id: "nonexistent") {
                id
                title
              }
            }
          `,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data.todo).toBeNull()
      })

      it('should support pagination arguments', async () => {
        const api = createTestAPI()

        const result = await api.executeGraphQL({
          query: `
            query {
              todos(limit: 10, offset: 5) {
                id
                title
              }
            }
          `,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data).toHaveProperty('todos')
      })

      it('should support filter arguments', async () => {
        const api = createTestAPI()

        const result = await api.executeGraphQL({
          query: `
            query {
              todos(filter: { done: true }) {
                id
                title
                done
              }
            }
          `,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data).toHaveProperty('todos')
      })
    })

    describe('Mutation Operations - CRUD', () => {
      it('should generate create mutation for each noun', () => {
        const api = createTestAPI()
        const schema = api.getGraphQLSchema()

        expect(schema.mutations).toHaveProperty('createTodo')
        expect(schema.mutations).toHaveProperty('createUser')
      })

      it('should generate update mutation for each noun', () => {
        const api = createTestAPI()
        const schema = api.getGraphQLSchema()

        expect(schema.mutations).toHaveProperty('updateTodo')
        expect(schema.mutations).toHaveProperty('updateUser')
      })

      it('should generate delete mutation for each noun', () => {
        const api = createTestAPI()
        const schema = api.getGraphQLSchema()

        expect(schema.mutations).toHaveProperty('deleteTodo')
        expect(schema.mutations).toHaveProperty('deleteUser')
      })

      it('should execute create mutation', async () => {
        const api = createTestAPI()

        const result = await api.executeGraphQL({
          query: `
            mutation {
              createTodo(input: { title: "New from GraphQL", done: false }) {
                id
                title
                done
              }
            }
          `,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data.createTodo).toHaveProperty('id')
        expect(result.data.createTodo.title).toBe('New from GraphQL')
      })

      it('should execute update mutation', async () => {
        const api = createTestAPI()

        // Create first
        const createResult = await api.executeGraphQL({
          query: `
            mutation {
              createTodo(input: { title: "Original" }) {
                id
              }
            }
          `,
        })

        const id = createResult.data.createTodo.id

        // Update
        const result = await api.executeGraphQL({
          query: `
            mutation {
              updateTodo(id: "${id}", input: { title: "Updated via GraphQL" }) {
                id
                title
              }
            }
          `,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data.updateTodo.title).toBe('Updated via GraphQL')
      })

      it('should execute delete mutation', async () => {
        const api = createTestAPI()

        // Create first
        const createResult = await api.executeGraphQL({
          query: `
            mutation {
              createTodo(input: { title: "To Delete" }) {
                id
              }
            }
          `,
        })

        const id = createResult.data.createTodo.id

        // Delete
        const result = await api.executeGraphQL({
          query: `
            mutation {
              deleteTodo(id: "${id}")
            }
          `,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data.deleteTodo).toBe(true)
      })
    })

    describe('Mutation Operations - Verbs', () => {
      it('should generate mutation for each verb', () => {
        const api = createTestAPI()
        const schema = api.getGraphQLSchema()

        expect(schema.mutations).toHaveProperty('completeTodo')
      })

      it('should execute verb mutation', async () => {
        const api = createTestAPI()

        // Create first
        const createResult = await api.executeGraphQL({
          query: `
            mutation {
              createTodo(input: { title: "Incomplete", done: false }) {
                id
              }
            }
          `,
        })

        const id = createResult.data.createTodo.id

        // Execute verb
        const result = await api.executeGraphQL({
          query: `
            mutation {
              completeTodo(id: "${id}") {
                id
                done
              }
            }
          `,
        })

        expect(result.errors).toBeUndefined()
        expect(result.data.completeTodo.done).toBe(true)
      })

      it('should pass input to verb mutation', async () => {
        const verbHandler = vi.fn().mockResolvedValue({ archived: true })
        const api = createTestAPI({
          verbs: {
            Todo: {
              archive: verbHandler,
            },
          },
        })

        // Create first
        const createResult = await api.executeGraphQL({
          query: `
            mutation {
              createTodo(input: { title: "Archive Test" }) {
                id
              }
            }
          `,
        })

        const id = createResult.data.createTodo.id

        // Execute verb with input
        await api.executeGraphQL({
          query: `
            mutation {
              archiveTodo(id: "${id}", input: { reason: "no longer needed" }) {
                id
              }
            }
          `,
        })

        expect(verbHandler).toHaveBeenCalled()
        const context = verbHandler.mock.calls[0][0]
        expect(context.input).toEqual({ reason: 'no longer needed' })
      })
    })

    describe('Subscription Operations', () => {
      it('should generate subscription for noun events', () => {
        const api = createTestAPI()
        const schema = api.getGraphQLSchema()

        expect(schema.subscriptions).toHaveProperty('todoCreated')
        expect(schema.subscriptions).toHaveProperty('todoUpdated')
        expect(schema.subscriptions).toHaveProperty('todoDeleted')
      })

      it('should generate subscription for verb events', () => {
        const api = createTestAPI()
        const schema = api.getGraphQLSchema()

        // Verb 'complete' generates 'completed' event
        expect(schema.subscriptions).toHaveProperty('todoCompleted')
      })

      it('should emit event when record is created', async () => {
        const api = createTestAPI()

        const events: any[] = []
        const unsubscribe = api.subscribeGraphQL('todoCreated', (event) => {
          events.push(event)
        })

        // Create a record
        await api.executeGraphQL({
          query: `
            mutation {
              createTodo(input: { title: "Subscription Test" }) {
                id
              }
            }
          `,
        })

        // Wait for event
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(events).toHaveLength(1)
        expect(events[0].title).toBe('Subscription Test')

        unsubscribe()
      })

      it('should emit event when verb is executed', async () => {
        const api = createTestAPI()

        const events: any[] = []
        const unsubscribe = api.subscribeGraphQL('todoCompleted', (event) => {
          events.push(event)
        })

        // Create and complete a record
        const createResult = await api.executeGraphQL({
          query: `
            mutation {
              createTodo(input: { title: "Complete Me" }) {
                id
              }
            }
          `,
        })

        await api.executeGraphQL({
          query: `
            mutation {
              completeTodo(id: "${createResult.data.createTodo.id}") {
                id
              }
            }
          `,
        })

        // Wait for event
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(events).toHaveLength(1)
        expect(events[0].done).toBe(true)

        unsubscribe()
      })

      it('should support filtering subscriptions', async () => {
        const api = createTestAPI()

        const events: any[] = []
        const unsubscribe = api.subscribeGraphQL(
          'todoCreated',
          (event) => {
            events.push(event)
          },
          { filter: { done: true } }
        )

        // Create records
        await api.executeGraphQL({
          query: `
            mutation {
              createTodo(input: { title: "Not Done", done: false }) { id }
            }
          `,
        })

        await api.executeGraphQL({
          query: `
            mutation {
              createTodo(input: { title: "Already Done", done: true }) { id }
            }
          `,
        })

        await new Promise((resolve) => setTimeout(resolve, 10))

        // Only the done=true record should be received
        expect(events).toHaveLength(1)
        expect(events[0].title).toBe('Already Done')

        unsubscribe()
      })
    })
  })

  describe('OpenAPI Specification Generation', () => {
    // Helper to get spec as object (not YAML string)
    const getSpec = (api: ReturnType<typeof createTestAPI>) => {
      const spec = api.generateOpenAPISpec()
      if (typeof spec === 'string') {
        throw new Error('Expected OpenAPISpec object, got string')
      }
      return spec
    }

    it('should generate valid OpenAPI 3.0 spec', () => {
      const api = createTestAPI()
      const spec = getSpec(api)

      expect(spec.openapi).toBe('3.0.0')
      expect(spec).toHaveProperty('info')
      expect(spec).toHaveProperty('paths')
      expect(spec).toHaveProperty('components')
    })

    it('should include info section with title and version', () => {
      const api = createTestAPI()
      const spec = getSpec(api)

      expect(spec.info).toHaveProperty('title')
      expect(spec.info).toHaveProperty('version')
    })

    it('should generate paths for all noun CRUD operations', () => {
      const api = createTestAPI()
      const spec = getSpec(api)

      // List and create
      expect(spec.paths).toHaveProperty('/todos')
      expect(spec.paths['/todos']).toHaveProperty('get')
      expect(spec.paths['/todos']).toHaveProperty('post')

      // Get, update, delete
      expect(spec.paths).toHaveProperty('/todos/{id}')
      expect(spec.paths['/todos/{id}']).toHaveProperty('get')
      expect(spec.paths['/todos/{id}']).toHaveProperty('put')
      expect(spec.paths['/todos/{id}']).toHaveProperty('delete')
    })

    it('should generate paths for verb endpoints', () => {
      const api = createTestAPI()
      const spec = getSpec(api)

      expect(spec.paths).toHaveProperty('/todos/{id}/complete')
      expect(spec.paths['/todos/{id}/complete']).toHaveProperty('post')
    })

    it('should generate component schemas for nouns', () => {
      const api = createTestAPI()
      const spec = getSpec(api)

      expect(spec.components.schemas).toHaveProperty('Todo')
      expect(spec.components.schemas.Todo).toHaveProperty('type', 'object')
      expect(spec.components.schemas.Todo).toHaveProperty('properties')
      expect(spec.components.schemas.Todo.properties).toHaveProperty('id')
      expect(spec.components.schemas.Todo.properties).toHaveProperty('title')
      expect(spec.components.schemas.Todo.properties).toHaveProperty('done')
    })

    it('should generate request/response schemas', () => {
      const api = createTestAPI()
      const spec = getSpec(api)

      expect(spec.components.schemas).toHaveProperty('TodoCreateInput')
      expect(spec.components.schemas).toHaveProperty('TodoUpdateInput')
      expect(spec.components.schemas).toHaveProperty('TodoListResponse')
    })

    it('should include error response schemas', () => {
      const api = createTestAPI()
      const spec = getSpec(api)

      expect(spec.components.schemas).toHaveProperty('Error')
      expect(spec.components.schemas.Error.properties).toHaveProperty('error')
      expect(spec.components.schemas.Error.properties).toHaveProperty('details')
    })

    it('should document query parameters for list endpoints', () => {
      const api = createTestAPI()
      const spec = getSpec(api)

      const listEndpoint = spec.paths['/todos']?.get
      expect(listEndpoint?.parameters).toBeDefined()

      const paramNames = listEndpoint!.parameters!.map((p: { name: string }) => p.name)
      expect(paramNames).toContain('limit')
      expect(paramNames).toContain('offset')
    })

    it('should be serializable to valid JSON', () => {
      const api = createTestAPI()
      const spec = getSpec(api)

      expect(() => JSON.stringify(spec)).not.toThrow()
      expect(typeof JSON.stringify(spec)).toBe('string')
    })

    it('should be serializable to valid YAML', () => {
      const api = createTestAPI()
      const spec = api.generateOpenAPISpec({ format: 'yaml' })

      expect(typeof spec).toBe('string')
      expect(spec).toContain('openapi:')
      expect(spec).toContain('paths:')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits when configured', async () => {
      const api = createTestAPI({
        rateLimiting: {
          requests: 2,
          window: '1s',
        },
      })

      // First two requests should succeed
      const response1 = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
      })
      expect(response1.status).toBe(200)

      const response2 = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
      })
      expect(response2.status).toBe(200)

      // Third request should be rate limited
      const response3 = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
      })
      expect(response3.status).toBe(429)
      expect(response3.body.error).toMatch(/rate limit/i)
    })

    it('should include rate limit headers in response', async () => {
      const api = createTestAPI({
        rateLimiting: {
          requests: 100,
          window: '1m',
        },
      })

      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
      })

      expect(response.headers).toHaveProperty('X-RateLimit-Limit')
      expect(response.headers).toHaveProperty('X-RateLimit-Remaining')
      expect(response.headers).toHaveProperty('X-RateLimit-Reset')
    })

    it('should support per-endpoint rate limits', async () => {
      const api = createTestAPI({
        rateLimiting: {
          default: { requests: 100, window: '1m' },
          endpoints: {
            'POST /todos/:id/complete': { requests: 5, window: '1m' },
          },
        },
      })

      // Check that verb endpoint has different limit
      const spec = api.getRateLimitConfig('POST /todos/:id/complete')
      expect(spec.requests).toBe(5)
    })

    it('should support rate limits by API key tier', async () => {
      const api = createTestAPI({
        rateLimiting: {
          tiers: {
            free: { requests: 100, window: '1h' },
            pro: { requests: 1000, window: '1h' },
            enterprise: { requests: 10000, window: '1h' },
          },
        },
        authentication: {
          apiKeys: true,
        },
      })

      // Request with pro tier API key
      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
        headers: {
          'X-API-Key': 'pro_key_123', // Would be validated to pro tier
        },
      })

      expect(response.headers['X-RateLimit-Limit']).toBe('1000')
    })
  })

  describe('API Key Authentication', () => {
    it('should require API key when authentication is enabled', async () => {
      const api = createTestAPI({
        authentication: {
          apiKeys: true,
        },
      })

      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
        headers: {},
      })

      expect(response.status).toBe(401)
      expect(response.body.error).toMatch(/api key|unauthorized/i)
    })

    it('should accept valid API key in header', async () => {
      const api = createTestAPI({
        authentication: {
          apiKeys: true,
          validateKey: async (key) => key === 'valid_key_123',
        },
      })

      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
        headers: {
          'X-API-Key': 'valid_key_123',
        },
      })

      expect(response.status).toBe(200)
    })

    it('should accept API key in query parameter', async () => {
      const api = createTestAPI({
        authentication: {
          apiKeys: true,
          validateKey: async (key) => key === 'valid_key_123',
          allowQueryParam: true,
        },
      })

      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: { api_key: 'valid_key_123' },
        body: null,
        headers: {},
      })

      expect(response.status).toBe(200)
    })

    it('should reject invalid API key', async () => {
      const api = createTestAPI({
        authentication: {
          apiKeys: true,
          validateKey: async (key) => key === 'valid_key_123',
        },
      })

      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
        headers: {
          'X-API-Key': 'invalid_key',
        },
      })

      expect(response.status).toBe(401)
      expect(response.body.error).toMatch(/invalid|unauthorized/i)
    })

    it('should support Bearer token format', async () => {
      const api = createTestAPI({
        authentication: {
          apiKeys: true,
          validateKey: async (key) => key === 'valid_key_123',
        },
      })

      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
        headers: {
          Authorization: 'Bearer valid_key_123',
        },
      })

      expect(response.status).toBe(200)
    })

    it('should expose API key info to handlers', async () => {
      let capturedKeyInfo: any = null
      const api = createTestAPI({
        authentication: {
          apiKeys: true,
          validateKey: async (key) => {
            if (key === 'valid_key_123') {
              return {
                valid: true,
                keyId: 'key_abc',
                tier: 'pro',
                organizationId: 'org_123',
              }
            }
            return { valid: false }
          },
        },
        verbs: {
          Todo: {
            inspect: ($: any) => {
              capturedKeyInfo = $.apiKey
              return { captured: true }
            },
          },
        },
      })

      // Create a record and execute verb
      await api.handleRequest({
        method: 'POST',
        path: '/todos',
        query: {},
        body: { id: 'key_test', title: 'Key Test' },
        headers: { 'X-API-Key': 'valid_key_123' },
      })

      await api.handleRequest({
        method: 'POST',
        path: '/todos/key_test/inspect',
        query: {},
        body: {},
        headers: { 'X-API-Key': 'valid_key_123' },
      })

      expect(capturedKeyInfo).toBeDefined()
      expect(capturedKeyInfo.keyId).toBe('key_abc')
      expect(capturedKeyInfo.tier).toBe('pro')
      expect(capturedKeyInfo.organizationId).toBe('org_123')
    })

    it('should allow public endpoints without authentication', async () => {
      const api = createTestAPI({
        authentication: {
          apiKeys: true,
          publicEndpoints: ['GET /todos'],
        },
      })

      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
        headers: {},
      })

      expect(response.status).toBe(200)
    })
  })

  describe('Standalone generateOpenAPISpec Function', () => {
    it('should generate spec from noun/verb definitions', () => {
      const spec = generateOpenAPISpec({
        nouns: {
          Product: { name: 'string', price: 'number' },
          Order: { total: 'number', status: 'pending | paid | shipped' },
        },
        verbs: {
          Order: {
            pay: () => {},
            ship: () => {},
          },
        },
      })

      expect(spec.openapi).toBe('3.0.0')
      expect(spec.paths).toHaveProperty('/products')
      expect(spec.paths).toHaveProperty('/orders')
      expect(spec.paths).toHaveProperty('/orders/{id}/pay')
      expect(spec.paths).toHaveProperty('/orders/{id}/ship')
    })

    it('should accept custom title and version', () => {
      const spec = generateOpenAPISpec({
        nouns: { Item: { name: 'string' } },
        info: {
          title: 'My Custom API',
          version: '2.0.0',
        },
      })

      expect(spec.info.title).toBe('My Custom API')
      expect(spec.info.version).toBe('2.0.0')
    })

    it('should accept custom server URLs', () => {
      const spec = generateOpenAPISpec({
        nouns: { Item: { name: 'string' } },
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'https://staging.example.com', description: 'Staging' },
        ],
      })

      expect(spec.servers).toHaveLength(2)
      expect(spec.servers![0].url).toBe('https://api.example.com')
    })
  })

  describe('Error Handling', () => {
    it('should return structured error responses', async () => {
      const api = createTestAPI()

      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos/nonexistent',
        query: {},
        body: null,
      })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error')
      expect(response.body).toHaveProperty('code')
      expect(response.body.code).toBe('NOT_FOUND')
    })

    it('should include request ID in error responses', async () => {
      const api = createTestAPI()

      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos/nonexistent',
        query: {},
        body: null,
        headers: {
          'X-Request-ID': 'req_123',
        },
      })

      expect(response.body.requestId).toBe('req_123')
    })

    it('should handle verb execution errors gracefully', async () => {
      const api = createTestAPI({
        verbs: {
          Todo: {
            fail: () => {
              throw new Error('Intentional failure')
            },
          },
        },
      })

      // Create a record
      await api.handleRequest({
        method: 'POST',
        path: '/todos',
        query: {},
        body: { id: 'fail_test', title: 'Fail Test' },
      })

      // Execute failing verb
      const response = await api.handleRequest({
        method: 'POST',
        path: '/todos/fail_test/fail',
        query: {},
        body: {},
      })

      expect(response.status).toBe(500)
      expect(response.body.error).toMatch(/internal|error/i)
      // Should not expose internal error details in production
    })

    it('should validate request body against schema', async () => {
      const api = createTestAPI()

      const response = await api.handleRequest({
        method: 'POST',
        path: '/todos',
        query: {},
        body: { title: 123 }, // Should be string
      })

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('VALIDATION_ERROR')
      expect(response.body.details).toBeDefined()
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'title',
        })
      )
    })
  })

  describe('CORS Support', () => {
    it('should include CORS headers when configured', async () => {
      const api = createTestAPI({
        cors: {
          origin: 'https://example.com',
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
      })

      const response = await api.handleRequest({
        method: 'GET',
        path: '/todos',
        query: {},
        body: null,
      })

      expect(response.headers['Access-Control-Allow-Origin']).toBe('https://example.com')
      expect(response.headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE')
    })

    it('should handle OPTIONS preflight requests', async () => {
      const api = createTestAPI({
        cors: {
          origin: '*',
        },
      })

      const response = await api.handleRequest({
        method: 'OPTIONS',
        path: '/todos',
        query: {},
        body: null,
        headers: {
          'Access-Control-Request-Method': 'POST',
        },
      })

      expect(response.status).toBe(204)
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*')
    })
  })
})
