/**
 * Schedule Overlap Prevention
 *
 * Provides locking mechanisms to prevent concurrent execution
 * of scheduled tasks.
 */

/**
 * Lock entry for a schedule
 */
interface ScheduleLock {
  /**
   * The schedule ID that holds the lock
   */
  scheduleId: string

  /**
   * When the lock was acquired
   */
  acquiredAt: Date

  /**
   * When the lock expires (auto-release for safety)
   */
  expiresAt: Date

  /**
   * Optional metadata about the execution
   */
  metadata?: Record<string, unknown>
}

/**
 * Result of acquiring a lock
 */
export interface AcquireLockResult {
  /**
   * Whether the lock was acquired
   */
  acquired: boolean

  /**
   * If not acquired, when the current lock expires
   */
  lockedUntil?: Date

  /**
   * The lock token (used for releasing)
   */
  token?: string
}

/**
 * Options for acquiring a lock
 */
export interface AcquireLockOptions {
  /**
   * Lock timeout in milliseconds (default: 5 minutes)
   * Lock auto-releases after this time as a safety measure
   */
  timeout?: number

  /**
   * Optional metadata to attach to the lock
   */
  metadata?: Record<string, unknown>
}

/**
 * In-memory store for schedule locks
 */
const scheduleLocks: Map<string, ScheduleLock> = new Map()

/**
 * Map of lock tokens to schedule IDs
 */
const lockTokens: Map<string, string> = new Map()

/**
 * Default lock timeout (5 minutes)
 */
const DEFAULT_LOCK_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Generate a unique lock token
 */
