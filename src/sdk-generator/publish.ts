/**
 * SDK Auto-Publish Pipeline
 *
 * Generates and publishes type-safe client SDKs to:
 * - npm (TypeScript)
 * - PyPI (Python)
 * - Go modules (Go)
 *
 * @module sdk-generator/publish
 *
 * @example
 * ```typescript
 * import { createPublisher, publishAllSDKs } from './publish'
 *
 * const publisher = createPublisher({
 *   nouns: { Todo: { title: 'string', done: 'boolean' } },
 *   verbs: { Todo: { complete: ($) => $.db.Todo.update($.id, { done: true }) } },
 *   packageName: 'my-app-sdk',
 *   version: '1.0.0',
 *   baseUrl: 'https://api.myapp.com',
 * })
 *
 * // Publish all SDKs
 * await publisher.publishAll()
 *
 * // Or publish individually
 * await publisher.publishTypeScript()
 * await publisher.publishPython()
 * await publisher.publishGo()
 * ```
 */

import { createSDKGenerator } from './index'
import type {
  SDKConfig,
  GeneratedSDK,
  GeneratedFiles,
  TypeScriptSDKConfig,
  PythonSDKConfig,
  GoSDKConfig,
} from './types'
import { tryLoadModule } from '../utils/optional-dependency'

// ============================================================================
// Types
// ============================================================================

/**
 * npm registry configuration
 */
export interface NpmConfig {
  /** npm registry URL (default: https://registry.npmjs.org) */
  registry?: string
  /** npm auth token */
  token?: string
  /** npm access level (public or restricted) */
  access?: 'public' | 'restricted'
  /** Whether to run npm publish in dry-run mode */
  dryRun?: boolean
  /** npm tag (default: latest) */
  tag?: string
}

/**
 * PyPI configuration
 */
export interface PyPIConfig {
  /** PyPI repository URL (default: https://upload.pypi.org/legacy/) */
  repository?: string
  /** PyPI username */
  username?: string
  /** PyPI password or API token */
  password?: string
  /** Whether to run in dry-run mode */
  dryRun?: boolean
}

/**
 * Go modules configuration
 */
export interface GoModulesConfig {
  /** Go module path (e.g., github.com/yourorg/yoursdk) */
  modulePath: string
  /** Git remote URL for pushing */
  gitRemote?: string
  /** Git branch for releases */
  branch?: string
  /** Whether to run in dry-run mode */
  dryRun?: boolean
  /** GPG key ID for signing tags */
  gpgKeyId?: string
}

/**
 * Webhook configuration for publish notifications
 */
export interface WebhookConfig {
  /** Webhook URL */
  url: string
  /** HTTP headers to include */
  headers?: Record<string, string>
  /** Event types to notify */
  events?: ('publish:start' | 'publish:success' | 'publish:error')[]
}

/**
 * Publisher configuration
 */
export interface PublisherConfig extends SDKConfig {
  /** npm registry configuration */
  npm?: NpmConfig
  /** PyPI configuration */
  pypi?: PyPIConfig
  /** Go modules configuration */
  goModules?: GoModulesConfig
  /** Output directory for generated files */
  outputDir?: string
  /** Webhook for publish notifications */
  webhook?: WebhookConfig
  /** TypeScript SDK config overrides */
  typescript?: TypeScriptSDKConfig
  /** Python SDK config overrides */
  python?: PythonSDKConfig
  /** Go SDK config overrides */
  go?: GoSDKConfig
}

/**
 * Publish result for a single SDK
 */
export interface PublishResult {
  /** Whether the publish was successful */
  success: boolean
  /** Language of the SDK */
  language: 'typescript' | 'python' | 'go'
  /** Package name */
  packageName: string
  /** Package version */
  version: string
  /** Registry/repository URL */
  registry?: string
  /** Error message if failed */
  error?: string
  /** Duration in milliseconds */
  duration: number
  /** Output logs */
  logs: string[]
}

/**
 * Publish all result
 */
export interface PublishAllResult {
  /** Results for each SDK */
  results: PublishResult[]
  /** Overall success (all succeeded) */
  success: boolean
  /** Total duration in milliseconds */
  totalDuration: number
}

/**
 * Publisher interface
 */
