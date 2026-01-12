import { describe, it, expect } from 'vitest'
import { isValidEmail, validateEmail } from '../utils/email-validator'

describe('email validation security', () => {
  describe('should reject invalid emails', () => {
    it('rejects email > 254 characters total', () => {
      const longEmail = 'a'.repeat(250) + '@b.com'
      expect(isValidEmail(longEmail)).toBe(false)
    })

    it('rejects local part > 64 characters', () => {
      const longLocal = 'a'.repeat(65) + '@example.com'
      expect(isValidEmail(longLocal)).toBe(false)
    })

    it('rejects consecutive dots in local part', () => {
      expect(isValidEmail('test..user@example.com')).toBe(false)
    })

    it('rejects single-char TLD', () => {
      expect(isValidEmail('test@example.a')).toBe(false)
    })

    it('rejects leading dot in local part', () => {
      expect(isValidEmail('.test@example.com')).toBe(false)
    })

    it('rejects trailing dot in local part', () => {
      expect(isValidEmail('test.@example.com')).toBe(false)
    })
  })

  describe('should accept valid emails', () => {
    it('accepts standard email', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
    })

    it('accepts email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true)
    })

    it('accepts email with plus addressing', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('accepts email with dots in local part', () => {
      expect(isValidEmail('first.last@example.com')).toBe(true)
    })
  })

  describe('validateEmail returns error details', () => {
    it('returns error message for invalid email', () => {
      const result = validateEmail('invalid')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('returns valid for good email', () => {
      const result = validateEmail('user@example.com')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })
})
