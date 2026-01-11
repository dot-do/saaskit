/**
 * Proxy Factory Utilities
 *
 * Shared utilities for creating cached proxy objects with lazy initialization.
 * Used throughout SaaSkit for database accessors, API proxies, and other
 * lazily-initialized object patterns.
 *
 * @module utils/proxy-factory
 */

/**
 * Configuration options for creating a cached proxy
 *
 * @typeParam TValue - The type of values returned by the proxy
 */
export interface CachedProxyOptions<TValue> {
  /**
   * Set of valid keys that the proxy will accept.
   * Access to keys not in this set will trigger onInvalidKey (if provided)
   * or return undefined.
   */
  validKeys: Set<string> | (() => Set<string>)

  /**
   * Factory function to create a value when a key is first accessed.
   * The result is cached and returned on subsequent accesses.
   *
   * @param key - The property key being accessed
   * @returns The value to cache and return
   */
  createValue: (key: string) => TValue

  /**
   * Optional callback when an invalid key is accessed.
   * Can throw an error with a helpful message or return undefined.
   *
   * @param key - The invalid key that was accessed
   * @param validKeys - Set of valid keys for error message construction
   */
  onInvalidKey?: (key: string, validKeys: Set<string>) => void
}

/**
 * Result from createCachedProxy including the proxy and cache management
 *
 * @typeParam TValue - The type of values in the proxy
 */
export interface CachedProxyResult<TValue> {
  /**
   * The proxy object that provides lazy value creation
   */
  proxy: Record<string, TValue>

  /**
   * Clear the cache for a specific key or all keys
   *
   * @param key - Optional key to clear. If not provided, clears all.
   */
  clearCache: (key?: string) => void

  /**
   * Direct access to the internal cache (for advanced use cases)
   */
  cache: Map<string, TValue>
}

/**
 * Create a proxy that lazily creates and caches values for valid keys
 *
 * This is a common pattern used throughout SaaSkit for:
 * - Database noun accessors ($.db.Customer, $.db.Order)
 * - API integration proxies
 * - Event handler registrations
 *
 * The proxy provides:
 * - Lazy initialization: Values are only created when first accessed
 * - Caching: Once created, values are cached for memory efficiency
 * - Validation: Only valid keys are allowed (configurable)
 * - Enumeration: Supports Object.keys(), 'in' operator, etc.
 * - Cache management: Clear cache to force re-creation of values
 *
 * @typeParam TValue - The type of values returned by the proxy
 * @param options - Configuration for the proxy behavior
 * @returns An object with the proxy, clearCache function, and cache access
 *
 * @example
 * ```ts
 * // Create a proxy for database accessors
 * const { proxy: dbProxy, clearCache } = createCachedProxy<NounAccessor>({
 *   validKeys: new Set(['Customer', 'Order', 'Product']),
 *   createValue: (nounName) => createNounAccessor(nounName),
 *   onInvalidKey: (key, validKeys) => {
 *     throw new Error(`Unknown noun: "${key}". Available: ${[...validKeys].join(', ')}`)
 *   },
 * })
 *
 * // First access creates and caches the accessor
 * const customerAccessor = dbProxy.Customer
 *
 * // Second access returns cached accessor
 * const sameAccessor = dbProxy.Customer
 *
 * // Clear cache when schema changes
 * clearCache('Customer')
 * ```
 *
 * @example
 * ```ts
 * // With dynamic valid keys (lazy evaluation)
 * const { proxy: dbProxy } = createCachedProxy<NounAccessor>({
 *   validKeys: () => new Set(Object.keys(nounDefinitions)),
 *   createValue: (nounName) => createNounAccessor(nounName),
 * })
 * ```
 */
