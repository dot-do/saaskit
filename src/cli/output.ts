/**
 * CLI Output Module - Formatters and Display Utilities
 *
 * Provides output formatting for different formats (table, json, yaml),
 * color output, progress indicators, and quiet mode for scripting.
 *
 * @module cli/output
 *
 * @example
 * ```typescript
 * import { Output, TableFormatter, ProgressBar, Spinner } from './output'
 *
 * // Create output with format preference
 * const output = new Output({ format: 'table', color: true })
 *
 * // Display data in table format
 * output.table([
 *   { name: 'project-1', status: 'running', port: 3000 },
 *   { name: 'project-2', status: 'stopped', port: 3001 },
 * ])
 *
 * // Show progress bar
 * const progress = new ProgressBar({ total: 100, label: 'Downloading' })
 * progress.update(50)
 * progress.complete()
 *
 * // Show spinner for async operations
 * const spinner = new Spinner('Deploying...')
 * spinner.start()
 * // ... do work ...
 * spinner.succeed('Deployed!')
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Output format options
 */
export type OutputFormat = 'table' | 'json' | 'yaml' | 'plain'

/**
 * Output configuration
 */
export interface OutputConfig {
  /** Output format (default: 'table') */
  format?: OutputFormat
  /** Enable color output (default: true, respects NO_COLOR env) */
  color?: boolean
  /** Quiet mode - suppress non-essential output (default: false) */
  quiet?: boolean
  /** Write function (default: console.log) */
  write?: (message: string) => void
  /** Write error function (default: console.error) */
  writeError?: (message: string) => void
}

/**
 * Table column definition
 */
export interface TableColumn {
  /** Column key in data */
  key: string
  /** Column header label */
  label?: string
  /** Column width (auto if not specified) */
  width?: number
  /** Text alignment */
  align?: 'left' | 'right' | 'center'
  /** Format function */
  format?: (value: unknown) => string
}

/**
 * Progress bar options
 */
export interface ProgressBarOptions {
  /** Total value */
  total: number
  /** Current value */
  current?: number
  /** Progress bar label */
  label?: string
  /** Bar width in characters */
  width?: number
  /** Show percentage */
  showPercent?: boolean
  /** Show ETA */
  showEta?: boolean
  /** Complete character */
  complete?: string
  /** Incomplete character */
  incomplete?: string
}

/**
 * Spinner options
 */
export interface SpinnerOptions {
  /** Spinner frames */
  frames?: string[]
  /** Frame interval in ms */
  interval?: number
  /** Color for the spinner */
  color?: keyof typeof Colors
}

// ============================================================================
// ANSI Colors
// ============================================================================

/**
 * ANSI color codes
 */
export const Colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',
  hidden: '\x1b[8m',
  strikethrough: '\x1b[9m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const

/**
 * Check if colors should be used
 */
export function shouldUseColor(): boolean {
  // Respect NO_COLOR environment variable
  if (process.env.NO_COLOR !== undefined) {
    return false
  }

  // Check if stdout is a TTY
  if (process.stdout && !process.stdout.isTTY) {
    return false
  }

  // Check FORCE_COLOR
  if (process.env.FORCE_COLOR !== undefined) {
    return process.env.FORCE_COLOR !== '0'
  }

  return true
}

/**
 * Color utility functions
 */
