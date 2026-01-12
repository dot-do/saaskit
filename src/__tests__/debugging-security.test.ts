import { describe, it, expect } from 'vitest'
import { safeEval, validateExpression, UnsafeExpressionError } from '../cli/safe-eval'

describe('breakpoint condition security', () => {
  describe('unsafe expressions should throw', () => {
    it('rejects process.exit() in condition', () => {
      expect(() => safeEval('process.exit(1)', {})).toThrow(UnsafeExpressionError)
    })

    it('rejects require() in condition', () => {
      expect(() => safeEval('require("fs")', {})).toThrow(UnsafeExpressionError)
    })

    it('rejects eval() in condition', () => {
      expect(() => safeEval('eval("malicious")', {})).toThrow(UnsafeExpressionError)
    })

    it('rejects Function constructor', () => {
      expect(() => safeEval('new Function("return 1")()', {})).toThrow(UnsafeExpressionError)
    })

    it('rejects global access', () => {
      expect(() => safeEval('global.process', {})).toThrow(UnsafeExpressionError)
    })

    it('rejects module access', () => {
      expect(() => safeEval('module.exports', {})).toThrow(UnsafeExpressionError)
    })

    it('rejects dynamic import', () => {
      expect(() => safeEval('import("fs")', {})).toThrow(UnsafeExpressionError)
    })
  })

  describe('safe expressions should work', () => {
    it('allows safe property access', () => {
      const ctx = { record: { status: 'active' } }
      expect(safeEval('record.status === "active"', ctx)).toBe(true)
    })

    it('allows safe comparisons', () => {
      const ctx = { count: 15, name: 'test-user' }
      expect(safeEval('count > 10 && name.includes("test")', ctx)).toBe(true)
    })

    it('allows arithmetic operations', () => {
      const ctx = { a: 5, b: 3 }
      expect(safeEval('a + b', ctx)).toBe(8)
    })

    it('allows boolean logic', () => {
      const ctx = { active: true, verified: false }
      expect(safeEval('active && !verified', ctx)).toBe(true)
    })

    it('allows array methods', () => {
      const ctx = { items: [1, 2, 3] }
      expect(safeEval('items.length > 0', ctx)).toBe(true)
    })
  })

  describe('validateExpression', () => {
    it('throws UnsafeExpressionError for blocked patterns', () => {
      expect(() => validateExpression('eval("code")')).toThrow(UnsafeExpressionError)
      expect(() => validateExpression('require("fs")')).toThrow(UnsafeExpressionError)
      expect(() => validateExpression('process.env')).toThrow(UnsafeExpressionError)
    })

    it('does not throw for safe expressions', () => {
      expect(() => validateExpression('x > 10')).not.toThrow()
      expect(() => validateExpression('user.name === "test"')).not.toThrow()
      expect(() => validateExpression('items.length > 0')).not.toThrow()
    })
  })
})
