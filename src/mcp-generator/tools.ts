/**
 * MCP Tool Generation
 *
 * Generates MCP tools from noun/verb definitions.
 */

import type { MCPTool, MCPToolResult, JSONSchema, JSONSchemaProperty } from './types'
import { toMCPKey, generateToolDescription } from './types'

/**
 * CRUD verb operations
 */
export const CRUD_VERBS = ['create', 'get', 'update', 'delete', 'list'] as const
export type CRUDVerb = (typeof CRUD_VERBS)[number]

/**
 * Generate input schema from noun fields
 */
export function generateInputSchema(
  fields: Record<string, string>,
  verb: string,
  includeId = true
): JSONSchema {
  const properties: Record<string, JSONSchemaProperty> = {}
  const required: string[] = []

  // Add ID field for operations that need it
  if (includeId && (verb === 'get' || verb === 'update' || verb === 'delete')) {
    properties['id'] = {
      type: 'string',
      description: 'The unique identifier',
    }
    required.push('id')
  }

  // For create and update, add noun fields
  if (verb === 'create' || verb === 'update') {
    for (const [field, type] of Object.entries(fields)) {
      if (field === 'id' && verb === 'create') {
        // ID is optional for create (auto-generated)
        properties['id'] = {
          type: 'string',
          description: 'Optional ID (auto-generated if not provided)',
        }
        continue
      }

      properties[field] = {
        type: mapFieldType(type),
        description: `The ${field} field`,
      }

      // For create, make non-id fields required (except boolean which can default)
      if (verb === 'create' && type !== 'boolean' && field !== 'id') {
        required.push(field)
      }
    }
  }

  // For custom verbs, just include id and allow additional input
  if (!CRUD_VERBS.includes(verb as CRUDVerb)) {
    properties['id'] = {
      type: 'string',
      description: 'The unique identifier',
    }
    required.push('id')
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  }
}

/**
 * Map field type to JSON Schema type
 */
function mapFieldType(type: string): 'string' | 'number' | 'boolean' | 'array' | 'object' {
  switch (type) {
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
    case 'bool':
      return 'boolean'
    case 'array':
      return 'array'
    case 'object':
      return 'object'
    default:
      return 'string'
  }
}

/**
 * Generate CRUD tools for a noun
 */
export function generateCRUDTools(noun: string, fields: Record<string, string>): MCPTool[] {
  const nounKey = toMCPKey(noun)

  return [
    {
      name: `${nounKey}_create`,
      description: generateToolDescription(noun, 'create'),
      inputSchema: generateInputSchema(fields, 'create'),
    },
    {
      name: `${nounKey}_get`,
      description: generateToolDescription(noun, 'get'),
      inputSchema: generateInputSchema(fields, 'get'),
    },
    {
      name: `${nounKey}_update`,
      description: generateToolDescription(noun, 'update'),
      inputSchema: generateInputSchema(fields, 'update'),
    },
    {
      name: `${nounKey}_delete`,
      description: generateToolDescription(noun, 'delete'),
      inputSchema: generateInputSchema(fields, 'delete'),
    },
  ]
}

/**
 * Generate verb tool for a noun
 */
export function generateVerbTool(noun: string, verb: string): MCPTool {
  const nounKey = toMCPKey(noun)

  return {
    name: `${nounKey}_${verb}`,
    description: generateToolDescription(noun, verb),
    inputSchema: generateInputSchema({}, verb),
  }
}

/**
 * Generate all tools from configuration
 */
export function generateTools(config: {
  nouns: Record<string, Record<string, string>>
  verbs?: Record<string, Record<string, Function>>
}): MCPTool[] {
  const tools: MCPTool[] = []

  // Generate CRUD tools for each noun
  for (const [noun, fields] of Object.entries(config.nouns)) {
    tools.push(...generateCRUDTools(noun, fields))
  }

  // Generate verb tools
  if (config.verbs) {
    for (const [noun, verbHandlers] of Object.entries(config.verbs)) {
      for (const verb of Object.keys(verbHandlers)) {
        // Skip if it's a CRUD verb (already generated)
        if (!CRUD_VERBS.includes(verb as CRUDVerb)) {
          tools.push(generateVerbTool(noun, verb))
        }
      }
    }
  }

  return tools
}

/**
 * In-memory data store for testing
 */
export class DataStore {
  private data: Map<string, Map<string, Record<string, unknown>>> = new Map()

  constructor() {}

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Get or create collection for a noun
   */
  private getCollection(noun: string): Map<string, Record<string, unknown>> {
    if (!this.data.has(noun)) {
      this.data.set(noun, new Map())
    }
    return this.data.get(noun)!
  }

  /**
   * Create a record
   */
  create(noun: string, data: Record<string, unknown>): Record<string, unknown> {
    const collection = this.getCollection(noun)
    const id = (data.id as string) || this.generateId()
    const record = { ...data, id }
    collection.set(id, record)
    return record
  }

  /**
   * Get a record by ID
   */
  get(noun: string, id: string): Record<string, unknown> | null {
    const collection = this.getCollection(noun)
    return collection.get(id) || null
  }