export const color = {
  enabled: shouldUseColor(),

  /**
   * Apply color if enabled
   */
  apply: (text: string, ...codes: string[]): string => {
    if (!color.enabled) return text
    return `${codes.join('')}${text}${Colors.reset}`
  },

  // Convenience methods
  bold: (text: string): string => color.apply(text, Colors.bold),
  dim: (text: string): string => color.apply(text, Colors.dim),
  italic: (text: string): string => color.apply(text, Colors.italic),
  underline: (text: string): string => color.apply(text, Colors.underline),

  red: (text: string): string => color.apply(text, Colors.red),
  green: (text: string): string => color.apply(text, Colors.green),
  yellow: (text: string): string => color.apply(text, Colors.yellow),
  blue: (text: string): string => color.apply(text, Colors.blue),
  magenta: (text: string): string => color.apply(text, Colors.magenta),
  cyan: (text: string): string => color.apply(text, Colors.cyan),
  white: (text: string): string => color.apply(text, Colors.white),
  gray: (text: string): string => color.apply(text, Colors.gray),

  // Semantic colors
  success: (text: string): string => color.green(text),
  error: (text: string): string => color.red(text),
  warning: (text: string): string => color.yellow(text),
  info: (text: string): string => color.cyan(text),
  muted: (text: string): string => color.dim(text),

  // Combined styles
  boldRed: (text: string): string => color.apply(text, Colors.bold, Colors.red),
  boldGreen: (text: string): string => color.apply(text, Colors.bold, Colors.green),
  boldYellow: (text: string): string => color.apply(text, Colors.bold, Colors.yellow),
  boldBlue: (text: string): string => color.apply(text, Colors.bold, Colors.blue),
  boldCyan: (text: string): string => color.apply(text, Colors.bold, Colors.cyan),
}

// ============================================================================
// Table Formatter
// ============================================================================

/**
 * TableFormatter - Format data as ASCII tables
 */
export class TableFormatter {
  private columns: TableColumn[]
  private useColor: boolean

  constructor(columns?: TableColumn[], useColor = true) {
    this.columns = columns || []
    this.useColor = useColor && color.enabled
  }

  /**
   * Format data as a table string
   */
  format(data: Record<string, unknown>[]): string {
    if (data.length === 0) {
      return this.useColor ? color.muted('No data') : 'No data'
    }

    // Auto-detect columns if not provided
    const columns = this.columns.length > 0
      ? this.columns
      : this.detectColumns(data)

    // Calculate column widths
    const widths = this.calculateWidths(data, columns)

    // Build table
    const lines: string[] = []

    // Header
    const headerCells = columns.map((col, i) =>
      this.padCell(col.label || col.key, widths[i], col.align || 'left')
    )
    const headerLine = this.useColor
      ? color.bold(headerCells.join('  '))
      : headerCells.join('  ')
    lines.push(headerLine)

    // Separator
    const separator = widths.map(w => '─'.repeat(w)).join('──')
    lines.push(this.useColor ? color.dim(separator) : separator)

    // Data rows
    for (const row of data) {
      const cells = columns.map((col, i) => {
        const value = row[col.key]
        const formatted = col.format ? col.format(value) : String(value ?? '')
        return this.padCell(formatted, widths[i], col.align || 'left')
      })
      lines.push(cells.join('  '))
    }

    return lines.join('\n')
  }

  /**
   * Detect columns from data
   */
  private detectColumns(data: Record<string, unknown>[]): TableColumn[] {
    const keys = new Set<string>()
    for (const row of data) {
      for (const key of Object.keys(row)) {
        keys.add(key)
      }
    }
    return Array.from(keys).map(key => ({ key, label: key }))
  }

