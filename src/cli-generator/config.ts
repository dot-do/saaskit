/**
 * CLI Config Management Generators
 *
 * Generates configuration management commands and utilities for the CLI.
 *
 * @module cli-generator/config
 */

import type { CLIConfig } from './types'

/**
 * Generate the config module (runtime config management)
 */
export function generateConfigModule(config: CLIConfig): string {
  const configName = config.cliName.replace(/-/g, '_').toUpperCase()
  const envPrefix = configName

  return `/**
 * Configuration Management
 *
 * Handles reading/writing CLI configuration including:
 * - API credentials
 * - Default settings
 * - User preferences
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// Configuration directory
const CONFIG_DIR = join(homedir(), '.${config.cliName}')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json')

/**
 * CLI Configuration interface
 */
export interface CLIConfigData {
  /** API key for authentication */
  apiKey?: string
  /** Base URL for API requests */
  baseUrl: string
  /** Default output format */
  outputFormat: 'table' | 'json' | 'yaml' | 'csv'
  /** Enable color output */
  color: boolean
  /** Default page limit for list commands */
  limit: number
  /** Custom headers to include in requests */
  headers?: Record<string, string>
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CLIConfigData = {
  baseUrl: '${config.baseUrl || 'https://api.example.com'}',
  outputFormat: 'table',
  color: true,
  limit: 20,
}

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  }
}

/**
 * Load configuration from file
 */
export function loadConfig(): Partial<CLIConfigData> {
  ensureConfigDir()

  let config: Partial<CLIConfigData> = {}

  // Load main config
  if (existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
    } catch {
      // Invalid config file, use defaults
    }
  }

  // Load credentials (separate file for security)
  if (existsSync(CREDENTIALS_FILE)) {
    try {
      const creds = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8'))
      config.apiKey = creds.apiKey
    } catch {
      // Invalid credentials file
    }
  }

  // Check environment variables
  if (process.env.${envPrefix}_API_KEY) {
    config.apiKey = process.env.${envPrefix}_API_KEY
  }
  if (process.env.${envPrefix}_BASE_URL) {
    config.baseUrl = process.env.${envPrefix}_BASE_URL
  }

  return config
}

/**
 * Get merged configuration with defaults
 */
export function getConfig(): CLIConfigData {
  const loaded = loadConfig()
  return { ...DEFAULT_CONFIG, ...loaded }
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Partial<CLIConfigData>): void {
  ensureConfigDir()

  const existing = loadConfig()
  const merged = { ...existing, ...config }

  // Separate credentials from other config
  const { apiKey, ...rest } = merged

  // Save main config
  writeFileSync(CONFIG_FILE, JSON.stringify(rest, null, 2), { mode: 0o600 })

  // Save credentials separately
  if (apiKey !== undefined) {
    writeFileSync(CREDENTIALS_FILE, JSON.stringify({ apiKey }, null, 2), { mode: 0o600 })
  }
}

/**
 * Clear all configuration
 */
export function clearConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE)
  }
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE)
  }
}

/**
 * Get a specific config value
 */
export function getConfigValue<K extends keyof CLIConfigData>(key: K): CLIConfigData[K] {
  return getConfig()[key]
}

/**
 * Set a specific config value
 */
export function setConfigValue<K extends keyof CLIConfigData>(key: K, value: CLIConfigData[K]): void {
  saveConfig({ [key]: value })
}

/**
 * Delete a specific config value
 */
export function deleteConfigValue<K extends keyof CLIConfigData>(key: K): void {
  const config = loadConfig()
  delete config[key]
  clearConfig()
  saveConfig(config)
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getConfig().apiKey
}

/**
 * Require authentication (exit if not authenticated)
 */
export function requireAuth(): void {
  if (!isAuthenticated()) {
    console.error('\\x1b[31mAuthentication required. Run "${config.cliName} login" first.\\x1b[0m')
    process.exit(1)
  }
}

/**
 * Get config file path
 */
export function getConfigPath(): string {
  return CONFIG_FILE
}

/**
 * Get credentials file path
 */
export function getCredentialsPath(): string {
  return CREDENTIALS_FILE
}
`
}

/**
 * Generate config command group
 */
