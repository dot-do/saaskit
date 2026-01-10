/**
 * CLI Logging Module - Developer Experience Utilities
 *
 * Provides structured logging, request/response tracing, and performance
 * profiling for the SaaSKit CLI tools.
 *
 * @module cli/logging
 *
 * @example
 * ```typescript
 * import { Logger, RequestLogger, PerformanceTracer } from './logging'
 *
 * // Basic structured logging
 * const logger = new Logger('dev-server')
 * logger.info('Server started', { port: 3000 })
 * logger.error('Failed to compile', { file: 'app.tsx', error })
 *
 * // Request/response logging
 * const reqLogger = new RequestLogger()
 * reqLogger.logRequest({ method: 'GET', url: '/api/users' })
 * reqLogger.logResponse({ status: 200, duration: 42 })
 *
 * // Performance tracing
 * const tracer = new PerformanceTracer()
 * tracer.start('build')
 * // ... do work ...
 * tracer.end('build') // logs duration
 * ```
 */

/**
 * Log levels for structured logging output
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured log entry with metadata
 */
export interface LogEntry {
  /** ISO timestamp of when the log was created */
  timestamp: string
  /** Log level (debug, info, warn, error) */
  level: LogLevel
  /** Logger namespace/source (e.g., 'dev-server', 'build') */
  namespace: string
  /** Human-readable message */
  message: string
  /** Additional structured data */
  data?: Record<string, unknown>
  /** Error details if applicable */
  error?: {
    name: string
    message: string
    stack?: string
  }
}

/**
 * HTTP request metadata for logging
 */
export interface RequestMeta {
  /** HTTP method (GET, POST, etc.) */
  method: string
  /** Request URL or path */
  url: string
  /** Optional request headers */
  headers?: Record<string, string>
  /** Optional request body (truncated for large payloads) */
  body?: unknown
  /** Request ID for correlation */
  requestId?: string
}

/**
 * HTTP response metadata for logging
 */
export interface ResponseMeta {
  /** HTTP status code */
  status: number
  /** Response time in milliseconds */
  duration: number
  /** Optional response headers */
  headers?: Record<string, string>
  /** Optional response body (truncated for large payloads) */
  body?: unknown
  /** Request ID for correlation */
  requestId?: string
}

/**
 * Performance trace entry for profiling
 */
export interface TraceEntry {
  /** Operation name (e.g., 'build', 'compile', 'deploy') */
  name: string
  /** Start timestamp in milliseconds */
  startTime: number
  /** End timestamp in milliseconds (if completed) */
  endTime?: number
  /** Duration in milliseconds (if completed) */
  duration?: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Event for the debugging timeline
 */
export interface TimelineEvent {
  /** Unique event ID */
  id: string
  /** ISO timestamp */
  timestamp: string
  /** Event type (request, response, error, build, etc.) */
  type: 'request' | 'response' | 'error' | 'build' | 'reload' | 'compile' | 'custom'
  /** Human-readable label */
  label: string
  /** Detailed event data */
  data?: Record<string, unknown>
  /** Duration in ms (for request/response pairs) */
  duration?: number
}

/**
 * Database query trace for debugging
 */
export interface QueryTrace {
  /** Query identifier */
  id: string
  /** SQL or query string */
  query: string
  /** Query parameters */
  params?: unknown[]
  /** Execution time in milliseconds */
  duration: number
  /** Number of rows affected/returned */
  rowCount?: number
  /** Timestamp of query execution */
  timestamp: string
  /** Source file and line (if available) */
  source?: {
    file: string
    line: number
  }
}

/**
 * AI call trace for debugging AI integrations
 */
export interface AICallTrace {
  /** Unique call ID */
  id: string
  /** AI provider (openai, anthropic, etc.) */
  provider: string
  /** Model used */
  model: string
  /** Input prompt or messages */
  input: unknown
  /** Output response */
  output?: unknown
  /** Token usage */
  tokens?: {
    prompt: number
    completion: number
    total: number
  }
  /** Duration in milliseconds */
  duration: number
  /** Timestamp of call */
  timestamp: string
  /** Error if failed */
  error?: string
}

/**
 * Generates a unique ID for tracing
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Logger - Structured logging utility for CLI tools
 *
 * Provides namespaced, level-aware logging with structured data support.
 * All logs include timestamps and can be filtered by level.
 *
 * @example
 * ```typescript
 * const logger = new Logger('build')
 * logger.info('Starting build')
 * logger.debug('Processing file', { file: 'app.tsx' })
 * logger.error('Build failed', { errors: [...] })
 * ```
 */
export class Logger {
  private namespace: string
  private minLevel: LogLevel
  private entries: LogEntry[] = []
  private maxEntries: number

