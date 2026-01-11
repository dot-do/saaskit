/**
 * MCP Logging and Debugging Support
 *
 * Provides structured logging and debugging utilities for MCP servers.
 * Supports multiple output formats and log levels.
 */

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: unknown
  duration?: number
  requestId?: string
  traceId?: string
}

/**
 * Log output format
 */
export type LogFormat = 'json' | 'text' | 'pretty'

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level?: LogLevel
  /** Output format */
  format?: LogFormat
  /** Include timestamps */
  timestamps?: boolean
  /** Include request IDs */
  includeRequestId?: boolean
  /** Custom output handler */
  output?: (entry: LogEntry) => void
  /** Enable performance tracking */
  trackPerformance?: boolean
}

/**
 * Log level priorities (higher = more severe)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Logger class
 */
export class MCPLogger {
  private config: Required<LoggerConfig>
  private requestId?: string
  private traceId?: string
  private timers: Map<string, number> = new Map()

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level ?? 'info',
      format: config.format ?? 'json',
      timestamps: config.timestamps ?? true,
      includeRequestId: config.includeRequestId ?? true,
      output: config.output ?? this.defaultOutput.bind(this),
      trackPerformance: config.trackPerformance ?? true,
    }
  }

  /**
   * Set request context
   */
  setRequestContext(requestId?: string, traceId?: string): void {
    this.requestId = requestId
    this.traceId = traceId
  }

  /**
   * Clear request context
   */
  clearRequestContext(): void {
    this.requestId = undefined
    this.traceId = undefined
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level]
  }

  /**
   * Create a log entry
   */
  private createEntry(
    level: LogLevel,
    category: string,
    message: string,
    data?: unknown
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
    }

    if (data !== undefined) {
      entry.data = data
    }

    if (this.config.includeRequestId && this.requestId) {
      entry.requestId = this.requestId
    }

    if (this.traceId) {
      entry.traceId = this.traceId
    }

    return entry
  }

  /**
   * Default output handler
   */
  private defaultOutput(entry: LogEntry): void {
    const output = this.formatEntry(entry)

    switch (entry.level) {
      case 'error':
        console.error(output)
        break
      case 'warn':
        console.warn(output)
        break
      default:
        console.log(output)
    }
  }

  /**
   * Format a log entry
   */
  private formatEntry(entry: LogEntry): string {
    switch (this.config.format) {
      case 'json':
        return JSON.stringify(entry)

      case 'pretty':
        return this.formatPretty(entry)

      case 'text':
      default:
        return this.formatText(entry)
    }
  }

  /**
   * Format as plain text
   */
  private formatText(entry: LogEntry): string {
    const parts: string[] = []

    if (this.config.timestamps) {
      parts.push(`[${entry.timestamp}]`)
    }

    parts.push(`[${entry.level.toUpperCase()}]`)
    parts.push(`[${entry.category}]`)
    parts.push(entry.message)

    if (entry.duration !== undefined) {
      parts.push(`(${entry.duration}ms)`)
    }

    if (entry.data !== undefined) {
      parts.push(JSON.stringify(entry.data))
    }

    return parts.join(' ')
  }

  /**
   * Format as pretty output
   */
  private formatPretty(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    }
    const reset = '\x1b[0m'
    const dim = '\x1b[2m'
    const bold = '\x1b[1m'

    const color = levelColors[entry.level]
    const level = entry.level.toUpperCase().padEnd(5)

    let output = ''

    if (this.config.timestamps) {
      output += `${dim}${entry.timestamp}${reset} `
    }

    output += `${color}${bold}${level}${reset} `
    output += `${dim}[${entry.category}]${reset} `
    output += entry.message

    if (entry.duration !== undefined) {
      output += ` ${dim}(${entry.duration}ms)${reset}`
    }

    if (entry.data !== undefined) {
      output += '\n' + JSON.stringify(entry.data, null, 2)
    }

    return output
  }

  /**
   * Log a debug message
   */
  debug(category: string, message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      this.config.output(this.createEntry('debug', category, message, data))
    }
  }

  /**
   * Log an info message
   */
  info(category: string, message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      this.config.output(this.createEntry('info', category, message, data))
    }
  }

  /**
   * Log a warning message
   */
  warn(category: string, message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      this.config.output(this.createEntry('warn', category, message, data))
    }
  }

  /**
   * Log an error message
   */
  error(category: string, message: string, data?: unknown): void {
    if (this.shouldLog('error')) {
      this.config.output(this.createEntry('error', category, message, data))
    }
  }

  /**
   * Start a timer for performance tracking
   */
  startTimer(name: string): void {
    if (this.config.trackPerformance) {
      this.timers.set(name, performance.now())
    }
  }

  /**
   * End a timer and log the duration
   */
  endTimer(name: string, category: string, message?: string): number | undefined {
    if (!this.config.trackPerformance) return undefined

    const startTime = this.timers.get(name)
    if (startTime === undefined) {
      this.warn('performance', `Timer '${name}' was not started`)
      return undefined
    }

    const duration = Math.round(performance.now() - startTime)
    this.timers.delete(name)

    const entry = this.createEntry(
      'debug',
      category,
      message || `${name} completed`,
      undefined
    )
    entry.duration = duration

    if (this.shouldLog('debug')) {
      this.config.output(entry)
    }

    return duration
  }

  /**
   * Create a child logger with a category prefix
   */
  child(categoryPrefix: string): MCPLogger {
    const child = new MCPLogger(this.config)
    const originalOutput = this.config.output

    child.config.output = (entry: LogEntry) => {
      entry.category = `${categoryPrefix}:${entry.category}`
      originalOutput(entry)
    }

    return child
  }
}

