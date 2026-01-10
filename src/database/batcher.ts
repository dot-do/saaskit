/**
 * Query Batcher Module
 *
 * Provides DataLoader-style batching and deduplication for database operations.
 * Batches multiple get() calls made within the same tick into a single operation
 * and deduplicates identical queries.
 *
 * @module database/batcher
 */

import type { BaseRecord } from './types'

/**
 * A pending request in the batch queue
 */
interface PendingRequest<T> {
  key: string
  resolve: (value: T | null) => void
  reject: (error: Error) => void
}

/**
 * Options for creating a QueryBatcher
 */
export interface BatcherOptions {
  /**
   * Maximum number of keys to batch in a single request.
   * Defaults to 100.
   */
  maxBatchSize?: number

  /**
   * Time in milliseconds to wait before dispatching the batch.
   * Defaults to 0 (next tick).
   */
  batchInterval?: number
}

/**
 * A function that loads multiple records by their keys
 */
export type BatchLoader<T> = (keys: string[]) => Promise<Map<string, T | null>>

/**
 * QueryBatcher - DataLoader-style batching and deduplication for get() operations
 *
 * Collects individual get() calls made within the same tick and batches them
 * into a single operation. Also deduplicates identical queries.
 *
 * @example
 * ```ts
 * const batcher = new QueryBatcher(async (keys) => {
 *   // Load all records at once
 *   const records = await loadMany(keys)
 *   return new Map(records.map(r => [r.id, r]))
 * })
 *
 * // These three calls will be batched into one loadMany call
 * const [user1, user2, user3] = await Promise.all([
 *   batcher.load('user_1'),
 *   batcher.load('user_2'),
 *   batcher.load('user_3'),
 * ])
 *
 * // Duplicate keys are deduplicated
 * const [same1, same2] = await Promise.all([
 *   batcher.load('user_1'),
 *   batcher.load('user_1'), // Same key - only one lookup
 * ])
 * ```
 *
 * @typeParam T - The record type being loaded
 */
export class QueryBatcher<T extends BaseRecord> {
  private readonly batchLoader: BatchLoader<T>
  private readonly options: Required<BatcherOptions>
  private queue: PendingRequest<T>[] = []
  private scheduled = false

  /**
   * Creates a new QueryBatcher
   *
   * @param batchLoader - Function that loads multiple records by their keys
   * @param options - Configuration options
   */
  constructor(batchLoader: BatchLoader<T>, options: BatcherOptions = {}) {
    this.batchLoader = batchLoader
    this.options = {
      maxBatchSize: options.maxBatchSize ?? 100,
      batchInterval: options.batchInterval ?? 0,
    }
  }

  /**
   * Load a record by key, batching with other concurrent requests
   *
   * @param key - The record ID to load
   * @returns Promise that resolves to the record or null if not found
   */
  load(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject })
      this.scheduleDispatch()
    })
  }

  /**
   * Load multiple records by their keys
   *
   * @param keys - Array of record IDs to load
   * @returns Promise that resolves to array of records (or null for missing)
   */
  loadMany(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((key) => this.load(key)))
  }

  /**
   * Clear the batcher queue and any pending requests
   * Useful for cleanup or resetting state
   */
  clear(): void {
    this.queue = []
    this.scheduled = false
  }

  /**
   * Get the current queue size (for testing/debugging)
   */
  get queueSize(): number {
    return this.queue.length
  }

  /**
   * Schedule the batch dispatch for the next tick
   */
  private scheduleDispatch(): void {
    if (this.scheduled) return

    this.scheduled = true

    if (this.options.batchInterval > 0) {
      setTimeout(() => this.dispatch(), this.options.batchInterval)
    } else {
      // Use queueMicrotask for immediate batching within same tick
      queueMicrotask(() => this.dispatch())
    }
  }

  /**
   * Dispatch the current batch of requests
   */
  private async dispatch(): Promise<void> {
    this.scheduled = false

    // Take current queue and reset
    const batch = this.queue.splice(0, this.options.maxBatchSize)
    if (batch.length === 0) return

    // Deduplicate keys while preserving request references
    const keyMap = new Map<string, PendingRequest<T>[]>()
    for (const request of batch) {
      const existing = keyMap.get(request.key)
      if (existing) {
        existing.push(request)
      } else {
        keyMap.set(request.key, [request])
      }
    }

    const uniqueKeys = Array.from(keyMap.keys())

    try {
      // Load all unique keys at once
      const results = await this.batchLoader(uniqueKeys)

      // Resolve all pending requests
      for (const entry of Array.from(keyMap.entries())) {
        const [key, requests] = entry
        const result = results.get(key) ?? null
        for (const request of requests) {
          request.resolve(result)
        }
      }
    } catch (error) {
      // Reject all pending requests on error
      for (const requests of Array.from(keyMap.values())) {
        for (const request of requests) {
          request.reject(error instanceof Error ? error : new Error(String(error)))
        }
      }
    }

    // If there are more items in queue, schedule another dispatch
    if (this.queue.length > 0) {
      this.scheduleDispatch()
    }
  }
}

/**
 * Create a batch loader function from a storage Map
 *
 * Helper function to create a BatchLoader from an in-memory Map storage.
 *
 * @param storage - The Map containing records
 * @returns A batch loader function
 *
 * @example
 * ```ts
 * const storage = new Map<string, User>()
 * const loader = createMapBatchLoader(storage)
 * const batcher = new QueryBatcher(loader)
 * ```
 */
export function createMapBatchLoader<T extends BaseRecord>(
  storage: Map<string, T>
): BatchLoader<T> {
  return async (keys: string[]) => {
    const results = new Map<string, T | null>()
    for (const key of keys) {
      results.set(key, storage.get(key) ?? null)
    }
    return results
  }
}