  private static readonly LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  /**
   * Create a new Logger instance
   *
   * @param namespace - Source identifier for logs (e.g., 'dev-server', 'build')
   * @param options - Logger configuration options
   * @param options.minLevel - Minimum log level to record (default: 'info')
   * @param options.maxEntries - Maximum entries to keep in memory (default: 1000)
   */
  constructor(
    namespace: string,
    options: {
      minLevel?: LogLevel
      maxEntries?: number
    } = {}
  ) {
    this.namespace = namespace
    this.minLevel = options.minLevel ?? 'info'
    this.maxEntries = options.maxEntries ?? 1000
  }

  /**
   * Check if a log level should be recorded
   */
  private shouldLog(level: LogLevel): boolean {
    return Logger.LEVEL_ORDER[level] >= Logger.LEVEL_ORDER[this.minLevel]
  }

  /**
   * Create and store a log entry
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      namespace: this.namespace,
      message,
      data,
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    if (this.shouldLog(level)) {
      this.entries.push(entry)

      // Trim old entries if over limit
      if (this.entries.length > this.maxEntries) {
        this.entries = this.entries.slice(-this.maxEntries)
      }
    }

    return entry
  }

  /**
   * Log a debug message (lowest priority, most verbose)
   *
   * @param message - Log message
   * @param data - Optional structured data
   */
  debug(message: string, data?: Record<string, unknown>): LogEntry {
    return this.log('debug', message, data)
  }

  /**
   * Log an info message (general information)
   *
   * @param message - Log message
   * @param data - Optional structured data
   */
  info(message: string, data?: Record<string, unknown>): LogEntry {
    return this.log('info', message, data)
  }

  /**
   * Log a warning message (potential issues)
   *
   * @param message - Log message
   * @param data - Optional structured data
   */
  warn(message: string, data?: Record<string, unknown>): LogEntry {
    return this.log('warn', message, data)
  }

  /**
   * Log an error message (failures and exceptions)
   *
   * @param message - Log message
   * @param dataOrError - Optional structured data or Error object
   * @param error - Optional Error object (if data was provided)
   */
  error(message: string, dataOrError?: Record<string, unknown> | Error, error?: Error): LogEntry {
    if (dataOrError instanceof Error) {
      return this.log('error', message, undefined, dataOrError)
    }
    return this.log('error', message, dataOrError, error)
  }

  /**
   * Get all stored log entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries]
  }

  /**
   * Get entries filtered by level
   */
  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter((e) => e.level === level)
  }

  /**
   * Clear all stored entries
   */
  clear(): void {
    this.entries = []
  }

  /**
   * Change the minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level
  }

  /**
   * Create a child logger with a sub-namespace
   *
   * @param childNamespace - Sub-namespace to append
   * @returns New Logger instance with combined namespace
   */
  child(childNamespace: string): Logger {
    const child = new Logger(`${this.namespace}:${childNamespace}`, {
      minLevel: this.minLevel,
      maxEntries: this.maxEntries,
    })
    return child
  }
}

/**
 * RequestLogger - HTTP request/response logging utility
 *
 * Tracks request/response pairs with timing information and correlation IDs.
 * Useful for debugging API endpoints and network issues.
 *
 * @example
 * ```typescript
 * const reqLogger = new RequestLogger()
 *
 * // Log incoming request
 * const requestId = reqLogger.logRequest({
 *   method: 'POST',
 *   url: '/api/todos',
 *   body: { title: 'New todo' }
 * })
 *
 * // ... handle request ...
 *
 * // Log response
 * reqLogger.logResponse({
 *   status: 201,
 *   duration: 42,
 *   requestId,
 *   body: { id: '123', title: 'New todo' }
 * })
 * ```
 */
export class RequestLogger {
  private requests: Map<string, { meta: RequestMeta; startTime: number }> = new Map()
  private history: Array<{ request: RequestMeta; response?: ResponseMeta }> = []
  private maxHistory: number

  /**
   * Create a new RequestLogger
   *
   * @param options - Configuration options
   * @param options.maxHistory - Maximum request/response pairs to keep (default: 100)
   */
  constructor(options: { maxHistory?: number } = {}) {
    this.maxHistory = options.maxHistory ?? 100
  }

  /**
   * Log an incoming HTTP request
   *
   * @param meta - Request metadata
   * @returns Request ID for correlation with response
   */
  logRequest(meta: RequestMeta): string {
    const requestId = meta.requestId ?? generateId()
    this.requests.set(requestId, {
      meta: { ...meta, requestId },
      startTime: Date.now(),
    })
    return requestId
  }

