/**
 * Event Deduplication
 *
 * Provides deterministic event ID generation and deduplication
 * to prevent duplicate event processing.
 */

/**
 * Options for event ID generation
 */
export interface EventIdOptions {
  /**
   * Include timestamp in the ID (default: false)
   * When true, same event+data at different times generates different IDs
   */
  includeTimestamp?: boolean

  /**
   * Custom fields to include in the hash
   */
  fields?: string[]
}

/**
 * Entry in the processed events store
 */
interface ProcessedEntry {
  /**
   * When the event was processed
   */
  processedAt: Date

  /**
   * TTL expiration time
   */
  expiresAt: Date
}

/**
 * In-memory store for processed event IDs
 */
const processedEvents: Map<string, ProcessedEntry> = new Map()

/**
 * Default TTL for processed event IDs (1 hour)
 */
const DEFAULT_TTL_MS = 60 * 60 * 1000

/**
 * Generate a deterministic event ID from event name and data.
 *
 * Uses a simple hash function to create reproducible IDs for
 * the same event + data combination.
 *
 * @param eventName - The event name (e.g., 'Order.created')
 * @param data - The event payload
 * @param options - Optional configuration
 * @returns A deterministic event ID
 *
 * @example
 * ```ts
 * // Same inputs always produce the same ID
 * const id1 = generateEventId('Order.created', { orderId: '123' })
 * const id2 = generateEventId('Order.created', { orderId: '123' })
 * console.log(id1 === id2) // true
 *
 * // Different data produces different IDs
 * const id3 = generateEventId('Order.created', { orderId: '456' })
 * console.log(id1 === id3) // false
 * ```
 */
export function generateEventId(
  eventName: string,
  data: unknown,
  options: EventIdOptions = {}
): string {
  const parts: unknown[] = [eventName]

  if (options.includeTimestamp) {
    parts.push(Date.now())
  }

  // If specific fields are requested, extract only those
  if (options.fields && typeof data === 'object' && data !== null) {
    const filtered: Record<string, unknown> = {}
    for (const field of options.fields) {
      const value = (data as Record<string, unknown>)[field]
      if (value !== undefined) {
        filtered[field] = value
      }
    }
    parts.push(filtered)
  } else {
    parts.push(data)
  }

  // Create deterministic string representation
  const str = JSON.stringify(parts, sortedReplacer)

  // Simple hash function (djb2)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }

  // Convert to hex string with event prefix
  const hashHex = (hash >>> 0).toString(16).padStart(8, '0')
  const eventPrefix = eventName.replace(/\./g, '_').toLowerCase()

  return `evt_${eventPrefix}_${hashHex}`
}

/**
 * JSON replacer that sorts object keys for deterministic serialization
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = (value as Record<string, unknown>)[key]
        return sorted
      }, {} as Record<string, unknown>)
  }
  return value
}

/**
 * Check if an event has already been processed.
 *
 * @param eventId - The event ID to check
 * @returns Whether the event has been processed
 *
 * @example
 * ```ts
 * const eventId = generateEventId('Order.created', orderData)
 *
 * if (isProcessed(eventId)) {
 *   console.log('Duplicate event, skipping')
 *   return
 * }
 *
 * await processEvent(event)
 * markProcessed(eventId)
 * ```
 */
export function isProcessed(eventId: string): boolean {
  const entry = processedEvents.get(eventId)

  if (!entry) {
    return false
  }

  // Check if entry has expired
  if (entry.expiresAt <= new Date()) {
    processedEvents.delete(eventId)
    return false
  }

  return true
}

/**
 * Mark an event as processed.
 *
 * @param eventId - The event ID to mark as processed
 * @param ttlMs - Time-to-live in milliseconds (default: 1 hour)
 *
 * @example
 * ```ts
 * markProcessed(eventId)  // Default 1 hour TTL
 * markProcessed(eventId, 24 * 60 * 60 * 1000)  // 24 hour TTL
 * ```
 */
export function markProcessed(eventId: string, ttlMs: number = DEFAULT_TTL_MS): void {
  const now = new Date()
  processedEvents.set(eventId, {
    processedAt: now,
    expiresAt: new Date(now.getTime() + ttlMs),
  })
}

/**
 * Remove a processed event entry (e.g., for reprocessing).
 *
 * @param eventId - The event ID to remove
 * @returns Whether the entry was removed
 */
export function unmarkProcessed(eventId: string): boolean {
  return processedEvents.delete(eventId)
}

/**
 * Clear all processed event entries.
 *
 * @returns Number of entries cleared
 */
export function clearProcessed(): number {
  const count = processedEvents.size
  processedEvents.clear()
  return count
}

/**
 * Clean up expired entries from the processed events store.
 *
 * This is automatically called periodically but can be invoked manually.
 *
 * @returns Number of expired entries removed
 */
export function cleanupExpired(): number {
  const now = new Date()
  let cleaned = 0

  for (const [eventId, entry] of processedEvents) {
    if (entry.expiresAt <= now) {
      processedEvents.delete(eventId)
      cleaned++
    }
  }

  return cleaned
}

/**
 * Get the number of entries in the processed events store.
 *
 * @returns Number of entries (including potentially expired ones)
 */
export function getProcessedCount(): number {
  return processedEvents.size
}

/**
 * Check if an event should be processed (not a duplicate) and mark it atomically.
 *
 * This is a convenience function that combines isProcessed and markProcessed
 * in a single atomic operation.
 *
 * @param eventId - The event ID to check and mark
 * @param ttlMs - Time-to-live in milliseconds (default: 1 hour)
 * @returns True if the event should be processed (first time), false if duplicate
 *
 * @example
 * ```ts
 * const eventId = generateEventId('Order.created', orderData)
 *
 * if (!acquireProcessingLock(eventId)) {
 *   console.log('Duplicate event, skipping')
 *   return
 * }
 *
 * // Safe to process - we have the lock
 * await processEvent(event)
 * ```
 */
export function acquireProcessingLock(eventId: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  if (isProcessed(eventId)) {
    return false
  }

  markProcessed(eventId, ttlMs)
  return true
}
