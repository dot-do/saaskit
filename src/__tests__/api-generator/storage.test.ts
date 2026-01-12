/**
 * Storage Module Tests
 *
 * Tests for the InMemoryStorage class used by the API generator.
 *
 * @module api-generator/storage.test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryStorage } from '../../api-generator/storage'

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage

  beforeEach(() => {
    storage = new InMemoryStorage(['todo', 'user', 'project'])
  })

  describe('constructor', () => {
    it('should create stores for all provided nouns', () => {
      expect(storage.getStore('todo')).toBeDefined()
      expect(storage.getStore('user')).toBeDefined()
      expect(storage.getStore('project')).toBeDefined()
    })

    it('should return undefined for unregistered nouns', () => {
      expect(storage.getStore('unknown')).toBeUndefined()
    })

    it('should initialize with empty stores', () => {
      expect(storage.getStore('todo')?.size).toBe(0)
    })
  })

  describe('create', () => {
    it('should create a record and return it', () => {
      const record = storage.create('todo', { id: '1', title: 'Test Todo', done: false })

      expect(record).toEqual({ id: '1', title: 'Test Todo', done: false })
    })

    it('should store the record', () => {
      storage.create('todo', { id: '1', title: 'Test Todo' })

      expect(storage.get('todo', '1')).toEqual({ id: '1', title: 'Test Todo' })
    })

    it('should throw error for unknown noun', () => {
      expect(() => storage.create('unknown', { id: '1' })).toThrow('Unknown noun: unknown')
    })

    it('should allow creating multiple records', () => {
      storage.create('todo', { id: '1', title: 'First' })
      storage.create('todo', { id: '2', title: 'Second' })

      expect(storage.count('todo')).toBe(2)
    })

    it('should overwrite existing records with same id', () => {
      storage.create('todo', { id: '1', title: 'Original' })
      storage.create('todo', { id: '1', title: 'Updated' })

      expect(storage.get('todo', '1')?.title).toBe('Updated')
      expect(storage.count('todo')).toBe(1)
    })
  })

  describe('get', () => {
    it('should return the record by id', () => {
      storage.create('todo', { id: '1', title: 'Test' })

      const record = storage.get('todo', '1')

      expect(record).toEqual({ id: '1', title: 'Test' })
    })

    it('should return undefined for non-existent id', () => {
      expect(storage.get('todo', 'nonexistent')).toBeUndefined()
    })

    it('should return undefined for unknown noun', () => {
      expect(storage.get('unknown', '1')).toBeUndefined()
    })
  })

  describe('update', () => {
    it('should update an existing record', () => {
      storage.create('todo', { id: '1', title: 'Original', done: false })

      const updated = storage.update('todo', '1', { title: 'Updated' })

      expect(updated).toEqual({ id: '1', title: 'Updated', done: false })
    })

    it('should preserve the id', () => {
      storage.create('todo', { id: '1', title: 'Original' })

      const updated = storage.update('todo', '1', { id: 'different', title: 'Updated' })

      expect(updated?.id).toBe('1')
    })

    it('should return undefined for non-existent id', () => {
      expect(storage.update('todo', 'nonexistent', { title: 'Test' })).toBeUndefined()
    })

    it('should return undefined for unknown noun', () => {
      expect(storage.update('unknown', '1', { title: 'Test' })).toBeUndefined()
    })

    it('should merge partial updates', () => {
      storage.create('todo', { id: '1', title: 'Original', done: false, priority: 1 })

      const updated = storage.update('todo', '1', { done: true })

      expect(updated).toEqual({ id: '1', title: 'Original', done: true, priority: 1 })
    })
  })

  describe('delete', () => {
    it('should delete an existing record', () => {
      storage.create('todo', { id: '1', title: 'Test' })

      const result = storage.delete('todo', '1')

      expect(result).toBe(true)
      expect(storage.get('todo', '1')).toBeUndefined()
    })

    it('should return false for non-existent id', () => {
      expect(storage.delete('todo', 'nonexistent')).toBe(false)
    })

    it('should return false for unknown noun', () => {
      expect(storage.delete('unknown', '1')).toBe(false)
    })
  })

  describe('list', () => {
    beforeEach(() => {
      storage.create('todo', { id: '1', title: 'First', done: false, priority: 1 })
      storage.create('todo', { id: '2', title: 'Second', done: true, priority: 2 })
      storage.create('todo', { id: '3', title: 'Third', done: false, priority: 1 })
      storage.create('todo', { id: '4', title: 'Fourth', done: true, priority: 3 })
      storage.create('todo', { id: '5', title: 'Fifth', done: false, priority: 2 })
    })

    it('should return all records by default', () => {
      const records = storage.list('todo')

      expect(records).toHaveLength(5)
    })

    it('should return empty array for empty store', () => {
      const records = storage.list('user')

      expect(records).toEqual([])
    })

    it('should return empty array for unknown noun', () => {
      const records = storage.list('unknown')

      expect(records).toEqual([])
    })

    it('should support limit option', () => {
      const records = storage.list('todo', { limit: 2 })

      expect(records).toHaveLength(2)
    })

    it('should support offset option', () => {
      const records = storage.list('todo', { offset: 2, limit: 2 })

      expect(records).toHaveLength(2)
      expect(records[0].id).toBe('3')
      expect(records[1].id).toBe('4')
    })

    it('should support offset without limit', () => {
      const records = storage.list('todo', { offset: 3 })

      expect(records).toHaveLength(2)
    })

    it('should support filtering', () => {
      const records = storage.list('todo', { filter: { done: true } })

      expect(records).toHaveLength(2)
      expect(records.every(r => r.done === true)).toBe(true)
    })

    it('should support multiple filter conditions', () => {
      const records = storage.list('todo', { filter: { done: false, priority: 1 } })

      expect(records).toHaveLength(2)
      expect(records.every(r => r.done === false && r.priority === 1)).toBe(true)
    })

    it('should combine filter, limit, and offset', () => {
      const records = storage.list('todo', { filter: { done: false }, limit: 1, offset: 1 })

      expect(records).toHaveLength(1)
      expect(records[0].done).toBe(false)
    })
  })

  describe('count', () => {
    beforeEach(() => {
      storage.create('todo', { id: '1', title: 'First', done: false })
      storage.create('todo', { id: '2', title: 'Second', done: true })
      storage.create('todo', { id: '3', title: 'Third', done: false })
    })

    it('should return total count', () => {
      expect(storage.count('todo')).toBe(3)
    })

    it('should return 0 for empty store', () => {
      expect(storage.count('user')).toBe(0)
    })

    it('should return 0 for unknown noun', () => {
      expect(storage.count('unknown')).toBe(0)
    })

    it('should support filtering', () => {
      expect(storage.count('todo', { done: true })).toBe(1)
      expect(storage.count('todo', { done: false })).toBe(2)
    })
  })

  describe('has', () => {
    it('should return true if record exists', () => {
      storage.create('todo', { id: '1', title: 'Test' })

      expect(storage.has('todo', '1')).toBe(true)
    })

    it('should return false if record does not exist', () => {
      expect(storage.has('todo', 'nonexistent')).toBe(false)
    })

    it('should return false for unknown noun', () => {
      expect(storage.has('unknown', '1')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle records with complex values', () => {
      storage.create('todo', {
        id: '1',
        title: 'Test',
        metadata: { nested: { deep: 'value' } },
        tags: ['a', 'b', 'c']
      })

      const record = storage.get('todo', '1')

      expect(record?.metadata).toEqual({ nested: { deep: 'value' } })
      expect(record?.tags).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty string as id', () => {
      storage.create('todo', { id: '', title: 'Empty ID' })

      expect(storage.has('todo', '')).toBe(true)
      expect(storage.get('todo', '')?.title).toBe('Empty ID')
    })

    it('should handle special characters in id', () => {
      storage.create('todo', { id: 'id-with-special_chars.123', title: 'Special' })

      expect(storage.has('todo', 'id-with-special_chars.123')).toBe(true)
    })
  })
})
