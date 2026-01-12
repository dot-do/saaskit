/**
 * Event Emitter
 *
 * Simple event emitter for GraphQL subscriptions and event handling.
 *
 * @module api-generator/events
 */

import type { UnsubscribeFn } from './types'

/**
 * Event listener callback function type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventListener = (data: any, filter?: Record<string, unknown>) => void

/**
 * Simple event emitter for GraphQL subscriptions
 * Supports filtered subscriptions where listeners only receive matching events
 */
export class EventEmitter {
  /** Map of event names to listener sets */
  private listeners: Map<string, Set<{ callback: EventListener; filter?: Record<string, unknown> }>> = new Map()

  on(event: string, callback: EventListener, filter?: Record<string, unknown>): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const listener = { callback, filter }
    this.listeners.get(event)!.add(listener)
    return () => {
      this.listeners.get(event)?.delete(listener)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    for (const { callback, filter } of eventListeners) {
      if (filter) {
        let match = true
        for (const [key, value] of Object.entries(filter)) {
          if (data[key] !== value) {
            match = false
            break
          }
        }
        if (!match) continue
      }
      // Use setTimeout to make it async
      setTimeout(() => callback(data), 0)
    }
  }
}
