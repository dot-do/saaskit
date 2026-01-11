/**
 * Documentation Generator
 *
 * Generates comprehensive API documentation from SaaS app definitions.
 * Creates Fumadocs-compatible MDX files with proper frontmatter,
 * full-text search indexing, and interactive features.
 *
 * @module docs/generator
 * @description
 * This module provides the core documentation generation functionality for SaaSkit.
 * It transforms app definitions (nouns, verbs, events) into complete documentation
 * sites with:
 *
 * - **Getting Started guides** - Quick start, authentication, first request
 * - **API Reference** - Auto-generated from noun schemas with CRUD + custom verbs
 * - **Webhook documentation** - Event reference with payload schemas
 * - **SDK Quickstarts** - JavaScript, Python, and Go examples
 * - **Full-text search** - Client-side search index generation
 * - **Version support** - Multi-version documentation with switcher
 * - **Changelog** - API change tracking and migration guides
 * - **API Playground** - Interactive endpoint testing configuration
 *
 * @example
 * ```typescript
 * import { generateDocs, DocsGenerator } from 'saaskit/docs'
 *
 * const $ = createSaaS()
 * $.nouns({ User: { name: 'string', email: 'string' } })
 *
 * // Function-based generation
 * const docs = generateDocs($, { appName: 'MyApp' })
 *
 * // Class-based generation with builder pattern
 * const generator = new DocsGenerator($, { appName: 'MyApp' })
 * const docs = generator.generate()
 * ```
 */

import type { SaaSContext, NounDefinitions, NounSchema } from '../database/types'
import type {
  DocsConfig,
  DocsPage,
  GeneratedDocs,
  APIEndpoint,
  EndpointParameter,
  ErrorResponse,
  WebhookEvent,
  SchemaField,
  NavItem,
  OpenAPISpec,
  DocsPlugin,
  SDKQuickstart,
  SearchIndexEntry,
  VersionInfo,
  ChangelogEntry,
} from './types'

// ============================================================================
// Constants
// ============================================================================

/** Standard CRUD verbs that are auto-generated */
const STANDARD_VERBS = ['create', 'update', 'delete', 'get', 'list'] as const