export interface Publisher {
  /** Generate TypeScript SDK files */
  generateTypeScript(): GeneratedSDK
  /** Generate Python SDK files */
  generatePython(): GeneratedSDK
  /** Generate Go SDK files */
  generateGo(): GeneratedSDK
  /** Write SDK files to disk */
  writeFiles(sdk: GeneratedSDK, outputDir: string): Promise<void>
  /** Publish TypeScript SDK to npm */
  publishTypeScript(): Promise<PublishResult>
  /** Publish Python SDK to PyPI */
  publishPython(): Promise<PublishResult>
  /** Publish Go SDK */
  publishGo(): Promise<PublishResult>
  /** Publish all SDKs */
  publishAll(): Promise<PublishAllResult>
  /** Get current configuration */
  getConfig(): PublisherConfig
  /** Check if schema has changed since last publish */
  hasSchemaChanged(): Promise<boolean>
}

// ============================================================================
// File System Helpers
// ============================================================================

/**
 * Write files to disk (Node.js environment)
 */
async function writeFilesToDisk(files: GeneratedFiles, outputDir: string): Promise<void> {
  // Dynamic import for Node.js fs/path - using safe loader that only catches MODULE_NOT_FOUND
  const fs = await tryLoadModule<typeof import('fs')>('fs')
  const path = await tryLoadModule<typeof import('path')>('path')

  if (!fs || !path) {
    throw new Error('File system operations require Node.js environment')
  }

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(outputDir, filePath)
    const dir = path.dirname(fullPath)

    // Create directory if it doesn't exist
    await fs.promises.mkdir(dir, { recursive: true })

    // Write file
    await fs.promises.writeFile(fullPath, content, 'utf-8')
  }
}

/**
 * Execute a shell command (Node.js environment)
 */
async function exec(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Using safe loader that only catches MODULE_NOT_FOUND
  const childProcess = await tryLoadModule<typeof import('child_process')>('child_process')

  if (!childProcess) {
    throw new Error('Shell execution requires Node.js environment')
  }

  return new Promise((resolve) => {
    childProcess.exec(command, { cwd }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: error ? (error as { code?: number }).code ?? 1 : 0,
      })
    })
  })
}

/**
 * Send webhook notification
 */
async function sendWebhook(
  config: WebhookConfig,
  event: 'publish:start' | 'publish:success' | 'publish:error',
  data: Record<string, unknown>
): Promise<void> {
  if (!config.events || config.events.includes(event)) {
    try {
      await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          ...data,
        }),
      })
    } catch (err) {
      // Silently fail webhook notifications
      console.error('Webhook notification failed:', err)
    }
  }
}

// ============================================================================
// Publisher Implementation
// ============================================================================

/**
 * Create a publisher for generating and publishing SDKs
 */