  /**
   * Calculate column widths
   */
  private calculateWidths(data: Record<string, unknown>[], columns: TableColumn[]): number[] {
    return columns.map(col => {
      // Start with header width
      let maxWidth = (col.label || col.key).length

      // Check data widths
      for (const row of data) {
        const value = row[col.key]
        const formatted = col.format ? col.format(value) : String(value ?? '')
        // Strip ANSI codes for width calculation
        const stripped = formatted.replace(/\x1b\[[0-9;]*m/g, '')
        maxWidth = Math.max(maxWidth, stripped.length)
      }

      // Apply fixed width if specified
      if (col.width) {
        return Math.min(col.width, maxWidth)
      }

      return maxWidth
    })
  }

  /**
   * Pad cell content
   */
  private padCell(content: string, width: number, align: 'left' | 'right' | 'center'): string {
    // Strip ANSI for length calculation
    const stripped = content.replace(/\x1b\[[0-9;]*m/g, '')
    const padding = width - stripped.length

    if (padding <= 0) {
      return content.slice(0, width)
    }

    switch (align) {
      case 'right':
        return ' '.repeat(padding) + content
      case 'center':
        const left = Math.floor(padding / 2)
        const right = padding - left
        return ' '.repeat(left) + content + ' '.repeat(right)
      default:
        return content + ' '.repeat(padding)
    }
  }
}

// ============================================================================
// JSON/YAML Formatters
// ============================================================================

/**
 * Format data as JSON
 */
export function formatJson(data: unknown, pretty = true): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
}

/**
 * Format data as YAML (simple implementation)
 */
export function formatYaml(data: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent)

  if (data === null || data === undefined) {
    return 'null'
  }

  if (typeof data === 'boolean' || typeof data === 'number') {
    return String(data)
  }