  /**
   * Log an HTTP response
   *
   * @param meta - Response metadata (should include requestId from logRequest)
   */
  logResponse(meta: ResponseMeta): void {
    const requestId = meta.requestId
    if (!requestId) {
      // No correlation, store as standalone
      this.history.push({ request: { method: 'UNKNOWN', url: 'UNKNOWN' }, response: meta })
      return
    }

    const request = this.requests.get(requestId)
    if (request) {
      this.history.push({
        request: request.meta,
        response: {
          ...meta,
          duration: meta.duration ?? Date.now() - request.startTime,
        },
      })
      this.requests.delete(requestId)

      // Trim history
      if (this.history.length > this.maxHistory) {
        this.history = this.history.slice(-this.maxHistory)
      }
    }
  }

  /**
   * Get request/response history
   */
  getHistory(): Array<{ request: RequestMeta; response?: ResponseMeta }> {
    return [...this.history]
  }

  /**
   * Get pending requests (no response logged yet)
   */
  getPending(): RequestMeta[] {
    return Array.from(this.requests.values()).map((r) => r.meta)
  }

  /**
   * Clear all history and pending requests
   */
  clear(): void {
    this.requests.clear()
    this.history = []
  }
}

/**
 * PerformanceTracer - Timing and profiling utility
 *
 * Tracks operation durations for performance profiling and bottleneck identification.
 *
 * @example
 * ```typescript
 * const tracer = new PerformanceTracer()
 *
 * tracer.start('build')
 * tracer.start('compile')
 * // ... compile ...
 * tracer.end('compile')
 * tracer.start('bundle')
 * // ... bundle ...
 * tracer.end('bundle')
 * tracer.end('build')
 *
 * console.log(tracer.getSummary())
 * // { build: 1200, compile: 400, bundle: 700 }
 * ```
 */
export class PerformanceTracer {
  private traces: Map<string, TraceEntry> = new Map()
  private completed: TraceEntry[] = []
  private maxCompleted: number

  /**
   * Create a new PerformanceTracer
   *
   * @param options - Configuration options
   * @param options.maxCompleted - Maximum completed traces to keep (default: 500)
   */
  constructor(options: { maxCompleted?: number } = {}) {
    this.maxCompleted = options.maxCompleted ?? 500
  }

  /**
   * Start timing an operation
   *
   * @param name - Operation name (e.g., 'build', 'compile')
   * @param metadata - Optional additional metadata
   */
  start(name: string, metadata?: Record<string, unknown>): void {
    this.traces.set(name, {
      name,
      startTime: Date.now(),
      metadata,
    })
  }

  /**
   * End timing an operation
   *
   * @param name - Operation name (must match a previous start call)
   * @returns Duration in milliseconds, or undefined if not found
   */
  end(name: string): number | undefined {
    const trace = this.traces.get(name)
    if (!trace) return undefined

    const endTime = Date.now()
    const duration = endTime - trace.startTime

    const completedTrace: TraceEntry = {
      ...trace,
      endTime,
      duration,
    }

    this.completed.push(completedTrace)
    this.traces.delete(name)

    // Trim completed
    if (this.completed.length > this.maxCompleted) {
      this.completed = this.completed.slice(-this.maxCompleted)
    }

    return duration
  }

  /**
   * Get all completed traces
   */
  getCompleted(): TraceEntry[] {
    return [...this.completed]
  }

  /**
   * Get currently running traces
   */
  getRunning(): TraceEntry[] {
    return Array.from(this.traces.values())
  }

  /**
   * Get a summary of average durations by operation name
   */
  getSummary(): Record<string, { count: number; avgDuration: number; totalDuration: number }> {
    const summary: Record<string, { count: number; avgDuration: number; totalDuration: number }> = {}

    for (const trace of this.completed) {
      if (!summary[trace.name]) {
        summary[trace.name] = { count: 0, avgDuration: 0, totalDuration: 0 }
      }
      summary[trace.name].count++
      summary[trace.name].totalDuration += trace.duration ?? 0
      summary[trace.name].avgDuration = summary[trace.name].totalDuration / summary[trace.name].count
    }

    return summary
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces.clear()
    this.completed = []
  }
}

/**
 * EventTimeline - Chronological event tracking for debugging
 *
 * Records events in chronological order for understanding execution flow
 * and debugging complex sequences.
 *
 * @example
 * ```typescript
 * const timeline = new EventTimeline()
 *
 * timeline.add('request', 'GET /api/users')
 * timeline.add('build', 'Compiling app.tsx', { file: 'app.tsx' })
 * timeline.add('response', 'OK', { status: 200 })
 *
 * console.log(timeline.getEvents())
 * ```
 */