/** Default search configuration */
const DEFAULT_SEARCH_CONFIG = {
  enabled: true,
  fields: ['title', 'description', 'content', 'keywords'] as const,
  maxContentLength: 10000,
  includeCodeBlocks: false,
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Convert noun name to plural form
 *
 * @description
 * Applies simple English pluralization rules. Handles common cases:
 * - Words ending in 'y' -> 'ies' (Category -> Categories)
 * - Words ending in 's', 'x', 'ch', 'sh' -> 'es' (Box -> Boxes)
 * - Default case -> 's' (User -> Users)
 *
 * @param name - Singular noun name
 * @returns Pluralized noun name
 *
 * @example
 * ```typescript
 * pluralize('User')      // 'Users'
 * pluralize('Category')  // 'Categories'
 * pluralize('Box')       // 'Boxes'
 * ```
 */
function pluralize(name: string): string {
  if (name.endsWith('y')) {
    return name.slice(0, -1) + 'ies'
  }
  if (name.endsWith('s') || name.endsWith('x') || name.endsWith('ch') || name.endsWith('sh')) {
    return name + 'es'
  }
  return name + 's'
}

/**
 * Convert noun name to lowercase URL slug
 *
 * @param name - Noun name in any case
 * @returns Lowercase slug
 *
 * @example
 * ```typescript
 * toSlug('UserProfile')  // 'userprofile'
 * ```
 */
function toSlug(name: string): string {
  return name.toLowerCase()
}

/**
 * Convert noun name to lowercase plural URL slug
 *
 * @param name - Singular noun name
 * @returns Lowercase plural slug
 *
 * @example
 * ```typescript
 * toPluralSlug('User')  // 'users'
 * ```
 */
function toPluralSlug(name: string): string {
  return pluralize(name).toLowerCase()
}

/**
 * Convert string to PascalCase
 *
 * @param name - Input string
 * @returns PascalCase string
 */
function toPascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Strip markdown formatting from content for search indexing
 *
 * @param content - Markdown content
 * @returns Plain text content
 */
function stripMarkdown(content: string): string {
  return content
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove headers
    .replace(/#{1,6}\s+/g, '')
    // Remove bold/italic
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate a unique ID for search index entries
 *
 * @param slug - Page slug
 * @param anchor - Optional anchor
 * @returns Unique ID
 */
function generateSearchId(slug: string, anchor?: string): string {
  const base = slug.replace(/\//g, '-')
  return anchor ? `${base}-${anchor}` : base
}

// ============================================================================
// Schema Parsing
// ============================================================================

/**
 * Parse a field definition to extract type information
 *
 * @description
 * Parses the DSL field definition syntax used in noun schemas.
 * Handles:
 * - Primitive types: 'string', 'number', 'boolean', 'date', 'datetime'
 * - Optional fields: 'string?'
 * - Union/enum types: 'pending | paid | shipped'
 * - Forward relationships: '->Customer', '~>Category'
 * - Backward relationships: '<-Order', '<~Product'
 * - Array types: ['->Product']
 *
 * @param fieldDef - Field definition string or array
 * @returns Parsed schema field information
 *
 * @example
 * ```typescript
 * parseField('string')           // { type: 'string', required: true }
 * parseField('string?')          // { type: 'string', required: false }
 * parseField('pending | paid')   // { type: 'enum', required: true, values: ['pending', 'paid'] }
 * parseField('->Customer')       // { type: 'relation', required: true, target: 'Customer' }
 * ```
 */
function parseField(fieldDef: string | [string]): SchemaField {
  // Handle array field definitions
  if (Array.isArray(fieldDef)) {
    const inner = parseField(fieldDef[0])
    return { ...inner, type: `array<${inner.type}>` }
  }

  // Check for optional fields (trailing ?)
  const isOptional = fieldDef.endsWith('?')
  const cleanDef = isOptional ? fieldDef.slice(0, -1) : fieldDef

  // Check for union/enum types (e.g., 'pending | paid | shipped')
  if (cleanDef.includes(' | ')) {
    const values = cleanDef.split(' | ').map((v) => v.trim())
    return { type: 'enum', required: !isOptional, values }
  }

  // Check for forward relationship types (-> or ~>)
  if (cleanDef.startsWith('->') || cleanDef.startsWith('~>')) {
    const target = cleanDef.slice(2)
    return { type: 'relation', required: !isOptional, target }
  }

  // Check for backward relationship types (<- or <~)
  if (cleanDef.startsWith('<-') || cleanDef.startsWith('<~')) {
    const target = cleanDef.slice(2)
    return { type: 'relation', required: !isOptional, target }
  }

  // Primitive types
  return { type: cleanDef, required: !isOptional }
}

// ============================================================================
// Example Value Generation
// ============================================================================

/**
 * Generate example value for a field type
 *
 * @description
 * Creates realistic example values based on field name and type.
 * Uses intelligent defaults based on common field naming conventions.
 *
 * @param fieldName - Name of the field
 * @param field - Parsed schema field
 * @returns Example value appropriate for the field
 *
 * @example
 * ```typescript
 * generateExampleValue('email', { type: 'string', required: true })
 * // Returns: 'user@example.com.ai'
 *
 * generateExampleValue('price', { type: 'number', required: true })
 * // Returns: 99.99
 * ```
 */
function generateExampleValue(fieldName: string, field: SchemaField): unknown {
  switch (field.type) {
    case 'string':
      // Use intelligent defaults based on field name
      if (fieldName === 'email') return 'user@example.com.ai'
      if (fieldName === 'name') return 'John Doe'
      if (fieldName === 'title') return 'Example Title'
      if (fieldName === 'description') return 'A detailed description'
      if (fieldName === 'url') return 'https://example.com.ai'
      if (fieldName === 'phone') return '+1-555-0123'
      return `example_${fieldName}`

    case 'number':
      if (fieldName === 'price' || fieldName === 'total' || fieldName === 'amount') return 99.99
      if (fieldName === 'quantity' || fieldName === 'count') return 10
      if (fieldName === 'age') return 25
      return 42

    case 'boolean':
      // Default booleans based on common naming patterns
      if (fieldName === 'completed' || fieldName === 'done') return false
      if (fieldName === 'active' || fieldName === 'enabled') return true
      return true

    case 'date':
    case 'datetime':
      return new Date().toISOString()

    case 'enum':
      return field.values?.[0] || 'unknown'

    case 'relation':
      return `${toSlug(field.target || 'item')}_abc123`

    case 'markdown':
      return '# Example markdown content'

    default:
      if (field.type.startsWith('array<')) {
        return []
      }
      return null
  }
}

/**
 * Generate a request example object from schema
 *
 * @description
 * Creates an example request body containing all required non-relation fields.
 * Used for POST/PUT endpoint documentation.
 *
 * @param schema - Parsed schema fields
 * @returns Example request object
 */
function generateRequestExample(
  schema: Record<string, SchemaField>
): Record<string, unknown> {
  const example: Record<string, unknown> = {}

  for (const [fieldName, field] of Object.entries(schema)) {
    // Only include required fields that aren't relations in request examples
    if (field.required && field.type !== 'relation') {
      example[fieldName] = generateExampleValue(fieldName, field)
    }
  }

  return example
}

/**
 * Generate a response example object from schema
 *
 * @description
 * Creates an example response body containing all fields plus auto-generated
 * fields (id, createdAt, updatedAt).
 *
 * @param schema - Parsed schema fields
 * @returns Example response object
 */
function generateResponseExample(
  schema: Record<string, SchemaField>
): Record<string, unknown> {
  const example: Record<string, unknown> = { id: 'item_abc123xyz' }

  for (const [fieldName, field] of Object.entries(schema)) {
    example[fieldName] = generateExampleValue(fieldName, field)
  }

  // Add auto-generated timestamps
  example.createdAt = new Date().toISOString()
  example.updatedAt = new Date().toISOString()

  return example
}

// ============================================================================
// Code Example Generators
// ============================================================================

/**
 * Generate curl example for an endpoint
 *
 * @description
 * Creates a properly formatted curl command with:
 * - Correct HTTP method
 * - Authorization header with Bearer token
 * - Content-Type header for JSON
 * - Request body for POST/PUT methods
 *
 * @param endpoint - API endpoint definition
 * @param baseUrl - Base API URL
 * @returns Formatted curl command string
 *
 * @example
 * ```typescript
 * const curl = generateCurlExample(endpoint, 'https://api.example.com.ai')
 * // curl -X POST "https://api.example.com.ai/users" \
 * //   -H "Authorization: Bearer YOUR_API_KEY" \
 * //   -H "Content-Type: application/json" \
 * //   -d '{"name": "John"}'
 * ```
 */
function generateCurlExample(
  endpoint: APIEndpoint,
  baseUrl = 'https://api.example.com.ai'
): string {
  const url = `${baseUrl}${endpoint.path.replace(':id', 'item_abc123')}`

  let curl = `curl -X ${endpoint.method} "${url}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`

  // Add request body for POST/PUT methods
  if (endpoint.requestExample && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
    curl += ` \\
  -d '${JSON.stringify(endpoint.requestExample, null, 2)}'`
  }

  return curl
}

/**
 * Generate JavaScript/TypeScript SDK example
 *
 * @description
 * Creates idiomatic JavaScript code using the SDK client pattern.
 * Uses async/await syntax for modern JavaScript.
 *
 * @param endpoint - API endpoint definition
 * @param nounName - Resource noun name
 * @returns JavaScript code string
 */
function generateJsExample(
  endpoint: APIEndpoint,
  nounName: string
): string {
  const resourceName = toSlug(nounName)
  const pluralName = toPluralSlug(nounName)

  // GET single resource by ID
  if (endpoint.method === 'GET' && endpoint.path.endsWith(':id')) {
    return `const ${resourceName} = await client.${pluralName}.get('item_abc123')`
  }

  // GET list of resources
  if (endpoint.method === 'GET') {
    return `const ${pluralName} = await client.${pluralName}.list()`
  }

  // POST create new resource
  if (endpoint.method === 'POST' && !endpoint.path.includes(':id')) {
    const example = endpoint.requestExample || {}
    return `const ${resourceName} = await client.${pluralName}.create(${JSON.stringify(example, null, 2)})`
  }

  // POST custom verb action
  if (endpoint.method === 'POST' && endpoint.path.includes(':id')) {
    const verbMatch = endpoint.path.match(/\/:id\/(\w+)$/)
    const verb = verbMatch ? verbMatch[1] : 'action'
    return `const result = await client.${pluralName}.${verb}('item_abc123')`
  }

  // PUT update resource
  if (endpoint.method === 'PUT') {
    const example = endpoint.requestExample || {}
    return `const ${resourceName} = await client.${pluralName}.update('item_abc123', ${JSON.stringify(example, null, 2)})`
  }

  // DELETE resource
  if (endpoint.method === 'DELETE') {
    return `await client.${pluralName}.delete('item_abc123')`
  }

  return `// ${endpoint.method} ${endpoint.path}`
}

/**
 * Generate Python SDK example
 *
 * @description
 * Creates idiomatic Python code using the SDK client pattern.
 * Converts JavaScript conventions to Python (snake_case, True/False/None).
 *
 * @param endpoint - API endpoint definition
 * @param nounName - Resource noun name
 * @returns Python code string
 */
function generatePythonExample(
  endpoint: APIEndpoint,
  nounName: string
): string {
  const resourceName = toSlug(nounName)
  const pluralName = toPluralSlug(nounName)

  // Helper to convert JSON to Python dict format
  const toPythonDict = (obj: Record<string, unknown>): string => {
    return JSON.stringify(obj, null, 2)
      .replace(/"/g, '"')
      .replace(/: true/g, ': True')
      .replace(/: false/g, ': False')
      .replace(/: null/g, ': None')
  }

  // GET single resource
  if (endpoint.method === 'GET' && endpoint.path.endsWith(':id')) {
    return `${resourceName} = client.${pluralName}.get("item_abc123")`
  }

  // GET list
  if (endpoint.method === 'GET') {
    return `${pluralName} = client.${pluralName}.list()`
  }

  // POST create
  if (endpoint.method === 'POST' && !endpoint.path.includes(':id')) {
    const example = endpoint.requestExample || {}
    return `${resourceName} = client.${pluralName}.create(${toPythonDict(example)})`
  }

  // POST custom verb
  if (endpoint.method === 'POST' && endpoint.path.includes(':id')) {
    const verbMatch = endpoint.path.match(/\/:id\/(\w+)$/)
    const verb = verbMatch ? verbMatch[1] : 'action'
    return `result = client.${pluralName}.${verb}("item_abc123")`
  }

  // PUT update
  if (endpoint.method === 'PUT') {
    const example = endpoint.requestExample || {}
    return `${resourceName} = client.${pluralName}.update("item_abc123", ${toPythonDict(example)})`
  }

  // DELETE
  if (endpoint.method === 'DELETE') {
    return `client.${pluralName}.delete("item_abc123")`
  }

  return `# ${endpoint.method} ${endpoint.path}`
}

/**
 * Generate Go SDK example
 *
 * @description
 * Creates idiomatic Go code using the SDK client pattern.
 * Uses Go conventions (PascalCase, context, error handling).
 *
 * @param endpoint - API endpoint definition
 * @param nounName - Resource noun name
 * @returns Go code string
 */
function generateGoExample(
  endpoint: APIEndpoint,
  nounName: string
): string {
  const pascalName = toPascalCase(nounName)
  const pluralPascal = pluralize(pascalName)

  // GET single
  if (endpoint.method === 'GET' && endpoint.path.endsWith(':id')) {
    return `${toSlug(nounName)}, err := client.${pluralPascal}.Get(ctx, "item_abc123")`
  }

  // GET list
  if (endpoint.method === 'GET') {
    return `${toPluralSlug(nounName)}, err := client.${pluralPascal}.List(ctx)`
  }

  // POST create
  if (endpoint.method === 'POST' && !endpoint.path.includes(':id')) {
    return `${toSlug(nounName)}, err := client.${pluralPascal}.Create(ctx, &${pascalName}CreateParams{
  // params here
})`
  }

  // POST custom verb
  if (endpoint.method === 'POST' && endpoint.path.includes(':id')) {
    const verbMatch = endpoint.path.match(/\/:id\/(\w+)$/)
    const verb = verbMatch ? verbMatch[1] : 'Action'
    const pascalVerb = toPascalCase(verb)
    return `result, err := client.${pluralPascal}.${pascalVerb}(ctx, "item_abc123")`
  }

  // PUT update
  if (endpoint.method === 'PUT') {
    return `${toSlug(nounName)}, err := client.${pluralPascal}.Update(ctx, "item_abc123", &${pascalName}UpdateParams{
  // params here
})`
  }

  // DELETE
  if (endpoint.method === 'DELETE') {
    return `err := client.${pluralPascal}.Delete(ctx, "item_abc123")`
  }

  return `// ${endpoint.method} ${endpoint.path}`
}

// ============================================================================
// Page Generators
// ============================================================================

/**
 * Generate Getting Started documentation pages
 *
 * @description
 * Creates the Getting Started section with:
 * - Overview page with navigation to subpages
 * - Quick Start guide with SDK installation
 * - Authentication guide with API key usage
 * - Your First Request guide with working examples
 *
 * @param nouns - Defined noun schemas
 * @param config - Documentation configuration
 * @returns Array of Getting Started pages
 */
function generateGettingStartedPages(
  nouns: NounDefinitions,
  config: DocsConfig
): DocsPage[] {
  const appName = config.appName || 'the API'
  const firstNoun = Object.keys(nouns)[0]
  const firstNounLower = firstNoun ? toSlug(firstNoun) : 'resource'
  const firstNounPlural = firstNoun ? toPluralSlug(firstNoun) : 'resources'

  return [
    // Overview page
    {
      slug: 'getting-started',
      title: 'Getting Started',
      content: `# Getting Started

Welcome to ${appName}! This guide will help you get up and running quickly.

<Steps>
1. [Quick Start](/docs/getting-started/quick-start) - Install the SDK and make your first request
2. [Authentication](/docs/getting-started/authentication) - Learn about API keys and auth
3. [Your First Request](/docs/getting-started/your-first-request) - Make your first API call
</Steps>
`,
      frontmatter: {
        title: 'Getting Started',
        description: `Get started with ${appName}`,
      },
      category: 'getting-started',
      searchKeywords: ['start', 'begin', 'introduction', 'setup'],
    },

    // Quick Start page
    {
      slug: 'getting-started/quick-start',
      title: 'Quick Start',
      content: `# Quick Start

Get up and running with ${appName} in minutes.

## Installation

<Tabs items={["npm", "yarn", "pnpm"]}>
<Tab value="npm">
\`\`\`bash
npm install ${config.appName || 'api-client'}
\`\`\`
</Tab>
<Tab value="yarn">
\`\`\`bash
yarn add ${config.appName || 'api-client'}
\`\`\`
</Tab>
<Tab value="pnpm">
\`\`\`bash
pnpm add ${config.appName || 'api-client'}
\`\`\`
</Tab>
</Tabs>

## Initialize the client

\`\`\`typescript
import { Client } from '${config.appName || 'api-client'}'

const client = new Client({
  apiKey: process.env.API_KEY,
})
\`\`\`

## Make your first request

\`\`\`typescript
const ${firstNounPlural} = await client.${firstNounPlural}.list()
console.log(${firstNounPlural})
\`\`\`
`,
      frontmatter: {
        title: 'Quick Start',
        description: `Quick start guide for ${appName}`,
      },
      category: 'getting-started',
      searchKeywords: ['install', 'setup', 'npm', 'yarn', 'pnpm', 'client'],
    },

    // Authentication page
    {
      slug: 'getting-started/authentication',
      title: 'Authentication',
      content: `# Authentication

${appName} uses API keys to authenticate requests.

## Getting your API key

1. Sign in to your dashboard
2. Navigate to Settings > API Keys
3. Click "Create API Key"
4. Copy your new API key

<Callout type="warning">
Keep your API key secure. Never expose it in client-side code or public repositories.
</Callout>

## Using your API key

Include your API key in the Authorization header:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.example.com.ai/${firstNounPlural}
\`\`\`

Or when using the SDK:

\`\`\`typescript
const client = new Client({
  apiKey: 'YOUR_API_KEY',
})
\`\`\`

## Rate limiting

API requests are rate limited to prevent abuse. See our rate limiting documentation for details.
`,
      frontmatter: {
        title: 'Authentication',
        description: 'Learn how to authenticate with the API',
      },
      category: 'getting-started',
      searchKeywords: ['auth', 'api key', 'bearer', 'token', 'authorization', 'security'],
    },

    // Your First Request page
    {
      slug: 'getting-started/your-first-request',
      title: 'Your First Request',
      content: `# Your First Request

Let's make your first API call to ${appName}.

## Using curl

\`\`\`bash
curl -X GET "https://api.example.com.ai/${firstNounPlural}" \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

## Using fetch

\`\`\`javascript
const response = await fetch('https://api.example.com.ai/${firstNounPlural}', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
  },
})
const ${firstNounPlural} = await response.json()
console.log(${firstNounPlural})
\`\`\`

## Using the SDK

\`\`\`typescript
import { Client } from '${config.appName || 'api-client'}'

const client = new Client({
  apiKey: process.env.API_KEY,
})

// List all ${firstNounPlural}
const ${firstNounPlural} = await client.${firstNounPlural}.list()

// Get a specific ${firstNounLower}
const ${firstNounLower} = await client.${firstNounPlural}.get('${firstNounLower}_abc123')

// Create a new ${firstNounLower}
const new${firstNoun} = await client.${firstNounPlural}.create({
  name: 'Example',
})
\`\`\`
`,
      frontmatter: {
        title: 'Your First Request',
        description: 'Make your first API request',
      },
      category: 'getting-started',
      searchKeywords: ['request', 'curl', 'fetch', 'example', 'tutorial'],
    },
  ]
}

/**
 * Generate API Reference page for a noun
 *
 * @description
 * Creates comprehensive API reference documentation for a resource including:
 * - All CRUD endpoints (List, Get, Create, Update, Delete)
 * - Custom verb endpoints (e.g., /orders/:id/ship)
 * - Request/response examples
 * - Parameter documentation
 * - Error responses
 * - Code examples in curl, JavaScript, Python, and Go
 *
 * @param nounName - Name of the noun/resource
 * @param schema - Noun schema definition
 * @param verbs - Verb handlers for this noun
 * @param config - Documentation configuration
 * @returns Documentation page for the noun
 */
function generateAPIReferencePage(
  nounName: string,
  schema: NounSchema,
  verbs: Record<string, (...args: unknown[]) => unknown>,
  config: DocsConfig
): DocsPage {
  const pluralName = pluralize(nounName)
  const slugName = toPluralSlug(nounName)

  // Parse schema fields
  const parsedSchema: Record<string, SchemaField> = {}
  for (const [fieldName, fieldDef] of Object.entries(schema)) {
    parsedSchema[fieldName] = parseField(fieldDef)
  }

  const requestExample = generateRequestExample(parsedSchema)
  const responseExample = generateResponseExample(parsedSchema)

  // Build endpoint list - standard CRUD first
  const endpoints: APIEndpoint[] = [
    // List endpoint
    {
      method: 'GET',
      path: `/${slugName}`,
      description: `List all ${pluralName.toLowerCase()}`,
      responseExample: [responseExample],
      parameters: [
        { name: 'limit', type: 'number', required: false, description: 'Maximum number of results', location: 'query' },
        { name: 'offset', type: 'number', required: false, description: 'Number of results to skip', location: 'query' },
      ],
      errorResponses: [
        { status: 401, description: 'Unauthorized - Invalid or missing API key' },
      ],
      tags: [pluralName],
    },

    // Get single endpoint
    {
      method: 'GET',
      path: `/${slugName}/:id`,
      description: `Get a ${nounName.toLowerCase()} by ID`,
      responseExample,
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'The ID of the resource', location: 'path' },
      ],
      errorResponses: [
        { status: 401, description: 'Unauthorized - Invalid or missing API key' },
        { status: 404, description: `${nounName} not found` },
      ],
      tags: [pluralName],
    },

    // Create endpoint
    {
      method: 'POST',
      path: `/${slugName}`,
      description: `Create a new ${nounName.toLowerCase()}`,
      requestExample,
      responseExample,
      parameters: Object.entries(parsedSchema)
        .filter(([, field]) => field.type !== 'relation')
        .map(([name, field]) => ({
          name,
          type: field.type,
          required: field.required,
          description: field.values ? `One of: ${field.values.join(', ')}` : undefined,
          location: 'body' as const,
        })),
      errorResponses: [
        { status: 401, description: 'Unauthorized - Invalid or missing API key' },
        { status: 400, description: 'Bad request - Invalid input data' },
      ],
      tags: [pluralName],
    },

    // Update endpoint
    {
      method: 'PUT',
      path: `/${slugName}/:id`,
      description: `Update a ${nounName.toLowerCase()}`,
      requestExample,
      responseExample,
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'The ID of the resource', location: 'path' },
        ...Object.entries(parsedSchema)
          .filter(([, field]) => field.type !== 'relation')
          .map(([name, field]) => ({
            name,
            type: field.type,
            required: false, // Updates usually have optional fields
            description: field.values ? `One of: ${field.values.join(', ')}` : undefined,
            location: 'body' as const,
          })),
      ],
      errorResponses: [
        { status: 401, description: 'Unauthorized - Invalid or missing API key' },
        { status: 404, description: `${nounName} not found` },
        { status: 400, description: 'Bad request - Invalid input data' },
      ],
      tags: [pluralName],
    },

    // Delete endpoint
    {
      method: 'DELETE',
      path: `/${slugName}/:id`,
      description: `Delete a ${nounName.toLowerCase()}`,
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'The ID of the resource', location: 'path' },
      ],
      errorResponses: [
        { status: 401, description: 'Unauthorized - Invalid or missing API key' },
        { status: 404, description: `${nounName} not found` },
      ],
      tags: [pluralName],
    },
  ]

  // Add custom verb endpoints
  for (const verbName of Object.keys(verbs)) {
    if (!STANDARD_VERBS.includes(verbName as typeof STANDARD_VERBS[number])) {
      endpoints.push({
        method: 'POST',
        path: `/${slugName}/:id/${verbName}`,
        description: `${toPascalCase(verbName)} a ${nounName.toLowerCase()}`,
        responseExample,
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'The ID of the resource', location: 'path' },
        ],
        errorResponses: [
          { status: 401, description: 'Unauthorized - Invalid or missing API key' },
          { status: 404, description: `${nounName} not found` },
        ],
        tags: [pluralName],
      })
    }
  }

  // Generate code examples for each endpoint
  for (const endpoint of endpoints) {
    endpoint.curlExample = generateCurlExample(endpoint)
    endpoint.jsExample = generateJsExample(endpoint, nounName)
    endpoint.pythonExample = generatePythonExample(endpoint, nounName)
    endpoint.goExample = generateGoExample(endpoint, nounName)
  }

  // Check for custom template
  if (config.templates?.apiReference) {
    return {
      slug: `api-reference/${slugName}`,
      title: pluralName,
      content: config.templates.apiReference(nounName),
      frontmatter: {
        title: pluralName,
        description: `API reference for ${pluralName}`,
      },
      endpoints,
      schema: parsedSchema,
      category: 'api-reference',
      searchKeywords: [nounName.toLowerCase(), slugName, ...Object.keys(parsedSchema)],
    }
  }

  // Generate default content with endpoint table and schema documentation
  const content = `# ${pluralName}

${nounName} resources and endpoints.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
${endpoints.map((e) => `| \`${e.method}\` | \`${e.path}\` | ${e.description} |`).join('\n')}