  if (typeof data === 'string') {
    // Quote strings that need it
    if (data.includes('\n') || data.includes(':') || data.includes('#')) {
      return `"${data.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    }
    return data
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]'
    return data
      .map(item => `${spaces}- ${formatYaml(item, indent + 1).trimStart()}`)
      .join('\n')
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    return entries
      .map(([key, value]) => {
        const formattedValue = formatYaml(value, indent + 1)
        if (typeof value === 'object' && value !== null) {
          return `${spaces}${key}:\n${formattedValue}`
        }
        return `${spaces}${key}: ${formattedValue}`
      })
      .join('\n')
  }

  return String(data)
}

// ============================================================================
// Progress Bar
// ============================================================================

/**
 * ProgressBar - ASCII progress bar with ETA
 */
export class ProgressBar {
  private total: number
  private current: number
  private label: string
  private width: number
  private showPercent: boolean
  private showEta: boolean
  private completeChar: string
  private incompleteChar: string
  private startTime: number
  private lastRender: string = ''

  constructor(options: ProgressBarOptions) {
    this.total = options.total
    this.current = options.current ?? 0
    this.label = options.label ?? ''
    this.width = options.width ?? 30
    this.showPercent = options.showPercent ?? true
    this.showEta = options.showEta ?? true
    this.completeChar = options.complete ?? '█'
    this.incompleteChar = options.incomplete ?? '░'
    this.startTime = Date.now()
  }

  /**
   * Update progress
   */
  update(current: number, label?: string): void {
    this.current = Math.min(current, this.total)
    if (label !== undefined) {
      this.label = label
    }
    this.render()
  }

  /**
   * Increment progress
   */
  increment(amount = 1): void {
    this.update(this.current + amount)
  }

  /**
   * Complete the progress bar
   */
  complete(label?: string): void {
    this.update(this.total, label)
    process.stdout.write('\n')
  }

  /**
   * Render the progress bar
   */
  private render(): void {
    const percent = this.total > 0 ? this.current / this.total : 0
    const filled = Math.round(this.width * percent)
    const empty = this.width - filled

    const bar = this.completeChar.repeat(filled) + this.incompleteChar.repeat(empty)

    let line = ''

    if (this.label) {
      line += `${this.label} `
    }

    line += color.enabled
      ? `[${color.green(bar.slice(0, filled))}${color.dim(bar.slice(filled))}]`
      : `[${bar}]`

    if (this.showPercent) {
      line += ` ${Math.round(percent * 100).toString().padStart(3)}%`
    }

    if (this.showEta && this.current > 0 && this.current < this.total) {
      const elapsed = (Date.now() - this.startTime) / 1000
      const rate = this.current / elapsed
      const remaining = (this.total - this.current) / rate
      line += ` (${this.formatTime(remaining)} remaining)`
    }

    // Clear previous line and write new one
    const clearLength = Math.max(this.lastRender.length, line.length)
    process.stdout.write(`\r${' '.repeat(clearLength)}\r${line}`)
    this.lastRender = line
  }

  /**
   * Format time in human-readable format
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    }
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60)
      const secs = Math.round(seconds % 60)
      return `${mins}m ${secs}s`
    }
    const hours = Math.floor(seconds / 3600)
    const mins = Math.round((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }
}

// ============================================================================
// Spinner
// ============================================================================

/**
 * Default spinner frames
 */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/**
 * Spinner - Animated loading indicator
 */
export class Spinner {
  private text: string
  private frames: string[]
  private interval: number
  private colorCode: string
  private frameIndex: number = 0
  private timer: ReturnType<typeof setInterval> | null = null
  private isSpinning: boolean = false

  constructor(text: string, options: SpinnerOptions = {}) {
    this.text = text
    this.frames = options.frames ?? SPINNER_FRAMES
    this.interval = options.interval ?? 80
    this.colorCode = options.color ? Colors[options.color] : Colors.cyan
  }

  /**
   * Start the spinner
   */
  start(): Spinner {
    if (this.isSpinning) return this

    this.isSpinning = true
    this.render()

    this.timer = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length
      this.render()
    }, this.interval)

    return this
  }

  /**
   * Stop the spinner
   */
  stop(): Spinner {
    if (!this.isSpinning) return this

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.isSpinning = false

    // Clear the line
    process.stdout.write('\r\x1b[K')

    return this
  }

  /**
   * Stop with success message
   */
  succeed(text?: string): void {
    this.stop()
    const symbol = color.enabled ? color.green('✔') : '✔'
    console.log(`${symbol} ${text ?? this.text}`)
  }

  /**
   * Stop with failure message
   */
  fail(text?: string): void {
    this.stop()
    const symbol = color.enabled ? color.red('✖') : '✖'
    console.log(`${symbol} ${text ?? this.text}`)
  }

  /**
   * Stop with warning message
   */
  warn(text?: string): void {
    this.stop()
    const symbol = color.enabled ? color.yellow('⚠') : '⚠'
    console.log(`${symbol} ${text ?? this.text}`)
  }

  /**
   * Stop with info message
   */
  info(text?: string): void {
    this.stop()
    const symbol = color.enabled ? color.blue('ℹ') : 'ℹ'
    console.log(`${symbol} ${text ?? this.text}`)
  }

  /**
   * Update spinner text
   */
  update(text: string): Spinner {
    this.text = text
    if (this.isSpinning) {
      this.render()
    }
    return this
  }

  /**
   * Render current frame
   */
  private render(): void {
    const frame = this.frames[this.frameIndex]
    const coloredFrame = color.enabled
      ? `${this.colorCode}${frame}${Colors.reset}`
      : frame
    process.stdout.write(`\r\x1b[K${coloredFrame} ${this.text}`)
  }
}

// ============================================================================
// Output Class
// ============================================================================

/**
 * Output - Unified output handler with format and quiet mode support
 */
export class Output {
  private format: OutputFormat
  private useColor: boolean
  private quiet: boolean
  private write: (message: string) => void
  private writeError: (message: string) => void

  constructor(config: OutputConfig = {}) {
    this.format = config.format ?? 'table'
    this.useColor = config.color ?? shouldUseColor()
    this.quiet = config.quiet ?? false
    this.write = config.write ?? console.log.bind(console)
    this.writeError = config.writeError ?? console.error.bind(console)

    // Update global color setting
    color.enabled = this.useColor
  }

  /**
   * Output data in configured format
   */
  data(data: unknown): void {
    if (this.quiet) return

    switch (this.format) {
      case 'json':
        this.write(formatJson(data))
        break
      case 'yaml':
        this.write(formatYaml(data))
        break
      case 'plain':
        this.write(String(data))
        break
      case 'table':
      default:
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
          const formatter = new TableFormatter(undefined, this.useColor)
          this.write(formatter.format(data as Record<string, unknown>[]))
        } else {
          this.write(formatJson(data, true))
        }
    }
  }

  /**
   * Output a table
   */
  table(data: Record<string, unknown>[], columns?: TableColumn[]): void {
    if (this.quiet) return

    if (this.format === 'json') {
      this.write(formatJson(data))
      return
    }

    if (this.format === 'yaml') {
      this.write(formatYaml(data))
      return
    }

    const formatter = new TableFormatter(columns, this.useColor)
    this.write(formatter.format(data))
  }

  /**
   * Output a success message
   */
  success(message: string): void {
    if (this.quiet) return
    const symbol = this.useColor ? color.green('✔') : '✔'
    this.write(`${symbol} ${message}`)
  }

  /**
   * Output an error message
   */
  error(message: string): void {
    // Errors are never suppressed in quiet mode
    const symbol = this.useColor ? color.red('✖') : '✖'
    this.writeError(`${symbol} ${message}`)
  }

  /**
   * Output a warning message
   */
  warning(message: string): void {
    if (this.quiet) return
    const symbol = this.useColor ? color.yellow('⚠') : '⚠'
    this.write(`${symbol} ${message}`)
  }

  /**
   * Output an info message
   */
  info(message: string): void {
    if (this.quiet) return
    const symbol = this.useColor ? color.blue('ℹ') : 'ℹ'
    this.write(`${symbol} ${message}`)
  }

  /**
   * Output a plain message (respects quiet mode)
   */
  log(message: string): void {
    if (this.quiet) return
    this.write(message)
  }

  /**
   * Output a debug message (only in verbose mode)
   */
  debug(message: string): void {
    if (this.quiet) return
    if (!process.env.DEBUG) return
    const prefix = this.useColor ? color.dim('[debug]') : '[debug]'
    this.write(`${prefix} ${message}`)
  }

  /**
   * Create a progress bar
   */
  progress(options: ProgressBarOptions): ProgressBar {
    return new ProgressBar(options)
  }

  /**
   * Create a spinner
   */
  spinner(text: string, options?: SpinnerOptions): Spinner {
    return new Spinner(text, options)
  }

  /**
   * Output with pagination
   */
  paginate<T>(items: T[], pageSize = 10, page = 1): { items: T[]; page: number; totalPages: number; hasMore: boolean } {
    const totalPages = Math.ceil(items.length / pageSize)
    const currentPage = Math.max(1, Math.min(page, totalPages))
    const start = (currentPage - 1) * pageSize
    const pageItems = items.slice(start, start + pageSize)

    return {
      items: pageItems,
      page: currentPage,
      totalPages,
      hasMore: currentPage < totalPages,
    }
  }

  /**
   * Output a blank line
   */
  newline(): void {
    if (this.quiet) return
    this.write('')
  }

  /**
   * Output a horizontal rule
   */
  hr(char = '─', width = 40): void {
    if (this.quiet) return
    const line = char.repeat(width)
    this.write(this.useColor ? color.dim(line) : line)
  }

  /**
   * Output a header
   */
  header(text: string): void {
    if (this.quiet) return
    this.write(this.useColor ? color.bold(text) : text)
    this.hr()
  }

  /**
   * Output key-value pairs
   */
  keyValue(pairs: Record<string, unknown>): void {
    if (this.quiet) return

    const maxKeyLength = Math.max(...Object.keys(pairs).map(k => k.length))

    for (const [key, value] of Object.entries(pairs)) {
      const paddedKey = key.padEnd(maxKeyLength)
      const formattedKey = this.useColor ? color.dim(paddedKey) : paddedKey
      this.write(`  ${formattedKey}  ${value}`)
    }
  }
}

// ============================================================================
// Default instance
// ============================================================================

/**
 * Default output instance
 */
export const output = new Output()

// ============================================================================
// Exports
// ============================================================================

export default Output
