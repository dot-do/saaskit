/**
 * CLI Generator Types
 *
 * Type definitions for the CLI generator that creates command-line interfaces
 * from noun/verb definitions.
 *
 * @module cli-generator/types
 */

// ============================================================================
// Input Types
// ============================================================================

/**
 * Field type definitions for noun schemas
 */
export type FieldType = string // e.g., 'string', 'number', 'boolean', 'string?', '->User', 'admin | member | guest'

/**
 * Noun schema definition - maps field names to their types
 */
export type NounSchema = Record<string, FieldType>

/**
 * Nouns configuration - maps noun names to their schemas
 */
export type NounsConfig = Record<string, NounSchema>

/**
 * Verb handler function type
 */
export type VerbHandler = ($: unknown) => unknown

/**
 * Verbs configuration for a single noun
 */
export type NounVerbs = Record<string, VerbHandler>

/**
 * Verbs configuration - maps noun names to their verb handlers
 */
export type VerbsConfig = Record<string, NounVerbs>

/**
 * Authentication configuration for CLI
 */
export interface CLIAuthConfig {
  /** Authentication type */
  type: 'oauth' | 'api-key' | 'browser'
  /** OAuth client ID (for OAuth type) */
  clientId?: string
  /** OAuth authorization URL */
  authUrl?: string
  /** OAuth token URL */
  tokenUrl?: string
  /** OAuth scopes */
  scopes?: string[]
  /** API key header name (for api-key type) */
  headerName?: string
  /** Environment variable for API key */
  envVar?: string
}

/**
 * CLI configuration for generating command-line interfaces
 */
export interface CLIConfig {
  /** Noun definitions with field schemas */
  nouns: NounsConfig
  /** Verb definitions for each noun */
  verbs: VerbsConfig
  /** CLI name (used as binary name) */
  cliName: string
  /** Package name for npm publishing */
  packageName: string
  /** Package version */
  version: string
  /** Base URL for API requests */
  baseUrl?: string
  /** Authentication configuration */
  auth?: CLIAuthConfig
  /** CLI description for help text */
  description?: string
  /** Enable shell completion generation */
  completions?: boolean
  /** Custom commands to include */
  customCommands?: CustomCommand[]
}

/**
 * Custom command definition
 */
export interface CustomCommand {
  /** Command name */
  name: string
  /** Command description */
  description: string
  /** Command arguments */
  args?: CommandArg[]
  /** Command options/flags */
  options?: CommandOption[]
  /** Handler code (as string for code generation) */
  handler?: string
}

/**
 * Command argument definition
 */
export interface CommandArg {
  /** Argument name */
  name: string
  /** Argument description */
  description: string
  /** Whether the argument is required */
  required?: boolean
  /** Default value */
  default?: string
}

/**
 * Command option/flag definition
 */
export interface CommandOption {
  /** Option name (long form, e.g., 'output') */
  name: string
  /** Short form (e.g., 'o') */
  short?: string
  /** Option description */
  description: string
  /** Whether this option takes a value */
  hasValue?: boolean
  /** Default value */
  default?: string
  /** Allowed values (for enum-like options) */
  choices?: string[]
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Generated CLI file content
 */
export type GeneratedFiles = Record<string, string>

/**
 * Generated CLI output
 */
export interface GeneratedCLI {
  /** CLI name */
  cliName: string
  /** Package name */
  packageName: string
  /** Package version */
  version: string
  /** List of resource names (nouns) */
  resources: string[]
  /** List of available commands */
  commands: string[]
  /** Generated file contents keyed by file path */
  files: GeneratedFiles
}

/**
 * CLI Generator instance
 */
export interface CLIGenerator {
  /** Generate CLI files */
  generate(): GeneratedCLI
  /** Get list of generated commands */
  getCommands(): CommandInfo[]
  /** Get shell completion script for a shell type */
  getCompletionScript(shell: ShellType): string
}

// ============================================================================
// Command Types
// ============================================================================

/**
 * Command information
 */
export interface CommandInfo {
  /** Full command path (e.g., 'users list', 'config set') */
  command: string
  /** Command description */
  description: string
  /** Available subcommands */
  subcommands?: CommandInfo[]
  /** Command arguments */
  args?: CommandArg[]
  /** Command options */
  options?: CommandOption[]
}

/**
 * Supported shell types for completions
 */
export type ShellType = 'bash' | 'zsh' | 'fish' | 'powershell'

// ============================================================================
// Internal Types for Generation
// ============================================================================

/**
 * Parsed field definition
 */
export interface ParsedField {
  /** Field name */
  name: string
  /** Base type (string, number, boolean, etc.) */
  type: string
  /** Whether the field is optional */
  optional: boolean
  /** Whether this is a relationship */
  isRelation: boolean
  /** Target noun if this is a relationship */
  relationTarget?: string
  /** Enum values if this is an enum type */
  enumValues?: string[]
}

/**
 * Parsed noun definition
 */
export interface ParsedNoun {
  /** Noun name (singular, PascalCase) */
  name: string
  /** Plural name for resource endpoints */
  pluralName: string
  /** CLI command name (lowercase) */
  cliName: string
  /** Parsed field definitions */
  fields: ParsedField[]
  /** Verbs defined for this noun */
  verbs: string[]
}

/**
 * Output format for CLI commands
 */
export type OutputFormat = 'table' | 'json' | 'yaml' | 'csv'
