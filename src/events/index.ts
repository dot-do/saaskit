/**
 * Events & Workflow Primitives
 *
 * Re-exports from the events module for backward compatibility
 * and new durability infrastructure.
 */

// Original exports (backward compatibility)
export {
  createEventBuilder,
  createWorkflowPrimitives,
  type EventHandlerFn,
  type WorkflowPrimitivesConfig,
  type WorkflowPrimitives,
} from '../events'

// Retry infrastructure
export {
  calculateBackoff,
  withRetry,
  isRetryableError,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  type RetryResult,
} from './retry'

// Dead letter queue infrastructure
export {
  addToDeadLetter,
  getDeadLetterItems,
  getDeadLetterById,
  removeDeadLetter,
  removeDeadLetters,
  clearDeadLetterQueue,
  getDeadLetterStats,
  purgeDeadLetters,
  type DeadLetterEntry,
  type AddToDeadLetterOptions,
  type GetDeadLetterOptions,
  type DeadLetterStats,
} from './dead-letter'

// Event deduplication
export {
  generateEventId,
  isProcessed,
  markProcessed,
  unmarkProcessed,
  clearProcessed,
  cleanupExpired,
  getProcessedCount,
  acquireProcessingLock,
  type EventIdOptions,
} from './dedup'

// Schedule overlap prevention
export {
  isScheduleRunning,
  acquireLock,
  releaseLock,
  forceReleaseLock,
  getLockInfo,
  getActiveLocks,
  cleanupExpiredLocks,
  clearAllLocks,
  withScheduleLock,
  type AcquireLockResult,
  type AcquireLockOptions,
} from './scheduler'
