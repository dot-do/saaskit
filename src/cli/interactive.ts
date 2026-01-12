/**
 * CLI Interactive Module - Enhanced Prompts and User Experience
 *
 * Provides interactive prompts with validation, suggestions, and helpful defaults
 * for the SaaSKit CLI tools.
 *
 * @module cli/interactive
 *
 * @example
 * ```typescript
 * import { InteractivePrompt, Validator, Suggester } from './interactive'
 *
 * const prompt = new InteractivePrompt()
 *
 * // Text input with validation
 * const name = await prompt.text({
 *   message: 'Project name:',
 *   validate: Validator.projectName,
 *   suggest: Suggester.projectName,
 *   default: 'my-app',
 * })
 *
 * // Select from choices
 * const template = await prompt.select({
 *   message: 'Choose a template:',
 *   choices: [
 *     { value: 'minimal', label: 'Minimal', description: 'Basic starter' },
 *     { value: 'todo', label: 'Todo App', description: 'CRUD example' },
 *   ],
 * })
 *
 * // Confirm action
 * const proceed = await prompt.confirm({
 *   message: 'Continue with deployment?',
 *   default: true,
 * })
 * ```
 */

import type { PromptQuestion } from './types'

// ============================================================================
// Types
// ============================================================================

/**
 * Text prompt options with validation and suggestions
 */
export interface TextPromptOptions {
  /** Prompt message */
  message: string
  /** Default value */
  default?: string
  /** Placeholder text */
  placeholder?: string
  /** Validation function - returns error message or undefined */
  validate?: (value: string) => string | undefined
  /** Transform function - transforms input before validation */
  transform?: (value: string) => string
  /** Suggestion function - provides suggestions based on input */
  suggest?: (value: string) => string | undefined
  /** Whether this field is required */
  required?: boolean
  /** Hint text shown below the prompt */
  hint?: string
}

/**
 * Select prompt choice
 */
export interface SelectChoice<T = string> {
  /** Value returned when selected */
  value: T
  /** Display label */
  label: string
  /** Optional description shown below the label */
  description?: string
  /** Whether this choice is disabled */
  disabled?: boolean
  /** Reason why disabled (shown as hint) */
  disabledReason?: string
}

/**
 * Select prompt options
 */
export interface SelectPromptOptions<T = string> {
  /** Prompt message */
  message: string
  /** Available choices */
  choices: SelectChoice<T>[]
  /** Default selected value */
  default?: T
  /** Whether to show descriptions inline */
  inlineDescriptions?: boolean
  /** Hint text shown below the prompt */
  hint?: string
}

/**
 * Confirm prompt options
 */
export interface ConfirmPromptOptions {
  /** Prompt message */
  message: string
  /** Default value */
  default?: boolean
  /** Text for affirmative option */
  yes?: string
  /** Text for negative option */
  no?: string
}

/**
 * Multi-select prompt options
 */
export interface MultiSelectPromptOptions<T = string> {
  /** Prompt message */
  message: string
  /** Available choices */
  choices: SelectChoice<T>[]
  /** Default selected values */
  default?: T[]
  /** Minimum selections required */
  min?: number
  /** Maximum selections allowed */
  max?: number
  /** Hint text shown below the prompt */
  hint?: string
}

/**
 * Password prompt options
 */
export interface PasswordPromptOptions {
  /** Prompt message */
  message: string
  /** Mask character (default: '*') */
  mask?: string
  /** Validation function */
  validate?: (value: string) => string | undefined
  /** Hint text shown below the prompt */
  hint?: string
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** Error message if invalid */
  error?: string
  /** Suggested correction */
  suggestion?: string
}

// ============================================================================
// Validators
// ============================================================================

/**
 * Common validators for CLI inputs
 */