## Schema

| Field | Type | Required |
|-------|------|----------|
${Object.entries(parsedSchema)
  .map(([name, field]) => `| \`${name}\` | \`${field.type}\` | ${field.required ? 'Yes' : 'No'} |`)
  .join('\n')}
`

  return {
    slug: `api-reference/${slugName}`,
    title: pluralName,
    content,
    frontmatter: {
      title: pluralName,
      description: `API reference for ${pluralName}`,
    },
    endpoints,
    schema: parsedSchema,
    category: 'api-reference',
    searchKeywords: [nounName.toLowerCase(), slugName, ...Object.keys(parsedSchema)],
  }
}

/**
 * Generate Webhooks documentation page
 *
 * @description
 * Creates webhook documentation including:
 * - Setup instructions
 * - Signature verification guide
 * - Retry policy documentation
 * - All registered event types with payload schemas
 *
 * @param nouns - Noun definitions for payload schemas
 * @param eventHandlers - Registered event handlers
 * @returns Webhooks documentation page
 */
function generateWebhooksPage(
  nouns: NounDefinitions,
  eventHandlers: Record<string, Array<(...args: unknown[]) => unknown>>
): DocsPage {
  const events: WebhookEvent[] = []

  // Generate events from registered handlers
  for (const eventKey of Object.keys(eventHandlers)) {
    const [nounName, eventType] = eventKey.split('.')
    const nounSchema = nouns[toPascalCase(nounName)]

    // Build payload schema from noun definition
    const payload: Record<string, unknown> = { id: 'string' }
    if (nounSchema) {
      for (const [fieldName, fieldDef] of Object.entries(nounSchema)) {
        const parsed = parseField(fieldDef)
        payload[fieldName] = parsed.type
      }
    }

    events.push({
      name: eventKey,
      description: `Triggered when a ${nounName} is ${eventType}`,
      payload,
      examplePayload: {
        event: eventKey,
        data: {
          id: `${nounName}_abc123`,
          ...generateRequestExample(
            Object.fromEntries(
              Object.entries(nounSchema || {}).map(([k, v]) => [k, parseField(v)])
            )
          ),
        },
        timestamp: new Date().toISOString(),
      },
    })
  }

  const content = `# Webhooks

