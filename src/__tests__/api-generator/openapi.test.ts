/**
 * OpenAPI Module Tests
 *
 * Tests for OpenAPI specification generation.
 *
 * @module api-generator/openapi.test
 */

import { describe, it, expect } from 'vitest'
import {
  buildOpenAPISpec,
  generateOpenAPISpec,
  toYAML,
} from '../../api-generator/openapi'
import type { NounDefinitions, VerbDefinitions } from '../../api-generator/types'

describe('OpenAPI Module', () => {
  const sampleNouns: NounDefinitions = {
    Todo: { title: 'string', done: 'boolean', priority: 'number' },
    User: { name: 'string', email: 'string', role: 'admin | user' },
  }

  const sampleVerbs: VerbDefinitions = {
    Todo: {
      complete: ($) => $.db.Todo.update($.id, { done: true }),
      archive: ($) => $.db.Todo.update($.id, { archived: true }),
    },
    User: {
      activate: ($) => $.db.User.update($.id, { active: true }),
    },
  }

  describe('buildOpenAPISpec', () => {
    describe('basic structure', () => {
      it('should return valid OpenAPI 3.0 spec', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.openapi).toBe('3.0.0')
        expect(spec.info).toBeDefined()
        expect(spec.paths).toBeDefined()
        expect(spec.components).toBeDefined()
        expect(spec.components.schemas).toBeDefined()
      })

      it('should include default info', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.info.title).toBe('API')
        expect(spec.info.version).toBe('1.0.0')
      })

      it('should use custom info', () => {
        const spec = buildOpenAPISpec({
          nouns: sampleNouns,
          info: { title: 'My API', version: '2.0.0' },
        })

        expect(spec.info.title).toBe('My API')
        expect(spec.info.version).toBe('2.0.0')
      })

      it('should include servers when provided', () => {
        const spec = buildOpenAPISpec({
          nouns: sampleNouns,
          servers: [
            { url: 'https://api.example.com', description: 'Production' },
            { url: 'https://staging.api.example.com', description: 'Staging' },
          ],
        })

        expect(spec.servers).toHaveLength(2)
        expect(spec.servers![0].url).toBe('https://api.example.com')
        expect(spec.servers![0].description).toBe('Production')
      })
    })

    describe('paths generation', () => {
      it('should generate list endpoint path', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.paths['/todos']).toBeDefined()
        expect(spec.paths['/todos'].get).toBeDefined()
        expect(spec.paths['/users']).toBeDefined()
        expect(spec.paths['/users'].get).toBeDefined()
      })

      it('should generate create endpoint on list path', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.paths['/todos'].post).toBeDefined()
      })

      it('should generate item endpoints', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.paths['/todos/{id}']).toBeDefined()
        expect(spec.paths['/todos/{id}'].get).toBeDefined()
        expect(spec.paths['/todos/{id}'].put).toBeDefined()
        expect(spec.paths['/todos/{id}'].delete).toBeDefined()
      })

      it('should generate verb endpoints', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns, verbs: sampleVerbs })

        expect(spec.paths['/todos/{id}/complete']).toBeDefined()
        expect(spec.paths['/todos/{id}/complete'].post).toBeDefined()
        expect(spec.paths['/todos/{id}/archive']).toBeDefined()
        expect(spec.paths['/todos/{id}/archive'].post).toBeDefined()
        expect(spec.paths['/users/{id}/activate']).toBeDefined()
      })
    })

    describe('operation details', () => {
      it('should include summary for list operation', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.paths['/todos'].get?.summary).toBe('List todos')
      })

      it('should include operationId', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.paths['/todos'].get?.operationId).toBe('listTodos')
        expect(spec.paths['/todos'].post?.operationId).toBe('createTodo')
        expect(spec.paths['/todos/{id}'].get?.operationId).toBe('getTodo')
        expect(spec.paths['/todos/{id}'].put?.operationId).toBe('updateTodo')
        expect(spec.paths['/todos/{id}'].delete?.operationId).toBe('deleteTodo')
      })

      it('should include pagination parameters for list', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })
        const params = spec.paths['/todos'].get?.parameters

        expect(params).toBeDefined()
        expect(params).toContainEqual({
          name: 'limit',
          in: 'query',
          schema: { type: 'integer' },
        })
        expect(params).toContainEqual({
          name: 'offset',
          in: 'query',
          schema: { type: 'integer' },
        })
      })

      it('should include id parameter for item endpoints', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })
        const getParams = spec.paths['/todos/{id}'].get?.parameters

        expect(getParams).toBeDefined()
        expect(getParams).toContainEqual({
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        })
      })

      it('should include request body for create', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })
        const requestBody = spec.paths['/todos'].post?.requestBody

        expect(requestBody).toBeDefined()
        expect(requestBody?.required).toBe(true)
        expect(requestBody?.content['application/json'].schema.$ref).toBe(
          '#/components/schemas/TodoCreateInput'
        )
      })

      it('should include request body for update', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })
        const requestBody = spec.paths['/todos/{id}'].put?.requestBody

        expect(requestBody?.content['application/json'].schema.$ref).toBe(
          '#/components/schemas/TodoUpdateInput'
        )
      })

      it('should include verb operation details', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns, verbs: sampleVerbs })
        const verbOp = spec.paths['/todos/{id}/complete'].post

        expect(verbOp?.summary).toBe('Complete Todo')
        expect(verbOp?.operationId).toBe('completeTodo')
        expect(verbOp?.parameters).toContainEqual({
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        })
      })
    })

    describe('responses', () => {
      it('should include 200 response for list', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })
        const responses = spec.paths['/todos'].get?.responses

        expect(responses?.['200']).toBeDefined()
        expect(responses?.['200'].description).toBe('Success')
        expect(responses?.['200'].content?.['application/json'].schema.$ref).toBe(
          '#/components/schemas/TodoListResponse'
        )
      })

      it('should include 201 response for create', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })
        const responses = spec.paths['/todos'].post?.responses

        expect(responses?.['201']).toBeDefined()
        expect(responses?.['201'].description).toBe('Created')
        expect(responses?.['201'].content?.['application/json'].schema.$ref).toBe(
          '#/components/schemas/Todo'
        )
      })

      it('should include 204 response for delete', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })
        const responses = spec.paths['/todos/{id}'].delete?.responses

        expect(responses?.['204']).toBeDefined()
        expect(responses?.['204'].description).toBe('Deleted')
      })

      it('should include 200 response for verb endpoints', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns, verbs: sampleVerbs })
        const responses = spec.paths['/todos/{id}/complete'].post?.responses

        expect(responses?.['200']).toBeDefined()
        expect(responses?.['200'].content?.['application/json'].schema.$ref).toBe(
          '#/components/schemas/Todo'
        )
      })
    })

    describe('schemas generation', () => {
      it('should generate main schema for each noun', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.components.schemas['Todo']).toBeDefined()
        expect(spec.components.schemas['User']).toBeDefined()
      })

      it('should include id in schema', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })
        const todoSchema = spec.components.schemas['Todo']

        expect(todoSchema.properties?.id).toEqual({ type: 'string' })
      })

      it('should include all fields with correct types', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })
        const todoSchema = spec.components.schemas['Todo']

        expect(todoSchema.properties?.title).toEqual({ type: 'string' })
        expect(todoSchema.properties?.done).toEqual({ type: 'boolean' })
        expect(todoSchema.properties?.priority).toEqual({ type: 'number' })
      })

      it('should handle enum types', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })
        const userSchema = spec.components.schemas['User']

        expect(userSchema.properties?.role).toEqual({
          type: 'string',
          enum: ['admin', 'user'],
        })
      })

      it('should generate create input schema', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.components.schemas['TodoCreateInput']).toBeDefined()
        expect(spec.components.schemas['TodoCreateInput'].properties?.title).toEqual({
          type: 'string',
        })
      })

      it('should generate update input schema', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.components.schemas['TodoUpdateInput']).toBeDefined()
      })

      it('should generate list response schema', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.components.schemas['TodoListResponse']).toBeDefined()
        expect(spec.components.schemas['TodoListResponse'].properties?.data).toBeDefined()
        expect(spec.components.schemas['TodoListResponse'].properties?.pagination).toBeDefined()
      })

      it('should generate Error schema', () => {
        const spec = buildOpenAPISpec({ nouns: sampleNouns })

        expect(spec.components.schemas['Error']).toBeDefined()
        expect(spec.components.schemas['Error'].properties?.error).toEqual({ type: 'string' })
        expect(spec.components.schemas['Error'].properties?.code).toEqual({ type: 'string' })
      })
    })
  })

  describe('generateOpenAPISpec', () => {
    it('should be an alias for buildOpenAPISpec', () => {
      const spec1 = buildOpenAPISpec({ nouns: sampleNouns })
      const spec2 = generateOpenAPISpec({ nouns: sampleNouns })

      expect(spec1).toEqual(spec2)
    })
  })

  describe('toYAML', () => {
    it('should convert simple object to YAML', () => {
      const yaml = toYAML({ key: 'value' })

      expect(yaml).toContain('key: value')
    })

    it('should convert nested objects', () => {
      const yaml = toYAML({ outer: { inner: 'value' } })

      expect(yaml).toContain('outer:')
      expect(yaml).toContain('inner: value')
    })

    it('should convert arrays of primitives', () => {
      const yaml = toYAML({ items: ['a', 'b', 'c'] })

      expect(yaml).toContain('items:')
      expect(yaml).toContain('- a')
      expect(yaml).toContain('- b')
      expect(yaml).toContain('- c')
    })

    it('should convert arrays of objects', () => {
      const yaml = toYAML({
        servers: [
          { url: 'https://api.example.com' },
          { url: 'https://staging.example.com' },
        ],
      })

      expect(yaml).toContain('servers:')
      expect(yaml).toContain('url: https://api.example.com')
      expect(yaml).toContain('url: https://staging.example.com')
    })

    it('should handle empty arrays', () => {
      const yaml = toYAML({ empty: [] })

      expect(yaml).toContain('empty: []')
    })

    it('should handle numbers', () => {
      const yaml = toYAML({ count: 42, price: 19.99 })

      expect(yaml).toContain('count: 42')
      expect(yaml).toContain('price: 19.99')
    })

    it('should handle booleans', () => {
      const yaml = toYAML({ enabled: true, disabled: false })

      expect(yaml).toContain('enabled: true')
      expect(yaml).toContain('disabled: false')
    })

    it('should skip null and undefined values', () => {
      const yaml = toYAML({ valid: 'yes', empty: null, missing: undefined })

      expect(yaml).toContain('valid: yes')
      expect(yaml).not.toContain('empty')
      expect(yaml).not.toContain('missing')
    })

    it('should handle indentation', () => {
      const yaml = toYAML({
        level1: {
          level2: {
            level3: 'deep',
          },
        },
      })

      const lines = yaml.split('\n')
      const level2Line = lines.find((l) => l.includes('level2:'))
      const level3Line = lines.find((l) => l.includes('level3:'))

      expect(level2Line?.startsWith('  ')).toBe(true)
      expect(level3Line?.startsWith('    ')).toBe(true)
    })

    it('should convert full OpenAPI spec to YAML', () => {
      const spec = buildOpenAPISpec({ nouns: sampleNouns })
      const yaml = toYAML(spec)

      expect(yaml).toContain('openapi: 3.0.0')
      expect(yaml).toContain('info:')
      expect(yaml).toContain('paths:')
      expect(yaml).toContain('/todos:')
      expect(yaml).toContain('components:')
      expect(yaml).toContain('schemas:')
    })
  })

  describe('edge cases', () => {
    it('should handle empty nouns', () => {
      const spec = buildOpenAPISpec({ nouns: {} })

      expect(spec.paths).toEqual({})
      expect(spec.components.schemas).toEqual({
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' },
            code: { type: 'string' },
          },
        },
      })
    })

    it('should handle nouns without verbs', () => {
      const spec = buildOpenAPISpec({ nouns: sampleNouns })

      expect(spec.paths['/todos/{id}/complete']).toBeUndefined()
    })

    it('should handle noun with empty fields', () => {
      const spec = buildOpenAPISpec({ nouns: { Empty: {} } })

      expect(spec.components.schemas['Empty']).toBeDefined()
      expect(spec.components.schemas['Empty'].properties).toEqual({ id: { type: 'string' } })
    })

    it('should handle optional field types', () => {
      const spec = buildOpenAPISpec({
        nouns: { Item: { name: 'string', description: 'string?' } },
      })

      expect(spec.components.schemas['Item'].properties?.description).toEqual({
        type: 'string',
      })
    })
  })
})