export class EventTimeline {
  private events: TimelineEvent[] = []
  private maxEvents: number

  /**
   * Create a new EventTimeline
   *
   * @param options - Configuration options
   * @param options.maxEvents - Maximum events to keep (default: 1000)
   */
  constructor(options: { maxEvents?: number } = {}) {
    this.maxEvents = options.maxEvents ?? 1000
  }

  /**
   * Add an event to the timeline
   *
   * @param type - Event type
   * @param label - Human-readable event label
   * @param data - Optional event data
   * @param duration - Optional duration in ms
   * @returns Event ID
   */
  add(type: TimelineEvent['type'], label: string, data?: Record<string, unknown>, duration?: number): string {
    const event: TimelineEvent = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type,
      label,
      data,
      duration,
    }

    this.events.push(event)

    // Trim events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    return event.id
  }

  /**
   * Get all events
   */
  getEvents(): TimelineEvent[] {
    return [...this.events]
  }

  /**
   * Get events filtered by type
   */
  getEventsByType(type: TimelineEvent['type']): TimelineEvent[] {
    return this.events.filter((e) => e.type === type)
  }

  /**
   * Get events within a time range
   */
  getEventsInRange(start: Date, end: Date): TimelineEvent[] {
    const startIso = start.toISOString()
    const endIso = end.toISOString()
    return this.events.filter((e) => e.timestamp >= startIso && e.timestamp <= endIso)
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = []
  }
}

/**
 * QueryTracer - Database query logging and analysis
 *
 * Tracks database queries for debugging, performance analysis,
 * and identifying N+1 query issues.
 *
 * @example
 * ```typescript
 * const queryTracer = new QueryTracer()
 *
 * queryTracer.trace('SELECT * FROM users WHERE id = ?', [123], 5, 1)
 *
 * // Check for issues
 * const duplicates = queryTracer.findDuplicates()
 * const slow = queryTracer.getSlowQueries(100)
 * ```
 */
export class QueryTracer {
  private queries: QueryTrace[] = []
  private maxQueries: number

  /**
   * Create a new QueryTracer
   *
   * @param options - Configuration options
   * @param options.maxQueries - Maximum queries to keep (default: 500)
   */
  constructor(options: { maxQueries?: number } = {}) {
    this.maxQueries = options.maxQueries ?? 500
  }

  /**
   * Record a database query
   *
   * @param query - SQL or query string
   * @param params - Query parameters
   * @param duration - Execution time in ms
   * @param rowCount - Number of rows affected/returned
   * @param source - Optional source location
   * @returns Query ID
   */
  trace(
    query: string,
    params?: unknown[],
    duration: number = 0,
    rowCount?: number,
    source?: { file: string; line: number }
  ): string {
    const trace: QueryTrace = {
      id: generateId(),
      query,
      params,
      duration,
      rowCount,
      timestamp: new Date().toISOString(),
      source,
    }

    this.queries.push(trace)

    // Trim queries
    if (this.queries.length > this.maxQueries) {
      this.queries = this.queries.slice(-this.maxQueries)
    }

    return trace.id
  }

  /**
   * Get all recorded queries
   */
  getQueries(): QueryTrace[] {
    return [...this.queries]
  }

  /**
   * Get queries slower than threshold
   *
   * @param thresholdMs - Minimum duration in milliseconds
   */
  getSlowQueries(thresholdMs: number): QueryTrace[] {
    return this.queries.filter((q) => q.duration >= thresholdMs)
  }

  /**
   * Find duplicate queries (same SQL pattern)
   */
  findDuplicates(): Map<string, QueryTrace[]> {
    const groups = new Map<string, QueryTrace[]>()

    for (const query of this.queries) {
      const key = query.query
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(query)
    }

    // Return only groups with duplicates
    const duplicates = new Map<string, QueryTrace[]>()
    for (const [key, queries] of groups) {
      if (queries.length > 1) {
        duplicates.set(key, queries)
      }
    }

    return duplicates
  }

  /**
   * Get query statistics
   */
  getStats(): {
    total: number
    totalDuration: number
    avgDuration: number
    slowCount: number
    duplicateCount: number
  } {
    const total = this.queries.length
    const totalDuration = this.queries.reduce((sum, q) => sum + q.duration, 0)
    const avgDuration = total > 0 ? totalDuration / total : 0
    const slowCount = this.getSlowQueries(100).length
    const duplicateCount = Array.from(this.findDuplicates().values()).reduce((sum, arr) => sum + arr.length - 1, 0)

    return {
      total,
      totalDuration,
      avgDuration,
      slowCount,
      duplicateCount,
    }
  }