export function generateConfigCommand(config: CLIConfig): string {
  return `/**
 * Config Command
 *
 * Manage CLI configuration settings.
 */

import { Command } from 'commander'
import { getConfig, setConfigValue, deleteConfigValue, getConfigPath, clearConfig } from '../config'
import { formatOutput, color } from '../output'

export const configCommand = new Command('config')
  .description('Manage CLI configuration')

/**
 * config get [key]
 */
const getCommand = new Command('get')
  .description('Get configuration value(s)')
  .argument('[key]', 'Configuration key to get')
  .option('-o, --output <format>', 'Output format (json, yaml)', 'json')
  .action((key, options) => {
    const config = getConfig()

    if (key) {
      if (key in config) {
        const value = config[key as keyof typeof config]
        if (options.output === 'json') {
          console.log(JSON.stringify({ [key]: value }, null, 2))
        } else {
          console.log(value)
        }
      } else {
        console.error(color.error(\`Unknown configuration key: \${key}\`))
        process.exit(1)
      }
    } else {
      // Show all config (hide sensitive values)
      const safeConfig = { ...config }
      if (safeConfig.apiKey) {
        safeConfig.apiKey = '***' + safeConfig.apiKey.slice(-4)
      }
      formatOutput(safeConfig, options.output)
    }
  })

/**
 * config set <key> <value>
 */
const setCommand = new Command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Configuration key')
  .argument('<value>', 'Configuration value')
  .action((key, value) => {
    const validKeys = ['baseUrl', 'outputFormat', 'color', 'limit']

    if (!validKeys.includes(key)) {
      console.error(color.error(\`Invalid configuration key: \${key}\`))
      console.error(color.dim(\`Valid keys: \${validKeys.join(', ')}\`))
      process.exit(1)
    }

    // Parse value based on key type
    let parsedValue: unknown = value

    switch (key) {
      case 'color':
        parsedValue = value === 'true'
        break
      case 'limit':
        parsedValue = parseInt(value, 10)
        if (isNaN(parsedValue as number)) {
          console.error(color.error('limit must be a number'))
          process.exit(1)
        }
        break
      case 'outputFormat':
        if (!['table', 'json', 'yaml', 'csv'].includes(value)) {
          console.error(color.error('outputFormat must be one of: table, json, yaml, csv'))
          process.exit(1)
        }
        break
    }

    setConfigValue(key as any, parsedValue as any)
    console.log(color.success(\`Set \${key} = \${value}\`))
  })

/**
 * config delete <key>
 */
const deleteCommand = new Command('delete')
  .description('Delete a configuration value')
  .argument('<key>', 'Configuration key to delete')
  .action((key) => {
    if (key === 'apiKey') {
      console.error(color.error('Use "logout" to remove authentication'))
      process.exit(1)
    }

    deleteConfigValue(key as any)
    console.log(color.success(\`Deleted \${key}\`))
  })

/**
 * config path
 */
const pathCommand = new Command('path')
  .description('Show configuration file path')
  .action(() => {
    console.log(getConfigPath())
  })

/**
 * config reset
 */
const resetCommand = new Command('reset')
  .description('Reset all configuration to defaults')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    if (!options.force) {
      const { confirm } = await import('@inquirer/prompts')
      const confirmed = await confirm({
        message: 'Are you sure you want to reset all configuration?',
        default: false,
      })
      if (!confirmed) {
        console.log(color.dim('Cancelled'))
        return
      }
    }

    clearConfig()
    console.log(color.success('Configuration reset to defaults'))
  })

configCommand
  .addCommand(getCommand)
  .addCommand(setCommand)
  .addCommand(deleteCommand)
  .addCommand(pathCommand)
  .addCommand(resetCommand)
`
}

/**
 * Generate output utility module
 */
