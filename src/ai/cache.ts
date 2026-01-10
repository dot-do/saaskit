/**
 * AI Response Caching Infrastructure
 *
 * Provides in-memory caching for AI responses to reduce
 * redundant API calls and improve response times.
 */

import type { AIOptions } from './index'

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry<T = string> {
  /** The cached response value */
  value: T
  /** When the entry was created */
  createdAt: number
  /** When the entry expires (timestamp) */
  expiresAt: number
  /** Cache hit count for analytics */
  hitCount: number
}

export interface CacheStats {
  /** Total number of entries in cache */
  size: number
  /** Number of cache hits */
  hits: number
  /** Number of cache misses */
  misses: number
  /** Hit rate percentage */
  hitRate: number
}

export interface CacheOptions {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number
  /** Maximum number of entries (default: 1000) */
  maxEntries?: number
}

// ============================================================================
// Cache Implementation
// ============================================================================

/** Default TTL: 5 minutes */
const DEFAULT_TTL = 5 * 60 * 1000

/** Default max entries */
const DEFAULT_MAX_ENTRIES = 1000

/** In-memory cache storage */
const cache = new Map<string, CacheEntry<unknown>>()

/** Cache statistics */
let cacheHits = 0
let cacheMisses = 0

/**
 * Generate a cache key from prompt and options
 *
 * Creates a deterministic key based on the prompt content
 * and relevant AI options that affect the response.
 *
 * @param prompt - The AI prompt
 * @param options - AI options that affect the response
 * @returns A string cache key
 *
 * @example
 * ```ts
 * const key = generateCacheKey('Summarize this text', {
 *   model: 'gpt-4',
 *   temperature: 0,
 * })
 * ```
 */
export function generateCacheKey(prompt: string, options?: AIOptions): string {
  // Include options that affect the response
  const relevantOptions = {
    model: options?.model ?? 'default',
    temperature: options?.temperature ?? 1,
    maxTokens: options?.maxTokens,
  }

  // Create a simple hash-like key
  const optionsStr = JSON.stringify(relevantOptions)
  return `ai:${hashString(prompt)}:${hashString(optionsStr)}`
}

/**
 * Simple string hashing function
 * Not cryptographically secure, but fast and sufficient for cache keys
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Get a cached response
 *
 * @param key - The cache key
 * @returns The cached value or undefined if not found/expired
 *
 * @example
 * ```ts
 * const key = generateCacheKey(prompt, options)
 * const cached = getCachedResponse(key)
 * if (cached) {
 *   return cached
 * }
 * ```
 */
export function getCachedResponse<T = string>(key: string): T | undefined {
  const entry = cache.get(key)

  if (!entry) {
    cacheMisses++
    return undefined
  }

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    cacheMisses++
    return undefined
  }

  // Update hit count
  entry.hitCount++
  cacheHits++

  return entry.value as T
}

/**
 * Store a response in the cache
 *
 * @param key - The cache key
 * @param response - The response to cache
 * @param ttl - Time-to-live in milliseconds (optional)
 *
 * @example
 * ```ts
 * const key = generateCacheKey(prompt, options)
 * const response = await ai`${prompt}`
 * setCachedResponse(key, response, 60000) // Cache for 1 minute
 * ```
 */
export function setCachedResponse<T = string>(
  key: string,
  response: T,
  ttl: number = DEFAULT_TTL
): void {
  // Enforce max entries with LRU-style eviction
  if (cache.size >= DEFAULT_MAX_ENTRIES) {
    evictOldestEntries(Math.floor(DEFAULT_MAX_ENTRIES * 0.1))
  }

  const now = Date.now()
  cache.set(key, {
    value: response,
    createdAt: now,
    expiresAt: now + ttl,
    hitCount: 0,
  })
}

/**
 * Delete a specific cache entry
 *
 * @param key - The cache key to delete
 * @returns true if an entry was deleted
 */
export function deleteCachedResponse(key: string): boolean {
  return cache.delete(key)
}

/**
 * Clear all cached responses
 */
export function clearCache(): void {
  cache.clear()
  cacheHits = 0
  cacheMisses = 0
}

/**
 * Get cache statistics
 *
 * @returns Current cache statistics
 */
export function getCacheStats(): CacheStats {
  const total = cacheHits + cacheMisses
  return {
    size: cache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? (cacheHits / total) * 100 : 0,
  }
}

/**
 * Evict oldest entries from cache
 * Used internally for LRU-style cache management
 */
function evictOldestEntries(count: number): void {
  const entries = Array.from(cache.entries())
    .sort((a, b) => a[1].createdAt - b[1].createdAt)
    .slice(0, count)

  for (const [key] of entries) {
    cache.delete(key)
  }
}

/**
 * Clean up expired entries
 * Can be called periodically to free memory
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now()
  let removed = 0

  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key)
      removed++
    }
  }

  return removed
}

/**
 * Get or set cached response with automatic key generation
 *
 * Convenience function that combines key generation, retrieval, and storage.
 *
 * @param prompt - The AI prompt
 * @param options - AI options
 * @param fetcher - Function to call if cache miss
 * @param ttl - Time-to-live in milliseconds
 * @returns The response (from cache or fetcher)
 *
 * @example
 * ```ts
 * const response = await getOrSet(
 *   'Summarize this',
 *   { model: 'gpt-4' },
 *   async () => ai`Summarize this`,
 *   60000
 * )
 * ```
 */
export async function getOrSet<T = string>(
  prompt: string,
  options: AIOptions | undefined,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const key = generateCacheKey(prompt, options)
  const cached = getCachedResponse<T>(key)

  if (cached !== undefined) {
    return cached
  }

  const response = await fetcher()
  setCachedResponse(key, response, ttl)
  return response
}
