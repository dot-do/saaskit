/**
 * Documentation Generator
 *
 * Generates API documentation from SaaS app definition.
 * Creates Fumadocs-compatible MDX files with proper frontmatter.
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
} from './types'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert noun name to plural (simple pluralization)
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
 * Convert noun name to lowercase slug
 */
function toSlug(name: string): string {
  return name.toLowerCase()
}

/**
 * Convert noun name to lowercase plural slug
 */
function toPluralSlug(name: string): string {
  return pluralize(name).toLowerCase()
}

/**
 * Parse a field definition to extract type information
 */
function parseField(fieldDef: string | [string]): SchemaField {
  // Handle array field definitions
  if (Array.isArray(fieldDef)) {
    const inner = parseField(fieldDef[0])
    return { ...inner, type: `array<${inner.type}>` }
  }

  // Check for optional fields
  const isOptional = fieldDef.endsWith('?')
  const cleanDef = isOptional ? fieldDef.slice(0, -1) : fieldDef

  // Check for union/enum types (e.g., 'pending | paid | shipped')
  if (cleanDef.includes(' | ')) {
    const values = cleanDef.split(' | ').map((v) => v.trim())
    return { type: 'enum', required: !isOptional, values }
  }

  // Check for relationship types
  if (cleanDef.startsWith('->') || cleanDef.startsWith('~>')) {
    const target = cleanDef.slice(2)
    return { type: 'relation', required: !isOptional, target }
  }

  if (cleanDef.startsWith('<-') || cleanDef.startsWith('<~')) {
    const target = cleanDef.slice(2)
    return { type: 'relation', required: !isOptional, target }
  }

  // Primitive types
  return { type: cleanDef, required: !isOptional }
}

/**
 * Generate example value for a field type
 */
