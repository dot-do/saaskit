/**
 * Database Proxy Utilities
 *
 * Shared proxy creation logic for lazy database accessor instantiation.
 * Used by both create-saas.ts (core SaaS context) and database/index.ts (pure database layer).
 *
 * This module provides database-specific proxy functionality with features like
 * initialization checks and custom error messages for unregistered nouns.
 *
 * Built on top of the generic createCachedProxy utility from utils/proxy-factory.ts,
 * adding database-specific features like initialization guards.
 */

import { createCachedProxy, type CachedProxyResult } from '../utils/proxy-factory'

/**
 * Configuration for creating a database proxy
 */
export interface DbProxyConfig<TAccessor> {
  /**
   * Function to check if nouns have been initialized at all.
   * If provided and returns false, notInitializedError will be thrown.
   */
  isInitialized?: () => boolean

  /**
   * Error message when nouns haven't been initialized
   */
  notInitializedError?: string

  /**
   * Function to check if a noun is registered
   */
  isRegistered: (nounName: string) => boolean

  /**
   * Function to create an accessor for a noun
   */
  createAccessor: (nounName: string) => TAccessor

  /**
   * Optional function to get all registered noun names (for ownKeys/enumeration)
   */
  getNounNames?: () => string[]

  /**
   * Optional custom error message when accessing unregistered noun
   */
  unregisteredError?: (nounName: string) => string
}

/**
 * Result from createDbProxy including the proxy and cache management functions
 */
export interface DbProxyResult<TAccessor> {
  /**
   * The proxy object that provides lazy accessor creation
   */
  proxy: Record<string, TAccessor | undefined>

  /**
   * Clear the accessor cache for a specific noun or all nouns
   */
  clearCache: (nounName?: string) => void
}

/**
 * Create a database proxy with lazy accessor creation and caching
 *
 * This creates a Proxy that:
 * - Lazily creates database accessors on first access
 * - Caches created accessors for reuse
 * - Returns undefined for unregistered nouns
 * - Supports `in` operator checks via `has` trap
 * - Supports Object.keys() enumeration if getNounNames is provided
 *
 * Built on top of createCachedProxy from utils/proxy-factory.ts, adding:
 * - Initialization guard (isInitialized/notInitializedError)
 * - Custom unregistered noun error messages
 *
 * @typeParam TAccessor - The database accessor type
 * @param config - Configuration for the proxy behavior
 * @returns An object with the proxy and cache management functions
 *
 * @example
 * ```ts
 * const { proxy: dbProxy, clearCache } = createDbProxy({
 *   isRegistered: (name) => name in registeredNouns,
 *   createAccessor: (name) => createDatabaseAccessor(name, schema, storage),
 *   getNounNames: () => Object.keys(registeredNouns),
 * })
 *
 * // Access triggers lazy creation
 * const userAccessor = dbProxy.User
 *
 * // Check if noun exists
 * 'User' in dbProxy // true
 * 'Unknown' in dbProxy // false
 *
 * // Clear cache when noun schema changes
 * clearCache('User')
 * ```
 */
export function createDbProxy<TAccessor>(
  config: DbProxyConfig<TAccessor>
): DbProxyResult<TAccessor> {
  const {
    isInitialized,
    notInitializedError,
    isRegistered,
    createAccessor,
    getNounNames,
    unregisteredError,
  } = config

  /**
   * Check if initialization is required and throw if not initialized.
   * This is called on property access (not on 'in' operator or enumeration).
   */
  function checkInitialized(): void {
    if (isInitialized && !isInitialized()) {
      throw new Error(notInitializedError || 'Database not initialized')
    }
  }

  // Use the base createCachedProxy utility for core proxy functionality
  const { proxy: baseProxy, clearCache, cache } = createCachedProxy<TAccessor>({
    // Dynamic valid keys based on getNounNames (if provided) or empty set
    validKeys: () => {
      // If not initialized, return empty set to prevent key enumeration
      if (isInitialized && !isInitialized()) {
        return new Set<string>()
      }
      return getNounNames ? new Set(getNounNames()) : new Set<string>()
    },

    createValue: createAccessor,

    onInvalidKey: (key: string) => {
      // For invalid keys, throw custom error if provided
      if (unregisteredError) {
        throw new Error(unregisteredError(key))
      }
      // Otherwise, let it return undefined (handled by base proxy)
    },
  })

  // Wrap the base proxy to add initialization checks on property access
  const proxy = new Proxy(baseProxy as Record<string, TAccessor | undefined>, {
    get(target, prop: string | symbol): TAccessor | undefined {
      if (typeof prop !== 'string') {
        return undefined
      }

      // Check initialization before any property access
      checkInitialized()

      // Check if registered (before accessing base proxy to provide better errors)
      if (!isRegistered(prop)) {
        if (unregisteredError) {
          throw new Error(unregisteredError(prop))
        }
        return undefined
      }

      // Use cached value from base proxy or create new one
      const cached = cache.get(prop)
      if (cached !== undefined) {
        return cached
      }

      const value = createAccessor(prop)
      cache.set(prop, value)
      return value
    },

    has(target, prop: string | symbol): boolean {
      if (typeof prop !== 'string') {
        return false
      }
      // Don't throw on `in` checks, just return false if not initialized
      if (isInitialized && !isInitialized()) {
        return false
      }
      return isRegistered(prop)
    },

    ownKeys(): string[] {
      // Don't throw on enumeration, return empty if not initialized
      if (isInitialized && !isInitialized()) {
        return []
      }
      return getNounNames ? getNounNames() : []
    },

    getOwnPropertyDescriptor(target, prop: string | symbol): PropertyDescriptor | undefined {
      if (typeof prop !== 'string') {
        return undefined
      }

      // Don't throw on property descriptor checks
      if (isInitialized && !isInitialized()) {
        return undefined
      }

      if (!isRegistered(prop)) {
        return undefined
      }

      // Get or create the accessor
      let accessor = cache.get(prop)
      if (!accessor) {
        accessor = createAccessor(prop)
        cache.set(prop, accessor)
      }

      return {
        enumerable: true,
        configurable: true,
        value: accessor,
      }
    },
  })

  return {
    proxy,
    clearCache,
  }
}

/**
 * Clear the accessor cache for a specific noun or all nouns
 *
 * Useful when noun schemas are updated and accessors need to be recreated.
 *
 * @param proxy - The proxy created by createDbProxy (must have internal cache access)
 * @param nounName - Optional noun name to clear. If not provided, clears all.
 */
export function clearAccessorCache(
  accessorCache: Map<string, unknown>,
  nounName?: string
): void {
  if (nounName) {
    accessorCache.delete(nounName)
  } else {
    accessorCache.clear()
  }
}
