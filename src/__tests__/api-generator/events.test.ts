/**
 * Events Module Tests
 *
 * Tests for the EventEmitter class used for GraphQL subscriptions.
 *
 * @module api-generator/events.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from '../../api-generator/events'

describe('EventEmitter', () => {
  let emitter: EventEmitter

  beforeEach(() => {
    emitter = new EventEmitter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('on', () => {
    it('should register a listener', () => {
      const callback = vi.fn()
      emitter.on('testEvent', callback)
      emitter.emit('testEvent', { data: 'test' })

      vi.runAllTimers()

      expect(callback).toHaveBeenCalledWith({ data: 'test' })
    })

    it('should return an unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = emitter.on('testEvent', callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should allow multiple listeners for the same event', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      emitter.on('testEvent', callback1)
      emitter.on('testEvent', callback2)
      emitter.emit('testEvent', { data: 'test' })

      vi.runAllTimers()

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it('should not trigger listeners for different events', () => {
      const callback = vi.fn()
      emitter.on('event1', callback)
      emitter.emit('event2', { data: 'test' })

      vi.runAllTimers()

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('emit', () => {
    it('should call registered listeners asynchronously', () => {
      const callback = vi.fn()
      emitter.on('testEvent', callback)
      emitter.emit('testEvent', { data: 'test' })

      // Callback should not be called synchronously
      expect(callback).not.toHaveBeenCalled()

      vi.runAllTimers()

      expect(callback).toHaveBeenCalled()
    })

    it('should pass data to listeners', () => {
      const callback = vi.fn()
      const eventData = { id: '123', name: 'Test', nested: { value: true } }

      emitter.on('testEvent', callback)
      emitter.emit('testEvent', eventData)

      vi.runAllTimers()

      expect(callback).toHaveBeenCalledWith(eventData)
    })

    it('should not throw for events with no listeners', () => {
      expect(() => emitter.emit('nonexistent', { data: 'test' })).not.toThrow()
    })

    it('should call all listeners for an event', () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()]

      callbacks.forEach(cb => emitter.on('testEvent', cb))
      emitter.emit('testEvent', { value: 42 })

      vi.runAllTimers()

      callbacks.forEach(cb => {
        expect(cb).toHaveBeenCalledTimes(1)
        expect(cb).toHaveBeenCalledWith({ value: 42 })
      })
    })
  })

  describe('unsubscribe', () => {
    it('should stop listener from receiving events', () => {
      const callback = vi.fn()
      const unsubscribe = emitter.on('testEvent', callback)

      unsubscribe()
      emitter.emit('testEvent', { data: 'test' })

      vi.runAllTimers()

      expect(callback).not.toHaveBeenCalled()
    })

    it('should only unsubscribe the specific listener', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsubscribe1 = emitter.on('testEvent', callback1)
      emitter.on('testEvent', callback2)

      unsubscribe1()
      emitter.emit('testEvent', { data: 'test' })

      vi.runAllTimers()

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })

    it('should be safe to call multiple times', () => {
      const callback = vi.fn()
      const unsubscribe = emitter.on('testEvent', callback)

      unsubscribe()
      expect(() => unsubscribe()).not.toThrow()
    })
  })

  describe('filtered subscriptions', () => {
    it('should filter events based on filter criteria', () => {
      const callback = vi.fn()
      emitter.on('todoCreated', callback, { status: 'active' })

      emitter.emit('todoCreated', { id: '1', status: 'active' })
      emitter.emit('todoCreated', { id: '2', status: 'completed' })

      vi.runAllTimers()

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ id: '1', status: 'active' })
    })

    it('should support multiple filter fields', () => {
      const callback = vi.fn()
      emitter.on('todoCreated', callback, { status: 'active', priority: 'high' })

      emitter.emit('todoCreated', { id: '1', status: 'active', priority: 'high' })
      emitter.emit('todoCreated', { id: '2', status: 'active', priority: 'low' })
      emitter.emit('todoCreated', { id: '3', status: 'completed', priority: 'high' })

      vi.runAllTimers()

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ id: '1', status: 'active', priority: 'high' })
    })

    it('should receive all events when no filter is provided', () => {
      const callback = vi.fn()
      emitter.on('todoCreated', callback)

      emitter.emit('todoCreated', { id: '1', status: 'active' })
      emitter.emit('todoCreated', { id: '2', status: 'completed' })

      vi.runAllTimers()

      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('should filter events with undefined filter values correctly', () => {
      const callback = vi.fn()
      emitter.on('todoCreated', callback, { userId: '123' })

      emitter.emit('todoCreated', { id: '1', userId: '123' })
      emitter.emit('todoCreated', { id: '2' }) // No userId field

      vi.runAllTimers()

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ id: '1', userId: '123' })
    })

    it('should allow both filtered and unfiltered listeners for same event', () => {
      const filteredCallback = vi.fn()
      const unfilteredCallback = vi.fn()

      emitter.on('todoCreated', filteredCallback, { status: 'active' })
      emitter.on('todoCreated', unfilteredCallback)

      emitter.emit('todoCreated', { id: '1', status: 'active' })
      emitter.emit('todoCreated', { id: '2', status: 'completed' })

      vi.runAllTimers()

      expect(filteredCallback).toHaveBeenCalledTimes(1)
      expect(unfilteredCallback).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases', () => {
    it('should handle empty event name', () => {
      const callback = vi.fn()
      emitter.on('', callback)
      emitter.emit('', { data: 'test' })

      vi.runAllTimers()

      expect(callback).toHaveBeenCalled()
    })

    it('should handle null/undefined data', () => {
      const callback = vi.fn()
      emitter.on('testEvent', callback)
      emitter.emit('testEvent', null)
      emitter.emit('testEvent', undefined)

      vi.runAllTimers()

      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('should handle complex nested data', () => {
      const callback = vi.fn()
      const complexData = {
        id: '1',
        nested: {
          deeply: {
            nested: {
              value: 'test',
            },
          },
        },
        array: [1, 2, { key: 'value' }],
      }

      emitter.on('testEvent', callback)
      emitter.emit('testEvent', complexData)

      vi.runAllTimers()

      expect(callback).toHaveBeenCalledWith(complexData)
    })

    it('should emit events in the order they were registered', () => {
      const order: number[] = []

      emitter.on('testEvent', () => order.push(1))
      emitter.on('testEvent', () => order.push(2))
      emitter.on('testEvent', () => order.push(3))

      emitter.emit('testEvent', {})

      vi.runAllTimers()

      expect(order).toEqual([1, 2, 3])
    })
  })
})
