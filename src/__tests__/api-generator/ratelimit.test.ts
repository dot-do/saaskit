/**
 * Rate Limiter Module Tests
 *
 * Tests for the token bucket rate limiter implementation.
 *
 * @module api-generator/ratelimit.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  RateLimiter,
  createRateLimiters,
  getRateLimiterForRequest,
} from '../../api-generator/ratelimit'
import type { RateLimitConfig } from '../../api-generator/types'

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('basic rate limiting', () => {
    it('should allow requests under the limit', () => {
      const limiter = new RateLimiter({ requests: 10, window: '1m' })

      const result = limiter.check('client1')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
    })

    it('should track remaining requests', () => {
      const limiter = new RateLimiter({ requests: 5, window: '1m' })

      expect(limiter.check('client1').remaining).toBe(4)
      expect(limiter.check('client1').remaining).toBe(3)
      expect(limiter.check('client1').remaining).toBe(2)
      expect(limiter.check('client1').remaining).toBe(1)
      expect(limiter.check('client1').remaining).toBe(0)
    })

    it('should block requests over the limit', () => {
      const limiter = new RateLimiter({ requests: 3, window: '1m' })

      limiter.check('client1')
      limiter.check('client1')
      limiter.check('client1')
      const result = limiter.check('client1')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should return reset time', () => {
      const limiter = new RateLimiter({ requests: 10, window: '1m' })
      const now = Date.now()

      const result = limiter.check('client1')

      expect(result.resetAt).toBeGreaterThan(now)
      expect(result.resetAt).toBeLessThanOrEqual(now + 60000)
    })

    it('should track different clients separately', () => {
      const limiter = new RateLimiter({ requests: 2, window: '1m' })

      limiter.check('client1')
      limiter.check('client1')
      const client1Result = limiter.check('client1')
      const client2Result = limiter.check('client2')

      expect(client1Result.allowed).toBe(false)
      expect(client2Result.allowed).toBe(true)
    })
  })

  describe('window reset', () => {
    it('should reset after the window expires', () => {
      const limiter = new RateLimiter({ requests: 2, window: '1m' })

      limiter.check('client1')
      limiter.check('client1')
      const blocked = limiter.check('client1')
      expect(blocked.allowed).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(60001)

      const afterReset = limiter.check('client1')
      expect(afterReset.allowed).toBe(true)
      expect(afterReset.remaining).toBe(1) // New window, used 1
    })

    it('should set new reset time after window expires', () => {
      const limiter = new RateLimiter({ requests: 5, window: '30s' })
      const initialTime = Date.now()

      const firstCheck = limiter.check('client1')
      expect(firstCheck.resetAt).toBe(initialTime + 30000)

      vi.advanceTimersByTime(30001)
      const newTime = Date.now()

      const afterReset = limiter.check('client1')
      expect(afterReset.resetAt).toBeGreaterThan(firstCheck.resetAt)
      expect(afterReset.resetAt).toBe(newTime + 30000)
    })

    it('should support different window formats', () => {
      const secondsLimiter = new RateLimiter({ requests: 10, window: '30s' })
      const minutesLimiter = new RateLimiter({ requests: 10, window: '5m' })
      const hoursLimiter = new RateLimiter({ requests: 10, window: '1h' })

      const now = Date.now()

      expect(secondsLimiter.check('c').resetAt).toBe(now + 30000)
      expect(minutesLimiter.check('c').resetAt).toBe(now + 300000)
      expect(hoursLimiter.check('c').resetAt).toBe(now + 3600000)
    })
  })

  describe('edge cases', () => {
    it('should handle limit of 1', () => {
      const limiter = new RateLimiter({ requests: 1, window: '1m' })

      const first = limiter.check('client1')
      const second = limiter.check('client1')

      expect(first.allowed).toBe(true)
      expect(first.remaining).toBe(0)
      expect(second.allowed).toBe(false)
    })

    it('should handle high limits', () => {
      const limiter = new RateLimiter({ requests: 10000, window: '1m' })

      for (let i = 0; i < 9999; i++) {
        limiter.check('client1')
      }

      const lastAllowed = limiter.check('client1')
      const blocked = limiter.check('client1')

      expect(lastAllowed.allowed).toBe(true)
      expect(lastAllowed.remaining).toBe(0)
      expect(blocked.allowed).toBe(false)
    })

    it('should handle empty string as client key', () => {
      const limiter = new RateLimiter({ requests: 5, window: '1m' })

      const result = limiter.check('')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })
  })
})

describe('createRateLimiters', () => {
  it('should return undefined global limiter when no config', () => {
    const { globalRateLimiter, rateLimiters } = createRateLimiters(undefined)

    expect(globalRateLimiter).toBeUndefined()
    expect(rateLimiters.size).toBe(0)
  })

  it('should create global limiter from requests/window config', () => {
    const config: RateLimitConfig = { requests: 100, window: '1m' }
    const { globalRateLimiter, rateLimiters } = createRateLimiters(config)

    expect(globalRateLimiter).toBeDefined()
    expect(rateLimiters.size).toBe(0)

    const result = globalRateLimiter!.check('test')
    expect(result.remaining).toBe(99)
  })

  it('should create global limiter from default config', () => {
    const config: RateLimitConfig = {
      default: { requests: 50, window: '30s' },
    }
    const { globalRateLimiter } = createRateLimiters(config)

    expect(globalRateLimiter).toBeDefined()
    const result = globalRateLimiter!.check('test')
    expect(result.remaining).toBe(49)
  })

  it('should prefer requests/window over default config', () => {
    const config: RateLimitConfig = {
      requests: 100,
      window: '1m',
      default: { requests: 50, window: '30s' },
    }
    const { globalRateLimiter } = createRateLimiters(config)

    const result = globalRateLimiter!.check('test')
    expect(result.remaining).toBe(99) // Using 100, not 50
  })

  it('should create endpoint-specific limiters', () => {
    const config: RateLimitConfig = {
      endpoints: {
        'POST /todos': { requests: 10, window: '1m' },
        'GET /todos': { requests: 100, window: '1m' },
        'DELETE /todos/:id': { requests: 5, window: '1m' },
      },
    }
    const { rateLimiters } = createRateLimiters(config)

    expect(rateLimiters.size).toBe(3)
    expect(rateLimiters.has('POST /todos')).toBe(true)
    expect(rateLimiters.has('GET /todos')).toBe(true)
    expect(rateLimiters.has('DELETE /todos/:id')).toBe(true)

    const postLimiter = rateLimiters.get('POST /todos')!
    expect(postLimiter.check('test').remaining).toBe(9)
  })

  it('should create both global and endpoint limiters', () => {
    const config: RateLimitConfig = {
      requests: 100,
      window: '1m',
      endpoints: {
        'POST /todos': { requests: 10, window: '1m' },
      },
    }
    const { globalRateLimiter, rateLimiters } = createRateLimiters(config)

    expect(globalRateLimiter).toBeDefined()
    expect(rateLimiters.size).toBe(1)
  })
})

describe('getRateLimiterForRequest', () => {
  let rateLimiters: Map<string, RateLimiter>
  let globalRateLimiter: RateLimiter

  beforeEach(() => {
    vi.useFakeTimers()
    rateLimiters = new Map()
    rateLimiters.set('POST /todos', new RateLimiter({ requests: 10, window: '1m' }))
    rateLimiters.set('GET /todos', new RateLimiter({ requests: 100, window: '1m' }))
    globalRateLimiter = new RateLimiter({ requests: 50, window: '1m' })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return endpoint-specific limiter when available', () => {
    const limiter = getRateLimiterForRequest(
      'POST /todos',
      undefined,
      rateLimiters,
      globalRateLimiter,
      undefined
    )

    expect(limiter).toBe(rateLimiters.get('POST /todos'))
  })

  it('should return global limiter when no endpoint match', () => {
    const limiter = getRateLimiterForRequest(
      'DELETE /todos/:id',
      undefined,
      rateLimiters,
      globalRateLimiter,
      undefined
    )

    expect(limiter).toBe(globalRateLimiter)
  })

  it('should return undefined when no limiter available', () => {
    const limiter = getRateLimiterForRequest(
      'DELETE /todos/:id',
      undefined,
      new Map(),
      undefined,
      undefined
    )

    expect(limiter).toBeUndefined()
  })

  describe('tier-based rate limiting', () => {
    const rateLimitingConfig: RateLimitConfig = {
      requests: 50,
      window: '1m',
      tiers: {
        basic: { requests: 100, window: '1m' },
        pro: { requests: 500, window: '1m' },
        enterprise: { requests: 10000, window: '1m' },
      },
    }

    it('should create tier-specific limiter on first request', () => {
      const limiter = getRateLimiterForRequest(
        'GET /users',
        'pro',
        rateLimiters,
        globalRateLimiter,
        rateLimitingConfig
      )

      expect(limiter).toBeDefined()
      expect(rateLimiters.has('tier:pro')).toBe(true)
    })

    it('should reuse cached tier limiter for same tier', () => {
      // Both requests are for unregistered endpoints with same tier
      // They should use the same tier-based limiter from cache
      const limiter1 = getRateLimiterForRequest(
        'GET /unknown1',
        'pro',
        rateLimiters,
        globalRateLimiter,
        rateLimitingConfig
      )
      const limiter2 = getRateLimiterForRequest(
        'GET /unknown2',
        'pro',
        rateLimiters,
        globalRateLimiter,
        rateLimitingConfig
      )

      expect(limiter1).toBe(limiter2)
      // Verify both are the tier:pro limiter, not endpoint-specific ones
      expect(rateLimiters.has('tier:pro')).toBe(true)
    })

    it('should use tier-specific limits', () => {
      const basicLimiter = getRateLimiterForRequest(
        'GET /users',
        'basic',
        rateLimiters,
        globalRateLimiter,
        rateLimitingConfig
      )!
      const proLimiter = getRateLimiterForRequest(
        'GET /users',
        'pro',
        rateLimiters,
        globalRateLimiter,
        rateLimitingConfig
      )!

      expect(basicLimiter.check('test').remaining).toBe(99) // 100 - 1
      expect(proLimiter.check('test').remaining).toBe(499) // 500 - 1
    })

    it('should prefer endpoint limiter over tier limiter', () => {
      const limiter = getRateLimiterForRequest(
        'POST /todos',
        'enterprise',
        rateLimiters,
        globalRateLimiter,
        rateLimitingConfig
      )

      // Should return the endpoint-specific limiter (10 requests)
      expect(limiter).toBe(rateLimiters.get('POST /todos'))
      expect(limiter!.check('test').remaining).toBe(9)
    })

    it('should fall back to global when tier not configured', () => {
      const limiter = getRateLimiterForRequest(
        'GET /users',
        'unknown_tier',
        rateLimiters,
        globalRateLimiter,
        rateLimitingConfig
      )

      expect(limiter).toBe(globalRateLimiter)
    })

    it('should fall back to global when tier is undefined', () => {
      const limiter = getRateLimiterForRequest(
        'GET /users',
        undefined,
        rateLimiters,
        globalRateLimiter,
        rateLimitingConfig
      )

      expect(limiter).toBe(globalRateLimiter)
    })
  })
})
