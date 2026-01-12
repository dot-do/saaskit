/**
 * Utility Functions
 *
 * Shared utilities used across the SaaSkit package.
 *
 * @module utils
 */

export {
  createCachedProxy,
  createUnboundedCachedProxy,
  findSimilarKey,
  type CachedProxyOptions,
} from './proxy-factory'

export { loadOptionalDependency, tryLoadModule, type LoadResult } from './optional-dependency'
