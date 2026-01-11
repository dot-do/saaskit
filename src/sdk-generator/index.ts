/**
 * SDK Generator
 *
 * Generates type-safe client libraries from noun/verb definitions for
 * TypeScript, Python, and Go.
 *
 * @module sdk-generator
 */

import type {
  SDKConfig,
  SDKGenerator,
  GeneratedSDK,
  TypeScriptSDKConfig,
  PythonSDKConfig,
  GoSDKConfig,
  ParsedField,
  ParsedNoun,
  NounSchema,
  NounsConfig,
  VerbsConfig,
  PublishOptions,
  SinglePublishResult,
  PublishAllOptions,
  PublishAllResult,
  ChangelogDiffOptions,
  AutoPublishOptions,
  AutoPublishConfig,
} from './types'

import { generateTypeScriptFiles } from './typescript'
import { generatePythonFiles } from './python'
import { generateGoFiles } from './go'

// Re-export types
export type * from './types'

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert a string to plural form (simple English rules)
 */
function pluralize(word: string): string {
  if (word.endsWith('y') && !/[aeiou]y$/i.test(word)) {
    return word.slice(0, -1) + 'ies'
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es'
  }
  return word + 's'
}

/**
 * Convert PascalCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

/**
 * Convert PascalCase to camelCase
 */
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * Parse a field type definition
 */
function parseFieldType(name: string, typeStr: string): ParsedField {
  const optional = typeStr.endsWith('?')
  const cleanType = optional ? typeStr.slice(0, -1) : typeStr

  // Check for relationship
  if (cleanType.startsWith('->')) {
    return {
      name,
      type: 'string', // Relations are stored as IDs
      optional,
      isRelation: true,
      relationTarget: cleanType.slice(2),
    }
  }

  // Check for enum/union type
  if (cleanType.includes('|')) {
    const values = cleanType.split('|').map(v => v.trim())
    return {
      name,
      type: 'enum',
      optional,
      isRelation: false,
      enumValues: values,
    }
  }

  // Basic types
  return {
    name,
    type: cleanType,
    optional,
    isRelation: false,
  }
}

/**
 * Parse noun schema into structured format
 */
function parseNoun(name: string, schema: NounSchema, verbs: string[]): ParsedNoun {
  const fields: ParsedField[] = [
    { name: 'id', type: 'string', optional: false, isRelation: false },
    ...Object.entries(schema).map(([fieldName, fieldType]) => parseFieldType(fieldName, fieldType)),
  ]

  return {
    name,
    pluralName: pluralize(name).toLowerCase(),
    fields,
    verbs,
  }
}

/**
 * Parse all nouns from config
 */
function parseNouns(nouns: NounsConfig, verbs: VerbsConfig): ParsedNoun[] {
  return Object.entries(nouns).map(([name, schema]) => {
    const nounVerbs = verbs[name] ? Object.keys(verbs[name]) : []
    return parseNoun(name, schema, nounVerbs)
  })
}

/**
 * Simple hash function for schema change detection
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Parse semantic version string
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    return { major: 1, minor: 0, patch: 0 }
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  }
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Create an SDK generator from configuration
 */