Webhooks allow you to receive real-time notifications when events occur in your account.

## Setting up webhooks

1. Go to Settings > Webhooks in your dashboard
2. Click "Add Webhook"
3. Enter your endpoint URL
4. Select the events you want to receive

## Verifying webhook signatures

All webhook requests include a signature in the \`X-Webhook-Signature\` header. You should verify this signature to ensure the request is authentic.

\`\`\`typescript
import crypto from 'crypto'

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}
\`\`\`

## Retry policy

If your endpoint returns an error (non-2xx status code), we'll retry the webhook with exponential backoff:

- First retry: 1 minute
- Second retry: 5 minutes
- Third retry: 30 minutes
- Fourth retry: 2 hours
- Fifth retry: 24 hours

After 5 failed attempts, the webhook will be marked as failed.

## Events

${events.map((e) => `### ${e.name}

${e.description}

**Example payload:**

\`\`\`json
${JSON.stringify(e.examplePayload, null, 2)}
\`\`\`
`).join('\n')}
`

  return {
    slug: 'webhooks',
    title: 'Webhooks',
    content,
    frontmatter: {
      title: 'Webhooks',
      description: 'Webhook events and configuration',
    },
    events,
    category: 'webhooks',
    searchKeywords: ['webhook', 'event', 'notification', 'callback', 'signature', 'retry'],
  }
}

/**
 * Generate SDK quickstart pages
 *
 * @description
 * Creates SDK documentation for JavaScript, Python, and Go including:
 * - Installation instructions
 * - Client initialization
 * - CRUD operation examples
 * - Custom verb examples
 *
 * @param nouns - Noun definitions for examples
 * @param verbs - Verb definitions for custom actions
 * @param config - Documentation configuration
 * @returns Array of SDK quickstart pages
 */
function generateSDKPages(
  nouns: NounDefinitions,
  verbs: Record<string, Record<string, (...args: unknown[]) => unknown>>,
  config: DocsConfig
): SDKQuickstart[] {
  const appName = config.appName || 'api-client'
  const firstNoun = Object.keys(nouns)[0]
  const firstNounLower = firstNoun ? toSlug(firstNoun) : 'resource'
  const firstNounPlural = firstNoun ? toPluralSlug(firstNoun) : 'resources'

  // Find first custom verb for examples
  const customVerbs = Object.entries(verbs)
    .flatMap(([noun, nounVerbs]) =>
      Object.keys(nounVerbs)
        .filter((v) => !STANDARD_VERBS.includes(v as typeof STANDARD_VERBS[number]))
        .map((v) => ({ noun, verb: v }))
    )
  const firstCustomVerb = customVerbs[0]

  return [
    // JavaScript SDK
    {
      slug: 'sdks/javascript',
      title: 'JavaScript SDK',
      language: 'javascript',
      packageName: appName,
      content: `# JavaScript SDK

