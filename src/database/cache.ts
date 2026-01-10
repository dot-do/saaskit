/**
 * Cache Module
 *
 * Provides a simple in-memory cache for database get() operations with
 * automatic invalidation on update/delete operations.
 *
 * @module database/cache
 */

import type { BaseRecord } from './types'

/**
 * Options for configuring the cache
 */
export interface CacheOptions {
  /**
   * Maximum number of entries to store in the cache.
   * Uses LRU eviction when exceeded.
   * Defaults to 1000.
   */
  maxSize?: number

  /**
   * Time-to-live in milliseconds for cache entries.
   * Set to 0 for no expiration.
   * Defaults to 60000 (1 minute).
   */
  ttl?: number

  /**
   * Whether to enable the cache.
   * Defaults to true.
   */
  enabled?: boolean
}

/**
 * Internal cache entry with metadata
 */
interface CacheEntry<T> {
  value: T
  timestamp: number
  accessOrder: number
}

/**
 * QueryCache - Simple in-memory cache with TTL and LRU eviction
 *
 * Caches get() results and automatically invalidates on update/delete.
 * Uses LRU (Least Recently Used) eviction when the cache is full.
 *
 * @example
 * ```ts
 * const cache = new QueryCache<User>({ maxSize: 100, ttl: 30000 })
 *
 * // Check cache before database lookup
 * const cached = cache.get('user_1')
 * if (cached) {
 *   return cached
 * }
 *
 * // Load from database and cache
 * const user = await db.get('user_1')
 * cache.set('user_1', user)
 *
 * // Invalidate on update
 * await db.update('user_1', { name: 'New Name' })
 * cache.invalidate('user_1')
 * ```
 *
 * @typeParam T - The record type being cached
 */
export class QueryCache<T extends BaseRecord> {
  private readonly cache: Map<string, CacheEntry<T>>
  private readonly options: Required<CacheOptions>
  private accessCounter = 0

  /**
   * Creates a new QueryCache
   *
   * @param options - Cache configuration options
   */
  constructor(options: CacheOptions = {}) {
    this.cache = new Map()
    this.options = {
      maxSize: options.maxSize ?? 1000,
      ttl: options.ttl ?? 60000,
      enabled: options.enabled ?? true,
    }
  }