export function createSDKGenerator(config: SDKConfig): SDKGenerator {
  const parsedNouns = parseNouns(config.nouns, config.verbs)

  return {
    generateTypeScript(tsConfig?: TypeScriptSDKConfig): GeneratedSDK {
      const files = generateTypeScriptFiles(config, parsedNouns, tsConfig)
      return {
        packageName: config.packageName,
        version: config.version,
        resources: parsedNouns.map(n => n.name),
        files,
        language: 'typescript',
      }
    },

    generatePython(pyConfig?: PythonSDKConfig): GeneratedSDK {
      const files = generatePythonFiles(config, parsedNouns, pyConfig)
      return {
        packageName: config.packageName,
        version: config.version,
        resources: parsedNouns.map(n => n.name),
        files,
        language: 'python',
      }
    },

    generateGo(goConfig?: GoSDKConfig): GeneratedSDK {
      const files = generateGoFiles(config, parsedNouns, goConfig)
      return {
        packageName: config.packageName,
        version: config.version,
        resources: parsedNouns.map(n => n.name),
        files,
        language: 'go',
      }
    },

    async publish(target: 'npm' | 'pypi' | 'go', options?: PublishOptions): Promise<SinglePublishResult> {
      const version = config.version
      const packageName = config.packageName

      // For dry-run mode, simulate a successful publish
      if (options?.dryRun) {
        switch (target) {
          case 'npm':
            return {
              success: true,
              package: packageName,
              version,
              registry: options.registry || 'https://registry.npmjs.org',
            }
          case 'pypi':
            return {
              success: true,
              package: packageName,
              version,
              repository: options.repository || 'https://upload.pypi.org/legacy/',
            }
          case 'go':
            const goVersion = version.startsWith('v') ? version : `v${version}`
            // Determine module path: use provided option, or packageName if it looks like a Go path
            let goModulePath: string
            if (options?.module) {
              goModulePath = options.module
            } else if (packageName.includes('/')) {
              goModulePath = packageName
            } else {
              goModulePath = `github.com/example/${packageName}`
            }
            return {
              success: true,
              module: goModulePath,
              version: goVersion,
              tag: goVersion,
              package: packageName,
            }
        }
      }

      // TODO: Implement actual publishing in future
      throw new Error(`Publishing to ${target} is not yet implemented in non-dry-run mode`)
    },

    async publishAll(options?: PublishAllOptions): Promise<PublishAllResult> {
      const npmResult = await this.publish('npm', {
        dryRun: options?.dryRun,
        registry: options?.npm?.registry,
      })

      const pypiResult = await this.publish('pypi', {
        dryRun: options?.dryRun,
        repository: options?.pypi?.repository,
      })

      const goResult = await this.publish('go', {
        dryRun: options?.dryRun,
        module: options?.go?.module,
      })

      const results = [npmResult, pypiResult, goResult]
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      return {
        npm: npmResult,
        pypi: pypiResult,
        go: goResult,
        summary: {
          totalTargets: 3,
          successful,
          failed,
        },
      }
    },

    getSchemaHash(): string {
      const schemaStr = JSON.stringify({
        nouns: config.nouns,
        verbs: Object.fromEntries(
          Object.entries(config.verbs).map(([k, v]) => [k, Object.keys(v)])
        ),
      })
      return simpleHash(schemaStr)
    },

    getNextVersion(bumpType: 'major' | 'minor' | 'patch'): string {
      const { major, minor, patch } = parseVersion(config.version)

      switch (bumpType) {
        case 'major':
          return `${major + 1}.0.0`
        case 'minor':
          return `${major}.${minor + 1}.0`
        case 'patch':
          return `${major}.${minor}.${patch + 1}`
      }
    },

    generateChangelog(diff: ChangelogDiffOptions): string {
      const changes: string[] = []
      const { previousNouns, currentNouns } = diff

      // Find new nouns
      for (const nounName of Object.keys(currentNouns)) {
        if (!previousNouns[nounName]) {
          changes.push(`- Added new resource: ${nounName}`)
        }
      }

      // Find removed nouns
      for (const nounName of Object.keys(previousNouns)) {
        if (!currentNouns[nounName]) {
          changes.push(`- Removed resource: ${nounName}`)
        }
      }

      // Find field changes
      for (const [nounName, nounSchema] of Object.entries(currentNouns)) {
        const previousSchema = previousNouns[nounName]
        if (previousSchema) {
          // Check for new fields
          for (const fieldName of Object.keys(nounSchema)) {
            if (!previousSchema[fieldName]) {
              changes.push(`- Added new field '${fieldName}' to ${nounName}`)
            }
          }
          // Check for removed fields
          for (const fieldName of Object.keys(previousSchema)) {
            if (!nounSchema[fieldName]) {
              changes.push(`- Removed field '${fieldName}' from ${nounName}`)
            }
          }
        }
      }

      if (changes.length === 0) {
        return 'No changes detected.'
      }

      return `## Changes\n\n${changes.join('\n')}`
    },

    setupAutoPublish(options: AutoPublishOptions): AutoPublishConfig {
      return {
        enabled: true,
        targets: options.targets,
        versionBump: options.onSchemaChange,
        dryRun: options.dryRun ?? false,
      }
    },
  }
}

// ============================================================================
// Standalone Functions
// ============================================================================

/**
 * Generate TypeScript SDK from configuration
 */
export function generateTypeScriptSDK(config: SDKConfig, tsConfig?: TypeScriptSDKConfig): GeneratedSDK {
  const generator = createSDKGenerator(config)
  return generator.generateTypeScript(tsConfig)
}

/**
 * Generate Python SDK from configuration
 */
export function generatePythonSDK(config: SDKConfig, pyConfig?: PythonSDKConfig): GeneratedSDK {
  const generator = createSDKGenerator(config)
  return generator.generatePython(pyConfig)
}

/**
 * Generate Go SDK from configuration
 */
export function generateGoSDK(config: SDKConfig, goConfig?: GoSDKConfig): GeneratedSDK {
  const generator = createSDKGenerator(config)
  return generator.generateGo(goConfig)
}

// Export utilities for internal use
export { parseFieldType, parseNoun, parseNouns, pluralize, toSnakeCase, toCamelCase }

// Re-export publish module
export {
  createPublisher,
  publishAllSDKs,
  generateAllSDKs,
  createSchemaHash,
} from './publish'
export type {
  Publisher,
  PublisherConfig,
  PublishResult,
  PublishAllResult,
  NpmConfig,
  PyPIConfig,
  GoModulesConfig,
  WebhookConfig,
} from './publish'