function generateToken(): string {
  return `lock_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Check if a schedule is currently running (has an active lock).
 *
 * @param scheduleId - The schedule identifier
 * @returns Whether the schedule is currently running
 *
 * @example
 * ```ts
 * if (isScheduleRunning('daily-report')) {
 *   console.log('Daily report is already running, skipping')
 *   return
 * }
 * ```
 */
export function isScheduleRunning(scheduleId: string): boolean {
  const lock = scheduleLocks.get(scheduleId)

  if (!lock) {
    return false
  }

  // Check if lock has expired
  if (lock.expiresAt <= new Date()) {
    // Clean up expired lock
    scheduleLocks.delete(scheduleId)
    // Find and remove the token
    for (const [token, id] of lockTokens) {
      if (id === scheduleId) {
        lockTokens.delete(token)
        break
      }
    }
    return false
  }

  return true
}

/**
 * Acquire a lock for a schedule to prevent overlapping executions.
 *
 * @param scheduleId - The schedule identifier
 * @param options - Lock options
 * @returns Result indicating if lock was acquired and lock token
 *
 * @example
 * ```ts
 * const result = acquireLock('daily-report', { timeout: 10 * 60 * 1000 })
 *
 * if (!result.acquired) {
 *   console.log(`Schedule locked until ${result.lockedUntil}`)
 *   return
 * }
 *
 * try {
 *   await runDailyReport()
 * } finally {
 *   releaseLock(result.token!)
 * }
 * ```
 */
export function acquireLock(
  scheduleId: string,
  options: AcquireLockOptions = {}
): AcquireLockResult {
  // Check for existing lock
  if (isScheduleRunning(scheduleId)) {
    const existingLock = scheduleLocks.get(scheduleId)!
    return {
      acquired: false,
      lockedUntil: existingLock.expiresAt,
    }
  }

  const timeout = options.timeout ?? DEFAULT_LOCK_TIMEOUT_MS
  const now = new Date()
  const token = generateToken()

  const lock: ScheduleLock = {
    scheduleId,
    acquiredAt: now,
    expiresAt: new Date(now.getTime() + timeout),
    metadata: options.metadata,
  }

  scheduleLocks.set(scheduleId, lock)
  lockTokens.set(token, scheduleId)

  return {
    acquired: true,
    token,
  }
}

/**
 * Release a schedule lock.
 *
 * @param token - The lock token received from acquireLock
 * @returns Whether the lock was released
 *
 * @example
 * ```ts
 * const { acquired, token } = acquireLock('weekly-cleanup')
 * if (acquired) {
 *   try {
 *     await runCleanup()
 *   } finally {
 *     releaseLock(token!)
 *   }
 * }
 * ```
 */
export function releaseLock(token: string): boolean {
  const scheduleId = lockTokens.get(token)

  if (!scheduleId) {
    return false
  }

  lockTokens.delete(token)
  scheduleLocks.delete(scheduleId)

  return true
}

/**
 * Force release a lock by schedule ID (admin operation).
 *
 * Use with caution - this may cause issues if the schedule is still running.
 *
 * @param scheduleId - The schedule identifier
 * @returns Whether the lock was released
 */
export function forceReleaseLock(scheduleId: string): boolean {
  // Find and remove the token
  for (const [token, id] of lockTokens) {
    if (id === scheduleId) {
      lockTokens.delete(token)
      break
    }
  }

  return scheduleLocks.delete(scheduleId)
}

/**
 * Get information about a schedule's lock.
 *
 * @param scheduleId - The schedule identifier
 * @returns Lock information or undefined if not locked
 */
export function getLockInfo(scheduleId: string): Omit<ScheduleLock, 'scheduleId'> | undefined {
  const lock = scheduleLocks.get(scheduleId)

  if (!lock || lock.expiresAt <= new Date()) {
    return undefined
  }

  const { scheduleId: _, ...info } = lock
  return info
}

/**
 * Get all currently active locks.
 *
 * @returns Map of schedule IDs to lock info
 */
export function getActiveLocks(): Map<string, Omit<ScheduleLock, 'scheduleId'>> {
  const now = new Date()
  const active = new Map<string, Omit<ScheduleLock, 'scheduleId'>>()

  for (const [scheduleId, lock] of scheduleLocks) {
    if (lock.expiresAt > now) {
      const { scheduleId: _, ...info } = lock
      active.set(scheduleId, info)
    }
  }

  return active
}

/**
 * Clean up expired locks.
 *
 * @returns Number of expired locks cleaned up
 */
export function cleanupExpiredLocks(): number {
  const now = new Date()
  let cleaned = 0

  for (const [scheduleId, lock] of scheduleLocks) {
    if (lock.expiresAt <= now) {
      scheduleLocks.delete(scheduleId)
      // Find and remove the token
      for (const [token, id] of lockTokens) {
        if (id === scheduleId) {
          lockTokens.delete(token)
          break
        }
      }
      cleaned++
    }
  }

  return cleaned
}

/**
 * Clear all locks (for testing or recovery).
 *
 * @returns Number of locks cleared
 */
export function clearAllLocks(): number {
  const count = scheduleLocks.size
  scheduleLocks.clear()
  lockTokens.clear()
  return count
}

/**
 * Execute a function with schedule lock protection.
 *
 * Automatically acquires lock before execution and releases after.
 *
 * @param scheduleId - The schedule identifier
 * @param fn - The async function to execute
 * @param options - Lock options
 * @returns The function result, or undefined if lock not acquired
 *
 * @example
 * ```ts
 * const result = await withScheduleLock('daily-report', async () => {
 *   const data = await gatherMetrics()
 *   await sendReport(data)
 *   return { success: true, metrics: data.length }
 * })
 *
 * if (!result) {
 *   console.log('Could not acquire lock, schedule already running')
 * }
 * ```
 */
export async function withScheduleLock<T>(
  scheduleId: string,
  fn: () => Promise<T>,
  options: AcquireLockOptions = {}
): Promise<{ executed: false; lockedUntil: Date } | { executed: true; result: T }> {
  const lockResult = acquireLock(scheduleId, options)

  if (!lockResult.acquired) {
    return {
      executed: false,
      lockedUntil: lockResult.lockedUntil!,
    }
  }

  try {
    const result = await fn()
    return {
      executed: true,
      result,
    }
  } finally {
    releaseLock(lockResult.token!)
  }
}
