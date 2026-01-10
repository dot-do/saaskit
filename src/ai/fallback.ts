/**
 * AI Fallback Handling Infrastructure
 *
 * Provides retry and fallback logic for AI operations,
 * including rate limit detection and automatic model fallback.
 */

// ============================================================================
// Types
// ============================================================================

export interface FallbackConfig {
  /** Maximum number of retries before giving up */
  maxRetries?: number
  /** Base delay between retries in milliseconds */
  baseDelay?: number
  /** Maximum delay between retries in milliseconds */
  maxDelay?: number
  /** Whether to use exponential backoff */
  exponentialBackoff?: boolean
  /** Callback when a retry occurs */
  onRetry?: (error: Error, attempt: number, model: string) => void
  /** Callback when falling back to another model */
  onFallback?: (fromModel: string, toModel: string, error: Error) => void
}

export interface RetryOptions {
  /** Maximum number of retries */
  maxRetries?: number
  /** Base delay in milliseconds */
  baseDelay?: number
  /** Maximum delay in milliseconds */
  maxDelay?: number
  /** Whether to use exponential backoff */
  exponentialBackoff?: boolean
  /** Predicate to determine if error is retryable */
  isRetryable?: (error: Error) => boolean
  /** Callback on each retry */
  onRetry?: (error: Error, attempt: number) => void
}

// ============================================================================
// Error Detection
// ============================================================================

/**
 * Check if an error is a rate limit error
 *
 * Detects rate limiting from various AI providers based on
 * error messages and status codes.
 *
 * @param error - The error to check
 * @returns true if this is a rate limit error
 *
 * @example
 * ```ts
 * try {
 *   await ai`Generate text`
 * } catch (error) {
 *   if (isRateLimitError(error)) {
 *     // Wait and retry, or fall back to another model
 *   }
 * }
 * ```
 */
export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()

  // Common rate limit indicators
  const rateLimitPatterns = [
    'rate limit',
    'rate_limit',
    'ratelimit',
    'too many requests',
    'quota exceeded',
    'capacity',
    '429',
    'throttl',
  ]

  return rateLimitPatterns.some((pattern) => message.includes(pattern))
}

/**
 * Check if an error is a timeout error
 *
 * @param error - The error to check
 * @returns true if this is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()

  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('etimedout') ||
    message.includes('econnaborted')
  )
}

/**
 * Check if an error is a transient error that may succeed on retry
 *
 * @param error - The error to check
 * @returns true if this is a transient/retryable error
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  // Rate limits and timeouts are transient
  if (isRateLimitError(error) || isTimeoutError(error)) return true

  const message = error.message.toLowerCase()

  // Server errors are often transient
  const transientPatterns = [
    'service unavailable',
    'temporarily unavailable',
    '500',
    '502',
    '503',
    '504',
    'internal server error',
    'bad gateway',
    'gateway timeout',
    'network error',
    'connection refused',
    'connection reset',
    'econnrefused',
    'econnreset',
  ]

  return transientPatterns.some((pattern) => message.includes(pattern))
}

/**
 * Check if an error is a model-specific error that may succeed with different model
 *
 * @param error - The error to check
 * @returns true if falling back to another model might help
 */