function generateExampleValue(fieldName: string, field: SchemaField): unknown {
  switch (field.type) {
    case 'string':
      if (fieldName === 'email') return 'user@example.com'
      if (fieldName === 'name') return 'John Doe'
      return `example_${fieldName}`
    case 'number':
      if (fieldName === 'price' || fieldName === 'total') return 99.99
      if (fieldName === 'quantity') return 10
      return 42
    case 'boolean':
      return fieldName === 'completed' ? false : true
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
 */
function generateRequestExample(
  schema: Record<string, SchemaField>
): Record<string, unknown> {
  const example: Record<string, unknown> = {}
  for (const [fieldName, field] of Object.entries(schema)) {
    if (field.required && field.type !== 'relation') {
      example[fieldName] = generateExampleValue(fieldName, field)
    }
  }
  return example
}

/**
 * Generate a response example object from schema
 */
function generateResponseExample(
  schema: Record<string, SchemaField>
): Record<string, unknown> {
  const example: Record<string, unknown> = { id: 'item_abc123xyz' }
  for (const [fieldName, field] of Object.entries(schema)) {
    example[fieldName] = generateExampleValue(fieldName, field)
  }
  example.createdAt = new Date().toISOString()
  example.updatedAt = new Date().toISOString()
  return example
}

// ============================================================================
// Code Example Generators
// ============================================================================

/**
 * Generate curl example for an endpoint
 */
function generateCurlExample(
  endpoint: APIEndpoint,
  baseUrl = 'https://api.example.com'
): string {
  const url = `${baseUrl}${endpoint.path.replace(':id', 'item_abc123')}`

  let curl = `curl -X ${endpoint.method} "${url}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`

  if (endpoint.requestExample && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
    curl += ` \\
  -d '${JSON.stringify(endpoint.requestExample, null, 2)}'`
  }

  return curl
}

/**
 * Generate JavaScript example for an endpoint
 */
function generateJsExample(
  endpoint: APIEndpoint,
  nounName: string
): string {
  const resourceName = toSlug(nounName)
  const pluralName = toPluralSlug(nounName)

  if (endpoint.method === 'GET' && endpoint.path.endsWith(':id')) {
    return `const ${resourceName} = await client.${pluralName}.get('item_abc123')`
  }

  if (endpoint.method === 'GET') {
    return `const ${pluralName} = await client.${pluralName}.list()`
  }

  if (endpoint.method === 'POST' && !endpoint.path.includes(':id')) {
    const example = endpoint.requestExample || {}
    return `const ${resourceName} = await client.${pluralName}.create(${JSON.stringify(example, null, 2)})`
  }

  if (endpoint.method === 'POST' && endpoint.path.includes(':id')) {
    const verbMatch = endpoint.path.match(/\/:id\/(\w+)$/)
    const verb = verbMatch ? verbMatch[1] : 'action'
    return `const result = await client.${pluralName}.${verb}('item_abc123')`
  }

  if (endpoint.method === 'PUT') {
    const example = endpoint.requestExample || {}
    return `const ${resourceName} = await client.${pluralName}.update('item_abc123', ${JSON.stringify(example, null, 2)})`
  }

  if (endpoint.method === 'DELETE') {
    return `await client.${pluralName}.delete('item_abc123')`
  }

  return `// ${endpoint.method} ${endpoint.path}`
}

/**
 * Generate Python example for an endpoint
 */
function generatePythonExample(
  endpoint: APIEndpoint,
  nounName: string
): string {
  const resourceName = toSlug(nounName)
  const pluralName = toPluralSlug(nounName)

  if (endpoint.method === 'GET' && endpoint.path.endsWith(':id')) {
    return `${resourceName} = client.${pluralName}.get("item_abc123")`
  }

  if (endpoint.method === 'GET') {
    return `${pluralName} = client.${pluralName}.list()`
  }

  if (endpoint.method === 'POST' && !endpoint.path.includes(':id')) {
    const example = endpoint.requestExample || {}
    // Convert JSON to Python dict format
    const pyDict = JSON.stringify(example, null, 2)
      .replace(/"/g, '"')
      .replace(/: true/g, ': True')
      .replace(/: false/g, ': False')
      .replace(/: null/g, ': None')
    return `${resourceName} = client.${pluralName}.create(${pyDict})`
  }

  if (endpoint.method === 'POST' && endpoint.path.includes(':id')) {
    const verbMatch = endpoint.path.match(/\/:id\/(\w+)$/)
    const verb = verbMatch ? verbMatch[1] : 'action'
    return `result = client.${pluralName}.${verb}("item_abc123")`
  }

  if (endpoint.method === 'PUT') {
    const example = endpoint.requestExample || {}
    const pyDict = JSON.stringify(example, null, 2)
      .replace(/"/g, '"')
      .replace(/: true/g, ': True')
      .replace(/: false/g, ': False')
      .replace(/: null/g, ': None')
    return `${resourceName} = client.${pluralName}.update("item_abc123", ${pyDict})`
  }

  if (endpoint.method === 'DELETE') {
    return `client.${pluralName}.delete("item_abc123")`
  }

  return `# ${endpoint.method} ${endpoint.path}`
}

/**
 * Generate Go example for an endpoint
 */
function generateGoExample(
  endpoint: APIEndpoint,
  nounName: string
): string {
  const pascalName = nounName.charAt(0).toUpperCase() + nounName.slice(1)
  const pluralPascal = pluralize(pascalName)

  if (endpoint.method === 'GET' && endpoint.path.endsWith(':id')) {
    return `${toSlug(nounName)}, err := client.${pluralPascal}.Get(ctx, "item_abc123")`
  }

  if (endpoint.method === 'GET') {
    return `${toPluralSlug(nounName)}, err := client.${pluralPascal}.List(ctx)`
  }

  if (endpoint.method === 'POST' && !endpoint.path.includes(':id')) {
    return `${toSlug(nounName)}, err := client.${pluralPascal}.Create(ctx, &${pascalName}CreateParams{
  // params here
})`
  }

  if (endpoint.method === 'POST' && endpoint.path.includes(':id')) {
    const verbMatch = endpoint.path.match(/\/:id\/(\w+)$/)
    const verb = verbMatch ? verbMatch[1] : 'Action'
    const pascalVerb = verb.charAt(0).toUpperCase() + verb.slice(1)
    return `result, err := client.${pluralPascal}.${pascalVerb}(ctx, "item_abc123")`
  }

  if (endpoint.method === 'PUT') {
    return `${toSlug(nounName)}, err := client.${pluralPascal}.Update(ctx, "item_abc123", &${pascalName}UpdateParams{
  // params here
})`
  }

  if (endpoint.method === 'DELETE') {
    return `err := client.${pluralPascal}.Delete(ctx, "item_abc123")`
  }

  return `// ${endpoint.method} ${endpoint.path}`
}

// ============================================================================
// Page Generators
// ============================================================================

/**
 * Generate Getting Started pages
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
    },
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
    },
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
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.example.com/${firstNounPlural}
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
    },
    {
      slug: 'getting-started/your-first-request',
      title: 'Your First Request',
      content: `# Your First Request

Let's make your first API call to ${appName}.

## Using curl

\`\`\`bash
curl -X GET "https://api.example.com/${firstNounPlural}" \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

## Using fetch

\`\`\`javascript
const response = await fetch('https://api.example.com/${firstNounPlural}', {
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
    },
  ]
}

/**
 * Generate API Reference page for a noun
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

  // Standard CRUD endpoints
  const endpoints: APIEndpoint[] = [
    // List
    {
      method: 'GET',
      path: `/${slugName}`,
      description: `List all ${pluralName.toLowerCase()}`,
      responseExample: [responseExample],
      parameters: [
        { name: 'limit', type: 'number', required: false, description: 'Maximum number of results' },
        { name: 'offset', type: 'number', required: false, description: 'Number of results to skip' },
      ],
      errorResponses: [
        { status: 401, description: 'Unauthorized - Invalid or missing API key' },
      ],
    },
    // Get one
    {
      method: 'GET',
      path: `/${slugName}/:id`,
      description: `Get a ${nounName.toLowerCase()} by ID`,
      responseExample,
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'The ID of the resource' },
      ],
      errorResponses: [
        { status: 401, description: 'Unauthorized - Invalid or missing API key' },
        { status: 404, description: `${nounName} not found` },
      ],
    },
    // Create
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
        })),
      errorResponses: [
        { status: 401, description: 'Unauthorized - Invalid or missing API key' },
        { status: 400, description: 'Bad request - Invalid input data' },
      ],
    },
    // Update
    {
      method: 'PUT',
      path: `/${slugName}/:id`,
      description: `Update a ${nounName.toLowerCase()}`,
      requestExample,
      responseExample,
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'The ID of the resource' },
        ...Object.entries(parsedSchema)
          .filter(([, field]) => field.type !== 'relation')
          .map(([name, field]) => ({
            name,
            type: field.type,
            required: false, // Updates usually have optional fields
            description: field.values ? `One of: ${field.values.join(', ')}` : undefined,
          })),
      ],
      errorResponses: [
        { status: 401, description: 'Unauthorized - Invalid or missing API key' },
        { status: 404, description: `${nounName} not found` },
        { status: 400, description: 'Bad request - Invalid input data' },
      ],
    },
    // Delete
    {
      method: 'DELETE',
      path: `/${slugName}/:id`,
      description: `Delete a ${nounName.toLowerCase()}`,
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'The ID of the resource' },
      ],
      errorResponses: [
        { status: 401, description: 'Unauthorized - Invalid or missing API key' },
        { status: 404, description: `${nounName} not found` },
      ],
    },
  ]

  // Add custom verb endpoints
  const standardVerbs = ['create', 'update', 'delete', 'get', 'list']
  for (const verbName of Object.keys(verbs)) {
    if (!standardVerbs.includes(verbName)) {
      endpoints.push({
        method: 'POST',
        path: `/${slugName}/:id/${verbName}`,
        description: `${verbName.charAt(0).toUpperCase() + verbName.slice(1)} a ${nounName.toLowerCase()}`,
        responseExample,
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'The ID of the resource' },
        ],
        errorResponses: [
          { status: 401, description: 'Unauthorized - Invalid or missing API key' },
          { status: 404, description: `${nounName} not found` },
        ],
      })
    }
  }

  // Add code examples to endpoints
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
    }
  }

  // Generate default content
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
  }
}

/**
 * Generate Webhooks documentation page
 */
function generateWebhooksPage(
  nouns: NounDefinitions,
  eventHandlers: Record<string, Array<(...args: unknown[]) => unknown>>
): DocsPage {
  const events: WebhookEvent[] = []

  // Generate events from registered handlers
  for (const eventKey of Object.keys(eventHandlers)) {
    const [nounName, eventType] = eventKey.split('.')
    const nounSchema = nouns[nounName.charAt(0).toUpperCase() + nounName.slice(1)]

    // Parse schema for payload
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
  }
}

/**
 * Generate SDK quickstart pages
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

  // Get custom verbs for examples
  const customVerbs = Object.entries(verbs)
    .flatMap(([noun, nounVerbs]) =>
      Object.keys(nounVerbs)
        .filter((v) => !['create', 'update', 'delete', 'get', 'list'].includes(v))
        .map((v) => ({ noun, verb: v }))
    )

  const firstCustomVerb = customVerbs[0]

  return [
    // JavaScript SDK
    {
      slug: 'sdks/javascript',
      title: 'JavaScript SDK',
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
    },
    // Python SDK
    {
      slug: 'sdks/python',
      title: 'Python SDK',
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
    },
    // Go SDK
    {
      slug: 'sdks/go',
      title: 'Go SDK',
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
    },
  ]
}

/**
 * Generate OpenAPI spec
 */
function generateOpenAPISpec(
  nouns: NounDefinitions,
  verbs: Record<string, Record<string, (...args: unknown[]) => unknown>>,
  config: DocsConfig
): OpenAPISpec {
  const paths: Record<string, Record<string, unknown>> = {}

  for (const [nounName, schema] of Object.entries(nouns)) {
    const slugName = toPluralSlug(nounName)
    const nounVerbs = verbs[nounName] || {}

    // Parse schema
    const properties: Record<string, unknown> = { id: { type: 'string' } }
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const parsed = parseField(fieldDef)
      if (parsed.type === 'enum') {
        properties[fieldName] = { type: 'string', enum: parsed.values }
      } else if (parsed.type === 'relation') {
        properties[fieldName] = { type: 'string', description: `ID of related ${parsed.target}` }
      } else {
        properties[fieldName] = {
          type: parsed.type === 'number' ? 'number' : parsed.type === 'boolean' ? 'boolean' : 'string',
        }
      }
    }

    // List endpoint
    paths[`/${slugName}`] = {
      get: {
        summary: `List ${pluralize(nounName)}`,
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object', properties } },
              },
            },
          },
        },
      },
      post: {
        summary: `Create a ${nounName}`,
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
        },
      },
    }

    // Single resource endpoint
    paths[`/${slugName}/{id}`] = {
      get: {
        summary: `Get a ${nounName}`,
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
        },
      },
      put: {
        summary: `Update a ${nounName}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Updated' },
        },
      },
      delete: {
        summary: `Delete a ${nounName}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
        },
      },
    }

    // Custom verb endpoints
    const standardVerbs = ['create', 'update', 'delete', 'get', 'list']
    for (const verbName of Object.keys(nounVerbs)) {
      if (!standardVerbs.includes(verbName)) {
        paths[`/${slugName}/{id}/${verbName}`] = {
          post: {
            summary: `${verbName.charAt(0).toUpperCase() + verbName.slice(1)} a ${nounName}`,
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              '200': { description: 'Success' },
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
    paths,
  }
}

/**
 * Generate navigation structure
 */
function generateNavigation(pages: DocsPage[]): NavItem[] {
  return [
    {
      title: 'Getting Started',
      slug: 'getting-started',
      children: pages
        .filter((p) => p.slug.startsWith('getting-started/'))
        .map((p) => ({ title: p.title, slug: p.slug })),
    },
    {
      title: 'API Reference',
      slug: 'api-reference',
      children: pages
        .filter((p) => p.slug.startsWith('api-reference/'))
        .map((p) => ({ title: p.title, slug: p.slug })),
    },
    {
      title: 'Webhooks',
      slug: 'webhooks',
    },
    {
      title: 'SDKs',
      slug: 'sdks',
      children: pages
        .filter((p) => p.slug.startsWith('sdks/'))
        .map((p) => ({ title: p.title, slug: p.slug })),
    },
  ]
}

/**
 * Generate file structure from docs
 */
function generateFileStructure(pages: DocsPage[]): Record<string, string> {
  const files: Record<string, string> = {}

  for (const page of pages) {
    const frontmatter = page.frontmatter
      ? `---\n${Object.entries(page.frontmatter)
          .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
          .join('\n')}\n---\n\n`
      : ''

    const fileName = page.slug.includes('/') ? `${page.slug}.mdx` : `${page.slug}/index.mdx`
    files[fileName] = frontmatter + page.content
  }

  return files
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Generate documentation from a SaaS context
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

  const navigation = generateNavigation(pages)
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
    toFileStructure: () => generateFileStructure(pages),
  }

  // Apply plugins
  if (config.plugins) {
    let result = docs
    for (const plugin of config.plugins) {
      if (plugin.afterGenerate) {
        result = plugin.afterGenerate(result)
      }
    }
    return result
  }

  return docs
}

/**
 * DocsGenerator class for builder-style usage
 */
export class DocsGenerator {
  private context: SaaSContext
  private config: DocsConfig

  constructor(context: SaaSContext, config: DocsConfig = {}) {
    this.context = context
    this.config = config
  }

  /**
   * Generate complete documentation
   */
  generate(): GeneratedDocs {
    return generateDocs(this.context, this.config)
  }

  /**
   * Generate documentation for a specific noun
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
}