  /**
   * Get a cached record by key
   *
   * @param key - The record ID to retrieve
   * @returns The cached record or undefined if not found/expired
   *
   * @example
   * ```ts
   * const user = cache.get('user_1')
   * if (user) {
   *   console.log('Cache hit:', user.name)
   * } else {
   *   console.log('Cache miss')
   * }
   * ```
   */
  get(key: string): T | undefined {
    if (!this.options.enabled) return undefined

    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check TTL expiration
    if (this.options.ttl > 0 && Date.now() - entry.timestamp > this.options.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // Update access order for LRU
    entry.accessOrder = ++this.accessCounter
    return entry.value
  }

  /**
   * Store a record in the cache
   *
   * @param key - The record ID
   * @param value - The record to cache
   *
   * @example
   * ```ts
   * const user = await db.get('user_1')
   * cache.set('user_1', user)
   * ```
   */
  set(key: string, value: T): void {
    if (!this.options.enabled) return

    // Evict if at capacity
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessOrder: ++this.accessCounter,
    })
  }

  /**
   * Invalidate (remove) a cached record
   *
   * Call this after update() or delete() operations to maintain consistency.
   *
   * @param key - The record ID to invalidate
   *
   * @example
   * ```ts
   * await db.update('user_1', { name: 'New Name' })
   * cache.invalidate('user_1')
   * ```
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Invalidate multiple cached records
   *
   * @param keys - Array of record IDs to invalidate
   */
  invalidateMany(keys: string[]): void {
    for (const key of keys) {
      this.cache.delete(key)
    }
  }

  /**
   * Invalidate all records matching a predicate
   *
   * Useful for bulk invalidation, e.g., when updating related records.
   *
   * @param predicate - Function that returns true for entries to invalidate
   *
   * @example
   * ```ts
   * // Invalidate all users with a specific plan
   * cache.invalidateWhere((user) => user.planId === 'plan_123')
   * ```
   */
  invalidateWhere(predicate: (value: T) => boolean): void {
    for (const [key, entry] of this.cache) {
      if (predicate(entry.value)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cached entries
   *
   * @example
   * ```ts
   * cache.clear()
   * console.log(cache.size) // 0
   * ```
   */
  clear(): void {
    this.cache.clear()
    this.accessCounter = 0
  }

  /**
   * Get the current number of cached entries
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Check if a key exists in the cache (and is not expired)
   *
   * @param key - The record ID to check
   * @returns true if the key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Get cache statistics
   *
   * @returns Object with cache statistics
   *
   * @example
   * ```ts
   * const stats = cache.stats()
   * console.log(`Cache size: ${stats.size}/${stats.maxSize}`)
   * ```
   */
  stats(): { size: number; maxSize: number; enabled: boolean; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      enabled: this.options.enabled,
      ttl: this.options.ttl,
    }
  }

  /**
   * Enable or disable the cache
   *
   * @param enabled - Whether to enable the cache
   */
  setEnabled(enabled: boolean): void {
    this.options.enabled = enabled
    if (!enabled) {
      this.clear()
    }
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | undefined
    let oldestAccess = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.accessOrder < oldestAccess) {
        oldestAccess = entry.accessOrder
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
}

/**
 * Create a cache key for a noun and record ID
 *
 * @param noun - The noun name (e.g., 'Customer')
 * @param id - The record ID
 * @returns A unique cache key
 *
 * @example
 * ```ts
 * const key = createCacheKey('Customer', 'cust_123')
 * // Returns: 'Customer:cust_123'
 * ```
 */
export function createCacheKey(noun: string, id: string): string {
  return `${noun}:${id}`
}

/**
 * CacheManager - Manages caches for multiple noun types
 *
 * Provides a centralized cache manager that handles cache instances
 * for different noun types with consistent configuration.
 *
 * @example
 * ```ts
 * const manager = new CacheManager({ ttl: 30000 })
 *
 * // Get or create cache for a noun
 * const customerCache = manager.getCache('Customer')
 * const orderCache = manager.getCache('Order')
 *
 * // Clear all caches
 * manager.clearAll()
 * ```
 */
export class CacheManager {
  private readonly caches: Map<string, QueryCache<BaseRecord>>
  private readonly defaultOptions: CacheOptions

  /**
   * Creates a new CacheManager
   *
   * @param defaultOptions - Default options for all caches
   */
  constructor(defaultOptions: CacheOptions = {}) {
    this.caches = new Map()
    this.defaultOptions = defaultOptions
  }

  /**
   * Get or create a cache for a noun
   *
   * @param noun - The noun name
   * @param options - Optional override options for this specific cache
   * @returns The cache instance
   */
  getCache<T extends BaseRecord>(noun: string, options?: CacheOptions): QueryCache<T> {
    let cache = this.caches.get(noun)
    if (!cache) {
      cache = new QueryCache<BaseRecord>({ ...this.defaultOptions, ...options })
      this.caches.set(noun, cache)
    }
    return cache as QueryCache<T>
  }

  /**
   * Invalidate a record across all caches
   *
   * @param noun - The noun name
   * @param id - The record ID
   */
  invalidate(noun: string, id: string): void {
    const cache = this.caches.get(noun)
    if (cache) {
      cache.invalidate(id)
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear()
    }
  }

  /**
   * Get statistics for all caches
   */
  statsAll(): Record<string, ReturnType<QueryCache<BaseRecord>['stats']>> {
    const result: Record<string, ReturnType<QueryCache<BaseRecord>['stats']>> = {}
    for (const [noun, cache] of this.caches) {
      result[noun] = cache.stats()
    }
    return result
  }
}