export function shouldFallbackToAnotherModel(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  // Rate limits often require model fallback
  if (isRateLimitError(error)) return true

  const message = error.message.toLowerCase()

  const fallbackPatterns = [
    'model not available',
    'model is overloaded',
    'context length exceeded',
    'maximum context',
    'token limit',
  ]

  return fallbackPatterns.some((pattern) => message.includes(pattern))
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate delay for a retry attempt with exponential backoff
 *
 * @param attempt - The current attempt number (1-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @param exponential - Whether to use exponential backoff
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  exponential: boolean = true
): number {
  if (!exponential) {
    return baseDelay
  }

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
  const jitter = Math.random() * 0.1 * exponentialDelay
  const delay = exponentialDelay + jitter

  return Math.min(delay, maxDelay)
}

/**
 * Sleep for a specified duration
 *
 * @param ms - Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry logic
 *
 * @param fn - The async function to execute
 * @param options - Retry options
 * @returns The function result
 * @throws The last error if all retries fail
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => ai`Generate text`,
 *   {
 *     maxRetries: 3,
 *     isRetryable: isTransientError,
 *   }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBackoff = true,
    isRetryable = isTransientError,
    onRetry,
  } = options

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry if we've exhausted attempts or error isn't retryable
      if (attempt > maxRetries || !isRetryable(lastError)) {
        throw lastError
      }

      // Notify of retry
      onRetry?.(lastError, attempt)

      // Wait before retrying
      const delay = calculateRetryDelay(attempt, baseDelay, maxDelay, exponentialBackoff)
      await sleep(delay)
    }
  }

  throw lastError
}

// ============================================================================
// Fallback Wrapper
// ============================================================================

/**
 * Wrap an AI function with automatic fallback to alternative models
 *
 * When the primary model fails (rate limit, capacity, etc.),
 * automatically tries fallback models in order.
 *
 * @param fn - Function that accepts a model name and returns a promise
 * @param fallbackModels - Ordered list of models to try on failure
 * @param config - Fallback configuration
 * @returns The result from the first successful model
 *
 * @example
 * ```ts
 * const result = await withFallback(
 *   (model) => ai.with({ model })`Generate text`,
 *   ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
 *   {
 *     maxRetries: 2,
 *     onFallback: (from, to, error) => {
 *       console.log(`Falling back from ${from} to ${to}`)
 *     },
 *   }
 * )
 * ```
 */
export async function withFallback<T>(
  fn: (model: string) => Promise<T>,
  fallbackModels: string[],
  config: FallbackConfig = {}
): Promise<T> {
  const {
    maxRetries = 2,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBackoff = true,
    onRetry,
    onFallback,
  } = config

  if (fallbackModels.length === 0) {
    throw new Error('At least one model must be provided')
  }

  let lastError: Error | undefined

  for (let modelIndex = 0; modelIndex < fallbackModels.length; modelIndex++) {
    const model = fallbackModels[modelIndex]

    try {
      // Try the current model with retries
      return await withRetry(() => fn(model), {
        maxRetries,
        baseDelay,
        maxDelay,
        exponentialBackoff,
        isRetryable: (error) => isTransientError(error) && !shouldFallbackToAnotherModel(error),
        onRetry: (error, attempt) => onRetry?.(error, attempt, model),
      })
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If there are more models to try and this error suggests fallback
      const hasMoreModels = modelIndex < fallbackModels.length - 1
      if (hasMoreModels && shouldFallbackToAnotherModel(lastError)) {
        onFallback?.(model, fallbackModels[modelIndex + 1], lastError)
        continue
      }

      // If error doesn't suggest fallback or no more models, throw
      if (!hasMoreModels) {
        throw lastError
      }
    }
  }

  throw lastError
}

/**
 * Create a fallback-enabled AI function
 *
 * Returns a function that automatically handles fallback
 * without needing to specify models on each call.
 *
 * @param fn - The base AI function
 * @param fallbackModels - Default fallback models
 * @param defaultConfig - Default fallback configuration
 * @returns A wrapped function with fallback handling
 *
 * @example
 * ```ts
 * const resilientAI = createFallbackHandler(
 *   (model, prompt) => ai.with({ model })`${prompt}`,
 *   ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
 * )
 *
 * // Use without worrying about fallback
 * const result = await resilientAI('Summarize this text')
 * ```
 */
export function createFallbackHandler<T>(
  fn: (model: string, ...args: unknown[]) => Promise<T>,
  fallbackModels: string[],
  defaultConfig: FallbackConfig = {}
): (...args: unknown[]) => Promise<T> {
  return (...args: unknown[]) =>
    withFallback((model) => fn(model, ...args), fallbackModels, defaultConfig)
}
