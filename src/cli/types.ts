/**
 * CLI Types - Placeholder for TDD RED phase
 *
 * These types define the expected interface for CLI commands.
 * Implementation will be added in GREEN phase.
 */

export interface InitOptions {
  name?: string
  directory: string
  template?: 'minimal' | 'todo' | 'ecommerce' | 'recruiter'
  git?: boolean
  install?: boolean
  prompt?: <T>(question: PromptQuestion) => Promise<T>
  interactive?: boolean
}

export interface PromptQuestion {
  type: 'text' | 'select' | 'confirm'
  name: string
  message?: string
  choices?: Array<{ value: string; description?: string }>
}

export interface DevOptions {
  directory: string
  port?: number
}

export interface DeployOptions {
  directory: string
  subdomain?: string
  env?: Record<string, string>
  production?: boolean
  dryRun?: boolean
  onProgress?: (step: string) => void
}

export interface BuildOptions {
  directory: string
}

export interface CLIResult {
  success: boolean
  error?: string
  suggestion?: string
  availableTemplates?: string[]
}

export interface InitResult extends CLIResult {
  // No additional properties needed
}

export interface DevResult extends CLIResult {
  port?: number
  url?: string
  server?: DevServer
  compiled?: boolean
  typeErrors?: TypeScriptError[]
  endpoints?: string[]
  nouns?: string[]
  verbs?: Record<string, string[]>
}

export interface DevServer {
  stop: () => Promise<void>
  isRunning: () => boolean
  onReload: (callback: (file: string) => void) => void
  onRebuild: (callback: () => void) => void
}

export interface DeployResult extends CLIResult {
  url?: string
  urls?: {
    app: string
    api: string
    docs: string
  }
  buildSuccess?: boolean
  typeErrors?: TypeScriptError[]
  dryRun?: boolean
  wouldDeploy?: boolean
  environment?: 'preview' | 'production'
  envSet?: string[]
}

export interface BuildResult extends CLIResult {
  errors: TypeScriptError[]
  errorsByFile?: Record<string, TypeScriptError[]>
  cached?: boolean
}

export interface TypeScriptError {
  file: string
  line: number
  column?: number
  message: string
  suggestion?: string
}