The official JavaScript/TypeScript SDK for ${appName}.

## Installation

\`\`\`bash
npm install ${appName}
# or
yarn add ${appName}
# or
pnpm add ${appName}
\`\`\`

## Quick start

\`\`\`typescript
import { Client } from '${appName}'

const client = new Client({
  apiKey: process.env.API_KEY,
})

// List ${firstNounPlural}
const ${firstNounPlural} = await client.${firstNounPlural}.list()

// Create a ${firstNounLower}
const ${firstNounLower} = await client.${firstNounPlural}.create({
  name: 'Example',
})
\`\`\`
`,
      frontmatter: {
        title: 'JavaScript SDK',
        description: `JavaScript/TypeScript SDK for ${appName}`,
      },
      initCode: `import { Client } from '${appName}'

const client = new Client({
  apiKey: process.env.API_KEY,
})`,
      examples: {
        create: `const ${firstNounLower} = await client.${firstNounPlural}.create({
  name: 'Example',
})`,
        list: `const ${firstNounPlural} = await client.${firstNounPlural}.list()`,
        get: `const ${firstNounLower} = await client.${firstNounPlural}.get('${firstNounLower}_abc123')`,
        update: `const updated = await client.${firstNounPlural}.update('${firstNounLower}_abc123', {
  name: 'Updated',
})`,
        delete: `await client.${firstNounPlural}.delete('${firstNounLower}_abc123')`,
        ...(firstCustomVerb
          ? {
              [firstCustomVerb.verb]: `const result = await client.${toPluralSlug(firstCustomVerb.noun)}.${firstCustomVerb.verb}('${toSlug(firstCustomVerb.noun)}_abc123')
// ${toSlug(firstCustomVerb.noun)} ${firstCustomVerb.verb}`,
            }
          : {}),
      },
      category: 'sdks',
      searchKeywords: ['javascript', 'typescript', 'npm', 'node', 'sdk', 'client'],
    },

    // Python SDK
    {
      slug: 'sdks/python',
      title: 'Python SDK',
      language: 'python',
      packageName: appName.replace(/-/g, '_'),
      content: `# Python SDK

The official Python SDK for ${appName}.

## Installation

\`\`\`bash
pip install ${appName}
# or
poetry add ${appName}
\`\`\`

## Quick start

\`\`\`python
from ${appName.replace(/-/g, '_')} import Client

client = Client(api_key="YOUR_API_KEY")

# List ${firstNounPlural}
${firstNounPlural} = client.${firstNounPlural}.list()

# Create a ${firstNounLower}
${firstNounLower} = client.${firstNounPlural}.create(
    name="Example"
)
\`\`\`
`,
      frontmatter: {
        title: 'Python SDK',
        description: `Python SDK for ${appName}`,
      },
      initCode: `from ${appName.replace(/-/g, '_')} import Client

client = Client(api_key="YOUR_API_KEY")`,
      examples: {
        create: `${firstNounLower} = client.${firstNounPlural}.create(name="Example")`,
        list: `${firstNounPlural} = client.${firstNounPlural}.list()`,
        get: `${firstNounLower} = client.${firstNounPlural}.get("${firstNounLower}_abc123")`,
        update: `updated = client.${firstNounPlural}.update("${firstNounLower}_abc123", name="Updated")`,
        delete: `client.${firstNounPlural}.delete("${firstNounLower}_abc123")`,
      },
      category: 'sdks',
      searchKeywords: ['python', 'pip', 'poetry', 'sdk', 'client'],
    },

    // Go SDK
    {
      slug: 'sdks/go',
      title: 'Go SDK',
      language: 'go',
      packageName: appName,
      content: `# Go SDK

The official Go SDK for ${appName}.

## Installation

\`\`\`bash
go get github.com/example/${appName}
\`\`\`

## Quick start

\`\`\`go
package main

import (
    "context"
    "${appName}"
)

func main() {
    client := ${appName.replace(/-/g, '')}.NewClient("YOUR_API_KEY")
    ctx := context.Background()

    // List ${firstNounPlural}
    ${firstNounPlural}, err := client.${pluralize(firstNoun)}.List(ctx)

    // Create a ${firstNounLower}
    ${firstNounLower}, err := client.${pluralize(firstNoun)}.Create(ctx, &${firstNoun}CreateParams{
        Name: "Example",
    })
}
\`\`\`
`,
      frontmatter: {
        title: 'Go SDK',
        description: `Go SDK for ${appName}`,
      },
      initCode: `package main

import (
    "context"
    "${appName}"
)

client := ${appName.replace(/-/g, '')}.NewClient("YOUR_API_KEY")`,
      examples: {
        create: `${firstNounLower}, err := client.${pluralize(firstNoun)}.Create(ctx, &${firstNoun}CreateParams{
    Name: "Example",
})`,
        list: `${firstNounPlural}, err := client.${pluralize(firstNoun)}.List(ctx)`,
        get: `${firstNounLower}, err := client.${pluralize(firstNoun)}.Get(ctx, "${firstNounLower}_abc123")`,
        update: `updated, err := client.${pluralize(firstNoun)}.Update(ctx, "${firstNounLower}_abc123", &${firstNoun}UpdateParams{
    Name: "Updated",
})`,
        delete: `err := client.${pluralize(firstNoun)}.Delete(ctx, "${firstNounLower}_abc123")`,
      },
      category: 'sdks',
      searchKeywords: ['go', 'golang', 'sdk', 'client'],
    },
  ]
}

