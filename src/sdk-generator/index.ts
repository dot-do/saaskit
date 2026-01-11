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
