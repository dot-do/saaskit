/**
 * CLI Debugging Module - Error Handling and Source Map Utilities
 *
 * Provides enhanced error handling with source map support, error formatting,
 * and debugging utilities for the SaaSKit CLI tools.
 *
 * @module cli/debugging
 *
 * @example
 * ```typescript
 * import { ErrorFormatter, SourceMapper, DebugSession } from './debugging'
 *
 * // Format TypeScript errors with context
 * const formatter = new ErrorFormatter()
 * const formatted = formatter.formatTypeError(error, sourceCode)
 *
 * // Map compiled errors back to source
 * const mapper = new SourceMapper()
 * mapper.addSourceMap('dist/app.js', sourceMapContent)
 * const originalLocation = mapper.mapToSource('dist/app.js', 10, 5)
 *
 * // Create a debug session
 * const session = new DebugSession()
 * session.setBreakpoint('app.tsx', 15)
 * session.onBreakpoint((location) => console.log('Hit:', location))
 * ```
 */

import type { TypeScriptError } from './types'
import { safeEval, UnsafeExpressionError } from './safe-eval'

/**
 * Source location with file, line, and column
 */
export interface SourceLocation {
  /** File path */
  file: string
  /** Line number (1-indexed) */
  line: number
  /** Column number (0-indexed) */
  column: number
  /** Optional function or scope name */
  name?: string
}

/**
 * Enhanced error information with context
 */
export interface EnhancedError {
  /** Original error message */
  message: string
  /** Error type/code */
  type: string
  /** Source location */
  location?: SourceLocation
  /** Source code snippet around the error */
  snippet?: {
    /** Lines of code before the error */
    before: string[]
    /** The error line */
    line: string
    /** Lines of code after the error */
    after: string[]
    /** Column range to highlight */
    highlight?: { start: number; end: number }
  }
  /** Possible fixes or suggestions */
  suggestions?: string[]
  /** Related errors or warnings */
  related?: EnhancedError[]
  /** Stack trace (if available) */
  stack?: string
}

/**
 * Source map entry for position mapping
 */
export interface SourceMapEntry {
  /** Generated line (in compiled output) */
  generatedLine: number
  /** Generated column */
  generatedColumn: number
  /** Original source file */
  sourceFile: string
  /** Original line */
  originalLine: number
  /** Original column */
  originalColumn: number
  /** Symbol name (if available) */
  name?: string
}

/**
 * Debug breakpoint definition
 */
export interface Breakpoint {
  /** Unique breakpoint ID */
  id: string
  /** File path */
  file: string
  /** Line number */
  line: number
  /** Optional condition expression */
  condition?: string
  /** Whether breakpoint is enabled */
  enabled: boolean
  /** Hit count */
  hitCount: number
}

/**
 * Generates a unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * ErrorFormatter - Formats errors with context and suggestions
 *
 * Takes raw TypeScript/runtime errors and formats them with source code
 * context, highlighting, and helpful suggestions.
 *
 * @example
 * ```typescript
 * const formatter = new ErrorFormatter()
 *
 * const enhanced = formatter.formatTypeError({
 *   file: 'app.tsx',
 *   line: 10,
 *   column: 5,
 *   message: "Type 'string' is not assignable to type 'number'"
 * }, sourceCode)
 *
 * console.log(formatter.toAnsiString(enhanced))
 * ```
 */
export class ErrorFormatter {
  /** Number of context lines to show before/after error */
  private contextLines: number

  /**
   * Create a new ErrorFormatter
   *
   * @param options - Configuration options
   * @param options.contextLines - Number of lines to show around error (default: 3)
   */
  constructor(options: { contextLines?: number } = {}) {
    this.contextLines = options.contextLines ?? 3
  }

  /**
   * Format a TypeScript error with source context
   *
   * @param error - TypeScript error to format
   * @param sourceCode - Source code content (optional, will read from file if not provided)
   * @returns Enhanced error with context
   */
  formatTypeError(error: TypeScriptError, sourceCode?: string): EnhancedError {
    const enhanced: EnhancedError = {
      message: error.message,
      type: this.categorizeError(error.message),
      location: {
        file: error.file,
        line: error.line,
        column: error.column ?? 0,
      },
      suggestions: error.suggestion ? [error.suggestion] : this.generateSuggestions(error),
    }

    // Add source snippet if we have the source
    if (sourceCode) {
      enhanced.snippet = this.extractSnippet(sourceCode, error.line, error.column)
    }

    return enhanced
  }

