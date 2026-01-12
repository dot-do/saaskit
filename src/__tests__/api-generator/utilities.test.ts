/**
 * Utilities Module Tests
 *
 * Tests for the shared utility functions in the API generator.
 *
 * @module api-generator/utilities.test
 */

import { describe, it, expect } from 'vitest'
import {
  generateId,
  pluralize,
  singularize,
  capitalize,
  parseWindow,
  mapFieldTypeToOpenAPI,
  validateField,
  matchPath,
} from '../../api-generator/utilities'

describe('API Generator Utilities', () => {
  describe('generateId', () => {
    it('should generate a string ID', () => {
      const id = generateId()
      expect(typeof id).toBe('string')
    })

    it('should generate unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(100)
    })

    it('should generate IDs of reasonable length', () => {
      const id = generateId()
      // Two random base36 strings of length 13 each
      expect(id.length).toBeGreaterThanOrEqual(20)
      expect(id.length).toBeLessThanOrEqual(30)
    })
  })

  describe('pluralize', () => {
    it('should pluralize regular nouns by adding s', () => {
      expect(pluralize('todo')).toBe('todos')
      expect(pluralize('user')).toBe('users')
      expect(pluralize('project')).toBe('projects')
    })

    it('should pluralize nouns ending in s by adding es', () => {
      expect(pluralize('bus')).toBe('buses')
      expect(pluralize('class')).toBe('classes')
    })

    it('should pluralize nouns ending in x by adding es', () => {
      expect(pluralize('box')).toBe('boxes')
      expect(pluralize('tax')).toBe('taxes')
    })

    it('should pluralize nouns ending in z by adding es', () => {
      expect(pluralize('quiz')).toBe('quizes')
    })

    it('should pluralize nouns ending in ch by adding es', () => {
      expect(pluralize('match')).toBe('matches')
      expect(pluralize('watch')).toBe('watches')
    })

    it('should pluralize nouns ending in sh by adding es', () => {
      expect(pluralize('dish')).toBe('dishes')
      expect(pluralize('wish')).toBe('wishes')
    })

    it('should pluralize nouns ending in consonant + y by changing y to ies', () => {
      expect(pluralize('category')).toBe('categories')
      expect(pluralize('story')).toBe('stories')
      expect(pluralize('company')).toBe('companies')
    })

    it('should pluralize nouns ending in vowel + y by adding s', () => {
      expect(pluralize('day')).toBe('days')
      expect(pluralize('key')).toBe('keys')
      expect(pluralize('toy')).toBe('toys')
    })

    it('should return lowercase result', () => {
      expect(pluralize('Todo')).toBe('todos')
      expect(pluralize('USER')).toBe('users')
    })
  })

  describe('singularize', () => {
    it('should return the lowercase form of the noun', () => {
      expect(singularize('Todo')).toBe('todo')
      expect(singularize('User')).toBe('user')
      expect(singularize('PROJECT')).toBe('project')
    })
  })

  describe('capitalize', () => {
    it('should capitalize the first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('world')).toBe('World')
    })

    it('should handle already capitalized strings', () => {
      expect(capitalize('Hello')).toBe('Hello')
    })

    it('should handle single character strings', () => {
      expect(capitalize('a')).toBe('A')
    })

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('')
    })

    it('should preserve rest of the string', () => {
      expect(capitalize('helloWorld')).toBe('HelloWorld')
      expect(capitalize('hello_world')).toBe('Hello_world')
    })
  })

  describe('parseWindow', () => {
    it('should parse seconds', () => {
      expect(parseWindow('30s')).toBe(30000)
      expect(parseWindow('1s')).toBe(1000)
      expect(parseWindow('60s')).toBe(60000)
    })

    it('should parse minutes', () => {
      expect(parseWindow('1m')).toBe(60000)
      expect(parseWindow('5m')).toBe(300000)
      expect(parseWindow('15m')).toBe(900000)
    })

    it('should parse hours', () => {
      expect(parseWindow('1h')).toBe(3600000)
      expect(parseWindow('2h')).toBe(7200000)
      expect(parseWindow('24h')).toBe(86400000)
    })

    it('should parse days', () => {
      expect(parseWindow('1d')).toBe(86400000)
      expect(parseWindow('7d')).toBe(604800000)
    })

    it('should return default 1 minute for invalid format', () => {
      expect(parseWindow('invalid')).toBe(60000)
      expect(parseWindow('10x')).toBe(60000)
      expect(parseWindow('abc')).toBe(60000)
    })
  })

  describe('mapFieldTypeToOpenAPI', () => {
    it('should map string type', () => {
      expect(mapFieldTypeToOpenAPI('string')).toEqual({ type: 'string' })
    })

    it('should map number type', () => {
      expect(mapFieldTypeToOpenAPI('number')).toEqual({ type: 'number' })
    })

    it('should map boolean type', () => {
      expect(mapFieldTypeToOpenAPI('boolean')).toEqual({ type: 'boolean' })
    })

    it('should handle optional types', () => {
      expect(mapFieldTypeToOpenAPI('string?')).toEqual({ type: 'string' })
      expect(mapFieldTypeToOpenAPI('number?')).toEqual({ type: 'number' })
      expect(mapFieldTypeToOpenAPI('boolean?')).toEqual({ type: 'boolean' })
    })

    it('should handle enum types (pipe-separated values)', () => {
      expect(mapFieldTypeToOpenAPI('active | inactive')).toEqual({
        type: 'string',
        enum: ['active', 'inactive'],
      })
      expect(mapFieldTypeToOpenAPI('low | medium | high')).toEqual({
        type: 'string',
        enum: ['low', 'medium', 'high'],
      })
    })

    it('should default unknown types to string', () => {
      expect(mapFieldTypeToOpenAPI('custom')).toEqual({ type: 'string' })
    })
  })

  describe('validateField', () => {
    describe('string type', () => {
      it('should validate string values', () => {
        expect(validateField('hello', 'string')).toBe(true)
        expect(validateField('', 'string')).toBe(true)
      })

      it('should reject non-string values', () => {
        expect(validateField(123, 'string')).toBe(false)
        expect(validateField(true, 'string')).toBe(false)
        expect(validateField({}, 'string')).toBe(false)
      })
    })

    describe('number type', () => {
      it('should validate number values', () => {
        expect(validateField(123, 'number')).toBe(true)
        expect(validateField(0, 'number')).toBe(true)
        expect(validateField(-5.5, 'number')).toBe(true)
      })

      it('should reject non-number values', () => {
        expect(validateField('123', 'number')).toBe(false)
        expect(validateField(true, 'number')).toBe(false)
      })
    })

    describe('boolean type', () => {
      it('should validate boolean values', () => {
        expect(validateField(true, 'boolean')).toBe(true)
        expect(validateField(false, 'boolean')).toBe(true)
      })

      it('should reject non-boolean values', () => {
        expect(validateField('true', 'boolean')).toBe(false)
        expect(validateField(1, 'boolean')).toBe(false)
        expect(validateField(0, 'boolean')).toBe(false)
      })
    })

    describe('optional types', () => {
      it('should accept undefined for optional types', () => {
        expect(validateField(undefined, 'string?')).toBe(true)
        expect(validateField(null, 'string?')).toBe(true)
      })

      it('should reject undefined for required types', () => {
        expect(validateField(undefined, 'string')).toBe(false)
        expect(validateField(null, 'string')).toBe(false)
      })

      it('should still validate values for optional types', () => {
        expect(validateField('hello', 'string?')).toBe(true)
        expect(validateField(123, 'string?')).toBe(false)
      })
    })

    describe('enum types', () => {
      it('should validate enum values', () => {
        expect(validateField('active', 'active | inactive')).toBe(true)
        expect(validateField('inactive', 'active | inactive')).toBe(true)
      })

      it('should reject invalid enum values', () => {
        expect(validateField('pending', 'active | inactive')).toBe(false)
        expect(validateField('', 'active | inactive')).toBe(false)
      })

      it('should handle enum with multiple values', () => {
        expect(validateField('low', 'low | medium | high')).toBe(true)
        expect(validateField('medium', 'low | medium | high')).toBe(true)
        expect(validateField('high', 'low | medium | high')).toBe(true)
        expect(validateField('critical', 'low | medium | high')).toBe(false)
      })
    })
  })

  describe('matchPath', () => {
    it('should match exact paths', () => {
      const result = matchPath('/todos', '/todos')
      expect(result.match).toBe(true)
      expect(result.params).toEqual({})
    })

    it('should match paths with parameters', () => {
      const result = matchPath('/todos/:id', '/todos/123')
      expect(result.match).toBe(true)
      expect(result.params).toEqual({ id: '123' })
    })

    it('should match paths with multiple parameters', () => {
      const result = matchPath('/users/:userId/todos/:todoId', '/users/abc/todos/xyz')
      expect(result.match).toBe(true)
      expect(result.params).toEqual({ userId: 'abc', todoId: 'xyz' })
    })

    it('should not match paths with different segment counts', () => {
      const result = matchPath('/todos/:id', '/todos')
      expect(result.match).toBe(false)
      expect(result.params).toEqual({})
    })

    it('should not match paths with different segments', () => {
      const result = matchPath('/todos/:id', '/users/123')
      expect(result.match).toBe(false)
      expect(result.params).toEqual({})
    })

    it('should match root path', () => {
      const result = matchPath('/', '/')
      expect(result.match).toBe(true)
      expect(result.params).toEqual({})
    })

    it('should match paths with verb actions', () => {
      const result = matchPath('/todos/:id/complete', '/todos/123/complete')
      expect(result.match).toBe(true)
      expect(result.params).toEqual({ id: '123' })
    })

    it('should handle empty strings in path segments', () => {
      const result = matchPath('/todos/', '/todos/')
      expect(result.match).toBe(true)
    })
  })
})
