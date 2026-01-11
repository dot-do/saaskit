/**
 * Database Proxy Utilities
 *
 * Shared proxy creation logic for lazy database accessor instantiation.
 * Used by both create-saas.ts (core SaaS context) and database/index.ts (pure database layer).
 */

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
 * Create a database proxy with lazy accessor creation and caching
 *
 * This creates a Proxy that:
 * - Lazily creates database accessors on first access
 * - Caches created accessors for reuse
 * - Returns undefined for unregistered nouns
 * - Supports `in` operator checks via `has` trap
 * - Supports Object.keys() enumeration if getNounNames is provided
 *
 * @typeParam TAccessor - The database accessor type
 * @param config - Configuration for the proxy behavior
 * @returns A proxy object that behaves like Record<string, TAccessor | undefined>
 *
 * @example
 * ```ts
 * const dbProxy = createDbProxy({
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
 * ```
 */
export function createDbProxy<TAccessor>(
  config: DbProxyConfig<TAccessor>
): Record<string, TAccessor | undefined> {
  const {
    isInitialized,
    notInitializedError,
    isRegistered,
    createAccessor,
    getNounNames,
    unregisteredError,
  } = config
  const accessorCache = new Map<string, TAccessor>()

  /**
   * Check if initialization is required and throw if not initialized
   */
  function checkInitialized(): void {
    if (isInitialized && !isInitialized()) {
      throw new Error(notInitializedError || 'Database not initialized')
    }
  }

  return new Proxy({} as Record<string, TAccessor | undefined>, {
    get(_target, prop: string | symbol) {
      // Skip Symbol properties (used for internal JS operations)
      if (typeof prop !== 'string') {
        return undefined
      }

      // Check if nouns have been initialized
      checkInitialized()

      // Return undefined or throw if noun is not registered
      if (!isRegistered(prop)) {
        if (unregisteredError) {
          throw new Error(unregisteredError(prop))
        }
        return undefined
      }

      // Return cached accessor or create new one
      let accessor = accessorCache.get(prop)
      if (!accessor) {
        accessor = createAccessor(prop)
        accessorCache.set(prop, accessor)
      }
      return accessor
    },

    has(_target, prop: string | symbol) {
      if (typeof prop !== 'string') {
        return false
      }
      // Don't throw on `in` checks, just return false if not initialized
      if (isInitialized && !isInitialized()) {
        return false
      }
      return isRegistered(prop)
    },

    ownKeys() {
      // Don't throw on enumeration, return empty if not initialized
      if (isInitialized && !isInitialized()) {
        return []
      }
      if (getNounNames) {
        return getNounNames()
      }
      return []
    },

    getOwnPropertyDescriptor(_target, prop: string | symbol) {
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
      let accessor = accessorCache.get(prop)
      if (!accessor) {
        accessor = createAccessor(prop)
        accessorCache.set(prop, accessor)
      }

      return {
        enumerable: true,
        configurable: true,
        value: accessor,
      }
    },
  })
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