export const Validator = {
  /**
   * Validate project name (npm package name rules)
   */
  projectName: (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return 'Project name is required'
    }

    // npm package name rules
    if (value.length > 214) {
      return 'Project name must be less than 214 characters'
    }

    if (value.startsWith('.') || value.startsWith('_')) {
      return 'Project name cannot start with . or _'
    }

    if (!/^[a-z0-9]([a-z0-9-._]*[a-z0-9])?$/.test(value)) {
      return 'Project name must be lowercase and contain only letters, numbers, hyphens, dots, and underscores'
    }

    return undefined
  },

  /**
   * Validate subdomain format
   */
  subdomain: (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return 'Subdomain is required'
    }

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value)) {
      return 'Subdomain must be lowercase alphanumeric with hyphens only'
    }

    if (value.length < 3) {
      return 'Subdomain must be at least 3 characters'
    }

    if (value.length > 63) {
      return 'Subdomain must be less than 63 characters'
    }

    return undefined
  },

  /**
   * Validate environment variable name
   */
  envVarName: (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return 'Environment variable name is required'
    }

    if (!/^[A-Z][A-Z0-9_]*$/.test(value)) {
      return 'Environment variable name must be uppercase with underscores only'
    }

    return undefined
  },

  /**
   * Validate port number
   */
  port: (value: string): string | undefined => {
    const num = parseInt(value, 10)

    if (isNaN(num)) {
      return 'Port must be a number'
    }

    if (num < 1 || num > 65535) {
      return 'Port must be between 1 and 65535'
    }

    if (num < 1024) {
      return 'Port below 1024 requires elevated privileges'
    }

    return undefined
  },

  /**
   * Validate URL format
   */
  url: (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return 'URL is required'
    }

    try {
      new URL(value)
      return undefined
    } catch {
      return 'Invalid URL format'
    }
  },

  /**
   * Create a required field validator
   */
  required: (fieldName: string) => (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return `${fieldName} is required`
    }
    return undefined
  },

  /**
   * Create a min length validator
   */
  minLength: (min: number, fieldName: string) => (value: string): string | undefined => {
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`
    }
    return undefined
  },

  /**
   * Create a max length validator
   */
  maxLength: (max: number, fieldName: string) => (value: string): string | undefined => {
    if (value.length > max) {
      return `${fieldName} must be less than ${max} characters`
    }
    return undefined
  },

  /**
   * Create a pattern validator
   */
  pattern: (regex: RegExp, message: string) => (value: string): string | undefined => {
    if (!regex.test(value)) {
      return message
    }
    return undefined
  },

  /**
   * Combine multiple validators
   */
  compose: (...validators: Array<(value: string) => string | undefined>) => (value: string): string | undefined => {
    for (const validator of validators) {
      const error = validator(value)
      if (error) return error
    }
    return undefined
  },
}

// ============================================================================
// Suggesters
// ============================================================================

/**
 * Common suggesters for CLI inputs
 */
export const Suggester = {
  /**
   * Suggest a valid project name from invalid input
   */
  projectName: (value: string): string | undefined => {
    if (!value) return undefined

    return value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-._]/g, '')
      .replace(/^[^a-z0-9]+/, '')
      .replace(/[^a-z0-9]+$/, '')
      .replace(/--+/g, '-')
  },

  /**
   * Suggest a valid subdomain from input
   */
  subdomain: (value: string): string | undefined => {
    if (!value) return undefined

    return value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^[^a-z0-9]+/, '')
      .replace(/[^a-z0-9]+$/, '')
      .replace(/--+/g, '-')
  },

  /**
   * Suggest an environment variable name
   */
  envVarName: (value: string): string | undefined => {
    if (!value) return undefined

    return value
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .replace(/^[^A-Z]+/, '')
  },
}

// ============================================================================
// Interactive Prompt
// ============================================================================

/**
 * InteractivePrompt - Enhanced CLI prompts with validation and UX features
 *
 * Provides a fluent API for collecting user input with built-in validation,
 * suggestions, and helpful error messages.
 */
export class InteractivePrompt {
  /** External prompt function (for dependency injection in tests) */
  private promptFn?: <T>(question: PromptQuestion) => Promise<T>

  /**
   * Create a new InteractivePrompt
   *
   * @param options - Configuration options
   * @param options.prompt - External prompt function (for testing)
   */
  constructor(options: { prompt?: <T>(question: PromptQuestion) => Promise<T> } = {}) {
    this.promptFn = options.prompt
  }

  /**
   * Prompt for text input with validation and suggestions
   */
  async text(options: TextPromptOptions): Promise<string> {
    const {
      message,
      default: defaultValue,
      validate,
      transform,
      suggest,
      required = false,
    } = options

    // Build the prompt question
    const question: PromptQuestion = {
      type: 'text',
      name: 'value',
      message: this.formatMessage(message, defaultValue),
    }

    // If we have an external prompt function, use it
    if (this.promptFn) {
      let value = await this.promptFn<string>(question)

      // Apply transform
      if (transform) {
        value = transform(value)
      }

      // Use default if empty
      if (!value && defaultValue) {
        value = defaultValue
      }

      // Validate
      if (required && !value) {
        throw new Error('Value is required')
      }

      if (validate) {
        const error = validate(value)
        if (error) {
          // Try to suggest a fix
          const suggestion = suggest?.(value)
          if (suggestion) {
            throw new Error(`${error}. Did you mean: ${suggestion}?`)
          }
          throw new Error(error)
        }
      }

      return value
    }

    // Fallback for non-interactive mode
    if (defaultValue) {
      return defaultValue
    }

    throw new Error('No prompt function available and no default value provided')
  }

  /**
   * Prompt for selection from choices
   */
  async select<T = string>(options: SelectPromptOptions<T>): Promise<T> {
    const { message, choices, default: defaultValue } = options

    const question: PromptQuestion = {
      type: 'select',
      name: 'value',
      message,
      choices: choices.map((c) => ({
        value: String(c.value),
        description: c.description,
      })),
    }

    if (this.promptFn) {
      const value = await this.promptFn<T>(question)

      // Check if selected choice is disabled
      const choice = choices.find((c) => c.value === value)
      if (choice?.disabled) {
        throw new Error(choice.disabledReason || 'This option is not available')
      }

      return value
    }

    // Fallback to default
    if (defaultValue !== undefined) {
      return defaultValue
    }

    // Return first non-disabled choice
    const firstAvailable = choices.find((c) => !c.disabled)
    if (firstAvailable) {
      return firstAvailable.value
    }

    throw new Error('No available choices')
  }

  /**
   * Prompt for confirmation (yes/no)
   */
  async confirm(options: ConfirmPromptOptions): Promise<boolean> {
    const { message, default: defaultValue = false, yes = 'Yes', no = 'No' } = options

    const question: PromptQuestion = {
      type: 'confirm',
      name: 'value',
      message: `${message} (${defaultValue ? `${yes}/${no.toLowerCase()}` : `${yes.toLowerCase()}/${no}`})`,
    }

    if (this.promptFn) {
      return await this.promptFn<boolean>(question)
    }

    return defaultValue
  }

  /**
   * Prompt for multiple selections
   */
  async multiSelect<T = string>(options: MultiSelectPromptOptions<T>): Promise<T[]> {
    const { choices, default: defaultValue = [], min: _min = 0, max: _max = choices.length } = options

    if (this.promptFn) {
      // Note: Would need extended prompt function for multi-select
      // For now, return default
      return defaultValue
    }

    return defaultValue
  }

  /**
   * Prompt for password (hidden input)
   */
  async password(options: PasswordPromptOptions): Promise<string> {
    const { message, validate } = options

    const question: PromptQuestion = {
      type: 'text', // Would be 'password' in real implementation
      name: 'value',
      message,
    }

    if (this.promptFn) {
      const value = await this.promptFn<string>(question)

      if (validate) {
        const error = validate(value)
        if (error) {
          throw new Error(error)
        }
      }

      return value
    }

    throw new Error('Password prompt requires interactive mode')
  }

  /**
   * Format message with default value hint
   */
  private formatMessage(message: string, defaultValue?: string): string {
    if (defaultValue) {
      return `${message} (${defaultValue})`
    }
    return message
  }
}

// ============================================================================
// Input Helpers
// ============================================================================

/**
 * Parse and validate CLI arguments
 */
export function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg.startsWith('--')) {
      const key = arg.slice(2)

      // Check for --no-* pattern
      if (key.startsWith('no-')) {
        result[key.slice(3)] = false
        continue
      }

      // Check for --key=value pattern
      if (key.includes('=')) {
        const [k, v] = key.split('=')
        result[k] = v
        continue
      }

      // Check next arg for value
      const nextArg = args[i + 1]
      if (nextArg && !nextArg.startsWith('-')) {
        result[key] = nextArg
        i++
      } else {
        result[key] = true
      }
    } else if (arg.startsWith('-')) {
      // Short flag
      const key = arg.slice(1)
      result[key] = true
    } else {
      // Positional argument
      if (!result['_']) {
        result['_'] = arg
      }
    }
  }

  return result
}

/**
 * Merge CLI args with defaults and environment variables
 */
export function mergeOptions<T extends Record<string, unknown>>(
  args: Record<string, unknown>,
  defaults: T,
  envPrefix = 'SAASKIT_'
): T {
  const result = { ...defaults }

  // Apply environment variables
  for (const key of Object.keys(defaults)) {
    const envKey = `${envPrefix}${key.toUpperCase().replace(/-/g, '_')}`
    if (process.env[envKey] !== undefined) {
      (result as Record<string, unknown>)[key] = process.env[envKey]
    }
  }

  // Apply CLI args (highest priority)
  for (const [key, value] of Object.entries(args)) {
    if (key !== '_' && value !== undefined) {
      (result as Record<string, unknown>)[key] = value
    }
  }

  return result
}

// ============================================================================
// Autocomplete
// ============================================================================

/**
 * Simple trie-based autocomplete for suggestions
 */
export class Autocomplete {
  private words: Set<string> = new Set()

  /**
   * Add words to the autocomplete dictionary
   */
  add(...words: string[]): void {
    for (const word of words) {
      this.words.add(word.toLowerCase())
    }
  }

  /**
   * Get suggestions for a prefix
   */
  suggest(prefix: string, limit = 5): string[] {
    const lowerPrefix = prefix.toLowerCase()
    const suggestions: string[] = []

    // Convert Set to array for iteration compatibility
    const wordArray = Array.from(this.words)
    for (let i = 0; i < wordArray.length && suggestions.length < limit; i++) {
      const word = wordArray[i]
      if (word.startsWith(lowerPrefix)) {
        suggestions.push(word)
      }
    }

    return suggestions.sort((a, b) => a.length - b.length)
  }

  /**
   * Check if an exact match exists
   */
  has(word: string): boolean {
    return this.words.has(word.toLowerCase())
  }
}

/**
 * Template autocomplete with descriptions
 */
export const templateAutocomplete = new Autocomplete()
templateAutocomplete.add('minimal', 'todo', 'ecommerce', 'recruiter')

// ============================================================================
// Wizard Flow
// ============================================================================

/**
 * Step in a wizard flow
 */
export interface WizardStep<TData> {
  /** Step ID */
  id: string
  /** Step title */
  title: string
  /** Run the step, return updated data or throw to abort */
  run: (data: TData, prompt: InteractivePrompt) => Promise<TData>
  /** Whether to skip this step */
  skip?: (data: TData) => boolean
}

/**
 * Run a multi-step wizard flow
 */
export async function runWizard<TData extends Record<string, unknown>>(
  steps: WizardStep<TData>[],
  initialData: TData,
  prompt: InteractivePrompt
): Promise<TData> {
  let data = { ...initialData }

  for (const step of steps) {
    // Check if step should be skipped
    if (step.skip?.(data)) {
      continue
    }

    try {
      data = await step.run(data, prompt)
    } catch (error) {
      // Re-throw with step context
      throw new Error(`Failed at step "${step.title}": ${(error as Error).message}`)
    }
  }

  return data
}

// ============================================================================
// Exports
// ============================================================================

export default InteractivePrompt