  /**
   * List all records
   */
  list(noun: string, filter?: Record<string, unknown>): Record<string, unknown>[] {
    const collection = this.getCollection(noun)
    let records = Array.from(collection.values())

    if (filter) {
      records = records.filter((record) => {
        for (const [key, value] of Object.entries(filter)) {
          if (record[key] !== value) {
            return false
          }
        }
        return true
      })
    }

    return records
  }

  /**
   * Update a record
   */
  update(noun: string, id: string, data: Record<string, unknown>): Record<string, unknown> | null {
    const collection = this.getCollection(noun)
    const existing = collection.get(id)
    if (!existing) {
      return null
    }
    const updated = { ...existing, ...data, id }
    collection.set(id, updated)
    return updated
  }

  /**
   * Delete a record
   */
  delete(noun: string, id: string): boolean {
    const collection = this.getCollection(noun)
    return collection.delete(id)
  }

  /**
   * Check if a record exists
   */
  exists(noun: string, id: string): boolean {
    const collection = this.getCollection(noun)
    return collection.has(id)
  }
}

/**
 * Tool executor
 */
export class ToolExecutor {
  private store: DataStore
  private verbs: Record<string, Record<string, Function>>
  private nouns: Record<string, Record<string, string>>

  constructor(
    nouns: Record<string, Record<string, string>>,
    verbs: Record<string, Record<string, Function>> = {}
  ) {
    this.store = new DataStore()
    this.nouns = nouns
    this.verbs = verbs
  }

  /**
   * Execute a tool
   */
  async execute(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const parts = name.split('_')
    const verb = parts.pop()!
    const nounKey = parts.join('_')

    // Find the noun (convert snake_case back to PascalCase)
    const noun = Object.keys(this.nouns).find((n) => toMCPKey(n) === nounKey)

    if (!noun) {
      return this.errorResult(`Unknown tool: ${name}`)
    }

    try {
      // Check for custom verb handler
      if (this.verbs[noun]?.[verb]) {
        const context = this.createContext(noun, args)
        const result = await this.verbs[noun][verb](context)
        return this.successResult(result)
      }

      // Handle CRUD operations
      switch (verb) {
        case 'create':
          return this.handleCreate(noun, args)
        case 'get':
          return this.handleGet(noun, args)
        case 'update':
          return this.handleUpdate(noun, args)
        case 'delete':
          return this.handleDelete(noun, args)
        case 'list':
          return this.handleList(noun, args)
        default:
          return this.errorResult(`Unknown tool: ${name}`)
      }
    } catch (error) {
      return this.errorResult(`Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create execution context for verb handlers
   */
  private createContext(noun: string, args: Record<string, unknown>) {
    return {
      noun,
      id: args.id as string | undefined,
      input: args,
      db: {
        [noun]: {
          create: (data: Record<string, unknown>) => this.store.create(noun, data),
          get: (id: string) => this.store.get(noun, id),
          list: (filter?: Record<string, unknown>) => this.store.list(noun, filter),
          update: (id: string, data: Record<string, unknown>) => this.store.update(noun, id, data),
          delete: (id: string) => this.store.delete(noun, id),
        },
      },
      email: {
        send: async (to: string, subject: string) => ({ sent: true, to, subject }),
      },
    }
  }

  /**
   * Handle create operation
   */
  private handleCreate(noun: string, args: Record<string, unknown>): MCPToolResult {
    const record = this.store.create(noun, args)
    return this.successResult(record)
  }

  /**
   * Handle get operation
   */
  private handleGet(noun: string, args: Record<string, unknown>): MCPToolResult {
    const id = args.id as string
    if (!id) {
      return this.errorResult('ID is required')
    }
    const record = this.store.get(noun, id)
    if (!record) {
      return this.successResult({ error: 'Not found', id })
    }
    return this.successResult(record)
  }

  /**
   * Handle update operation
   */
  private handleUpdate(noun: string, args: Record<string, unknown>): MCPToolResult {
    const id = args.id as string
    if (!id) {
      return this.errorResult('ID is required')
    }
    const { id: _, ...data } = args
    const record = this.store.update(noun, id, data)
    if (!record) {
      return this.errorResult(`${noun} not found: ${id}`)
    }
    return this.successResult(record)
  }

  /**
   * Handle delete operation
   */
  private handleDelete(noun: string, args: Record<string, unknown>): MCPToolResult {
    const id = args.id as string
    if (!id) {
      return this.errorResult('ID is required')
    }
    const success = this.store.delete(noun, id)
    return this.successResult({ success, id })
  }

  /**
   * Handle list operation
   */
  private handleList(noun: string, args: Record<string, unknown>): MCPToolResult {
    const records = this.store.list(noun, args)
    return this.successResult(records)
  }

  /**
   * Create success result
   */
  private successResult(data: unknown): MCPToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data),
        },
      ],
    }
  }

  /**
   * Create error result
   */
  private errorResult(message: string): MCPToolResult {
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
      isError: true,
    }
  }

  /**
   * Get data store (for resource access)
   */
  getStore(): DataStore {
    return this.store
  }
}
