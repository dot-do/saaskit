/**
 * MCP stdio Transport
 *
 * Implements the stdio transport for MCP communication.
 */

import type {
  MCPStdioTransport,
  MCPJSONRPCMessage,
  MCPGenerator,
  MCPServerInfo,
  MCPCapabilities,
} from './types'

/**
 * JSON-RPC error codes
 */
export const JSONRPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  NOT_INITIALIZED: -32002,
}

/**
 * Create an error response
 */
function errorResponse(
  id: number | string | undefined,
  code: number,
  message: string
): MCPJSONRPCMessage {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  }
}

/**
 * Create a success response
 */
function successResponse(id: number | string | undefined, result: unknown): MCPJSONRPCMessage {
  return {
    jsonrpc: '2.0',
    id,
    result,
  }
}

/**
 * stdio transport implementation
 */
export class StdioTransport implements MCPStdioTransport {
  private generator: MCPGenerator
  private initialized = false
  private clientInfo: { name: string; version: string } | null = null
  private running = false

  constructor(generator: MCPGenerator) {
    this.generator = generator
  }

  /**
   * Handle an incoming JSON-RPC message
   */
  async handleMessage(message: MCPJSONRPCMessage): Promise<MCPJSONRPCMessage> {
    const { id, method, params } = message

    // Handle initialize (can be called before initialization)
    if (method === 'initialize') {
      return this.handleInitialize(id, params as unknown as InitializeParams)
    }

    // Handle initialized notification
    if (method === 'initialized') {
      // Just acknowledge, no response needed for notifications
      return { jsonrpc: '2.0', id } as MCPJSONRPCMessage
    }

    // Check initialization for all other methods
    if (!this.initialized) {
      return errorResponse(id, JSONRPC_ERRORS.NOT_INITIALIZED, 'Server not initialized')
    }

    // Route to appropriate handler
    switch (method) {
      case 'tools/list':
        return this.handleToolsList(id)

      case 'tools/call':
        return this.handleToolsCall(id, params as unknown as ToolsCallParams)

      case 'resources/list':
        return this.handleResourcesList(id)

      case 'resources/templates/list':
        return this.handleResourceTemplatesList(id)

      case 'resources/read':
        return this.handleResourcesRead(id, params as unknown as ResourcesReadParams)

      case 'prompts/list':
        return this.handlePromptsList(id)

      case 'prompts/get':
        return this.handlePromptsGet(id, params as unknown as PromptsGetParams)

      case 'ping':
        return successResponse(id, {})

      default:
        return errorResponse(id, JSONRPC_ERRORS.METHOD_NOT_FOUND, `Unknown method: ${method}`)
    }
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(
    id: number | string | undefined,
    params: InitializeParams
  ): Promise<MCPJSONRPCMessage> {
    this.clientInfo = params.clientInfo
    this.initialized = true

    const serverInfo = this.generator.getServerInfo()
    const capabilities = this.generator.getCapabilities()

    return successResponse(id, {
      protocolVersion: this.generator.getProtocolVersion(),
      serverInfo,
      capabilities: {
        tools: capabilities.tools ? {} : undefined,
        resources: capabilities.resources ? {} : undefined,
        prompts: capabilities.prompts ? {} : undefined,
        sampling: capabilities.sampling,
      },
    })
  }

  /**
   * Handle tools/list request
   */
  private async handleToolsList(id: number | string | undefined): Promise<MCPJSONRPCMessage> {
    const tools = this.generator.listTools()
    return successResponse(id, { tools })
  }

  /**
   * Handle tools/call request
   */
  private async handleToolsCall(
    id: number | string | undefined,
    params: ToolsCallParams
  ): Promise<MCPJSONRPCMessage> {
    const result = await this.generator.callTool(params.name, params.arguments || {})
    return successResponse(id, result)
  }

  /**
   * Handle resources/list request
   */
  private async handleResourcesList(id: number | string | undefined): Promise<MCPJSONRPCMessage> {
    const resources = this.generator.listResources()
    return successResponse(id, { resources })
  }

  /**
   * Handle resources/templates/list request
   */
  private async handleResourceTemplatesList(
    id: number | string | undefined
  ): Promise<MCPJSONRPCMessage> {
    const resourceTemplates = this.generator.listResourceTemplates()
    return successResponse(id, { resourceTemplates })
  }

  /**
   * Handle resources/read request
   */
  private async handleResourcesRead(
    id: number | string | undefined,
    params: ResourcesReadParams
  ): Promise<MCPJSONRPCMessage> {
    const result = await this.generator.readResource(params.uri)

    if (result.error) {
      return errorResponse(id, JSONRPC_ERRORS.INVALID_PARAMS, result.error)
    }

    return successResponse(id, result)
  }

  /**
   * Handle prompts/list request
   */
  private async handlePromptsList(id: number | string | undefined): Promise<MCPJSONRPCMessage> {
    const prompts = this.generator.listPrompts()
    return successResponse(id, { prompts })
  }

  /**
   * Handle prompts/get request
   */
  private async handlePromptsGet(
    id: number | string | undefined,
    params: PromptsGetParams
  ): Promise<MCPJSONRPCMessage> {
    const result = await this.generator.getPrompt(params.name, params.arguments || {})

    if (result.error) {
      return errorResponse(id, JSONRPC_ERRORS.INVALID_PARAMS, result.error)
    }

    return successResponse(id, result)
  }

  /**
   * Start the transport (begin reading from stdin)
   */
  start(): void {
    this.running = true

    // In a real implementation, this would set up stdin/stdout handlers
    // For now, we just mark it as running
    if (typeof process !== 'undefined' && process.stdin && process.stdout) {
      // Set up line-by-line reading
      let buffer = ''

      process.stdin.setEncoding('utf8')
      process.stdin.on('data', (chunk: string) => {
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            this.processLine(line)
          }
        }
      })
    }
  }

  /**
   * Process a line of input
   */
  private async processLine(line: string): Promise<void> {
    try {
      const message = JSON.parse(line) as MCPJSONRPCMessage
      const response = await this.handleMessage(message)

      if (response.id !== undefined || response.error) {
        const output = JSON.stringify(response) + '\n'
        if (typeof process !== 'undefined' && process.stdout) {
          process.stdout.write(output)
        }
      }
    } catch (error) {
      const errorResp = errorResponse(
        undefined,
        JSONRPC_ERRORS.PARSE_ERROR,
        'Invalid JSON'
      )
      const output = JSON.stringify(errorResp) + '\n'
      if (typeof process !== 'undefined' && process.stdout) {
        process.stdout.write(output)
      }
    }
  }

  /**
   * Close the transport
   */
  close(): void {
    this.running = false
  }
}

/**
 * Initialize request params
 */
interface InitializeParams {
  protocolVersion: string
  capabilities: Record<string, unknown>
  clientInfo: {
    name: string
    version: string
  }
}

/**
 * Tools call params
 */
interface ToolsCallParams {
  name: string
  arguments?: Record<string, unknown>
}

/**
 * Resources read params
 */
interface ResourcesReadParams {
  uri: string
}

/**
 * Prompts get params
 */
interface PromptsGetParams {
  name: string
  arguments?: Record<string, string>
}