export function createPublisher(config: PublisherConfig): Publisher {
  const generator = createSDKGenerator(config)

  const publisher: Publisher = {
    generateTypeScript() {
      return generator.generateTypeScript(config.typescript)
    },

    generatePython() {
      return generator.generatePython(config.python)
    },

    generateGo() {
      return generator.generateGo(config.go)
    },

    async writeFiles(sdk: GeneratedSDK, outputDir: string) {
      await writeFilesToDisk(sdk.files, outputDir)
    },

    async publishTypeScript(): Promise<PublishResult> {
      const startTime = Date.now()
      const logs: string[] = []
      const npmConfig = config.npm || {}
      const sdk = this.generateTypeScript()
      const outputDir = config.outputDir || './sdk-output/typescript'

      try {
        // Notify webhook
        if (config.webhook) {
          await sendWebhook(config.webhook, 'publish:start', {
            language: 'typescript',
            packageName: sdk.packageName,
            version: sdk.version,
          })
        }

        logs.push(`Generating TypeScript SDK: ${sdk.packageName}@${sdk.version}`)

        // Write files
        await this.writeFiles(sdk, outputDir)
        logs.push(`Files written to: ${outputDir}`)

        // Build the package
        const buildResult = await exec('npm run build', outputDir)
        logs.push(buildResult.stdout)
        if (buildResult.exitCode !== 0) {
          throw new Error(`Build failed: ${buildResult.stderr}`)
        }

        // Publish to npm
        if (!npmConfig.dryRun) {
          const publishArgs = [
            'npm publish',
            npmConfig.access ? `--access ${npmConfig.access}` : '--access public',
            npmConfig.tag ? `--tag ${npmConfig.tag}` : '',
            npmConfig.registry ? `--registry ${npmConfig.registry}` : '',
          ].filter(Boolean).join(' ')

          const publishResult = await exec(publishArgs, outputDir)
          logs.push(publishResult.stdout)
          if (publishResult.exitCode !== 0) {
            throw new Error(`Publish failed: ${publishResult.stderr}`)
          }
          logs.push(`Published to npm: ${sdk.packageName}@${sdk.version}`)
        } else {
          logs.push('Dry run mode - skipping publish')
        }

        // Notify webhook success
        if (config.webhook) {
          await sendWebhook(config.webhook, 'publish:success', {
            language: 'typescript',
            packageName: sdk.packageName,
            version: sdk.version,
          })
        }

        return {
          success: true,
          language: 'typescript',
          packageName: sdk.packageName,
          version: sdk.version,
          registry: npmConfig.registry || 'https://registry.npmjs.org',
          duration: Date.now() - startTime,
          logs,
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        logs.push(`Error: ${error}`)

        // Notify webhook error
        if (config.webhook) {
          await sendWebhook(config.webhook, 'publish:error', {
            language: 'typescript',
            packageName: sdk.packageName,
            version: sdk.version,
            error,
          })
        }

        return {
          success: false,
          language: 'typescript',
          packageName: sdk.packageName,
          version: sdk.version,
          error,
          duration: Date.now() - startTime,
          logs,
        }
      }
    },

    async publishPython(): Promise<PublishResult> {
      const startTime = Date.now()
      const logs: string[] = []
      const pypiConfig = config.pypi || {}
      const sdk = this.generatePython()
      const outputDir = config.outputDir || './sdk-output/python'

      try {
        // Notify webhook
        if (config.webhook) {
          await sendWebhook(config.webhook, 'publish:start', {
            language: 'python',
            packageName: sdk.packageName,
            version: sdk.version,
          })
        }

        logs.push(`Generating Python SDK: ${sdk.packageName}@${sdk.version}`)

        // Write files
        await this.writeFiles(sdk, outputDir)
        logs.push(`Files written to: ${outputDir}`)

        // Build the package
        const buildResult = await exec('python -m build', outputDir)
        logs.push(buildResult.stdout)
        if (buildResult.exitCode !== 0) {
          throw new Error(`Build failed: ${buildResult.stderr}`)
        }

        // Publish to PyPI
        if (!pypiConfig.dryRun) {
          const repoArg = pypiConfig.repository ? `--repository-url ${pypiConfig.repository}` : ''
          const userArg = pypiConfig.username ? `-u ${pypiConfig.username}` : ''
          const passArg = pypiConfig.password ? `-p ${pypiConfig.password}` : ''

          const publishResult = await exec(
            `python -m twine upload ${repoArg} ${userArg} ${passArg} dist/*`,
            outputDir
          )
          logs.push(publishResult.stdout)
          if (publishResult.exitCode !== 0) {
            throw new Error(`Publish failed: ${publishResult.stderr}`)
          }
          logs.push(`Published to PyPI: ${sdk.packageName}@${sdk.version}`)
        } else {
          logs.push('Dry run mode - skipping publish')
        }

        // Notify webhook success
        if (config.webhook) {
          await sendWebhook(config.webhook, 'publish:success', {
            language: 'python',
            packageName: sdk.packageName,
            version: sdk.version,
          })
        }

        return {
          success: true,
          language: 'python',
          packageName: sdk.packageName,
          version: sdk.version,
          registry: pypiConfig.repository || 'https://pypi.org',
          duration: Date.now() - startTime,
          logs,
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        logs.push(`Error: ${error}`)

        // Notify webhook error
        if (config.webhook) {
          await sendWebhook(config.webhook, 'publish:error', {
            language: 'python',
            packageName: sdk.packageName,
            version: sdk.version,
            error,
          })
        }

        return {
          success: false,
          language: 'python',
          packageName: sdk.packageName,
          version: sdk.version,
          error,
          duration: Date.now() - startTime,
          logs,
        }
      }
    },

    async publishGo(): Promise<PublishResult> {
      const startTime = Date.now()
      const logs: string[] = []
      const goConfig = config.goModules || { modulePath: `github.com/example/${config.packageName}` }
      const sdk = this.generateGo()
      const outputDir = config.outputDir || './sdk-output/go'

      try {
        // Notify webhook
        if (config.webhook) {
          await sendWebhook(config.webhook, 'publish:start', {
            language: 'go',
            packageName: sdk.packageName,
            version: sdk.version,
          })
        }

        logs.push(`Generating Go SDK: ${goConfig.modulePath}@v${sdk.version}`)

        // Write files
        await this.writeFiles(sdk, outputDir)
        logs.push(`Files written to: ${outputDir}`)

        // Initialize or update go module
        const modResult = await exec('go mod tidy', outputDir)
        logs.push(modResult.stdout)

        if (!goConfig.dryRun && goConfig.gitRemote) {
          // Git operations for Go modules
          const branch = goConfig.branch || 'main'
          const tagName = `v${sdk.version}`

          // Initialize git if needed
          await exec('git init', outputDir)
          await exec(`git remote add origin ${goConfig.gitRemote} || git remote set-url origin ${goConfig.gitRemote}`, outputDir)

          // Commit changes
          await exec('git add .', outputDir)
          await exec(`git commit -m "Release ${tagName}"`, outputDir)

          // Create tag
          const signArg = goConfig.gpgKeyId ? `-s -u ${goConfig.gpgKeyId}` : ''
          await exec(`git tag ${signArg} -a ${tagName} -m "Release ${tagName}"`, outputDir)

          // Push
          await exec(`git push origin ${branch}`, outputDir)
          await exec(`git push origin ${tagName}`, outputDir)

          logs.push(`Published Go module: ${goConfig.modulePath}@${tagName}`)
        } else {
          logs.push('Dry run mode or no git remote - skipping publish')
        }

        // Notify webhook success
        if (config.webhook) {
          await sendWebhook(config.webhook, 'publish:success', {
            language: 'go',
            packageName: goConfig.modulePath,
            version: sdk.version,
          })
        }

        return {
          success: true,
          language: 'go',
          packageName: goConfig.modulePath,
          version: sdk.version,
          registry: 'pkg.go.dev',
          duration: Date.now() - startTime,
          logs,
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        logs.push(`Error: ${error}`)

        // Notify webhook error
        if (config.webhook) {
          await sendWebhook(config.webhook, 'publish:error', {
            language: 'go',
            packageName: goConfig.modulePath,
            version: sdk.version,
            error,
          })
        }

        return {
          success: false,
          language: 'go',
          packageName: goConfig.modulePath,
          version: sdk.version,
          error,
          duration: Date.now() - startTime,
          logs,
        }
      }
    },

    async publishAll(): Promise<PublishAllResult> {
      const startTime = Date.now()

      // Run all publishes in parallel
      const [tsResult, pyResult, goResult] = await Promise.all([
        this.publishTypeScript(),
        this.publishPython(),
        this.publishGo(),
      ])

      const results = [tsResult, pyResult, goResult]

      return {
        results,
        success: results.every((r) => r.success),
        totalDuration: Date.now() - startTime,
      }
    },

    getConfig() {
      return config
    },

    async hasSchemaChanged(): Promise<boolean> {
      // This would compare the current noun/verb schema with a stored hash
      // For now, always return true (always regenerate)
      // In a production implementation, you'd hash the config and compare with stored value
      return true
    },
  }

  return publisher
}

// ============================================================================
// Standalone Functions
// ============================================================================

/**
 * Generate and publish all SDKs from configuration
 */
export async function publishAllSDKs(config: PublisherConfig): Promise<PublishAllResult> {
  const publisher = createPublisher(config)
  return publisher.publishAll()
}

/**
 * Generate all SDKs without publishing
 */
export function generateAllSDKs(config: SDKConfig): {
  typescript: GeneratedSDK
  python: GeneratedSDK
  go: GeneratedSDK
} {
  const generator = createSDKGenerator(config)
  return {
    typescript: generator.generateTypeScript(),
    python: generator.generatePython(),
    go: generator.generateGo(),
  }
}

/**
 * Create a schema hash for change detection
 */
export function createSchemaHash(config: SDKConfig): string {
  const schemaStr = JSON.stringify({
    nouns: config.nouns,
    verbs: Object.fromEntries(
      Object.entries(config.verbs).map(([k, v]) => [k, Object.keys(v)])
    ),
    version: config.version,
  })

  // Simple hash function (for production, use crypto.createHash)
  let hash = 0
  for (let i = 0; i < schemaStr.length; i++) {
    const char = schemaStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}
