/**
 * OpenAPI Module
 *
 * OpenAPI specification generation from noun/verb definitions.
 *
 * @module api-generator/openapi
 */

import type {
  OpenAPISpec,
  NounDefinitions,
  VerbDefinitions,
} from './types'
import { pluralize, capitalize, mapFieldTypeToOpenAPI } from './utilities'

/**
 * Configuration for OpenAPI spec generation
 */
export interface OpenAPIConfig {
  nouns: NounDefinitions
  verbs?: VerbDefinitions
  info?: {
    title?: string
    version?: string
  }
  servers?: Array<{ url: string; description?: string }>
}

/**
 * Builds an OpenAPI specification from configuration
 * @param config - The API configuration
 * @returns The OpenAPI specification object
 */
export function buildOpenAPISpec(config: OpenAPIConfig): OpenAPISpec {
  const { nouns, verbs = {}, info, servers } = config
  const paths: OpenAPISpec['paths'] = {}
  const schemas: OpenAPISpec['components']['schemas'] = {}

  // Error schema
  schemas['Error'] = {
    type: 'object',
    properties: {
      error: { type: 'string' },
      details: { type: 'string' },
      code: { type: 'string' },
    },
  }

  for (const [noun, nounSchema] of Object.entries(nouns)) {
    const plural = pluralize(noun)
    const listPath = `/${plural}`
    const itemPath = `/${plural}/{id}`

    // Main schema
    const properties: Record<string, { type: string; enum?: string[] }> = {
      id: { type: 'string' },
    }
    for (const [field, type] of Object.entries(nounSchema)) {
      properties[field] = mapFieldTypeToOpenAPI(type)
    }
    schemas[noun] = { type: 'object', properties }

    // Input schemas
    const inputProperties: Record<string, { type: string; enum?: string[] }> = {}
    for (const [field, type] of Object.entries(nounSchema)) {
      inputProperties[field] = mapFieldTypeToOpenAPI(type)
    }
    schemas[`${noun}CreateInput`] = { type: 'object', properties: inputProperties }
    schemas[`${noun}UpdateInput`] = { type: 'object', properties: inputProperties }
    schemas[`${noun}ListResponse`] = {
      type: 'object',
      properties: {
        data: { type: 'array' },
        pagination: { type: 'object' },
      },
    }

    // List endpoint
    paths[listPath] = {
      get: {
        summary: `List ${plural}`,
        operationId: `list${noun}s`,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'offset', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}ListResponse` } } },
          },
        },
      },
      post: {
        summary: `Create ${noun}`,
        operationId: `create${noun}`,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}CreateInput` } } },
        },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}` } } },
          },
        },
      },
    }

    // Item endpoints
    paths[itemPath] = {
      get: {
        summary: `Get ${noun}`,
        operationId: `get${noun}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}` } } },
          },
        },
      },
      put: {
        summary: `Update ${noun}`,
        operationId: `update${noun}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}UpdateInput` } } },
        },
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}` } } },
          },
        },
      },
      delete: {
        summary: `Delete ${noun}`,
        operationId: `delete${noun}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
        },
      },
    }

    // Verb endpoints
    const nounVerbs = verbs[noun] || {}
    for (const verb of Object.keys(nounVerbs)) {
      const verbPath = `/${plural}/{id}/${verb}`
      paths[verbPath] = {
        post: {
          summary: `${capitalize(verb)} ${noun}`,
          operationId: `${verb}${noun}`,
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Success',
              content: { 'application/json': { schema: { $ref: `#/components/schemas/${noun}` } } },
            },
          },
        },
      }
    }
  }

  return {
    openapi: '3.0.0',
    info: {
      title: info?.title || 'API',
      version: info?.version || '1.0.0',
    },
    servers,
    paths,
    components: { schemas },
  }
}

/**
 * Converts an object to YAML format
 * @param obj - The object to convert
 * @param indent - Current indentation level
 * @returns YAML string representation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toYAML(obj: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent)
  let result = ''

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      if (value.length === 0) {
        result += `${spaces}${key}: []\n`
      } else if (typeof value[0] === 'object') {
        result += `${spaces}${key}:\n`
        for (const item of value) {
          result += `${spaces}- ${toYAML(item, indent + 1).trim().replace(/\n/g, `\n${spaces}  `)}\n`
        }
      } else {
        result += `${spaces}${key}:\n`
        for (const item of value) {
          result += `${spaces}  - ${item}\n`
        }
      }
    } else if (typeof value === 'object') {
      result += `${spaces}${key}:\n${toYAML(value, indent + 1)}`
    } else if (typeof value === 'string') {
      result += `${spaces}${key}: ${value}\n`
    } else {
      result += `${spaces}${key}: ${value}\n`
    }
  }

  return result
}

/**
 * Generates an OpenAPI specification from configuration
 * @param config - The API configuration
 * @returns The OpenAPI specification
 */
export function generateOpenAPISpec(config: OpenAPIConfig): OpenAPISpec {
  return buildOpenAPISpec(config)
}
