/**
 * GraphQL Module Tests
 *
 * Tests for GraphQL schema generation, query parsing, and execution.
 *
 * @module api-generator/graphql.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  parseGraphQL,
  buildGraphQLSchema,
  createGraphQLHandler,
  createDbContext,
} from '../../api-generator/graphql'
import { InMemoryStorage } from '../../api-generator/storage'
import { EventEmitter } from '../../api-generator/events'
import type { NounDefinitions, VerbDefinitions } from '../../api-generator/types'

describe('GraphQL Module', () => {
  const sampleNouns: NounDefinitions = {
    Todo: { title: 'string', done: 'boolean', priority: 'number' },
    User: { name: 'string', email: 'string' },
  }

  const sampleVerbs: VerbDefinitions = {
    Todo: {
      complete: ($) => $.db.Todo.update($.id, { done: true }),
      archive: ($) => $.db.Todo.update($.id, { archived: true }),
    },
  }

  describe('parseGraphQL', () => {
    describe('query parsing', () => {
      it('should parse simple query', () => {
        const result = parseGraphQL('{ todos { id title } }')

        expect(result.type).toBe('query')
        expect(result.selections).toHaveLength(1)
        expect(result.selections[0].name).toBe('todos')
        expect(result.selections[0].selections).toContain('id')
        expect(result.selections[0].selections).toContain('title')
      })

      it('should parse query with keyword', () => {
        const result = parseGraphQL('query { todos { id } }')

        expect(result.type).toBe('query')
        expect(result.selections[0].name).toBe('todos')
      })

      it('should parse query with arguments', () => {
        const result = parseGraphQL('{ todo(id: "123") { id title } }')

        expect(result.selections[0].args.id).toBe('123')
      })

      it('should parse query with number arguments', () => {
        const result = parseGraphQL('{ todos(limit: 10, offset: 5) { id } }')

        expect(result.selections[0].args.limit).toBe(10)
        expect(result.selections[0].args.offset).toBe(5)
      })

      it('should parse query with boolean arguments', () => {
        const result = parseGraphQL('{ todos(done: true) { id } }')

        expect(result.selections[0].args.done).toBe(true)
      })

      it('should parse multiple selections', () => {
        const result = parseGraphQL('{ todos { id } users { id } }')

        expect(result.selections).toHaveLength(2)
        expect(result.selections[0].name).toBe('todos')
        expect(result.selections[1].name).toBe('users')
      })
    })

    describe('mutation parsing', () => {
      it('should identify mutation type', () => {
        const result = parseGraphQL('mutation { createTodo(input: { title: "test" }) { id } }')

        expect(result.type).toBe('mutation')
      })

      it('should parse mutation with input object', () => {
        const result = parseGraphQL('mutation { createTodo(input: { title: "test", done: false }) { id } }')

        expect(result.selections[0].args.input).toEqual({
          title: 'test',
          done: false,
        })
      })

      it('should parse update mutation', () => {
        const result = parseGraphQL('mutation { updateTodo(id: "123", input: { done: true }) { id } }')

        expect(result.selections[0].args.id).toBe('123')
        expect(result.selections[0].args.input.done).toBe(true)
      })

      it('should parse delete mutation', () => {
        const result = parseGraphQL('mutation { deleteTodo(id: "123") }')

        expect(result.selections[0].name).toBe('deleteTodo')
        expect(result.selections[0].args.id).toBe('123')
      })
    })
  })

  describe('buildGraphQLSchema', () => {
    describe('queries', () => {
      it('should generate list query for each noun', () => {
        const schema = buildGraphQLSchema(sampleNouns)

        expect(schema.queries.todos).toBeDefined()
        expect(schema.queries.todos.name).toBe('todos')
        expect(schema.queries.todos.returnType).toBe('[Todo]')
      })

      it('should generate singular query for each noun', () => {
        const schema = buildGraphQLSchema(sampleNouns)

        expect(schema.queries.todo).toBeDefined()
        expect(schema.queries.todo.name).toBe('todo')
        expect(schema.queries.todo.returnType).toBe('Todo')
      })
    })

    describe('mutations', () => {
      it('should generate create mutation', () => {
        const schema = buildGraphQLSchema(sampleNouns)

        expect(schema.mutations.createTodo).toBeDefined()
        expect(schema.mutations.createTodo.returnType).toBe('Todo')
      })

      it('should generate update mutation', () => {
        const schema = buildGraphQLSchema(sampleNouns)

        expect(schema.mutations.updateTodo).toBeDefined()
        expect(schema.mutations.updateTodo.returnType).toBe('Todo')
      })

      it('should generate delete mutation', () => {
        const schema = buildGraphQLSchema(sampleNouns)

        expect(schema.mutations.deleteTodo).toBeDefined()
        expect(schema.mutations.deleteTodo.returnType).toBe('Boolean')
      })

      it('should generate verb mutations', () => {
        const schema = buildGraphQLSchema(sampleNouns, sampleVerbs)

        expect(schema.mutations.completeTodo).toBeDefined()
        expect(schema.mutations.completeTodo.returnType).toBe('Todo')
        expect(schema.mutations.archiveTodo).toBeDefined()
      })
    })

    describe('subscriptions', () => {
      it('should generate created subscription', () => {
        const schema = buildGraphQLSchema(sampleNouns)

        expect(schema.subscriptions.todoCreated).toBeDefined()
        expect(schema.subscriptions.todoCreated.returnType).toBe('Todo')
      })

      it('should generate updated subscription', () => {
        const schema = buildGraphQLSchema(sampleNouns)

        expect(schema.subscriptions.todoUpdated).toBeDefined()
      })

      it('should generate deleted subscription', () => {
        const schema = buildGraphQLSchema(sampleNouns)

        expect(schema.subscriptions.todoDeleted).toBeDefined()
      })

      it('should generate verb subscriptions', () => {
        const schema = buildGraphQLSchema(sampleNouns, sampleVerbs)

        expect(schema.subscriptions.todoCompleted).toBeDefined()
        expect(schema.subscriptions.todoArchived).toBeDefined()
      })
    })

    describe('types', () => {
      it('should generate type definitions', () => {
        const schema = buildGraphQLSchema(sampleNouns)

        expect(schema.types.Todo).toBeDefined()
        expect(schema.types.Todo.id).toBe('ID')
        expect(schema.types.Todo.title).toBe('string')
        expect(schema.types.Todo.done).toBe('boolean')
      })
    })
  })

  describe('createDbContext', () => {
    let storage: InMemoryStorage

    beforeEach(() => {
      storage = new InMemoryStorage(['Todo', 'User'])
    })

    it('should create db context with all nouns', () => {
      const db = createDbContext(storage, ['Todo', 'User'])

      expect(db.Todo).toBeDefined()
      expect(db.User).toBeDefined()
    })

    it('should support get operation', async () => {
      storage.create('Todo', { id: '1', title: 'Test' })
      const db = createDbContext(storage, ['Todo'])

      const todo = await db.Todo.get('1')

      expect(todo).toEqual({ id: '1', title: 'Test' })
    })

    it('should return null for non-existent record', async () => {
      const db = createDbContext(storage, ['Todo'])

      const todo = await db.Todo.get('nonexistent')

      expect(todo).toBeNull()
    })

    it('should support create operation', async () => {
      const db = createDbContext(storage, ['Todo'])

      const todo = await db.Todo.create({ title: 'New Todo' })

      expect(todo.id).toBeDefined()
      expect(todo.title).toBe('New Todo')
      expect(storage.has('Todo', todo.id as string)).toBe(true)
    })

    it('should support update operation', async () => {
      storage.create('Todo', { id: '1', title: 'Original', done: false })
      const db = createDbContext(storage, ['Todo'])

      const updated = await db.Todo.update('1', { done: true })

      expect(updated?.done).toBe(true)
      expect(updated?.title).toBe('Original')
    })

    it('should support delete operation', async () => {
      storage.create('Todo', { id: '1', title: 'Test' })
      const db = createDbContext(storage, ['Todo'])

      await db.Todo.delete('1')

      expect(storage.has('Todo', '1')).toBe(false)
    })

    it('should support list operation', async () => {
      storage.create('Todo', { id: '1', title: 'First' })
      storage.create('Todo', { id: '2', title: 'Second' })
      const db = createDbContext(storage, ['Todo'])

      const todos = await db.Todo.list()

      expect(todos).toHaveLength(2)
    })

    it('should support find operation with filter', async () => {
      storage.create('Todo', { id: '1', title: 'First', done: false })
      storage.create('Todo', { id: '2', title: 'Second', done: true })
      storage.create('Todo', { id: '3', title: 'Third', done: false })
      const db = createDbContext(storage, ['Todo'])

      const done = await db.Todo.find({ done: true })

      expect(done).toHaveLength(1)
      expect(done[0].id).toBe('2')
    })
  })

  describe('createGraphQLHandler', () => {
    let storage: InMemoryStorage
    let events: EventEmitter
    let handler: ReturnType<typeof createGraphQLHandler>

    beforeEach(() => {
      storage = new InMemoryStorage(['Todo', 'User'])
      events = new EventEmitter()
      handler = createGraphQLHandler(sampleNouns, sampleVerbs, storage, events)
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    describe('getSchema', () => {
      it('should return the GraphQL schema', () => {
        const schema = handler.getSchema()

        expect(schema.queries).toBeDefined()
        expect(schema.mutations).toBeDefined()
        expect(schema.subscriptions).toBeDefined()
        expect(schema.types).toBeDefined()
      })
    })

    describe('execute - queries', () => {
      it('should execute list query', async () => {
        storage.create('Todo', { id: '1', title: 'First' })
        storage.create('Todo', { id: '2', title: 'Second' })

        const result = await handler.execute({ query: '{ todos { id title } }' })

        expect(result.data?.todos).toHaveLength(2)
      })

      it('should execute list query with limit and offset', async () => {
        storage.create('Todo', { id: '1', title: 'First' })
        storage.create('Todo', { id: '2', title: 'Second' })
        storage.create('Todo', { id: '3', title: 'Third' })

        const result = await handler.execute({
          query: '{ todos(limit: 2, offset: 1) { id } }',
        })

        expect(result.data?.todos).toHaveLength(2)
      })

      it('should execute single query', async () => {
        storage.create('Todo', { id: '123', title: 'Test Todo' })

        const result = await handler.execute({
          query: '{ todo(id: "123") { id title } }',
        })

        expect(result.data?.todo).toEqual({ id: '123', title: 'Test Todo' })
      })

      it('should return null for non-existent item', async () => {
        const result = await handler.execute({
          query: '{ todo(id: "nonexistent") { id } }',
        })

        expect(result.data?.todo).toBeNull()
      })

      it('should execute empty list query', async () => {
        const result = await handler.execute({ query: '{ todos { id } }' })

        expect(result.data?.todos).toEqual([])
      })
    })

    describe('execute - mutations', () => {
      it('should execute create mutation', async () => {
        const result = await handler.execute({
          query: 'mutation { createTodo(input: { title: "New Todo", done: false }) { id title } }',
        })

        expect(result.data?.createTodo).toBeDefined()
        expect(result.data?.createTodo.title).toBe('New Todo')
        expect(result.data?.createTodo.id).toBeDefined()
      })

      it('should emit event on create', async () => {
        const callback = vi.fn()
        events.on('todoCreated', callback)

        await handler.execute({
          query: 'mutation { createTodo(input: { title: "Test" }) { id } }',
        })

        vi.runAllTimers()

        expect(callback).toHaveBeenCalled()
      })

      it('should execute update mutation', async () => {
        storage.create('Todo', { id: '1', title: 'Original', done: false })

        const result = await handler.execute({
          query: 'mutation { updateTodo(id: "1", input: { done: true }) { id done } }',
        })

        expect(result.data?.updateTodo.done).toBe(true)
      })

      it('should emit event on update', async () => {
        storage.create('Todo', { id: '1', title: 'Test' })
        const callback = vi.fn()
        events.on('todoUpdated', callback)

        await handler.execute({
          query: 'mutation { updateTodo(id: "1", input: { done: true }) { id } }',
        })

        vi.runAllTimers()

        expect(callback).toHaveBeenCalled()
      })

      it('should execute delete mutation', async () => {
        storage.create('Todo', { id: '1', title: 'Test' })

        const result = await handler.execute({
          query: 'mutation { deleteTodo(id: "1") }',
        })

        expect(result.data?.deleteTodo).toBe(true)
        expect(storage.has('Todo', '1')).toBe(false)
      })

      it('should return false for deleting non-existent item', async () => {
        const result = await handler.execute({
          query: 'mutation { deleteTodo(id: "nonexistent") }',
        })

        expect(result.data?.deleteTodo).toBe(false)
      })

      it('should emit event on delete', async () => {
        storage.create('Todo', { id: '1', title: 'Test' })
        const callback = vi.fn()
        events.on('todoDeleted', callback)

        await handler.execute({
          query: 'mutation { deleteTodo(id: "1") }',
        })

        vi.runAllTimers()

        expect(callback).toHaveBeenCalledWith({ id: '1' })
      })

      it('should execute verb mutation', async () => {
        storage.create('Todo', { id: '1', title: 'Test', done: false })

        const result = await handler.execute({
          query: 'mutation { completeTodo(id: "1") { id done } }',
        })

        expect(result.data?.completeTodo.done).toBe(true)
      })

      it('should emit event on verb mutation', async () => {
        storage.create('Todo', { id: '1', title: 'Test', done: false })
        const callback = vi.fn()
        events.on('todoCompleted', callback)

        await handler.execute({
          query: 'mutation { completeTodo(id: "1") { id } }',
        })

        vi.runAllTimers()

        expect(callback).toHaveBeenCalled()
      })
    })

    describe('execute - error handling', () => {
      it('should handle queries with no matching operations gracefully', async () => {
        // The simple parseGraphQL doesn't throw on syntax errors, it returns empty data
        const result = await handler.execute({
          query: '{ unknownQuery { id } }',
        })

        // Empty data for unknown query, not an error
        expect(result.data).toBeDefined()
      })
    })

    describe('subscribe', () => {
      it('should subscribe to events', () => {
        const callback = vi.fn()

        const unsubscribe = handler.subscribe('todoCreated', callback)

        expect(typeof unsubscribe).toBe('function')
      })

      it('should receive events when subscribed', async () => {
        const callback = vi.fn()
        handler.subscribe('todoCreated', callback)

        await handler.execute({
          query: 'mutation { createTodo(input: { title: "Test" }) { id } }',
        })

        vi.runAllTimers()

        expect(callback).toHaveBeenCalled()
      })

      it('should support filtered subscriptions', async () => {
        const callback = vi.fn()
        handler.subscribe('todoCreated', callback, { filter: { done: true } })

        await handler.execute({
          query: 'mutation { createTodo(input: { title: "Test", done: false }) { id } }',
        })

        vi.runAllTimers()

        expect(callback).not.toHaveBeenCalled()
      })

      it('should unsubscribe correctly', async () => {
        const callback = vi.fn()
        const unsubscribe = handler.subscribe('todoCreated', callback)

        unsubscribe()

        await handler.execute({
          query: 'mutation { createTodo(input: { title: "Test" }) { id } }',
        })

        vi.runAllTimers()

        expect(callback).not.toHaveBeenCalled()
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty nouns', () => {
      const schema = buildGraphQLSchema({})

      expect(schema.queries).toEqual({})
      expect(schema.mutations).toEqual({})
      expect(schema.subscriptions).toEqual({})
    })

    it('should handle nouns without verbs', () => {
      const schema = buildGraphQLSchema(sampleNouns)

      expect(schema.mutations.completeTodo).toBeUndefined()
    })

    it('should handle verbs that end with e for past tense', () => {
      const verbs: VerbDefinitions = {
        Todo: {
          archive: ($) => $.db.Todo.update($.id, { archived: true }),
        },
      }
      const schema = buildGraphQLSchema(sampleNouns, verbs)

      // archive + d = archived
      expect(schema.subscriptions.todoArchived).toBeDefined()
    })
  })
})
