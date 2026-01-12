/**
 * RFC 5321 compliant email validation.
 *
 * Validates:
 * - Basic email format
 * - Total length <= 254 characters
 * - Local part <= 64 characters
 * - TLD >= 2 characters
 * - No consecutive dots
 * - No leading/trailing dots in local part
 */

/**
 * Validates an email address.
 * @param email The email to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  return validateEmail(email).valid
}

/**
 * Validates an email and returns details.
 * @param email The email to validate
 * @returns Object with valid status and optional error message
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  // Basic format check - must have @ and at least one . after @
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!basicRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }

  // Total length check (RFC 5321)
  if (email.length > 254) {
    return { valid: false, error: 'Email must not exceed 254 characters' }
  }

  const [localPart, domain] = email.split('@')

  // Local part length check (RFC 5321)
  if (localPart.length > 64) {
    return { valid: false, error: 'Local part must not exceed 64 characters' }
  }

  // No consecutive dots anywhere
  if (email.includes('..')) {
    return { valid: false, error: 'Consecutive dots not allowed' }
  }

  // No leading/trailing dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { valid: false, error: 'Local part must not start or end with a dot' }
  }

  // TLD must be at least 2 characters
  const tld = domain?.split('.').pop()
  if (!tld || tld.length < 2) {
    return { valid: false, error: 'TLD must be at least 2 characters' }
  }

  return { valid: true }
}