  /**
   * Format a runtime error
   *
   * @param error - JavaScript Error object
   * @returns Enhanced error with context
   */
  formatRuntimeError(error: Error): EnhancedError {
    const enhanced: EnhancedError = {
      message: error.message,
      type: error.name || 'Error',
      stack: error.stack,
    }

    // Try to extract location from stack
    const location = this.extractLocationFromStack(error.stack)
    if (location) {
      enhanced.location = location
    }

    return enhanced
  }

  /**
   * Categorize error by type based on message content
   */
  private categorizeError(message: string): string {
    if (message.includes('not assignable')) return 'type-mismatch'
    if (message.includes('has no exported member')) return 'import-error'
    if (message.includes('cannot find')) return 'not-found'
    if (message.includes('syntax')) return 'syntax-error'
    if (message.includes('is not a function')) return 'type-error'
    if (message.includes('undefined')) return 'undefined-error'
    return 'unknown'
  }

  /**
   * Generate suggestions based on error type
   */
  private generateSuggestions(error: TypeScriptError): string[] {
    const suggestions: string[] = []
    const msg = error.message.toLowerCase()

    if (msg.includes('not assignable')) {
      suggestions.push('Check the type definitions for both values')
      suggestions.push('Consider using type assertion if you are sure of the type')
    }

    if (msg.includes('has no exported member')) {
      suggestions.push('Check the spelling of the import')
      suggestions.push('Verify the export exists in the source module')
    }

    if (msg.includes('cannot find module')) {
      suggestions.push('Run npm install or pnpm install')
      suggestions.push('Check the module name spelling')
    }

    if (msg.includes('syntax')) {
      suggestions.push('Check for missing brackets, quotes, or semicolons')
      suggestions.push('Verify JSX elements are properly closed')
    }

    return suggestions
  }

  /**
   * Extract a code snippet around an error location
   */
  private extractSnippet(
    sourceCode: string,
    errorLine: number,
    errorColumn?: number
  ): EnhancedError['snippet'] {
    const lines = sourceCode.split('\n')
    const startLine = Math.max(0, errorLine - this.contextLines - 1)
    const endLine = Math.min(lines.length, errorLine + this.contextLines)

    const before = lines.slice(startLine, errorLine - 1)
    const line = lines[errorLine - 1] || ''
    const after = lines.slice(errorLine, endLine)

    const snippet: EnhancedError['snippet'] = {
      before,
      line,
      after,
    }

    if (errorColumn !== undefined) {
      // Try to find the end of the problematic token
      const remaining = line.slice(errorColumn)
      const tokenMatch = remaining.match(/^[\w$]+|^[^\w\s]+/)
      const tokenLength = tokenMatch ? tokenMatch[0].length : 1

      snippet.highlight = {
        start: errorColumn,
        end: errorColumn + tokenLength,
      }
    }

    return snippet
  }

  /**
   * Extract source location from stack trace
   */
  private extractLocationFromStack(stack?: string): SourceLocation | undefined {
    if (!stack) return undefined

    // Match patterns like "at function (file:line:column)" or "at file:line:column"
    const patterns = [
      /at\s+(?:\w+\s+)?\((.+):(\d+):(\d+)\)/,
      /at\s+(.+):(\d+):(\d+)/,
      /\((.+):(\d+):(\d+)\)/,
    ]

    for (const pattern of patterns) {
      const match = stack.match(pattern)
      if (match) {
        return {
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
        }
      }
    }

    return undefined
  }

  /**
   * Convert enhanced error to plain text format
   *
   * @param error - Enhanced error to format
   * @returns Multi-line string representation
   */
  toPlainText(error: EnhancedError): string {
    const lines: string[] = []

    // Header
    lines.push(`[${error.type}] ${error.message}`)

    // Location
    if (error.location) {
      lines.push(`  at ${error.location.file}:${error.location.line}:${error.location.column}`)
    }

    // Snippet
    if (error.snippet) {
      lines.push('')
      const startLine = error.location
        ? error.location.line - error.snippet.before.length
        : 1

      error.snippet.before.forEach((line, i) => {
        lines.push(`  ${String(startLine + i).padStart(4)} | ${line}`)
      })

      const errorLineNum = error.location?.line ?? startLine + error.snippet.before.length
      lines.push(`> ${String(errorLineNum).padStart(4)} | ${error.snippet.line}`)

      if (error.snippet.highlight) {
        const underline =
          ' '.repeat(error.snippet.highlight.start + 9) +
          '^'.repeat(error.snippet.highlight.end - error.snippet.highlight.start)
        lines.push(underline)
      }

      error.snippet.after.forEach((line, i) => {
        lines.push(`  ${String(errorLineNum + i + 1).padStart(4)} | ${line}`)
      })
    }

    // Suggestions
    if (error.suggestions && error.suggestions.length > 0) {
      lines.push('')
      lines.push('Suggestions:')
      error.suggestions.forEach((s) => {
        lines.push(`  - ${s}`)
      })
    }

    return lines.join('\n')
  }

