/**
 * Safe optional dependency loader.
 *
 * Only catches MODULE_NOT_FOUND errors, re-throws everything else.
 * Logs warnings when optional modules are not installed.
 */

export interface LoadResult<T> {
  module: T | null
  error: Error | null
  isNotFound: boolean
}

/**
 * Safely loads an optional dependency.
 *
 * - Returns the module if found
 * - Returns null and logs warning if module not installed
 * - Throws error for syntax errors, type errors, etc.
 *
 * @param moduleName The module to load
 * @returns LoadResult with module or null
 */
export async function loadOptionalDependency<T = unknown>(moduleName: string): Promise<LoadResult<T>> {
  try {
    const module = await import(moduleName)
    return { module: module as T, error: null, isNotFound: false }
  } catch (error) {
    const err = error as Error & { code?: string }

    // Only treat MODULE_NOT_FOUND as expected (missing optional dep)
    if (
      err.code === 'ERR_MODULE_NOT_FOUND' ||
      err.code === 'MODULE_NOT_FOUND' ||
      err.message?.includes('Cannot find module')
    ) {
      console.warn(`Optional dependency '${moduleName}' not installed. ` + `Install with: pnpm add ${moduleName}`)
      return { module: null, error: null, isNotFound: true }
    }

    // All other errors should propagate (syntax errors, type errors, etc.)
    console.error(`Error loading ${moduleName}:`, err)
    return { module: null, error: err, isNotFound: false }
  }
}

/**
 * Simple version that throws on non-MODULE_NOT_FOUND errors.
 */
export async function tryLoadModule<T = unknown>(moduleName: string): Promise<T | null> {
  const result = await loadOptionalDependency<T>(moduleName)
  if (result.error) {
    throw result.error
  }
  return result.module
}