  /**
   * Clear all queries
   */
  clear(): void {
    this.queries = []
  }
}

/**
 * AICallTracer - AI API call logging and analysis
 *
 * Tracks AI provider API calls for debugging, cost analysis,
 * and performance monitoring.
 *
 * @example
 * ```typescript
 * const aiTracer = new AICallTracer()
 *
 * const callId = aiTracer.startCall('openai', 'gpt-4', { messages: [...] })
 * // ... make API call ...
 * aiTracer.endCall(callId, response, { prompt: 100, completion: 50 })
 *
 * console.log(aiTracer.getCostEstimate())
 * ```
 */
export class AICallTracer {
  private calls: Map<string, AICallTrace> = new Map()
  private completed: AICallTrace[] = []
  private maxCompleted: number

  /**
   * Create a new AICallTracer
   *
   * @param options - Configuration options
   * @param options.maxCompleted - Maximum completed calls to keep (default: 200)
   */
  constructor(options: { maxCompleted?: number } = {}) {
    this.maxCompleted = options.maxCompleted ?? 200
  }

  /**
   * Start tracking an AI API call
   *
   * @param provider - AI provider (openai, anthropic, etc.)
   * @param model - Model identifier
   * @param input - Input prompt/messages
   * @returns Call ID for correlation
   */
  startCall(provider: string, model: string, input: unknown): string {
    const id = generateId()
    const call: AICallTrace = {
      id,
      provider,
      model,
      input,
      duration: 0,
      timestamp: new Date().toISOString(),
    }

    this.calls.set(id, call)
    return id
  }

  /**
   * Complete an AI API call
   *
   * @param id - Call ID from startCall
   * @param output - API response
   * @param tokens - Token usage
   */
  endCall(id: string, output: unknown, tokens?: { prompt: number; completion: number }): void {
    const call = this.calls.get(id)
    if (!call) return

    const startTime = new Date(call.timestamp).getTime()
    const duration = Date.now() - startTime

    const completedCall: AICallTrace = {
      ...call,
      output,
      duration,
      tokens: tokens
        ? {
            prompt: tokens.prompt,
            completion: tokens.completion,
            total: tokens.prompt + tokens.completion,
          }
        : undefined,
    }

    this.completed.push(completedCall)
    this.calls.delete(id)

    // Trim completed
    if (this.completed.length > this.maxCompleted) {
      this.completed = this.completed.slice(-this.maxCompleted)
    }
  }

  /**
   * Record a failed AI API call
   *
   * @param id - Call ID from startCall
   * @param error - Error message
   */
  failCall(id: string, error: string): void {
    const call = this.calls.get(id)
    if (!call) return

    const startTime = new Date(call.timestamp).getTime()
    const duration = Date.now() - startTime

    const failedCall: AICallTrace = {
      ...call,
      duration,
      error,
    }

    this.completed.push(failedCall)
    this.calls.delete(id)
  }

  /**
   * Get all completed calls
   */
  getCompleted(): AICallTrace[] {
    return [...this.completed]
  }

  /**
   * Get calls by provider
   */
  getCallsByProvider(provider: string): AICallTrace[] {
    return this.completed.filter((c) => c.provider === provider)
  }

  /**
   * Get total token usage
   */
  getTotalTokens(): { prompt: number; completion: number; total: number } {
    return this.completed.reduce(
      (acc, call) => {
        if (call.tokens) {
          acc.prompt += call.tokens.prompt
          acc.completion += call.tokens.completion
          acc.total += call.tokens.total
        }
        return acc
      },
      { prompt: 0, completion: 0, total: 0 }
    )
  }

  /**
   * Get failed calls
   */
  getFailedCalls(): AICallTrace[] {
    return this.completed.filter((c) => c.error !== undefined)
  }

  /**
   * Clear all calls
   */
  clear(): void {
    this.calls.clear()
    this.completed = []
  }
}

/**
 * Create a global logger instance for the CLI
 */
export const cliLogger = new Logger('saaskit-cli', { minLevel: 'debug' })

/**
 * Create a global request logger for dev server
 */
export const devServerRequestLogger = new RequestLogger()

/**
 * Create a global performance tracer
 */
export const performanceTracer = new PerformanceTracer()

/**
 * Create a global event timeline
 */
export const eventTimeline = new EventTimeline()

/**
 * Create a global query tracer
 */
export const queryTracer = new QueryTracer()

/**
 * Create a global AI call tracer
 */
export const aiCallTracer = new AICallTracer()