  /**
   * Convert enhanced error to ANSI-colored string for terminal output
   *
   * @param error - Enhanced error to format
   * @returns ANSI-colored string
   */
  toAnsiString(error: EnhancedError): string {
    // ANSI color codes
    const RED = '\x1b[31m'
    const YELLOW = '\x1b[33m'
    const CYAN = '\x1b[36m'
    const DIM = '\x1b[2m'
    const BOLD = '\x1b[1m'
    const RESET = '\x1b[0m'

    const lines: string[] = []

    // Header
    lines.push(`${RED}${BOLD}[${error.type}]${RESET} ${error.message}`)

    // Location
    if (error.location) {
      lines.push(`${DIM}  at ${CYAN}${error.location.file}${RESET}${DIM}:${error.location.line}:${error.location.column}${RESET}`)
    }

    // Snippet
    if (error.snippet) {
      lines.push('')
      const startLine = error.location
        ? error.location.line - error.snippet.before.length
        : 1

      error.snippet.before.forEach((line, i) => {
        lines.push(`${DIM}  ${String(startLine + i).padStart(4)} |${RESET} ${line}`)
      })

      const errorLineNum = error.location?.line ?? startLine + error.snippet.before.length
      lines.push(`${RED}>${RESET} ${String(errorLineNum).padStart(4)} | ${error.snippet.line}`)

      if (error.snippet.highlight) {
        const underline =
          ' '.repeat(error.snippet.highlight.start + 9) +
          `${RED}${'~'.repeat(error.snippet.highlight.end - error.snippet.highlight.start)}${RESET}`
        lines.push(underline)
      }

      error.snippet.after.forEach((line, i) => {
        lines.push(`${DIM}  ${String(errorLineNum + i + 1).padStart(4)} |${RESET} ${line}`)
      })
    }

    // Suggestions
    if (error.suggestions && error.suggestions.length > 0) {
      lines.push('')
      lines.push(`${YELLOW}Suggestions:${RESET}`)
      error.suggestions.forEach((s) => {
        lines.push(`  ${DIM}-${RESET} ${s}`)
      })
    }

    return lines.join('\n')
  }
}

/**
 * SourceMapper - Maps compiled code positions back to original source
 *
 * Uses source maps to translate error locations from compiled JavaScript
 * back to original TypeScript/TSX source files.
 *
 * @example
 * ```typescript
 * const mapper = new SourceMapper()
 *
 * // Add a source map
 * mapper.addSourceMap('dist/app.js', sourceMapJSON)
 *
 * // Map a position
 * const original = mapper.mapToSource('dist/app.js', 15, 10)
 * console.log(original) // { file: 'src/app.tsx', line: 8, column: 5 }
 * ```
 */
export class SourceMapper {
  /** Stored source maps by generated file path */
  private maps: Map<string, SourceMapEntry[]> = new Map()

  /**
   * Add a source map for a generated file
   *
   * @param generatedFile - Path to the generated file
   * @param sourceMapContent - Source map content (JSON string or object)
   */
  addSourceMap(generatedFile: string, sourceMapContent: string | SourceMapData): void {
    const data = typeof sourceMapContent === 'string' ? JSON.parse(sourceMapContent) : sourceMapContent

    if (!data.mappings || !data.sources) {
      return
    }

    const entries = this.parseSourceMap(data)
    this.maps.set(generatedFile, entries)
  }

  /**
   * Map a position in generated code back to original source
   *
   * @param generatedFile - Generated file path
   * @param line - Line number in generated file (1-indexed)
   * @param column - Column number in generated file (0-indexed)
   * @returns Original source location, or undefined if not found
   */
  mapToSource(generatedFile: string, line: number, column: number): SourceLocation | undefined {
    const entries = this.maps.get(generatedFile)
    if (!entries) return undefined

    // Find the closest mapping
    let closest: SourceMapEntry | undefined

    for (const entry of entries) {
      if (entry.generatedLine === line) {
        if (!closest || Math.abs(entry.generatedColumn - column) < Math.abs(closest.generatedColumn - column)) {
          closest = entry
        }
      } else if (entry.generatedLine < line && (!closest || entry.generatedLine > closest.generatedLine)) {
        closest = entry
      }
    }

    if (!closest) return undefined

    return {
      file: closest.sourceFile,
      line: closest.originalLine,
      column: closest.originalColumn,
      name: closest.name,
    }
  }

