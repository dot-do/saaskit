/**
 * MCP Sampling Utilities
 *
 * Provides utilities for AI-to-AI communication via the MCP sampling protocol.
 * Supports context building, conversation management, and structured requests.
 */

import type {
  MCPSamplingMessage,
  MCPSamplingRequest,
  MCPResource,
  MCPTool,
  MCPPrompt,
} from './types'

/**
 * Model preference hints for sampling
 */
export type ModelHint =
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'

/**
 * Context inclusion options
 */
export type ContextScope = 'none' | 'thisServer' | 'allServers'

/**
 * Sampling request builder configuration
 */
export interface SamplingBuilderConfig {
  /** Default max tokens */
  defaultMaxTokens?: number
  /** Default temperature */
  defaultTemperature?: number
  /** Default model hints */
  defaultModelHints?: ModelHint[]
  /** Default context scope */
  defaultContextScope?: ContextScope
}

/**
 * Conversation message for multi-turn sampling
 */
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Sampling request builder for fluent API
 */
export class SamplingRequestBuilder {
  private messages: MCPSamplingMessage[] = []
  private maxTokens: number
  private stopSequences: string[] = []
  private temperature?: number
  private modelHints: Array<{ name: string }> = []
  private costPriority?: number
  private speedPriority?: number
  private intelligencePriority?: number
  private systemPrompt?: string
  private includeContext?: ContextScope

  constructor(config: SamplingBuilderConfig = {}) {
    this.maxTokens = config.defaultMaxTokens || 1000
    this.temperature = config.defaultTemperature
    if (config.defaultModelHints) {
      this.modelHints = config.defaultModelHints.map((name) => ({ name }))
    }
    this.includeContext = config.defaultContextScope
  }

  /**
   * Add a user message
   */
  user(content: string): this {
    this.messages.push({
      role: 'user',
      content: { type: 'text', text: content },
    })
    return this
  }

  /**
   * Add an assistant message (for multi-turn conversations)
   */
  assistant(content: string): this {
    this.messages.push({
      role: 'assistant',
      content: { type: 'text', text: content },
    })
    return this
  }

  /**
   * Add a user message with an image
   */
  userWithImage(text: string, imageData: string, mimeType: string): this {
    // MCP sampling only supports one content type per message
    // Add text first, then image as separate message if needed
    this.messages.push({
      role: 'user',
      content: { type: 'text', text },
    })
    this.messages.push({
      role: 'user',
      content: { type: 'image', data: imageData, mimeType },
    })
    return this
  }

  /**
   * Set the maximum tokens for the response
   */
  withMaxTokens(tokens: number): this {
    this.maxTokens = tokens
    return this
  }

  /**
   * Set stop sequences
   */
  withStopSequences(sequences: string[]): this {
    this.stopSequences = sequences
    return this
  }

  /**
   * Set temperature for sampling
   */
  withTemperature(temp: number): this {
    this.temperature = temp
    return this
  }

  /**
   * Set model preferences
   */
  withModelHints(...hints: ModelHint[]): this {
    this.modelHints = hints.map((name) => ({ name }))
    return this
  }

  /**
   * Set priority preferences
   */
  withPriorities(options: {
    cost?: number
    speed?: number
    intelligence?: number
  }): this {
    this.costPriority = options.cost
    this.speedPriority = options.speed
    this.intelligencePriority = options.intelligence
    return this
  }

  /**
   * Set the system prompt
   */
  withSystemPrompt(prompt: string): this {
    this.systemPrompt = prompt
    return this
  }

  /**
   * Set context inclusion scope
   */
  withContext(scope: ContextScope): this {
    this.includeContext = scope
    return this
  }

  /**
   * Add a conversation history
   */
  withConversation(messages: ConversationMessage[]): this {
    for (const msg of messages) {
      this.messages.push({
        role: msg.role,
        content: { type: 'text', text: msg.content },
      })
    }
    return this
  }

