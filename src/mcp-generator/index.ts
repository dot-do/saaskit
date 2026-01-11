/**
 * MCP Generator
 *
 * Generate MCP (Model Context Protocol) servers from SaaSkit noun/verb definitions.
 *
 * @example
 * ```ts
 * import { createMCPGenerator, generateMCPServer } from 'saaskit/mcp-generator'
 *
 * // Create a generator for runtime use
 * const mcp = createMCPGenerator({
 *   nouns: {
 *     Todo: { id: 'string', title: 'string', done: 'boolean' },
 *     User: { id: 'string', name: 'string', email: 'string' },
 *   },
 *   verbs: {
 *     Todo: {
 *       complete: ($) => $.db.Todo.update($.id, { done: true }),
 *     },
 *   },
 * })
 *
 * // List tools
 * const tools = mcp.listTools()
 *
 * // Execute a tool
 * const result = await mcp.callTool('todo_create', { title: 'New task' })
 *
 * // Read a resource
 * const todos = await mcp.readResource('saaskit://todo')
 *
 * // Start stdio transport for CLI
 * const transport = mcp.createStdioTransport()
 * transport.start()
 * ```
 *
 * ## Advanced Features
 *
 * ### Workflow Prompts
 * ```ts
 * const mcp = createMCPGenerator({
 *   nouns: { Todo: { id: 'string', title: 'string' } },
 *   workflows: {
 *     enabled: ['crud_guide', 'data_analysis', 'bulk_operations'],
 *   },
 * })
 * ```
 *
 * ### Sampling for AI-to-AI Communication
 * ```ts
 * import { createSamplingBuilder, createContextBuilder } from 'saaskit/mcp-generator'
 *
 * const request = createSamplingBuilder()
 *   .user('Analyze the data')
 *   .withMaxTokens(2000)
 *   .withModelHints('claude-3-opus')
 *   .build()
 * ```
 *
 * ### Schema Validation
 * ```ts
 * import { schema, validateSchema } from 'saaskit/mcp-generator'
 *
 * const inputSchema = schema()
 *   .string('name', { required: true })
 *   .number('count', { min: 1, max: 100 })
 *   .build()
 * ```
 *
 * ### Logging and Debugging
 * ```ts
 * import { createLogger, createTracer, LogCategories } from 'saaskit/mcp-generator'
 *
 * const logger = createLogger({ level: 'debug', format: 'pretty' })
 * logger.info(LogCategories.TOOLS, 'Tool executed', { tool: 'todo_create' })
 * ```
 *
 * @module
 */

export { createMCPGenerator, generateMCPServer } from './generator'

export type {
  // Main interfaces
  MCPGenerator,
  MCPGeneratorConfig,
  MCPServerConfig,

  // Tool types
  MCPTool,
  MCPToolResult,

  // Resource types
  MCPResource,
  MCPResourceTemplate,
  MCPResourceContent,

  // Prompt types
  MCPPrompt,
  MCPPromptArgument,
  MCPPromptResult,

  // Server types
  MCPServerInfo,
  MCPCapabilities,

  // Sampling types
  MCPSamplingMessage,
  MCPSamplingRequest,

  // Transport types
  MCPStdioTransport,
  MCPJSONRPCMessage,

  // Utility types
  JSONSchema,
  JSONSchemaProperty,
} from './types'

export {
  // Helper functions
  toMCPKey,
  fromMCPKey,
  generateToolDescription,
  generateResourceDescription,
} from './types'

// Prompt exports
export type { PromptConfig, WorkflowPromptType, WorkflowPromptConfig } from './prompts'
export {
  generateAnalyzePrompt,
  generateCRUDGuidePrompt,
  generateDataAnalysisPrompt,
  generateBulkOperationsPrompt,
  generateDataMigrationPrompt,
  generateTroubleshootPrompt,
  generateReportPrompt,
  generateWorkflowPrompts,
  PromptExecutor,
} from './prompts'

// Sampling exports
export type {
  ModelHint,
  ContextScope,
  SamplingBuilderConfig,
  ConversationMessage,
} from './sampling'
export {
  SamplingRequestBuilder,
  ContextBuilder,
  createSamplingBuilder,
  createContextBuilder,
  createSimpleSamplingRequest,
  createToolAssistedRequest,
  createDataAnalysisRequest,
  createAgentCoordinationRequest,
} from './sampling'

// Resource exports
export type { URIParameterRule, ValidationResult } from './resources'
export {
  URIParameterValidator,
  createIdValidator,
  createPaginationValidator,
  parseResourceUri,
  ResourceReader,
} from './resources'

// Validation exports
export type {
  ValidationError,
  SchemaValidationResult,
  FieldSchema,
} from './validation'
export {
  SchemaBuilder,
  schema,
  validateSchema,
  createToolValidator,
  withValidation,
  ValidationException,
  coerceInput,
} from './validation'

// Logging exports
export type {
  LogLevel,
  LogEntry,
  LogFormat,
  LoggerConfig,
  DebugContext,
} from './logging'
export {
  MCPLogger,
  DebugTracer,
  createLogger,
  createTracer,
  defaultLogger,
  LogCategories,
  withLogging,
} from './logging'

// Transport exports
export { JSONRPC_ERRORS, StdioTransport } from './transport'

// Tool exports
export { CRUD_VERBS, generateCRUDTools, generateVerbTool, DataStore, ToolExecutor } from './tools'