export function generateOutputModule(config: CLIConfig): string {
  return `/**
 * Output Formatting Utilities
 *
 * Provides consistent output formatting across all CLI commands.
 */

import type { OutputFormat } from './types'

/**
 * Color output helpers
 */
export const color = {
  /** Success message (green) */
  success: (msg: string) => \`\\x1b[32m\${msg}\\x1b[0m\`,
  /** Error message (red) */
  error: (msg: string) => \`\\x1b[31m\${msg}\\x1b[0m\`,
  /** Warning message (yellow) */
  warn: (msg: string) => \`\\x1b[33m\${msg}\\x1b[0m\`,
  /** Info message (blue) */
  info: (msg: string) => \`\\x1b[34m\${msg}\\x1b[0m\`,
  /** Dim message (gray) */
  dim: (msg: string) => \`\\x1b[90m\${msg}\\x1b[0m\`,
  /** Bold message */
  bold: (msg: string) => \`\\x1b[1m\${msg}\\x1b[0m\`,
}

/**
 * Format data as table
 */
function formatTable(data: unknown[], options?: { columns?: string[] }): string {
  if (!Array.isArray(data) || data.length === 0) {
    return 'No data'
  }

  const columns = options?.columns || Object.keys(data[0] as Record<string, unknown>)
  const rows = data.map(item => {
    const row: Record<string, string> = {}
    for (const col of columns) {
      const value = (item as Record<string, unknown>)[col]
      row[col] = value === undefined || value === null ? '' : String(value)
    }
    return row
  })

  // Calculate column widths
  const widths: Record<string, number> = {}
  for (const col of columns) {
    widths[col] = Math.max(
      col.length,
      ...rows.map(row => row[col].length)
    )
  }

  // Build table
  const separator = columns.map(col => '-'.repeat(widths[col])).join('-+-')
  const header = columns.map(col => col.padEnd(widths[col])).join(' | ')
  const body = rows.map(row =>
    columns.map(col => row[col].padEnd(widths[col])).join(' | ')
  ).join('\\n')

  return \`\${header}\\n\${separator}\\n\${body}\`
}

/**
 * Format data as CSV
 */
function formatCSV(data: unknown[], options?: { columns?: string[] }): string {
  if (!Array.isArray(data) || data.length === 0) {
    return ''
  }

  const columns = options?.columns || Object.keys(data[0] as Record<string, unknown>)
  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\\n')) {
      return \`"\${val.replace(/"/g, '""')}"\`
    }
    return val
  }

  const header = columns.map(escapeCSV).join(',')
  const rows = data.map(item =>
    columns.map(col => {
      const value = (item as Record<string, unknown>)[col]
      return escapeCSV(value === undefined || value === null ? '' : String(value))
    }).join(',')
  ).join('\\n')

  return \`\${header}\\n\${rows}\`
}

/**
 * Format data as YAML (simple implementation)
 */
function formatYAML(data: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent)

  if (data === null || data === undefined) {
    return 'null'
  }

  if (typeof data === 'boolean' || typeof data === 'number') {
    return String(data)
  }

  if (typeof data === 'string') {
    if (data.includes('\\n') || data.includes(':') || data.includes('#')) {
      return \`|\n\${data.split('\\n').map(l => spaces + '  ' + l).join('\\n')}\`
    }
    return data
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]'
    return data.map(item => {
      const formatted = formatYAML(item, indent + 1)
      if (typeof item === 'object' && item !== null) {
        return \`\${spaces}- \${formatted.trim().replace(/^\\s+/gm, (m) => m + '  ')}\`
      }
      return \`\${spaces}- \${formatted}\`
    }).join('\\n')
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return '{}'
    return entries.map(([key, value]) => {
      const formatted = formatYAML(value, indent + 1)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return \`\${spaces}\${key}:\\n\${formatted}\`
      }
      if (Array.isArray(value)) {
        return \`\${spaces}\${key}:\\n\${formatted}\`
      }
      return \`\${spaces}\${key}: \${formatted}\`
    }).join('\\n')
  }

  return String(data)
}

/**
 * Format output based on format type
 */
export function formatOutput(
  data: unknown,
  format: OutputFormat = 'json',
  options?: { columns?: string[] }
): void {
  switch (format) {
    case 'json':
      console.log(JSON.stringify(data, null, 2))
      break
    case 'yaml':
      console.log(formatYAML(data))
      break
    case 'table':
      if (Array.isArray(data)) {
        console.log(formatTable(data, options))
      } else {
        // Single object - show as key-value pairs
        const entries = Object.entries(data as Record<string, unknown>)
        console.log(formatTable(entries.map(([k, v]) => ({ key: k, value: String(v) })), { columns: ['key', 'value'] }))
      }
      break
    case 'csv':
      if (Array.isArray(data)) {
        console.log(formatCSV(data, options))
      } else {
        console.log(formatCSV([data], options))
      }
      break
    default:
      console.log(JSON.stringify(data, null, 2))
  }
}
`
}