  /**
   * Build the sampling request
   */
  build(): MCPSamplingRequest {
    const request: MCPSamplingRequest = {
      messages: this.messages,
      maxTokens: this.maxTokens,
    }

    if (this.stopSequences.length > 0) {
      request.stopSequences = this.stopSequences
    }

    if (this.temperature !== undefined) {
      request.temperature = this.temperature
    }

    if (this.modelHints.length > 0 || this.costPriority !== undefined || this.speedPriority !== undefined || this.intelligencePriority !== undefined) {
      request.modelPreferences = {}
      if (this.modelHints.length > 0) {
        request.modelPreferences.hints = this.modelHints
      }
      if (this.costPriority !== undefined) {
        request.modelPreferences.costPriority = this.costPriority
      }
      if (this.speedPriority !== undefined) {
        request.modelPreferences.speedPriority = this.speedPriority
      }
      if (this.intelligencePriority !== undefined) {
        request.modelPreferences.intelligencePriority = this.intelligencePriority
      }
    }

    if (this.systemPrompt) {
      request.systemPrompt = this.systemPrompt
    }

    if (this.includeContext) {
      request.includeContext = this.includeContext
    }

    return request
  }
}

/**
 * Context builder for building rich context from MCP resources
 */
export class ContextBuilder {
  private parts: string[] = []
  private resources: MCPResource[] = []
  private tools: MCPTool[] = []
  private prompts: MCPPrompt[] = []

  /**
   * Add a text section to the context
   */
  addText(text: string, label?: string): this {
    if (label) {
      this.parts.push(`## ${label}\n${text}`)
    } else {
      this.parts.push(text)
    }
    return this
  }

  /**
   * Add resource information to context
   */
  addResource(resource: MCPResource): this {
    this.resources.push(resource)
    return this
  }

  /**
   * Add multiple resources to context
   */
  addResources(resources: MCPResource[]): this {
    this.resources.push(...resources)
    return this
  }

  /**
   * Add tool information to context
   */
  addTool(tool: MCPTool): this {
    this.tools.push(tool)
    return this
  }

  /**
   * Add multiple tools to context
   */
  addTools(tools: MCPTool[]): this {
    this.tools.push(...tools)
    return this
  }

  /**
   * Add prompt information to context
   */
  addPrompt(prompt: MCPPrompt): this {
    this.prompts.push(prompt)
    return this
  }

  /**
   * Add data as JSON
   */
  addData(data: unknown, label?: string): this {
    const json = JSON.stringify(data, null, 2)
    if (label) {
      this.parts.push(`## ${label}\n\`\`\`json\n${json}\n\`\`\``)
    } else {
      this.parts.push(`\`\`\`json\n${json}\n\`\`\``)
    }
    return this
  }

