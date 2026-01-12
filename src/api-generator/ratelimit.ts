/**
 * Rate Limiter
 *
 * Token bucket rate limiter implementation for API rate limiting.
 *
 * @module api-generator/ratelimit
 */

import type { RateLimitRule, RateLimitConfig } from './types'
import { parseWindow } from './utilities'

/**
 * Token bucket rate limiter implementation
 * Tracks request counts per key within configurable time windows
 */
export class RateLimiter {
  /** Map of client keys to request counts and reset times */
  private requests: Map<string, { count: number; resetAt: number }> = new Map()
  /** Rate limit configuration */
  private config: RateLimitRule

  /**
   * Creates a new rate limiter
   * @param config - Rate limit configuration with requests and window
   */
  constructor(config: RateLimitRule) {
    this.config = config
  }

  /**
   * Checks if a request is allowed and updates the request count
   * @param key - Client identifier (e.g., API key or IP)
   * @returns Whether the request is allowed, remaining requests, and reset time
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const windowMs = parseWindow(this.config.window)
    const existing = this.requests.get(key)

    if (!existing || now >= existing.resetAt) {
      this.requests.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, remaining: this.config.requests - 1, resetAt: now + windowMs }
    }

    if (existing.count >= this.config.requests) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt }
    }

    existing.count++
    return { allowed: true, remaining: this.config.requests - existing.count, resetAt: existing.resetAt }
  }
}

/**
 * Creates rate limiters from configuration
 * @param rateLimiting - Rate limit configuration
 * @returns Global rate limiter and endpoint-specific limiters map
 */
export function createRateLimiters(rateLimiting?: RateLimitConfig): {
  globalRateLimiter?: RateLimiter
  rateLimiters: Map<string, RateLimiter>
} {
  const rateLimiters = new Map<string, RateLimiter>()
  let globalRateLimiter: RateLimiter | undefined

  if (rateLimiting) {
    if (rateLimiting.requests && rateLimiting.window) {
      globalRateLimiter = new RateLimiter({ requests: rateLimiting.requests, window: rateLimiting.window })
    } else if (rateLimiting.default) {
      globalRateLimiter = new RateLimiter(rateLimiting.default)
    }

    if (rateLimiting.endpoints) {
      for (const [endpoint, rule] of Object.entries(rateLimiting.endpoints)) {
        rateLimiters.set(endpoint, new RateLimiter(rule))
      }
    }
  }

  return { globalRateLimiter, rateLimiters }
}

/**
 * Gets the rate limiter for a specific endpoint and tier
 * @param endpoint - Endpoint pattern (e.g., 'GET /todos')
 * @param tier - Optional user tier for tier-based limits
 * @param rateLimiters - Map of endpoint-specific rate limiters
 * @param globalRateLimiter - Global rate limiter fallback
 * @param rateLimiting - Rate limit configuration for tier lookup
 * @returns The appropriate rate limiter or undefined
 */
export function getRateLimiterForRequest(
  endpoint: string,
  tier: string | undefined,
  rateLimiters: Map<string, RateLimiter>,
  globalRateLimiter: RateLimiter | undefined,
  rateLimiting?: RateLimitConfig
): RateLimiter | undefined {
  // Check endpoint-specific rate limit
  const endpointLimiter = rateLimiters.get(endpoint)
  if (endpointLimiter) return endpointLimiter

  // Check tier-specific rate limit
  if (tier && rateLimiting?.tiers?.[tier]) {
    // Create or get cached tier limiter
    const tierKey = `tier:${tier}`
    if (!rateLimiters.has(tierKey)) {
      rateLimiters.set(tierKey, new RateLimiter(rateLimiting.tiers[tier]))
    }
    return rateLimiters.get(tierKey)
  }

  return globalRateLimiter
}