  /**
   * Parse source map data into entries
   * (Simplified VLQ decoding - in production, use a proper source-map library)
   */
  private parseSourceMap(data: SourceMapData): SourceMapEntry[] {
    const entries: SourceMapEntry[] = []
    const sources = data.sources || []

    // Simplified: Create basic 1:1 mappings
    // In a real implementation, decode VLQ-encoded mappings string
    const mappingLines = (data.mappings || '').split(';')

    mappingLines.forEach((_, lineIndex) => {
      // Create a basic entry for each line
      if (sources.length > 0) {
        entries.push({
          generatedLine: lineIndex + 1,
          generatedColumn: 0,
          sourceFile: sources[0],
          originalLine: lineIndex + 1,
          originalColumn: 0,
        })
      }
    })

    return entries
  }

  /**
   * Check if a source map exists for a generated file
   */
  hasSourceMap(generatedFile: string): boolean {
    return this.maps.has(generatedFile)
  }

  /**
   * Remove a source map
   */
  removeSourceMap(generatedFile: string): void {
    this.maps.delete(generatedFile)
  }

  /**
   * Clear all source maps
   */
  clear(): void {
    this.maps.clear()
  }
}

/**
 * Source map data structure
 */
interface SourceMapData {
  version?: number
  sources?: string[]
  sourcesContent?: (string | null)[]
  mappings?: string
  names?: string[]
  sourceRoot?: string
}

/**
 * DebugSession - Interactive debugging session manager
 *
 * Manages breakpoints and provides debugging hooks for the dev server.
 * Note: This is a simplified implementation for development tooling,
 * not a full debugger.
 *
 * @example
 * ```typescript
 * const session = new DebugSession()
 *
 * // Set breakpoints
 * session.setBreakpoint('app.tsx', 15)
 * session.setBreakpoint('utils.ts', 30, 'x > 10')
 *
 * // Listen for hits
 * session.onBreakpoint((bp, context) => {
 *   console.log(`Hit breakpoint at ${bp.file}:${bp.line}`)
 * })
 *
 * // Programmatically trigger (for instrumentation)
 * session.hit('app.tsx', 15, { x: 5 })
 * ```
 */
export class DebugSession {
  /** All defined breakpoints */
  private breakpoints: Map<string, Breakpoint[]> = new Map()
  /** Breakpoint hit callbacks */
  private breakpointCallbacks: Array<(bp: Breakpoint, context?: Record<string, unknown>) => void> = []
  /** Whether session is active */
  private active: boolean = true

  /**
   * Set a breakpoint at a file location
   *
   * @param file - File path
   * @param line - Line number (1-indexed)
   * @param condition - Optional condition expression
   * @returns Breakpoint ID
   */
  setBreakpoint(file: string, line: number, condition?: string): string {
    const bp: Breakpoint = {
      id: generateId(),
      file,
      line,
      condition,
      enabled: true,
      hitCount: 0,
    }

    if (!this.breakpoints.has(file)) {
      this.breakpoints.set(file, [])
    }

    this.breakpoints.get(file)!.push(bp)
    return bp.id
  }

  /**
   * Remove a breakpoint by ID
   *
   * @param id - Breakpoint ID
   * @returns True if removed
   */
  removeBreakpoint(id: string): boolean {
    for (const [file, bps] of this.breakpoints) {
      const index = bps.findIndex((bp) => bp.id === id)
      if (index !== -1) {
        bps.splice(index, 1)
        if (bps.length === 0) {
          this.breakpoints.delete(file)
        }
        return true
      }
    }
    return false
  }

  /**
   * Enable or disable a breakpoint
   *
   * @param id - Breakpoint ID
   * @param enabled - Whether to enable
   */
  setBreakpointEnabled(id: string, enabled: boolean): void {
    for (const bps of this.breakpoints.values()) {
      const bp = bps.find((b) => b.id === id)
      if (bp) {
        bp.enabled = enabled
        return
      }
    }
  }

  /**
   * Get all breakpoints for a file
   *
   * @param file - File path
   * @returns Array of breakpoints
   */
  getBreakpoints(file?: string): Breakpoint[] {
    if (file) {
      return [...(this.breakpoints.get(file) || [])]
    }

    const all: Breakpoint[] = []
    for (const bps of this.breakpoints.values()) {
      all.push(...bps)
    }
    return all
  }

  /**
   * Register a callback for breakpoint hits
   *
   * @param callback - Function to call when breakpoint is hit
   */
  onBreakpoint(callback: (bp: Breakpoint, context?: Record<string, unknown>) => void): void {
    this.breakpointCallbacks.push(callback)
  }