export function createCachedProxy<TValue>(
  options: CachedProxyOptions<TValue>
): CachedProxyResult<TValue> {
  const { validKeys, createValue, onInvalidKey } = options
  const cache = new Map<string, TValue>()

  /**
   * Get the current set of valid keys (handles both static Set and lazy getter)
   */
  const getValidKeys = (): Set<string> => {
    return typeof validKeys === 'function' ? validKeys() : validKeys
  }

  const proxy = new Proxy({} as Record<string, TValue>, {
    /**
     * Property getter - returns cached value or creates a new one
     */
    get(target, prop: string | symbol): TValue | undefined {
      if (typeof prop !== 'string') return undefined

      // Check cache first for efficiency
      const cached = cache.get(prop)
      if (cached !== undefined) return cached

      const keys = getValidKeys()

      // Validate key
      if (!keys.has(prop)) {
        if (onInvalidKey) {
          onInvalidKey(prop, keys)
        }
        return undefined
      }

      // Create, cache, and return the value
      const value = createValue(prop)
      cache.set(prop, value)
      return value
    },

    /**
     * Support for 'in' operator: 'Customer' in proxy
     */
    has(target, prop: string | symbol): boolean {
      if (typeof prop !== 'string') return false
      return getValidKeys().has(prop)
    },

    /**
     * Support for Object.keys(proxy)
     */
    ownKeys(): string[] {
      return Array.from(getValidKeys())
    },

    /**
     * Required for ownKeys to work properly with Object.keys()
     */
    getOwnPropertyDescriptor(target, prop: string | symbol): PropertyDescriptor | undefined {
      if (typeof prop !== 'string') return undefined

      const keys = getValidKeys()
      if (!keys.has(prop)) return undefined

      // Get or create the value
      let value = cache.get(prop)
      if (value === undefined) {
        value = createValue(prop)
        cache.set(prop, value)
      }

      return {
        enumerable: true,
        configurable: true,
        value,
      }
    },
  })

  return {
    proxy,
    clearCache: (key?: string) => {
      if (key) {
        cache.delete(key)
      } else {
        cache.clear()
      }
    },
    cache,
  }
}

/**
 * Create a simple cached proxy without key validation
 *
 * Unlike createCachedProxy, this version accepts any string key and
 * always calls the createValue function. Useful for dynamic proxies
 * where any key is valid (e.g., agent registries, event handlers).
 *
 * @typeParam TValue - The type of values returned by the proxy
 * @param createValue - Factory function to create values for keys
 * @returns A proxy object that lazily creates and caches values
 *
 * @example
 * ```ts
 * // Create an agent registry proxy
 * const agentsProxy = createUnboundedCachedProxy<AgentDefinition>((name) => ({
 *   instructions: '',
 *   tools: [],
 *   run: (input) => Promise.resolve({ result: 'response' }),
 * }))
 *
 * // Any key creates a new agent
 * const emailAgent = agentsProxy.emailAgent
 * const chatAgent = agentsProxy.chatAgent
 * ```
 */
export function createUnboundedCachedProxy<TValue>(
  createValue: (key: string) => TValue
): Record<string, TValue> {
  const cache = new Map<string, TValue>()

  return new Proxy({} as Record<string, TValue>, {
    get(target, prop: string | symbol): TValue | undefined {
      if (typeof prop !== 'string') return undefined

      const cached = cache.get(prop)
      if (cached !== undefined) return cached

      const value = createValue(prop)
      cache.set(prop, value)
      return value
    },

    has(): boolean {
      // Any string key is valid
      return true
    },
  })
}

/**
 * Helper to find similar keys for helpful error messages
 *
 * Uses simple string distance heuristics to suggest corrections for typos.
 *
 * @param name - The invalid key that was accessed
 * @param validKeys - Set or array of valid keys to search
 * @returns The most similar key, or null if no close match found
 *
 * @example
 * ```ts
 * findSimilarKey('Custmer', ['Customer', 'Order', 'Product'])
 * // Returns 'Customer'
 *
 * findSimilarKey('XYZ', ['Customer', 'Order', 'Product'])
 * // Returns null
 * ```
 */
export function findSimilarKey(
  name: string,
  validKeys: Set<string> | string[]
): string | null {
  const keys = Array.isArray(validKeys) ? validKeys : Array.from(validKeys)
  const nameLower = name.toLowerCase()

  for (const key of keys) {
    const keyLower = key.toLowerCase()

    // Exact case-insensitive match
    if (nameLower === keyLower) {
      return key
    }

    // Check for common typos: missing letter, extra letter, or swapped letters
    if (Math.abs(name.length - key.length) <= 1) {
      let diff = 0
      const longer = name.length >= key.length ? nameLower : keyLower
      const shorter = name.length < key.length ? nameLower : keyLower

      for (let i = 0; i < longer.length; i++) {
        if (shorter[i] !== longer[i]) diff++
        if (diff > 2) break
      }

      if (diff <= 2) return key
    }

    // Check for plural/singular confusion
    if (nameLower === keyLower + 's' || nameLower + 's' === keyLower) {
      return key
    }
  }

  return null
}
