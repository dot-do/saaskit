/**
 * CLI Command Generators
 *
 * Generates command implementations for CRUD operations and custom verbs.
 *
 * @module cli-generator/commands
 */

import type { ParsedNoun, CLIConfig } from './types'

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert PascalCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

/**
 * Convert PascalCase to camelCase
 */
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ============================================================================
// Command Code Generators
// ============================================================================

/**
 * Generate the login command code
 */
export function generateLoginCommand(config: CLIConfig): string {
  const authType = config.auth?.type || 'api-key'
  const envVar = config.auth?.envVar || `${config.cliName.toUpperCase().replace(/-/g, '_')}_API_KEY`

  return `/**
 * Login Command
 *
 * Authenticates the user and stores credentials.
 */

import { Command } from 'commander'
import { input, password, confirm } from '@inquirer/prompts'
import { saveConfig, getConfig } from '../config'
import { color } from '../output'
import open from 'open'

export const loginCommand = new Command('login')
  .description('Authenticate with ${config.cliName}')
  .option('--api-key <key>', 'API key for authentication')
  .option('--browser', 'Open browser for authentication')
  .action(async (options) => {
    try {
      ${authType === 'api-key' ? `
      // API Key authentication
      let apiKey = options.apiKey || process.env.${envVar}

      if (!apiKey) {
        apiKey = await password({
          message: 'Enter your API key:',
          mask: '*',
        })
      }

      if (!apiKey) {
        console.error(color.error('API key is required'))
        process.exit(1)
      }

      // Validate the API key
      const response = await fetch(\`\${getConfig().baseUrl || '${config.baseUrl || 'https://api.example.com.ai'}'}/auth/validate\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${apiKey}\`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error(color.error('Invalid API key'))
        process.exit(1)
      }

      // Save the API key
      saveConfig({ apiKey })
      console.log(color.success('Successfully authenticated!'))
      ` : authType === 'browser' || authType === 'oauth' ? `
      // Browser/OAuth authentication
      console.log(color.info('Opening browser for authentication...'))

      const authUrl = '${config.auth?.authUrl || `${config.baseUrl}/auth/cli`}'
      await open(authUrl)

      console.log(color.info('Complete the authentication in your browser.'))
      console.log(color.dim('Waiting for authentication...'))

      // In a real implementation, you would start a local server to receive the callback
      // For now, prompt for the token
      const token = await password({
        message: 'Paste the token from your browser:',
        mask: '*',
      })

      if (!token) {
        console.error(color.error('Token is required'))
        process.exit(1)
      }

      saveConfig({ apiKey: token })
      console.log(color.success('Successfully authenticated!'))
      ` : `
      console.error(color.error('Authentication type not configured'))
      process.exit(1)
      `}
    } catch (error) {
      console.error(color.error(\`Login failed: \${(error as Error).message}\`))
      process.exit(1)
    }
  })
`
}

/**
 * Generate the logout command code
 */
export function generateLogoutCommand(_config: CLIConfig): string {
  return `/**
 * Logout Command
 *
 * Removes stored credentials.
 */

import { Command } from 'commander'
import { clearConfig, getConfig } from '../config'
import { color } from '../output'

export const logoutCommand = new Command('logout')
  .description('Log out and remove stored credentials')
  .option('--all', 'Remove all stored configuration')
  .action(async (options) => {
    try {
      if (options.all) {
        clearConfig()
        console.log(color.success('All configuration cleared'))
      } else {
        const config = getConfig()
        delete config.apiKey
        // saveConfig without apiKey
        clearConfig()
        console.log(color.success('Successfully logged out'))
      }
    } catch (error) {
      console.error(color.error(\`Logout failed: \${(error as Error).message}\`))
      process.exit(1)
    }
  })
`
}

/**
 * Generate list command for a noun
 */
export function generateListCommand(noun: ParsedNoun, _config: CLIConfig): string {
  return `/**
 * List ${noun.pluralName}
 */

import { Command } from 'commander'
import { getConfig, requireAuth } from '../config'
import { formatOutput, color } from '../output'
import type { OutputFormat } from '../types'

export const list${noun.name}Command = new Command('list')
  .description('List all ${noun.pluralName}')
  .option('-o, --output <format>', 'Output format (table, json, yaml, csv)', 'table')
  .option('-l, --limit <number>', 'Maximum number of results', '20')
  .option('--offset <number>', 'Number of results to skip', '0')
  .option('-f, --filter <filter>', 'Filter results (key=value)')
  .option('-s, --sort <field>', 'Sort by field')
  .option('--desc', 'Sort in descending order')
  .action(async (options) => {
    requireAuth()

    try {
      const config = getConfig()
      const params = new URLSearchParams()

      params.set('limit', options.limit)
      params.set('offset', options.offset)

      if (options.filter) {
        const [key, value] = options.filter.split('=')
        params.set(key, value)
      }

      if (options.sort) {
        params.set('sort', options.sort)
        if (options.desc) {
          params.set('order', 'desc')
        }
      }

      const response = await fetch(\`\${config.baseUrl}/${noun.pluralName}?\${params}\`, {
        headers: {
          'Authorization': \`Bearer \${config.apiKey}\`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || \`HTTP \${response.status}\`)
      }

      const result = await response.json()
      const data = result.data || result

      formatOutput(data, options.output as OutputFormat, {
        columns: [${noun.fields.map(f => `'${f.name}'`).join(', ')}],
      })

      if (result.pagination) {
        console.log(color.dim(\`\\nShowing \${data.length} of \${result.pagination.total} results\`))
      }
    } catch (error) {
      console.error(color.error(\`Failed to list ${noun.pluralName}: \${(error as Error).message}\`))
      process.exit(1)
    }
  })
`
}

/**
 * Generate get command for a noun
 */
export function generateGetCommand(noun: ParsedNoun, _config: CLIConfig): string {
  return `/**
 * Get ${noun.name} by ID
 */

import { Command } from 'commander'
import { getConfig, requireAuth } from '../config'
import { formatOutput, color } from '../output'
import type { OutputFormat } from '../types'

export const get${noun.name}Command = new Command('get')
  .description('Get a ${noun.name.toLowerCase()} by ID')
  .argument('<id>', '${noun.name} ID')
  .option('-o, --output <format>', 'Output format (table, json, yaml)', 'json')
  .action(async (id, options) => {
    requireAuth()

    try {
      const config = getConfig()

      const response = await fetch(\`\${config.baseUrl}/${noun.pluralName}/\${id}\`, {
        headers: {
          'Authorization': \`Bearer \${config.apiKey}\`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.error(color.error(\`${noun.name} not found: \${id}\`))
          process.exit(1)
        }
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || \`HTTP \${response.status}\`)
      }

      const data = await response.json()
      formatOutput(data, options.output as OutputFormat)
    } catch (error) {
      console.error(color.error(\`Failed to get ${noun.name.toLowerCase()}: \${(error as Error).message}\`))
      process.exit(1)
    }
  })
`
}

/**
 * Generate create command for a noun
 */
export function generateCreateCommand(noun: ParsedNoun, _config: CLIConfig): string {
  const requiredFields = noun.fields.filter(f => !f.optional && f.name !== 'id')
  const optionalFields = noun.fields.filter(f => f.optional)

  return `/**
 * Create ${noun.name}
 */

import { Command } from 'commander'
import { input, select, confirm } from '@inquirer/prompts'
import { getConfig, requireAuth } from '../config'
import { formatOutput, color } from '../output'
import type { OutputFormat } from '../types'

export const create${noun.name}Command = new Command('create')
  .description('Create a new ${noun.name.toLowerCase()}')
${requiredFields.map(f => `  .option('--${toKebabCase(f.name)} <value>', '${capitalize(f.name)}${f.isRelation ? ` (${f.relationTarget} ID)` : ''}')`).join('\n')}
${optionalFields.map(f => `  .option('--${toKebabCase(f.name)} <value>', '${capitalize(f.name)} (optional)')`).join('\n')}
  .option('-i, --interactive', 'Interactive mode')
  .option('-o, --output <format>', 'Output format (table, json, yaml)', 'json')
  .action(async (options) => {
    requireAuth()

    try {
      let data: Record<string, unknown> = {}

      if (options.interactive) {
        // Interactive mode - prompt for each field
${requiredFields.map(f => `
        ${f.enumValues ? `
        data['${f.name}'] = await select({
          message: '${capitalize(f.name)}:',
          choices: [${f.enumValues.map(v => `{ value: '${v}', name: '${v}' }`).join(', ')}],
        })` : f.type === 'boolean' ? `
        data['${f.name}'] = await confirm({
          message: '${capitalize(f.name)}?',
        })` : `
        data['${f.name}'] = await input({
          message: '${capitalize(f.name)}:',
          validate: (value) => value.length > 0 || '${capitalize(f.name)} is required',
        })`}
`).join('')}

        // Optional fields
${optionalFields.map(f => `
        const include${capitalize(f.name)} = await confirm({
          message: 'Set ${f.name}?',
          default: false,
        })
        if (include${capitalize(f.name)}) {
          ${f.enumValues ? `
          data['${f.name}'] = await select({
            message: '${capitalize(f.name)}:',
            choices: [${f.enumValues.map(v => `{ value: '${v}', name: '${v}' }`).join(', ')}],
          })` : f.type === 'boolean' ? `
          data['${f.name}'] = await confirm({
            message: '${capitalize(f.name)}?',
          })` : `
          data['${f.name}'] = await input({
            message: '${capitalize(f.name)}:',
          })`}
        }
`).join('')}
      } else {
        // Use CLI options
${requiredFields.map(f => `
        if (options['${toCamelCase(f.name.replace(/-/g, ''))}'] !== undefined) {
          data['${f.name}'] = ${f.type === 'number' ? `parseFloat(options['${toCamelCase(f.name.replace(/-/g, ''))}'])` : f.type === 'boolean' ? `options['${toCamelCase(f.name.replace(/-/g, ''))}'] === 'true'` : `options['${toCamelCase(f.name.replace(/-/g, ''))}']`}
        } else {
          console.error(color.error('--${toKebabCase(f.name)} is required'))
          process.exit(1)
        }
`).join('')}
${optionalFields.map(f => `
        if (options['${toCamelCase(f.name.replace(/-/g, ''))}'] !== undefined) {
          data['${f.name}'] = ${f.type === 'number' ? `parseFloat(options['${toCamelCase(f.name.replace(/-/g, ''))}'])` : f.type === 'boolean' ? `options['${toCamelCase(f.name.replace(/-/g, ''))}'] === 'true'` : `options['${toCamelCase(f.name.replace(/-/g, ''))}']`}
        }
`).join('')}
      }

      const config = getConfig()

      const response = await fetch(\`\${config.baseUrl}/${noun.pluralName}\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${config.apiKey}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || \`HTTP \${response.status}\`)
      }

      const result = await response.json()
      console.log(color.success('${noun.name} created successfully!'))
      formatOutput(result, options.output as OutputFormat)
    } catch (error) {
      console.error(color.error(\`Failed to create ${noun.name.toLowerCase()}: \${(error as Error).message}\`))
      process.exit(1)
    }
  })
`
}

/**
 * Generate update command for a noun
 */
export function generateUpdateCommand(noun: ParsedNoun, _config: CLIConfig): string {
  const allFields = noun.fields.filter(f => f.name !== 'id')

  return `/**
 * Update ${noun.name}
 */

import { Command } from 'commander'
import { getConfig, requireAuth } from '../config'
import { formatOutput, color } from '../output'
import type { OutputFormat } from '../types'

export const update${noun.name}Command = new Command('update')
  .description('Update a ${noun.name.toLowerCase()}')
  .argument('<id>', '${noun.name} ID')
${allFields.map(f => `  .option('--${toKebabCase(f.name)} <value>', '${capitalize(f.name)}')`).join('\n')}
  .option('-o, --output <format>', 'Output format (table, json, yaml)', 'json')
  .action(async (id, options) => {
    requireAuth()

    try {
      const data: Record<string, unknown> = {}

${allFields.map(f => `
      if (options['${toCamelCase(f.name.replace(/-/g, ''))}'] !== undefined) {
        data['${f.name}'] = ${f.type === 'number' ? `parseFloat(options['${toCamelCase(f.name.replace(/-/g, ''))}'])` : f.type === 'boolean' ? `options['${toCamelCase(f.name.replace(/-/g, ''))}'] === 'true'` : `options['${toCamelCase(f.name.replace(/-/g, ''))}']`}
      }
`).join('')}

      if (Object.keys(data).length === 0) {
        console.error(color.error('No fields to update. Provide at least one field.'))
        process.exit(1)
      }

      const config = getConfig()

      const response = await fetch(\`\${config.baseUrl}/${noun.pluralName}/\${id}\`, {
        method: 'PUT',
        headers: {
          'Authorization': \`Bearer \${config.apiKey}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.error(color.error(\`${noun.name} not found: \${id}\`))
          process.exit(1)
        }
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || \`HTTP \${response.status}\`)
      }

      const result = await response.json()
      console.log(color.success('${noun.name} updated successfully!'))
      formatOutput(result, options.output as OutputFormat)
    } catch (error) {
      console.error(color.error(\`Failed to update ${noun.name.toLowerCase()}: \${(error as Error).message}\`))
      process.exit(1)
    }
  })
`
}

/**
 * Generate delete command for a noun
 */
export function generateDeleteCommand(noun: ParsedNoun, _config: CLIConfig): string {
  return `/**
 * Delete ${noun.name}
 */

import { Command } from 'commander'
import { confirm } from '@inquirer/prompts'
import { getConfig, requireAuth } from '../config'
import { color } from '../output'

export const delete${noun.name}Command = new Command('delete')
  .description('Delete a ${noun.name.toLowerCase()}')
  .argument('<id>', '${noun.name} ID')
  .option('-f, --force', 'Skip confirmation')
  .action(async (id, options) => {
    requireAuth()

    try {
      if (!options.force) {
        const confirmed = await confirm({
          message: \`Are you sure you want to delete ${noun.name.toLowerCase()} \${id}?\`,
          default: false,
        })

        if (!confirmed) {
          console.log(color.dim('Cancelled'))
          return
        }
      }

      const config = getConfig()

      const response = await fetch(\`\${config.baseUrl}/${noun.pluralName}/\${id}\`, {
        method: 'DELETE',
        headers: {
          'Authorization': \`Bearer \${config.apiKey}\`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.error(color.error(\`${noun.name} not found: \${id}\`))
          process.exit(1)
        }
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || \`HTTP \${response.status}\`)
      }

      console.log(color.success(\`${noun.name} \${id} deleted successfully\`))
    } catch (error) {
      console.error(color.error(\`Failed to delete ${noun.name.toLowerCase()}: \${(error as Error).message}\`))
      process.exit(1)
    }
  })
`
}

/**
 * Generate verb command for a noun
 */
export function generateVerbCommand(noun: ParsedNoun, verb: string, _config: CLIConfig): string {
  return `/**
 * ${capitalize(verb)} ${noun.name}
 */

import { Command } from 'commander'
import { getConfig, requireAuth } from '../config'
import { formatOutput, color } from '../output'
import type { OutputFormat } from '../types'

export const ${verb}${noun.name}Command = new Command('${verb}')
  .description('${capitalize(verb)} a ${noun.name.toLowerCase()}')
  .argument('<id>', '${noun.name} ID')
  .option('--input <json>', 'Input data as JSON')
  .option('-o, --output <format>', 'Output format (table, json, yaml)', 'json')
  .action(async (id, options) => {
    requireAuth()

    try {
      const config = getConfig()

      let body = {}
      if (options.input) {
        try {
          body = JSON.parse(options.input)
        } catch {
          console.error(color.error('Invalid JSON input'))
          process.exit(1)
        }
      }

      const response = await fetch(\`\${config.baseUrl}/${noun.pluralName}/\${id}/${verb}\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${config.apiKey}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.error(color.error(\`${noun.name} not found: \${id}\`))
          process.exit(1)
        }
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || \`HTTP \${response.status}\`)
      }

      const result = await response.json()
      console.log(color.success('${capitalize(verb)} executed successfully!'))
      formatOutput(result, options.output as OutputFormat)
    } catch (error) {
      console.error(color.error(\`Failed to ${verb} ${noun.name.toLowerCase()}: \${(error as Error).message}\`))
      process.exit(1)
    }
  })
`
}

/**
 * Generate noun command group (aggregates all CRUD and verb commands)
 */
export function generateNounCommandGroup(noun: ParsedNoun, _config: CLIConfig): string {
  return `/**
 * ${noun.name} Commands
 */

import { Command } from 'commander'
import { list${noun.name}Command } from './list'
import { get${noun.name}Command } from './get'
import { create${noun.name}Command } from './create'
import { update${noun.name}Command } from './update'
import { delete${noun.name}Command } from './delete'
${noun.verbs.map(verb => `import { ${verb}${noun.name}Command } from './${verb}'`).join('\n')}

export const ${noun.cliName}Command = new Command('${noun.cliName}')
  .description('Manage ${noun.pluralName}')
  .addCommand(list${noun.name}Command)
  .addCommand(get${noun.name}Command)
  .addCommand(create${noun.name}Command)
  .addCommand(update${noun.name}Command)
  .addCommand(delete${noun.name}Command)
${noun.verbs.map(verb => `  .addCommand(${verb}${noun.name}Command)`).join('\n')}
`
}