  /**
   * Programmatically trigger a breakpoint hit (for instrumentation)
   *
   * @param file - File path
   * @param line - Line number
   * @param context - Optional execution context
   */
  hit(file: string, line: number, context?: Record<string, unknown>): void {
    if (!this.active) return

    const bps = this.breakpoints.get(file)
    if (!bps) return

    const bp = bps.find((b) => b.line === line && b.enabled)
    if (!bp) return

    // Check condition if present
    if (bp.condition && context) {
      try {
        const result = safeEval(bp.condition, context)
        if (!result) {
          return
        }
      } catch (error) {
        if (error instanceof UnsafeExpressionError) {
          console.warn(`[debug] Blocked unsafe breakpoint condition: ${bp.condition}`)
        }
        // Condition evaluation failed, skip
        return
      }
    }

    bp.hitCount++

    // Notify callbacks
    for (const callback of this.breakpointCallbacks) {
      callback(bp, context)
    }
  }

  /**
   * Pause the debug session (ignore hits)
   */
  pause(): void {
    this.active = false
  }

  /**
   * Resume the debug session
   */
  resume(): void {
    this.active = true
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.active
  }

  /**
   * Clear all breakpoints and reset
   */
  reset(): void {
    this.breakpoints.clear()
    this.breakpointCallbacks = []
    this.active = true
  }
}

/**
 * DiagnosticReporter - Aggregates and reports diagnostic information
 *
 * Collects errors, warnings, and performance data to provide a
 * comprehensive diagnostic report.
 *
 * @example
 * ```typescript
 * const reporter = new DiagnosticReporter()
 *
 * reporter.addError({ message: 'Type error', file: 'app.tsx', line: 10 })
 * reporter.addWarning({ message: 'Unused variable', file: 'utils.ts', line: 5 })
 * reporter.addPerformance('compile', 1200)
 *
 * const report = reporter.generateReport()
 * console.log(report.summary)
 * ```
 */
export class DiagnosticReporter {
  private errors: EnhancedError[] = []
  private warnings: EnhancedError[] = []
  private performance: Map<string, number[]> = new Map()

  /**
   * Add an error to the report
   */
  addError(error: TypeScriptError | EnhancedError): void {
    if ('type' in error) {
      this.errors.push(error)
    } else {
      const formatter = new ErrorFormatter()
      this.errors.push(formatter.formatTypeError(error))
    }
  }

  /**
   * Add a warning to the report
   */
  addWarning(warning: TypeScriptError | EnhancedError): void {
    if ('type' in warning) {
      this.warnings.push(warning)
    } else {
      const formatter = new ErrorFormatter()
      this.warnings.push(formatter.formatTypeError(warning))
    }
  }

  /**
   * Add a performance measurement
   */
  addPerformance(operation: string, durationMs: number): void {
    if (!this.performance.has(operation)) {
      this.performance.set(operation, [])
    }
    this.performance.get(operation)!.push(durationMs)
  }

  /**
   * Generate a diagnostic report
   */
  generateReport(): {
    summary: string
    errorCount: number
    warningCount: number
    errors: EnhancedError[]
    warnings: EnhancedError[]
    performance: Record<string, { count: number; avg: number; min: number; max: number }>
  } {
    const perfReport: Record<string, { count: number; avg: number; min: number; max: number }> = {}

    for (const [op, durations] of this.performance) {
      perfReport[op] = {
        count: durations.length,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
      }
    }

    const summary = [
      `Diagnostic Report`,
      `==================`,
      `Errors: ${this.errors.length}`,
      `Warnings: ${this.warnings.length}`,
      ``,
      `Performance:`,
      ...Object.entries(perfReport).map(
        ([op, stats]) => `  ${op}: avg ${stats.avg.toFixed(1)}ms (${stats.count} runs)`
      ),
    ].join('\n')

    return {
      summary,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: [...this.errors],
      warnings: [...this.warnings],
      performance: perfReport,
    }
  }

  /**
   * Clear all diagnostic data
   */
  clear(): void {
    this.errors = []
    this.warnings = []
    this.performance.clear()
  }
}

/**
 * Global error formatter instance
 */
export const errorFormatter = new ErrorFormatter()

/**
 * Global source mapper instance
 */
export const sourceMapper = new SourceMapper()

/**
 * Global debug session instance
 */
export const debugSession = new DebugSession()

/**
 * Global diagnostic reporter instance
 */
export const diagnosticReporter = new DiagnosticReporter()
