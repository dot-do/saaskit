/**
 * MCP (Model Context Protocol) Generator Types
 *
 * Types following the MCP protocol specification for generating MCP servers
 * from SaaSkit configurations.
 *
 * @see https://modelcontextprotocol.io/
 */

/**
 * JSON Schema type for tool input validation
 */
export interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array'
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  description?: string
  items?: JSONSchema
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  enum?: string[]
  default?: unknown
  items?: JSONSchema
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  /** Unique tool name (noun_verb format) */
  name: string
  /** Human-readable description */
  description: string
  /** JSON Schema for input validation */
  inputSchema: JSONSchema
}

/**
 * MCP Tool call result
 */
export interface MCPToolResult {
  /** Content returned by the tool */
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
    uri?: string
  }>
  /** Whether this is an error result */
  isError?: boolean
}

/**
 * MCP Resource definition
 */
export interface MCPResource {
  /** Resource URI */
  uri: string
  /** Human-readable name */
  name: string
  /** Optional description */
  description?: string
  /** MIME type of the resource content */
  mimeType: string
}

/**
 * MCP Resource template for parameterized resources
 */
export interface MCPResourceTemplate {
  /** URI template with placeholders */
  uriTemplate: string
  /** Human-readable name */
  name: string
  /** Optional description */
  description?: string
  /** MIME type of the resource content */
  mimeType?: string
}

/**
 * MCP Resource content
 */
export interface MCPResourceContent {
  /** Contents array */
  contents: Array<{
    uri: string
    mimeType: string
    text?: string
    blob?: string
  }>
  /** Error message if read failed */
  error?: string
}

/**
 * MCP Prompt argument definition
 */
export interface MCPPromptArgument {
  /** Argument name */
  name: string
  /** Human-readable description */
  description: string
  /** Whether argument is required */
  required?: boolean
}

/**
 * MCP Prompt definition
 */
export interface MCPPrompt {
  /** Unique prompt name */
  name: string
  /** Human-readable description */
  description: string
  /** Arguments for the prompt */
  arguments?: MCPPromptArgument[]
}

/**
 * MCP Prompt result with rendered messages
 */
export interface MCPPromptResult {
  /** Description of the prompt */
  description?: string
  /** Rendered messages */
  messages: Array<{
    role: 'user' | 'assistant'
    content: {
      type: 'text' | 'image' | 'resource'
      text?: string
      data?: string
      mimeType?: string
    }
  }>
  /** Error message if prompt retrieval failed */
  error?: string
}

/**
 * MCP Server info
 */
export interface MCPServerInfo {
  /** Server name */
  name: string
  /** Server version */
  version: string
}

/**
 * MCP Server capabilities
 */
export interface MCPCapabilities {
  /** Whether tools are supported */
  tools?: boolean | { listChanged?: boolean }
  /** Whether resources are supported */
  resources?: boolean | { subscribe?: boolean; listChanged?: boolean }
  /** Whether prompts are supported */
  prompts?: boolean | { listChanged?: boolean }
  /** Whether sampling is supported */
  sampling?: {}
}

/**
 * MCP Sampling message
 */
export interface MCPSamplingMessage {
  role: 'user' | 'assistant'
  content: {
    type: 'text' | 'image'
    text?: string
    data?: string
    mimeType?: string
  }
}

/**
 * MCP Sampling request
 */
export interface MCPSamplingRequest {
  /** Messages to sample from */
  messages: MCPSamplingMessage[]
  /** Maximum tokens to generate */
  maxTokens: number
  /** Stop sequences */
  stopSequences?: string[]
  /** Temperature */
  temperature?: number
  /** Model preferences */
  modelPreferences?: {
    hints?: Array<{ name: string }>
    costPriority?: number
    speedPriority?: number
    intelligencePriority?: number
  }
  /** System prompt */
  systemPrompt?: string
  /** Include context */
  includeContext?: 'none' | 'thisServer' | 'allServers'
}

/**
 * MCP JSON-RPC message
 */
