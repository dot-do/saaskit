/**
 * Dead Letter Queue Infrastructure
 *
 * Provides in-memory dead letter queue for failed events that
 * can be inspected, retried, or purged.
 */

/**
 * Entry in the dead letter queue
 */
export interface DeadLetterEntry<T = unknown> {
  /**
   * Unique ID for this dead letter entry
   */
  id: string

  /**
   * The event name that failed (e.g., 'Order.created')
   */
  eventName: string

  /**
   * The event payload/data
   */
  data: T

  /**
   * The error that caused the failure
   */
  error: {
    message: string
    stack?: string
    name: string
  }

  /**
   * Number of processing attempts before being dead-lettered
   */
  attempts: number

  /**
   * Timestamp when the event was first received
   */
  firstAttemptAt: Date

  /**
   * Timestamp when the event was dead-lettered
   */
  deadLetteredAt: Date

  /**
   * Optional metadata about the failure
   */
  metadata?: Record<string, unknown>
}

/**
 * Options for adding to dead letter queue
 */
export interface AddToDeadLetterOptions {
  /**
   * Optional metadata to attach to the entry
   */
  metadata?: Record<string, unknown>

  /**
   * Timestamp of the first attempt (defaults to current time)
   */
  firstAttemptAt?: Date
}

/**
 * Options for querying dead letter items
 */
export interface GetDeadLetterOptions {
  /**
   * Filter by event name pattern (supports wildcards)
   */
  eventName?: string

  /**
   * Maximum number of items to return
   */
  limit?: number

  /**
   * Offset for pagination
   */
  offset?: number

  /**
   * Filter by entries created after this date
   */
  since?: Date

  /**
   * Filter by entries created before this date
   */
  before?: Date
}

/**
 * Result of dead letter queue operations
 */
export interface DeadLetterStats {
  /**
   * Total number of entries in the queue
   */
  total: number

  /**
   * Entries by event name
   */
  byEvent: Record<string, number>

  /**
   * Oldest entry timestamp
   */
  oldestEntry?: Date

  /**
   * Most recent entry timestamp
   */
  newestEntry?: Date
}

/**
 * In-memory dead letter queue storage
 */
const deadLetterQueue: Map<string, DeadLetterEntry> = new Map()

/**
 * Generate a unique ID for dead letter entries
 */
function generateId(): string {
  return `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Add a failed event to the dead letter queue.
 *
 * @param eventName - The name of the event that failed
 * @param data - The event payload
 * @param error - The error that caused the failure
 * @param attempts - Number of processing attempts made
 * @param options - Additional options
 * @returns The created dead letter entry
 *
 * @example
 * ```ts
 * try {
 *   await processEvent(event)
 * } catch (error) {
 *   await addToDeadLetter('Order.created', orderData, error, 3)
 * }
 * ```
 */
export function addToDeadLetter<T = unknown>(
  eventName: string,
  data: T,
  error: Error,
  attempts: number,
  options: AddToDeadLetterOptions = {}
): DeadLetterEntry<T> {
  const entry: DeadLetterEntry<T> = {
    id: generateId(),
    eventName,
    data,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    attempts,
    firstAttemptAt: options.firstAttemptAt ?? new Date(),
    deadLetteredAt: new Date(),
    metadata: options.metadata,
  }

  deadLetterQueue.set(entry.id, entry as DeadLetterEntry)
  return entry
}

/**
 * Get items from the dead letter queue with optional filtering.
 *
 * @param options - Query options for filtering and pagination
 * @returns Array of dead letter entries
 *
 * @example
 * ```ts
 * // Get all entries
 * const all = getDeadLetterItems()
 *
 * // Get entries for a specific event
 * const orderFails = getDeadLetterItems({ eventName: 'Order.*' })
 *
 * // Paginate results
 * const page1 = getDeadLetterItems({ limit: 10, offset: 0 })
 * const page2 = getDeadLetterItems({ limit: 10, offset: 10 })
 * ```
 */
export function getDeadLetterItems(options: GetDeadLetterOptions = {}): DeadLetterEntry[] {
  let entries = Array.from(deadLetterQueue.values())

  // Filter by event name pattern
  if (options.eventName) {
    const pattern = options.eventName.replace(/\*/g, '.*')
    const regex = new RegExp(`^${pattern}$`)
    entries = entries.filter(e => regex.test(e.eventName))
  }

  // Filter by date range
  if (options.since) {
    entries = entries.filter(e => e.deadLetteredAt >= options.since!)
  }
  if (options.before) {
    entries = entries.filter(e => e.deadLetteredAt < options.before!)
  }

  // Sort by deadLetteredAt descending (most recent first)
  entries.sort((a, b) => b.deadLetteredAt.getTime() - a.deadLetteredAt.getTime())

  // Apply pagination
  const offset = options.offset ?? 0
  const limit = options.limit ?? entries.length

  return entries.slice(offset, offset + limit)
}

/**
 * Get a single dead letter entry by ID.
 *
 * @param id - The dead letter entry ID
 * @returns The entry or undefined if not found
 */
export function getDeadLetterById(id: string): DeadLetterEntry | undefined {
  return deadLetterQueue.get(id)
}

/**
 * Remove a dead letter entry (e.g., after successful retry or manual resolution).
 *
 * @param id - The dead letter entry ID
 * @returns Whether the entry was removed
 */
export function removeDeadLetter(id: string): boolean {
  return deadLetterQueue.delete(id)
}

/**
 * Remove multiple dead letter entries.
 *
 * @param ids - Array of entry IDs to remove
 * @returns Number of entries removed
 */
export function removeDeadLetters(ids: string[]): number {
  let removed = 0
  for (const id of ids) {
    if (deadLetterQueue.delete(id)) {
      removed++
    }
  }
  return removed
}

/**
 * Clear all entries from the dead letter queue.
 *
 * @returns Number of entries cleared
 */
export function clearDeadLetterQueue(): number {
  const count = deadLetterQueue.size
  deadLetterQueue.clear()
  return count
}

/**
 * Get statistics about the dead letter queue.
 *
 * @returns Dead letter queue statistics
 */
export function getDeadLetterStats(): DeadLetterStats {
  const entries = Array.from(deadLetterQueue.values())
  const byEvent: Record<string, number> = {}

  let oldestEntry: Date | undefined
  let newestEntry: Date | undefined

  for (const entry of entries) {
    // Count by event
    byEvent[entry.eventName] = (byEvent[entry.eventName] ?? 0) + 1

    // Track oldest/newest
    if (!oldestEntry || entry.deadLetteredAt < oldestEntry) {
      oldestEntry = entry.deadLetteredAt
    }
    if (!newestEntry || entry.deadLetteredAt > newestEntry) {
      newestEntry = entry.deadLetteredAt
    }
  }

  return {
    total: entries.length,
    byEvent,
    oldestEntry,
    newestEntry,
  }
}

/**
 * Purge old entries from the dead letter queue.
 *
 * @param olderThan - Remove entries older than this date
 * @returns Number of entries purged
 */
export function purgeDeadLetters(olderThan: Date): number {
  let purged = 0
  for (const [id, entry] of deadLetterQueue) {
    if (entry.deadLetteredAt < olderThan) {
      deadLetterQueue.delete(id)
      purged++
    }
  }
  return purged
}
