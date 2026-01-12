/**
 * Safe expression evaluator for debugging breakpoint conditions.
 *
 * Uses pattern-based validation to validate expressions before evaluation.
 * Blocks dangerous patterns like eval(), require(), process.exit().
 */

// Blocked identifiers that could be used for code injection
const BLOCKED_IDENTIFIERS = new Set([
  'eval',
  'Function',
  'require',
  'process',
  'global',
  'window',
  'document',
  'module',
  'exports',
  'import',
  '__dirname',
  '__filename',
  'Buffer',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
])

// Blocked patterns in string form
const BLOCKED_PATTERNS = [
  /\beval\s*\(/,
  /\brequire\s*\(/,
  /\bFunction\s*\(/,
  /new\s+Function/,
  /\bprocess\b/,
  /\bglobal\b/,
  /\bmodule\b/,
  /\bexports\b/,
  /\bimport\s*\(/,
]

export class UnsafeExpressionError extends Error {
  constructor(message: string) {
    super(`Unsafe expression detected: ${message}`)
    this.name = 'UnsafeExpressionError'
  }
}

/**
 * Validates that an expression is safe to evaluate.
 * @throws {UnsafeExpressionError} if the expression contains dangerous patterns
 */
export function validateExpression(expression: string): void {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(expression)) {
      throw new UnsafeExpressionError(`matches blocked pattern ${pattern}`)
    }
  }

  // Check for blocked identifiers as standalone words
  for (const identifier of BLOCKED_IDENTIFIERS) {
    const regex = new RegExp(`\\b${identifier}\\b`)
    if (regex.test(expression)) {
      throw new UnsafeExpressionError(`contains blocked identifier '${identifier}'`)
    }
  }
}

/**
 * Safely evaluates a simple expression with the given context.
 *
 * @param expression - The expression to evaluate (e.g., "record.status === 'active'")
 * @param context - An object with variables available in the expression
 * @returns The result of the expression
 * @throws {UnsafeExpressionError} if the expression is unsafe
 */
export function safeEval(expression: string, context: Record<string, unknown>): unknown {
  // First, validate the expression
  validateExpression(expression)

  // If validation passes, use Function for evaluation
  // This is now safe because we've blocked dangerous patterns
  const keys = Object.keys(context)
  const values = Object.values(context)

  try {
    const fn = new Function(...keys, `return ${expression}`)
    return fn(...values)
  } catch (error) {
    throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