// ============================================================================
// Search Index Generation
// ============================================================================

/**
 * Generate search index from documentation pages
 *
 * @description
 * Creates a search index for full-text search functionality.
 * Extracts searchable content from pages, endpoints, and events.
 *
 * @param pages - Generated documentation pages
 * @param config - Search configuration
 * @returns Array of search index entries
 */
function generateSearchIndex(pages: DocsPage[], config: DocsConfig): SearchIndexEntry[] {
  const searchConfig = { ...DEFAULT_SEARCH_CONFIG, ...config.search }
  if (!searchConfig.enabled) return []

  const entries: SearchIndexEntry[] = []

  for (const page of pages) {
    // Add page entry
    entries.push({
      id: generateSearchId(page.slug),
      slug: page.slug,
      title: page.title,
      description: page.frontmatter?.description,
      content: stripMarkdown(page.content).slice(0, searchConfig.maxContentLength),
      type: 'page',
      keywords: page.searchKeywords,
      category: page.category,
    })

    // Add endpoint entries
    if (page.endpoints) {
      for (const endpoint of page.endpoints) {
        const anchor = `${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[/:]/g, '-')}`
        entries.push({
          id: generateSearchId(page.slug, anchor),
          slug: page.slug,
          title: `${endpoint.method} ${endpoint.path}`,
          description: endpoint.description,
          content: endpoint.description || '',
          type: 'endpoint',
          anchor,
          keywords: endpoint.tags,
          category: 'api-reference',
        })
      }
    }

    // Add event entries
    if (page.events) {
      for (const event of page.events) {
        const anchor = event.name.replace(/\./g, '-')
        entries.push({
          id: generateSearchId(page.slug, anchor),
          slug: page.slug,
          title: event.name,
          description: event.description,
          content: event.description || '',
          type: 'event',
          anchor,
          keywords: ['webhook', 'event'],
          category: 'webhooks',
        })
      }
    }
  }

  return entries
}