/**
 * Debug context for MCP operations
 */
export interface DebugContext {
  /** Operation being performed */
  operation: string
  /** Start timestamp */
  startTime: number
  /** Input data */
  input?: unknown
  /** Output data */
  output?: unknown
  /** Error if any */
  error?: Error
  /** Sub-operations */
  children: DebugContext[]
  /** Duration in ms */
  duration?: number
}

/**
 * Debug tracer for tracking operation flow
 */
export class DebugTracer {
  private root: DebugContext | null = null
  private stack: DebugContext[] = []
  private enabled: boolean

  constructor(enabled = true) {
    this.enabled = enabled
  }

  /**
   * Start tracing an operation
   */
  start(operation: string, input?: unknown): void {
    if (!this.enabled) return

    const context: DebugContext = {
      operation,
      startTime: performance.now(),
      input,
      children: [],
    }

    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1].children.push(context)
    } else {
      this.root = context
    }

    this.stack.push(context)
  }

  /**
   * End the current operation
   */
  end(output?: unknown, error?: Error): void {
    if (!this.enabled || this.stack.length === 0) return

    const context = this.stack.pop()!
    context.duration = Math.round(performance.now() - context.startTime)
    context.output = output
    context.error = error
  }

  /**
   * Get the trace as a formatted string
   */
  format(indent = 0): string {
    if (!this.root) return 'No trace recorded'
    return this.formatContext(this.root, indent)
  }

  private formatContext(ctx: DebugContext, indent: number): string {
    const prefix = '  '.repeat(indent)
    let output = `${prefix}${ctx.operation}`

    if (ctx.duration !== undefined) {
      output += ` (${ctx.duration}ms)`
    }

    if (ctx.error) {
      output += ` [ERROR: ${ctx.error.message}]`
    }

    output += '\n'

    if (ctx.input !== undefined) {
      output += `${prefix}  Input: ${JSON.stringify(ctx.input)}\n`
    }

    if (ctx.output !== undefined) {
      output += `${prefix}  Output: ${JSON.stringify(ctx.output)}\n`
    }

    for (const child of ctx.children) {
      output += this.formatContext(child, indent + 1)
    }

    return output
  }

  /**
   * Get the trace as JSON
   */
  toJSON(): DebugContext | null {
    return this.root
  }

  /**
   * Clear the trace
   */
  clear(): void {
    this.root = null
    this.stack = []
  }
}

/**
 * Create a logger instance
 */
export function createLogger(config?: LoggerConfig): MCPLogger {
  return new MCPLogger(config)
}

/**
 * Create a debug tracer instance
 */
export function createTracer(enabled?: boolean): DebugTracer {
  return new DebugTracer(enabled)
}

/**
 * Default logger instance
 */
export const defaultLogger = createLogger()

/**
 * Logging categories for MCP operations
 */
export const LogCategories = {
  TRANSPORT: 'transport',
  TOOLS: 'tools',
  RESOURCES: 'resources',
  PROMPTS: 'prompts',
  SAMPLING: 'sampling',
  VALIDATION: 'validation',
  LIFECYCLE: 'lifecycle',
} as const

/**
 * Wrap an async function with logging
 */
export function withLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  logger: MCPLogger,
  category: string,
  operation: string,
  fn: T
): T {
  return (async (...args: unknown[]) => {
    logger.debug(category, `${operation} started`, { args })
    logger.startTimer(operation)

    try {
      const result = await fn(...args)
      const duration = logger.endTimer(operation, category, `${operation} completed`)
      logger.debug(category, `${operation} succeeded`, { result, duration })
      return result
    } catch (error) {
      logger.endTimer(operation, category)
      logger.error(category, `${operation} failed`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }) as T
}
