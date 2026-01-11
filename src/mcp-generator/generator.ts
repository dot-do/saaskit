/**
 * MCP Generator
 *
 * Main entry point for creating MCP servers from noun/verb definitions.
 */

import type {
  MCPGenerator,
  MCPGeneratorConfig,
  MCPServerConfig,
  MCPServerInfo,
  MCPCapabilities,
  MCPTool,
  MCPToolResult,
  MCPResource,
  MCPResourceTemplate,
  MCPResourceContent,
  MCPPrompt,
  MCPPromptResult,
  MCPSamplingRequest,
  MCPStdioTransport,
} from './types'
import { generateTools, ToolExecutor } from './tools'
import { generateResources, ResourceReader } from './resources'
import { generatePrompts, PromptExecutor, type PromptConfig } from './prompts'
import { StdioTransport } from './transport'

/**
 * Default server info
 */
const DEFAULT_SERVER_INFO: MCPServerInfo = {
  name: 'saaskit-mcp-server',
  version: '1.0.0',
}

/**
 * Default URI scheme
 */
const DEFAULT_URI_SCHEME = 'saaskit'

/**
 * Protocol version
 */
const PROTOCOL_VERSION = '2024-11-05'

/**
 * Create an MCP Generator
 */
export function createMCPGenerator(config: MCPGeneratorConfig): MCPGenerator {
  // Normalize configuration
  const normalizedConfig = normalizeConfig(config)

  const serverInfo = config.serverInfo || DEFAULT_SERVER_INFO
  const uriScheme = config.uriScheme || DEFAULT_URI_SCHEME

  // Generate tools
  const tools = generateTools({
    nouns: normalizedConfig.nouns,
    verbs: normalizedConfig.verbs,
  })

  // Generate resources
  const { resources, templates } = generateResources(normalizedConfig.nouns, uriScheme)

  // Generate prompts
  const prompts = generatePrompts({
    nouns: normalizedConfig.nouns,
    prompts: config.prompts,
  })

  // Create executors
  const toolExecutor = new ToolExecutor(normalizedConfig.nouns, normalizedConfig.verbs)
  const resourceReader = new ResourceReader(
    toolExecutor.getStore(),
    normalizedConfig.nouns,
    uriScheme
  )
  const promptExecutor = new PromptExecutor(
    config.prompts || {},
    normalizedConfig.nouns,
    toolExecutor.getStore()
  )

  return {
    getServerInfo: () => serverInfo,

    getProtocolVersion: () => PROTOCOL_VERSION,

    getCapabilities: (): MCPCapabilities => ({
      tools: true,
      resources: true,
      prompts: true,
      sampling: {},
    }),

    listTools: () => tools,

    callTool: async (name: string, args: Record<string, unknown>): Promise<MCPToolResult> => {
      return toolExecutor.execute(name, args)
    },

    listResources: () => resources,

    listResourceTemplates: () => templates,

    readResource: async (uri: string): Promise<MCPResourceContent> => {
      return resourceReader.read(uri)
    },

    listPrompts: () => prompts,

    getPrompt: async (name: string, args: Record<string, string>): Promise<MCPPromptResult> => {
      return promptExecutor.getPrompt(name, args)
    },

    createSamplingRequest: (
      options: Omit<MCPSamplingRequest, 'maxTokens'> & { maxTokens?: number }
    ): MCPSamplingRequest => {
      return {
        messages: options.messages,
        maxTokens: options.maxTokens || 1000,
        stopSequences: options.stopSequences,
        temperature: options.temperature,
        modelPreferences: options.modelPreferences,
        systemPrompt: options.systemPrompt,
        includeContext: options.includeContext,
      }
    },

    createStdioTransport: (): MCPStdioTransport => {
      const generator: MCPGenerator = {
        getServerInfo: () => serverInfo,
        getProtocolVersion: () => PROTOCOL_VERSION,
        getCapabilities: () => ({
          tools: true,
          resources: true,
          prompts: true,
          sampling: {},
        }),
        listTools: () => tools,
        callTool: async (name, args) => toolExecutor.execute(name, args),
        listResources: () => resources,
        listResourceTemplates: () => templates,
        readResource: async (uri) => resourceReader.read(uri),
        listPrompts: () => prompts,
        getPrompt: async (name, args) => promptExecutor.getPrompt(name, args),
        createSamplingRequest: (opts) => ({
          messages: opts.messages,
          maxTokens: opts.maxTokens || 1000,
          stopSequences: opts.stopSequences,
          temperature: opts.temperature,
          modelPreferences: opts.modelPreferences,
          systemPrompt: opts.systemPrompt,
          includeContext: opts.includeContext,
        }),
        createStdioTransport: () => {
          throw new Error('Cannot create nested transport')
        },
      }

      return new StdioTransport(generator)
    },
  }
}

/**
 * Generate MCP server configuration
 */
export function generateMCPServer(config: {
  nouns: Record<string, Record<string, string>>
  verbs?: Record<string, Record<string, Function>>
  prompts?: Record<string, PromptConfig>
  serverInfo?: MCPServerInfo
  uriScheme?: string
}): MCPServerConfig {
  const serverInfo = config.serverInfo || DEFAULT_SERVER_INFO
  const uriScheme = config.uriScheme || DEFAULT_URI_SCHEME

  const tools = generateTools({
    nouns: config.nouns,
    verbs: config.verbs,
  })

  const { resources, templates } = generateResources(config.nouns, uriScheme)

  const prompts = generatePrompts({
    nouns: config.nouns,
    prompts: config.prompts,
  })

  return {
    serverInfo,
    tools,
    resources,
    resourceTemplates: templates,
    prompts,
    uriScheme,
  }
}

/**
 * Normalize configuration from various formats
 */
function normalizeConfig(config: MCPGeneratorConfig): {
  nouns: Record<string, Record<string, string>>
  verbs: Record<string, Record<string, Function>>
} {
  // If appConfig format is provided, convert it
  if (config.appConfig) {
    const nouns: Record<string, Record<string, string>> = {}
    const verbs: Record<string, Record<string, Function>> = {}

    // Convert noun array to schema format with default fields
    if (config.appConfig.nouns) {
      for (const noun of config.appConfig.nouns) {
        nouns[noun] = {
          id: 'string',
          createdAt: 'string',
          updatedAt: 'string',
        }
      }
    }

    // Convert verb array format to function format
    if (config.appConfig.verbs) {
      for (const [noun, verbList] of Object.entries(config.appConfig.verbs)) {
        verbs[noun] = {}
        for (const verb of verbList) {
          // Create a placeholder function for each verb
          verbs[noun][verb] = async ($: any) => {
            return { success: true, verb, noun, id: $.id }
          }
        }
      }
    }

    return { nouns, verbs }
  }

  // Use direct config
  return {
    nouns: config.nouns || {},
    verbs: config.verbs || {},
  }
}