// ============================================================================
// OpenAPI Generation
// ============================================================================

/**
 * Generate OpenAPI specification
 *
 * @description
 * Creates an OpenAPI 3.0 specification from the app definition.
 * Compatible with Fumadocs OpenAPI plugin and other tools.
 *
 * @param nouns - Noun definitions
 * @param verbs - Verb definitions
 * @param config - Documentation configuration
 * @returns OpenAPI specification object
 */
function generateOpenAPISpec(
  nouns: NounDefinitions,
  verbs: Record<string, Record<string, (...args: unknown[]) => unknown>>,
  config: DocsConfig
): OpenAPISpec {
  const paths: Record<string, Record<string, unknown>> = {}
  const tags: Array<{ name: string; description?: string }> = []

  for (const [nounName, schema] of Object.entries(nouns)) {
    const slugName = toPluralSlug(nounName)
    const nounVerbs = verbs[nounName] || {}

    // Add tag for this resource
    tags.push({
      name: pluralize(nounName),
      description: `${nounName} resource operations`,
    })

    // Parse schema for OpenAPI properties
    const properties: Record<string, unknown> = { id: { type: 'string' } }
    const required: string[] = []

    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const parsed = parseField(fieldDef)

      if (parsed.type === 'enum') {
        properties[fieldName] = { type: 'string', enum: parsed.values }
      } else if (parsed.type === 'relation') {
        properties[fieldName] = {
          type: 'string',
          description: `ID of related ${parsed.target}`,
        }
      } else {
        properties[fieldName] = {
          type: parsed.type === 'number' ? 'number' : parsed.type === 'boolean' ? 'boolean' : 'string',
        }
      }

      if (parsed.required) {
        required.push(fieldName)
      }
    }

    // List and Create endpoints
    paths[`/${slugName}`] = {
      get: {
        summary: `List ${pluralize(nounName)}`,
        tags: [pluralize(nounName)],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' }, description: 'Maximum results' },
          { name: 'offset', in: 'query', schema: { type: 'integer' }, description: 'Results to skip' },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object', properties } },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        summary: `Create a ${nounName}`,
        tags: [pluralize(nounName)],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', properties, required },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    }

    // Single resource endpoints
    paths[`/${slugName}/{id}`] = {
      get: {
        summary: `Get a ${nounName}`,
        tags: [pluralize(nounName)],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'object', properties },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        summary: `Update a ${nounName}`,
        tags: [pluralize(nounName)],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', properties },
            },
          },
        },
        responses: {
          '200': { description: 'Updated' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        summary: `Delete a ${nounName}`,
        tags: [pluralize(nounName)],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
    }

    // Custom verb endpoints
    for (const verbName of Object.keys(nounVerbs)) {
      if (!STANDARD_VERBS.includes(verbName as typeof STANDARD_VERBS[number])) {
        paths[`/${slugName}/{id}/${verbName}`] = {
          post: {
            summary: `${toPascalCase(verbName)} a ${nounName}`,
            tags: [pluralize(nounName)],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              '200': { description: 'Success' },
              '401': { description: 'Unauthorized' },
              '404': { description: 'Not found' },
            },
          },
        }
      }
    }
  }

  return {
    openapi: '3.0.0',
    info: {
      title: config.appName || 'API',
      version: config.version || '1.0.0',
      description: `API documentation for ${config.appName || 'the API'}`,
    },
    servers: config.baseUrl ? [{ url: `https://${config.baseUrl}`, description: 'Production' }] : undefined,
    paths,
    tags,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  }
}

// ============================================================================
// Navigation Generation
// ============================================================================

/**
 * Generate navigation structure
 *
 * @description
 * Creates the sidebar navigation structure for Fumadocs.
 *
 * @param pages - Generated documentation pages
 * @param config - Documentation configuration
 * @returns Navigation tree
 */
function generateNavigation(pages: DocsPage[], config: DocsConfig): NavItem[] {
  const nav: NavItem[] = [
    {
      title: 'Getting Started',
      slug: 'getting-started',
      icon: 'rocket',
      defaultOpen: true,
      children: pages
        .filter((p) => p.slug.startsWith('getting-started/'))
        .map((p) => ({ title: p.title, slug: p.slug })),
    },
    {
      title: 'API Reference',
      slug: 'api-reference',
      icon: 'code',
      children: pages
        .filter((p) => p.slug.startsWith('api-reference/'))
        .map((p) => ({ title: p.title, slug: p.slug })),
    },
    {
      title: 'Webhooks',
      slug: 'webhooks',
      icon: 'webhook',
    },
    {
      title: 'SDKs',
      slug: 'sdks',
      icon: 'package',
      children: pages
        .filter((p) => p.slug.startsWith('sdks/'))
        .map((p) => ({ title: p.title, slug: p.slug })),
    },
  ]

  // Add changelog link if changelog exists
  if (config.changelog && config.changelog.length > 0) {
    nav.push({
      title: 'Changelog',
      slug: 'changelog',
      icon: 'history',
    })
  }

  return nav
}

// ============================================================================
// File Structure Generation
// ============================================================================

/**
 * Generate file structure from documentation pages
 *
 * @description
 * Converts documentation pages to a file structure suitable for
 * static site generation. Creates MDX files with frontmatter.
 *
 * @param pages - Generated documentation pages
 * @returns Map of file paths to file contents
 */
function generateFileStructure(pages: DocsPage[]): Record<string, string> {
  const files: Record<string, string> = {}

  for (const page of pages) {
    // Generate frontmatter
    const frontmatter = page.frontmatter
      ? `---\n${Object.entries(page.frontmatter)
          .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
          .join('\n')}\n---\n\n`
      : ''

    // Determine file path
    const fileName = page.slug.includes('/') ? `${page.slug}.mdx` : `${page.slug}/index.mdx`
    files[fileName] = frontmatter + page.content
  }

  return files
}

/**
 * Generate changelog page content
 *
 * @param entries - Changelog entries
 * @param config - Documentation configuration
 * @returns Changelog documentation page
 */