export interface MCPJSONRPCMessage {
  jsonrpc: '2.0'
  id?: number | string
  method?: string
  params?: Record<string, unknown>
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

/**
 * MCP stdio transport interface
 */
export interface MCPStdioTransport {
  /** Handle an incoming JSON-RPC message */
  handleMessage: (message: MCPJSONRPCMessage) => Promise<MCPJSONRPCMessage>
  /** Start the transport (begin reading from stdin) */
  start: () => void
  /** Close the transport */
  close: () => void
}

/**
 * MCP Generator configuration
 */
export interface MCPGeneratorConfig {
  /** Nouns with their field definitions */
  nouns?: Record<string, Record<string, string>>
  /** Verbs (actions) per noun */
  verbs?: Record<string, Record<string, Function>>
  /** Custom prompts */
  prompts?: Record<
    string,
    {
      description: string
      template: string
      arguments?: MCPPromptArgument[]
    }
  >
  /** Server info */
  serverInfo?: MCPServerInfo
  /** URI scheme for resources (default: 'saaskit') */
  uriScheme?: string
  /** App config format (alternative to nouns/verbs) */
  appConfig?: {
    nouns?: readonly string[]
    verbs?: Record<string, readonly string[]>
  }
}

/**
 * MCP Server configuration (generated)
 */
export interface MCPServerConfig {
  /** Server info */
  serverInfo: MCPServerInfo
  /** Available tools */
  tools: MCPTool[]
  /** Available resources */
  resources: MCPResource[]
  /** Resource templates */
  resourceTemplates: MCPResourceTemplate[]
  /** Available prompts */
  prompts: MCPPrompt[]
  /** URI scheme */
  uriScheme: string
}

/**
 * MCP Generator interface
 */
export interface MCPGenerator {
  /** Get server info */
  getServerInfo: () => MCPServerInfo
  /** Get protocol version */
  getProtocolVersion: () => string
  /** Get server capabilities */
  getCapabilities: () => MCPCapabilities

  /** List available tools */
  listTools: () => MCPTool[]
  /** Call a tool */
  callTool: (name: string, args: Record<string, unknown>) => Promise<MCPToolResult>

  /** List available resources */
  listResources: () => MCPResource[]
  /** List resource templates */
  listResourceTemplates: () => MCPResourceTemplate[]
  /** Read a resource */
  readResource: (uri: string) => Promise<MCPResourceContent>

  /** List available prompts */
  listPrompts: () => MCPPrompt[]
  /** Get a prompt with arguments filled in */
  getPrompt: (name: string, args: Record<string, string>) => Promise<MCPPromptResult>

  /** Create a sampling request */
  createSamplingRequest: (
    options: Omit<MCPSamplingRequest, 'maxTokens'> & { maxTokens?: number }
  ) => MCPSamplingRequest

  /** Create stdio transport for CLI integration */
  createStdioTransport: () => MCPStdioTransport
}

/**
 * Convert a noun name to a tool/resource key
 */
export function toMCPKey(name: string): string {
  // Convert PascalCase to snake_case
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

/**
 * Convert a tool key back to noun name
 */
export function fromMCPKey(key: string): string {
  // Convert snake_case to PascalCase
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/**
 * Generate tool description from noun and verb
 */
export function generateToolDescription(noun: string, verb: string): string {
  const nounLower = noun.toLowerCase()

  switch (verb) {
    case 'create':
      return `Create a new ${nounLower}`
    case 'get':
      return `Get a ${nounLower} by ID`
    case 'update':
      return `Update an existing ${nounLower}`
    case 'delete':
      return `Delete a ${nounLower} by ID`
    case 'list':
      return `List all ${nounLower}s`
    default:
      return `${verb.charAt(0).toUpperCase() + verb.slice(1)} a ${nounLower}`
  }
}

/**
 * Generate resource description from noun
 */
export function generateResourceDescription(noun: string): string {
  return `${noun} collection - access and manage ${noun.toLowerCase()} records`
}