  /**
   * Add instructions for the AI
   */
  addInstructions(instructions: string[]): this {
    this.parts.push('## Instructions\n' + instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n'))
    return this
  }

  /**
   * Build the context string
   */
  build(): string {
    const sections: string[] = [...this.parts]

    // Add resources section
    if (this.resources.length > 0) {
      const resourceList = this.resources
        .map((r) => `- **${r.name}**: ${r.uri} (${r.mimeType})${r.description ? `\n  ${r.description}` : ''}`)
        .join('\n')
      sections.push(`## Available Resources\n${resourceList}`)
    }

    // Add tools section
    if (this.tools.length > 0) {
      const toolList = this.tools
        .map((t) => {
          const params = t.inputSchema.properties
            ? Object.entries(t.inputSchema.properties)
                .map(([name, prop]) => `    - ${name}: ${(prop as { type: string }).type}`)
                .join('\n')
            : ''
          return `- **${t.name}**: ${t.description}${params ? `\n${params}` : ''}`
        })
        .join('\n')
      sections.push(`## Available Tools\n${toolList}`)
    }

    // Add prompts section
    if (this.prompts.length > 0) {
      const promptList = this.prompts
        .map((p) => {
          const args = p.arguments
            ? p.arguments.map((a) => `    - ${a.name}${a.required ? ' (required)' : ''}: ${a.description}`).join('\n')
            : ''
          return `- **${p.name}**: ${p.description}${args ? `\n${args}` : ''}`
        })
        .join('\n')
      sections.push(`## Available Prompts\n${promptList}`)
    }

    return sections.join('\n\n')
  }
}

/**
 * Create a sampling request builder
 */
export function createSamplingBuilder(config?: SamplingBuilderConfig): SamplingRequestBuilder {
  return new SamplingRequestBuilder(config)
}

/**
 * Create a context builder
 */
export function createContextBuilder(): ContextBuilder {
  return new ContextBuilder()
}

/**
 * Create a simple sampling request with a single user message
 */
export function createSimpleSamplingRequest(
  message: string,
  options: {
    maxTokens?: number
    temperature?: number
    modelHints?: ModelHint[]
    systemPrompt?: string
  } = {}
): MCPSamplingRequest {
  const builder = new SamplingRequestBuilder({
    defaultMaxTokens: options.maxTokens,
    defaultTemperature: options.temperature,
    defaultModelHints: options.modelHints,
  })

  if (options.systemPrompt) {
    builder.withSystemPrompt(options.systemPrompt)
  }

  return builder.user(message).build()
}

/**
 * Create a sampling request for tool-assisted tasks
 */
export function createToolAssistedRequest(
  task: string,
  tools: MCPTool[],
  options: {
    maxTokens?: number
    temperature?: number
    additionalContext?: string
  } = {}
): MCPSamplingRequest {
  const context = createContextBuilder()
    .addText(task, 'Task')
    .addTools(tools)

  if (options.additionalContext) {
    context.addText(options.additionalContext, 'Additional Context')
  }

  context.addInstructions([
    'Analyze the task and determine which tools are needed',
    'Execute the necessary tools in the correct order',
    'Report the results clearly',
  ])

  return createSamplingBuilder({
    defaultMaxTokens: options.maxTokens || 2000,
    defaultTemperature: options.temperature,
  })
    .user(context.build())
    .build()
}

/**
 * Create a sampling request for data analysis
 */
export function createDataAnalysisRequest(
  data: unknown,
  analysisType: 'summary' | 'trends' | 'anomalies' | 'comparison',
  options: {
    maxTokens?: number
    format?: 'text' | 'json' | 'markdown'
  } = {}
): MCPSamplingRequest {
  const instructions: Record<string, string> = {
    summary: 'Provide a concise summary of the key insights from this data.',
    trends: 'Identify and explain any trends, patterns, or changes over time.',
    anomalies: 'Detect and explain any outliers, anomalies, or unusual patterns.',
    comparison: 'Compare and contrast the different elements or categories in the data.',
  }

  const context = createContextBuilder()
    .addData(data, 'Data')
    .addText(instructions[analysisType], 'Analysis Focus')
    .addInstructions([
      `Output format: ${options.format || 'markdown'}`,
      'Be specific and cite data points when making claims',
      'Highlight actionable insights',
    ])

  return createSamplingBuilder({
    defaultMaxTokens: options.maxTokens || 2000,
    defaultTemperature: 0.3, // Lower temperature for analytical tasks
  })
    .withSystemPrompt('You are a data analyst. Provide clear, actionable insights.')
    .user(context.build())
    .build()
}

/**
 * Create a multi-agent coordination request
 */
export function createAgentCoordinationRequest(
  agents: Array<{
    name: string
    role: string
    capabilities: string[]
  }>,
  task: string,
  options: {
    maxTokens?: number
    coordinationStyle?: 'sequential' | 'parallel' | 'hierarchical'
  } = {}
): MCPSamplingRequest {
  const agentList = agents
    .map((a) => `- **${a.name}** (${a.role}): ${a.capabilities.join(', ')}`)
    .join('\n')

  const coordinationInstructions: Record<string, string> = {
    sequential: 'Coordinate agents to work one after another, passing results to the next.',
    parallel: 'Divide the task so agents can work simultaneously on different parts.',
    hierarchical: 'Assign a lead agent to coordinate and delegate to other agents.',
  }

  const context = createContextBuilder()
    .addText(task, 'Task')
    .addText(agentList, 'Available Agents')
    .addText(coordinationInstructions[options.coordinationStyle || 'sequential'], 'Coordination Strategy')
    .addInstructions([
      'Create a step-by-step execution plan',
      'Assign specific responsibilities to each agent',
      'Define success criteria and verification steps',
    ])

  return createSamplingBuilder({
    defaultMaxTokens: options.maxTokens || 3000,
    defaultTemperature: 0.5,
  })
    .withSystemPrompt('You are a coordination agent responsible for orchestrating multi-agent workflows.')
    .user(context.build())
    .build()
}