function generateChangelogPage(entries: ChangelogEntry[], config: DocsConfig): DocsPage {
  const groupedByVersion = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.version]) {
        acc[entry.version] = []
      }
      acc[entry.version].push(entry)
      return acc
    },
    {} as Record<string, ChangelogEntry[]>
  )

  const content = `# Changelog

All notable changes to ${config.appName || 'the API'} are documented here.

${Object.entries(groupedByVersion)
  .map(
    ([version, versionEntries]) => `## ${version}

${versionEntries
  .map(
    (entry) => `### ${entry.type === 'added' ? 'Added' : entry.type === 'changed' ? 'Changed' : entry.type === 'deprecated' ? 'Deprecated' : entry.type === 'removed' ? 'Removed' : entry.type === 'fixed' ? 'Fixed' : 'Security'}: ${entry.title}

${entry.breaking ? '<Callout type="warning">Breaking Change</Callout>\n\n' : ''}${entry.description || ''}

${entry.migrationGuide ? `**Migration guide:**\n\n${entry.migrationGuide}` : ''}`
  )
  .join('\n\n')}`
  )
  .join('\n\n')}`

  return {
    slug: 'changelog',
    title: 'Changelog',
    content,
    frontmatter: {
      title: 'Changelog',
      description: `Changelog for ${config.appName || 'the API'}`,
    },
    category: 'changelog',
    searchKeywords: ['changelog', 'release', 'update', 'version', 'breaking'],
  }
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Generate documentation from a SaaS context
 *
 * @description
 * Main entry point for documentation generation. Takes a SaaS context
 * and configuration options, returning complete documentation including:
 * - All documentation pages
 * - Navigation structure
 * - Search index
 * - OpenAPI specification
 * - File structure generator
 *
 * @param context - SaaS context with noun/verb definitions
 * @param config - Documentation configuration options
 * @returns Complete generated documentation
 *
 * @example
 * ```typescript
 * const $ = createSaaS()
 * $.nouns({ User: { name: 'string', email: 'string' } })
 *
 * const docs = generateDocs($, {
 *   appName: 'MyApp',
 *   baseUrl: 'api.myapp.com',
 *   version: '1.0.0',
 *   search: { enabled: true },
 * })
 *
 * // Export as files
 * const files = docs.toFileStructure()
 *
 * // Get search index
 * const searchJson = docs.toSearchIndex?.()
 * ```
 */
export function generateDocs(
  context: SaaSContext,
  config: DocsConfig = {}
): GeneratedDocs {
  const nouns = context.getNounDefinitions() || {}
  const verbs = context.getVerbDefinitions()
  const eventHandlers = context.getEventHandlers()

  const pages: DocsPage[] = []

  // Getting Started pages
  pages.push(...generateGettingStartedPages(nouns, config))

  // API Reference pages for each noun
  for (const [nounName, schema] of Object.entries(nouns)) {
    const nounVerbs = verbs[nounName] || {}
    pages.push(generateAPIReferencePage(nounName, schema, nounVerbs, config))
  }

  // Webhooks page
  pages.push(generateWebhooksPage(nouns, eventHandlers))

  // SDK pages
  pages.push(...generateSDKPages(nouns, verbs, config))

  // Changelog page if entries exist
  if (config.changelog && config.changelog.length > 0) {
    pages.push(generateChangelogPage(config.changelog, config))
  }

  // Generate search index
  const searchIndex = generateSearchIndex(pages, config)

  // Generate navigation and OpenAPI spec
  const navigation = generateNavigation(pages, config)
  const openapi = generateOpenAPISpec(nouns, verbs, config)

  const docs: GeneratedDocs = {
    pages,
    config,
    baseUrl: config.baseUrl,
    version: config.version,
    navigation,
    meta: {
      pages: pages.map((p) => p.slug),
    },
    openapi,
    searchIndex,
    versions: config.versions,
    changelog: config.changelog,
    toFileStructure: () => generateFileStructure(pages),
    toSearchIndex: () => JSON.stringify(searchIndex, null, 2),
    toOpenAPIYaml: () => {
      // Simple YAML conversion (for full YAML support, use a library)
      return JSON.stringify(openapi, null, 2)
    },
  }

  // Apply plugins
  if (config.plugins) {
    let result = docs
    for (const plugin of config.plugins) {
      if (plugin.beforeGenerate) {
        // Note: beforeGenerate modifies config, already applied
      }
      if (plugin.afterGenerate) {
        result = plugin.afterGenerate(result)
      }
    }
    return result
  }

  return docs
}

/**
 * DocsGenerator class for builder-style documentation generation
 *
 * @description
 * Provides a class-based API for documentation generation with
 * builder pattern support and incremental generation capabilities.
 *
 * @example
 * ```typescript
 * const generator = new DocsGenerator($, {
 *   appName: 'MyApp',
 *   version: '2.0.0',
 * })
 *
 * // Generate all documentation
 * const docs = generator.generate()
 *
 * // Generate for specific noun only
 * const userDocs = generator.generateForNoun('User')
 * ```
 */
export class DocsGenerator {
  private context: SaaSContext
  private config: DocsConfig

  /**
   * Create a new DocsGenerator
   *
   * @param context - SaaS context with noun/verb definitions
   * @param config - Documentation configuration options
   */
  constructor(context: SaaSContext, config: DocsConfig = {}) {
    this.context = context
    this.config = config
  }

  /**
   * Generate complete documentation
   *
   * @returns Complete generated documentation
   */
  generate(): GeneratedDocs {
    return generateDocs(this.context, this.config)
  }

  /**
   * Generate documentation for a specific noun
   *
   * @description
   * Useful for incremental generation or when you only need
   * documentation for a single resource.
   *
   * @param nounName - Name of the noun to generate docs for
   * @returns Documentation page for the noun
   * @throws Error if noun is not found
   */
  generateForNoun(nounName: string): DocsPage {
    const nouns = this.context.getNounDefinitions() || {}
    const verbs = this.context.getVerbDefinitions()

    const schema = nouns[nounName]
    if (!schema) {
      throw new Error(`Noun "${nounName}" not found`)
    }

    const nounVerbs = verbs[nounName] || {}
    return generateAPIReferencePage(nounName, schema, nounVerbs, this.config)
  }

  /**
   * Get the current configuration
   *
   * @returns Current documentation configuration
   */
  getConfig(): DocsConfig {
    return this.config
  }

  /**
   * Update configuration
   *
   * @param config - Partial configuration to merge
   * @returns This generator instance for chaining
   */
  withConfig(config: Partial<DocsConfig>): DocsGenerator {
    this.config = { ...this.config, ...config }
    return this
  }
}
