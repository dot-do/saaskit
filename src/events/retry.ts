/**
 * Retry Logic with Exponential Backoff
 *
 * Provides retry utilities for durable event processing with
 * configurable backoff strategies.
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries: number

  /**
   * Base delay in milliseconds (default: 1000)
   */
  baseDelay: number

  /**
   * Maximum delay in milliseconds (default: 30000)
   */
  maxDelay: number

  /**
   * Jitter factor (0-1) to randomize delays (default: 0.1)
   */
  jitter?: number
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitter: 0.1,
}

/**
 * Calculate backoff delay for a given attempt using exponential backoff.
 *
 * Formula: min(baseDelay * 2^attempt, maxDelay) * (1 + jitter * random)
 *
 * @param attempt - The current attempt number (0-indexed)
 * @param config - Optional retry configuration
 * @returns Delay in milliseconds
 *
 * @example
 * ```ts
 * calculateBackoff(0) // ~1000ms (base)
 * calculateBackoff(1) // ~2000ms
 * calculateBackoff(2) // ~4000ms
 * calculateBackoff(3) // ~8000ms
 * calculateBackoff(10) // ~30000ms (capped at maxDelay)
 * ```
 */
export function calculateBackoff(attempt: number, config: Partial<RetryConfig> = {}): number {
  const { baseDelay, maxDelay, jitter } = { ...DEFAULT_RETRY_CONFIG, ...config }

  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt)

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay)

  // Apply jitter if configured
  const jitterFactor = jitter ?? 0
  const jitterAmount = cappedDelay * jitterFactor * Math.random()

  return Math.round(cappedDelay + jitterAmount)
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /**
   * Whether the operation succeeded
   */
  success: boolean

  /**
   * The result if successful
   */
  result?: T

  /**
   * The error if failed after all retries
   */
  error?: Error

  /**
   * Number of attempts made
   */
  attempts: number

  /**
   * Total time spent in milliseconds
   */
  totalTime: number
}

/**
 * Wraps a function with retry logic using exponential backoff.
 *
 * @param fn - Async function to execute with retries
 * @param config - Optional retry configuration
 * @returns Promise with the retry result
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   async () => {
 *     const response = await fetch('/api/data')
 *     if (!response.ok) throw new Error('Request failed')
 *     return response.json()
 *   },
 *   { maxRetries: 5, baseDelay: 500 }
 * )
 *
 * if (result.success) {
 *   console.log('Data:', result.result)
 * } else {
 *   console.error('Failed after', result.attempts, 'attempts:', result.error)
 * }
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const { maxRetries } = mergedConfig

  const startTime = Date.now()
  let lastError: Error | undefined
  let attempts = 0

  while (attempts <= maxRetries) {
    attempts++

    try {
      const result = await fn()
      return {
        success: true,
        result,
        attempts,
        totalTime: Date.now() - startTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't delay after the last attempt
      if (attempts <= maxRetries) {
        const delay = calculateBackoff(attempts - 1, mergedConfig)
        await sleep(delay)
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts,
    totalTime: Date.now() - startTime,
  }
}

/**
 * Check if an error is retryable based on common patterns.
 *
 * By default, considers these as retryable:
 * - Network errors (ECONNRESET, ETIMEDOUT, etc.)
 * - Rate limit errors (429)
 * - Server errors (5xx)
 *
 * @param error - The error to check
 * @returns Whether the error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()

  // Network errors
  const networkErrors = ['econnreset', 'etimedout', 'econnrefused', 'epipe', 'enotfound']
  if (networkErrors.some(e => message.includes(e))) return true

  // Rate limiting
  if (message.includes('429') || message.includes('rate limit')) return true

  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return true
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) return true

  return false
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
