/**
 * Events & Workflow Primitives
 *
 * Provides the fluent API for event handlers and durable workflow primitives
 * that integrate with Workflows.do
 */

import type { AppContext } from './types'

/**
 * Event handler type that receives the record and context
 */
export type EventHandlerFn<T = unknown> = (record: T, $: AppContext) => Promise<void>

/**
 * Creates an event builder that supports the fluent API pattern:
 * $.on.Order.created(handler)
 *
 * Uses Proxies to dynamically handle any Noun.event combination.
 *
 * @param registeredHandlers - Map to store registered handlers keyed by 'Noun.event'
 * @returns A proxy that allows $.on.Noun.event(handler) calls
 */
export function createEventBuilder(
  registeredHandlers: Map<string, Array<(record: unknown, $: AppContext) => Promise<void>>>
): Record<string, Record<string, (handler: EventHandlerFn) => void>> {
  return new Proxy({} as Record<string, Record<string, (handler: EventHandlerFn) => void>>, {
    get(_target, noun: string) {
      // Return a proxy for the noun that handles event names
      return new Proxy({} as Record<string, (handler: EventHandlerFn) => void>, {
        get(_nounTarget, event: string) {
          // Return the registration function for this Noun.event combination
          return (handler: EventHandlerFn) => {
            const key = `${noun}.${event}`
            if (!registeredHandlers.has(key)) {
              registeredHandlers.set(key, [])
            }
            registeredHandlers.get(key)!.push(handler)
          }
        },
      })
    },
  })
}

/**
 * Configuration for creating workflow primitives
 */
export interface WorkflowPrimitivesConfig {
  /**
   * Callback invoked when $.send() is called
   * Fire-and-forget, returns void
   */
  onSend?: (event: string, payload: unknown) => void

  /**
   * Callback invoked when $.do() is called
   * Awaits result from durable action
   */
  onDo?: (action: string, payload: unknown) => Promise<unknown>
}

/**
 * Workflow primitives returned by createWorkflowPrimitives
 */
export interface WorkflowPrimitives {
  /**
   * Fire and forget - sends an event without waiting for result
   */
  send: (event: string, payload?: unknown) => void

  /**
   * Await durable action - waits for the action to complete and returns result
   */
  do: (action: string, payload?: unknown) => Promise<unknown>
}

/**
 * Creates workflow primitives for durable event sending and action execution.
 *
 * @param config - Configuration with onSend and onDo callbacks
 * @returns WorkflowPrimitives with send() and do() methods
 */
export function createWorkflowPrimitives(config: WorkflowPrimitivesConfig = {}): WorkflowPrimitives {
  return {
    send: (event: string, payload?: unknown): void => {
      if (config.onSend) {
        config.onSend(event, payload)
      }
      // Fire and forget - return void
    },

    do: async (action: string, payload?: unknown): Promise<unknown> => {
      if (config.onDo) {
        return config.onDo(action, payload)
      }
      return null
    },
  }
}
