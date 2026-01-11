/**
 * MCP Generator Tests (RED Phase - TDD)
 *
 * These tests define the expected API for the MCP (Model Context Protocol) generator
 * that creates MCP servers from noun/verb definitions. All tests should FAIL
 * initially because the implementation doesn't exist yet.
 *
 * The MCP generator provides:
 * - MCP server scaffold with tools, resources, and prompts
 * - Tool generation from verbs (actions that can be performed)
 * - Resource generation from nouns (data that can be read)
 * - Tool execution handlers
 * - Resource read handlers
 * - Sampling support for AI interactions
 * - stdio transport for CLI integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// These imports will fail until implementation exists
import {
  createMCPGenerator,
  generateMCPServer,
  type MCPGenerator,
  type MCPTool,
  type MCPResource,
  type MCPPrompt,
  type MCPServerConfig,
  type MCPToolResult,
  type MCPResourceContent,
} from '../mcp-generator'

describe('MCP Generator', () => {
  /**
   * Factory function for creating test MCP generators
   */
  const createTestMCP = (config: {
    nouns?: Record<string, Record<string, string>>
    verbs?: Record<string, Record<string, Function>>
    prompts?: Record<string, { description: string; template: string; arguments?: Array<{ name: string; description: string; required?: boolean }> }>
    serverInfo?: { name: string; version: string }
  } = {}) => {
    return createMCPGenerator({
      nouns: config.nouns ?? {
        Todo: { id: 'string', title: 'string', done: 'boolean' },
        User: { id: 'string', name: 'string', email: 'string' },
      },
      verbs: config.verbs ?? {
        Todo: {
          complete: ($: any) => $.db.Todo.update($.id, { done: true }),
          archive: ($: any) => $.db.Todo.update($.id, { archived: true }),
        },
        User: {
          invite: ($: any) => $.email.send($.input.email, 'Invitation'),
        },
      },
      prompts: config.prompts,
      serverInfo: config.serverInfo,
    })
  }

  describe('MCP Server Generation', () => {
    describe('Server Configuration', () => {
      it('should create an MCP generator with server info', () => {
        const mcp = createTestMCP({
          serverInfo: {
            name: 'test-server',
            version: '1.0.0',
          },
        })

        expect(mcp).toBeDefined()
        expect(mcp.getServerInfo().name).toBe('test-server')
        expect(mcp.getServerInfo().version).toBe('1.0.0')
      })

      it('should use default server info if not provided', () => {
        const mcp = createTestMCP()

        expect(mcp.getServerInfo().name).toBe('saaskit-mcp-server')
        expect(mcp.getServerInfo().version).toBe('1.0.0')
      })

      it('should list available capabilities', () => {
        const mcp = createTestMCP()

        const capabilities = mcp.getCapabilities()

        expect(capabilities).toHaveProperty('tools')
        expect(capabilities).toHaveProperty('resources')
        expect(capabilities).toHaveProperty('prompts')
        expect(capabilities.tools).toBe(true)
        expect(capabilities.resources).toBe(true)
      })
    })

    describe('Protocol Version', () => {
      it('should support MCP protocol version 2024-11-05', () => {
        const mcp = createTestMCP()

        expect(mcp.getProtocolVersion()).toBe('2024-11-05')
      })
    })
  })

  describe('Tool Generation from Verbs', () => {
    describe('Tool Listing', () => {
      it('should generate tools from noun verbs', () => {
        const mcp = createTestMCP()

        const tools = mcp.listTools()

        // Check that verb tools are generated (case-insensitive match)
        expect(tools).toContainEqual(
          expect.objectContaining({
            name: 'todo_complete',
            description: expect.stringMatching(/complete/i),
          })
        )
        expect(tools).toContainEqual(
          expect.objectContaining({
            name: 'todo_archive',
            description: expect.stringMatching(/archive/i),
          })
        )
        expect(tools).toContainEqual(
          expect.objectContaining({
            name: 'user_invite',
            description: expect.stringMatching(/invite/i),
          })
        )
      })

      it('should generate CRUD tools for nouns', () => {
        const mcp = createTestMCP()

        const tools = mcp.listTools()

        // Create tools
        expect(tools).toContainEqual(
          expect.objectContaining({
            name: 'todo_create',
          })
        )
        expect(tools).toContainEqual(
          expect.objectContaining({
            name: 'user_create',
          })
        )

        // Read tools
        expect(tools).toContainEqual(
          expect.objectContaining({
            name: 'todo_get',
          })
        )

        // Update tools
        expect(tools).toContainEqual(
          expect.objectContaining({
            name: 'todo_update',
          })
        )

        // Delete tools
        expect(tools).toContainEqual(
          expect.objectContaining({
            name: 'todo_delete',
          })
        )
      })

      it('should include input schema for tools', () => {
        const mcp = createTestMCP()

        const tools = mcp.listTools()
        const completeTool = tools.find((t) => t.name === 'todo_complete')

        expect(completeTool).toBeDefined()
        expect(completeTool!.inputSchema).toBeDefined()
        expect(completeTool!.inputSchema.type).toBe('object')
        expect(completeTool!.inputSchema.properties).toHaveProperty('id')
      })

      it('should include input schema based on noun fields for create', () => {
        const mcp = createTestMCP()

        const tools = mcp.listTools()
        const createTool = tools.find((t) => t.name === 'todo_create')

        expect(createTool).toBeDefined()
        expect(createTool!.inputSchema.properties).toHaveProperty('title')
        expect(createTool!.inputSchema.properties).toHaveProperty('done')
      })
    })

    describe('Tool Execution', () => {
      it('should execute verb tool and return result', async () => {
        const verbHandler = vi.fn().mockResolvedValue({ id: '123', done: true })
        const mcp = createTestMCP({
          verbs: {
            Todo: {
              complete: verbHandler,
            },
          },
        })

        const result = await mcp.callTool('todo_complete', { id: '123' })

        expect(result.content).toBeDefined()
        expect(result.content[0].type).toBe('text')
        expect(JSON.parse(result.content[0].text!)).toEqual({ id: '123', done: true })
      })

      it('should execute CRUD create tool', async () => {
        const mcp = createTestMCP()

        const result = await mcp.callTool('todo_create', {
          title: 'New Todo',
          done: false,
        })

        expect(result.content).toBeDefined()
        expect(result.content[0].type).toBe('text')
        const data = JSON.parse(result.content[0].text!)
        expect(data).toHaveProperty('id')
        expect(data.title).toBe('New Todo')
      })

      it('should execute CRUD get tool', async () => {
        const mcp = createTestMCP()

        // Create first
        const createResult = await mcp.callTool('todo_create', {
          title: 'Test Todo',
        })
        const created = JSON.parse(createResult.content[0].text!)

        // Then get
        const result = await mcp.callTool('todo_get', { id: created.id })

        expect(result.content).toBeDefined()
        const data = JSON.parse(result.content[0].text!)
        expect(data.id).toBe(created.id)
        expect(data.title).toBe('Test Todo')
      })

      it('should execute CRUD update tool', async () => {
        const mcp = createTestMCP()

        // Create first
        const createResult = await mcp.callTool('todo_create', {
          title: 'Original',
        })
        const created = JSON.parse(createResult.content[0].text!)

        // Then update
        const result = await mcp.callTool('todo_update', {
          id: created.id,
          title: 'Updated',
        })

        expect(result.content).toBeDefined()
        const data = JSON.parse(result.content[0].text!)
        expect(data.title).toBe('Updated')
      })

      it('should execute CRUD delete tool', async () => {
        const mcp = createTestMCP()

        // Create first
        const createResult = await mcp.callTool('todo_create', {
          title: 'To Delete',
        })
        const created = JSON.parse(createResult.content[0].text!)

        // Delete
        const result = await mcp.callTool('todo_delete', { id: created.id })

        expect(result.content).toBeDefined()
        const data = JSON.parse(result.content[0].text!)
        expect(data.success).toBe(true)

        // Verify deleted
        const getResult = await mcp.callTool('todo_get', { id: created.id })
        const getData = JSON.parse(getResult.content[0].text!)
        expect(getData.error).toBeDefined()
      })

      it('should return error for unknown tool', async () => {
        const mcp = createTestMCP()

        const result = await mcp.callTool('unknown_tool', {})

        expect(result.isError).toBe(true)
        expect(result.content[0].text).toMatch(/unknown tool|not found/i)
      })

      it('should pass context to verb handler', async () => {
        let capturedContext: any = null
        const mcp = createTestMCP({
          verbs: {
            Todo: {
              inspect: ($: any) => {
                capturedContext = $
                return { inspected: true }
              },
            },
          },
        })

        await mcp.callTool('todo_inspect', {
          id: '123',
          extra: 'data',
        })

        expect(capturedContext).toBeDefined()
        expect(capturedContext.id).toBe('123')
        expect(capturedContext.input).toEqual({ id: '123', extra: 'data' })
      })

      it('should handle verb execution errors gracefully', async () => {
        const mcp = createTestMCP({
          verbs: {
            Todo: {
              fail: () => {
                throw new Error('Intentional failure')
              },
            },
          },
        })

        const result = await mcp.callTool('todo_fail', { id: '123' })

        expect(result.isError).toBe(true)
        expect(result.content[0].text).toMatch(/error|failed/i)
      })
    })
  })

  describe('Resource Generation from Nouns', () => {
    describe('Resource Listing', () => {
      it('should generate resources from nouns', () => {
        const mcp = createTestMCP()

        const resources = mcp.listResources()

        expect(resources).toContainEqual(
          expect.objectContaining({
            uri: 'saaskit://todo',
            name: 'Todo',
            mimeType: 'application/json',
          })
        )
        expect(resources).toContainEqual(
          expect.objectContaining({
            uri: 'saaskit://user',
            name: 'User',
            mimeType: 'application/json',
          })
        )
      })

      it('should include resource description', () => {
        const mcp = createTestMCP()

        const resources = mcp.listResources()
        const todoResource = resources.find((r) => r.uri === 'saaskit://todo')

        expect(todoResource).toBeDefined()
        expect(todoResource!.description).toBeDefined()
        expect(todoResource!.description).toContain('Todo')
      })

      it('should support resource templates for individual items', () => {
        const mcp = createTestMCP()

        const templates = mcp.listResourceTemplates()

        expect(templates).toContainEqual(
          expect.objectContaining({
            uriTemplate: 'saaskit://todo/{id}',
            name: 'Todo by ID',
          })
        )
        expect(templates).toContainEqual(
          expect.objectContaining({
            uriTemplate: 'saaskit://user/{id}',
            name: 'User by ID',
          })
        )
      })
    })

    describe('Resource Reading', () => {
      it('should read resource list', async () => {
        const mcp = createTestMCP()

        // Create some data first
        await mcp.callTool('todo_create', { title: 'Todo 1' })
        await mcp.callTool('todo_create', { title: 'Todo 2' })

        const result = await mcp.readResource('saaskit://todo')

        expect(result.contents).toBeDefined()
        expect(result.contents).toHaveLength(1)
        expect(result.contents[0].uri).toBe('saaskit://todo')
        expect(result.contents[0].mimeType).toBe('application/json')

        const data = JSON.parse(result.contents[0].text!)
        expect(Array.isArray(data)).toBe(true)
        expect(data).toHaveLength(2)
      })

      it('should read individual resource by ID', async () => {
        const mcp = createTestMCP()

        // Create data
        const createResult = await mcp.callTool('todo_create', {
          title: 'Specific Todo',
        })
        const created = JSON.parse(createResult.content[0].text!)

        const result = await mcp.readResource(`saaskit://todo/${created.id}`)

        expect(result.contents).toBeDefined()
        expect(result.contents[0].uri).toBe(`saaskit://todo/${created.id}`)

        const data = JSON.parse(result.contents[0].text!)
        expect(data.id).toBe(created.id)
        expect(data.title).toBe('Specific Todo')
      })

      it('should return error for non-existent resource', async () => {
        const mcp = createTestMCP()

        const result = await mcp.readResource('saaskit://unknown')

        expect(result.error).toBeDefined()
        expect(result.error).toMatch(/not found|unknown/i)
      })

      it('should return error for non-existent item', async () => {
        const mcp = createTestMCP()

        const result = await mcp.readResource('saaskit://todo/nonexistent_123')

        expect(result.error).toBeDefined()
        expect(result.error).toMatch(/not found/i)
      })

      it('should support query parameters in resource URI', async () => {
        const mcp = createTestMCP()

        // Create some data
        await mcp.callTool('todo_create', { title: 'Done', done: true })
        await mcp.callTool('todo_create', { title: 'Not Done', done: false })

        const result = await mcp.readResource('saaskit://todo?done=true')

        expect(result.contents).toBeDefined()
        const data = JSON.parse(result.contents[0].text!)
        expect(data).toHaveLength(1)
        expect(data[0].done).toBe(true)
      })
    })
  })

  describe('Prompt Generation', () => {
    describe('Prompt Listing', () => {
      it('should list available prompts', () => {
        const mcp = createTestMCP({
          prompts: {
            summarize: {
              description: 'Summarize todos',
              template: 'Please summarize the following todos: {{todos}}',
            },
            prioritize: {
              description: 'Prioritize tasks',
              template: 'Help me prioritize: {{tasks}}',
            },
          },
        })

        const prompts = mcp.listPrompts()

        expect(prompts).toContainEqual(
          expect.objectContaining({
            name: 'summarize',
            description: 'Summarize todos',
          })
        )
        expect(prompts).toContainEqual(
          expect.objectContaining({
            name: 'prioritize',
            description: 'Prioritize tasks',
          })
        )
      })

      it('should generate default prompts for nouns', () => {
        const mcp = createTestMCP()

        const prompts = mcp.listPrompts()

        // Should have analyze prompts for each noun (case-insensitive match)
        expect(prompts).toContainEqual(
          expect.objectContaining({
            name: 'analyze_todo',
            description: expect.stringMatching(/analyze/i),
          })
        )
      })

      it('should include prompt arguments', () => {
        const mcp = createTestMCP({
          prompts: {
            custom: {
              description: 'Custom prompt',
              template: 'Input: {{input}}, Context: {{context}}',
              arguments: [
                { name: 'input', description: 'The input', required: true },
                { name: 'context', description: 'Optional context', required: false },
              ],
            },
          },
        })

        const prompts = mcp.listPrompts()
        const customPrompt = prompts.find((p) => p.name === 'custom')

        expect(customPrompt).toBeDefined()
        expect(customPrompt!.arguments).toHaveLength(2)
        expect(customPrompt!.arguments![0].required).toBe(true)
        expect(customPrompt!.arguments![1].required).toBe(false)
      })
    })

    describe('Prompt Execution', () => {
      it('should get prompt with arguments filled', async () => {
        const mcp = createTestMCP({
          prompts: {
            greet: {
              description: 'Generate greeting',
              template: 'Hello {{name}}, welcome to {{place}}!',
              arguments: [
                { name: 'name', description: 'Name', required: true },
                { name: 'place', description: 'Place', required: true },
              ],
            },
          },
        })

        const result = await mcp.getPrompt('greet', {
          name: 'Alice',
          place: 'Wonderland',
        })

        expect(result.messages).toBeDefined()
        expect(result.messages).toHaveLength(1)
        expect(result.messages[0].role).toBe('user')
        expect(result.messages[0].content.text).toBe('Hello Alice, welcome to Wonderland!')
      })

      it('should return error for unknown prompt', async () => {
        const mcp = createTestMCP()

        const result = await mcp.getPrompt('unknown_prompt', {})

        expect(result.error).toBeDefined()
        expect(result.error).toMatch(/not found|unknown/i)
      })

      it('should return error for missing required arguments', async () => {
        const mcp = createTestMCP({
          prompts: {
            required: {
              description: 'Requires args',
              template: 'Value: {{value}}',
              arguments: [{ name: 'value', description: 'Required', required: true }],
            },
          },
        })

        const result = await mcp.getPrompt('required', {})

        expect(result.error).toBeDefined()
        expect(result.error).toMatch(/required|missing/i)
      })

      it('should include resource data in prompt context', async () => {
        const mcp = createTestMCP()

        // Create some data
        await mcp.callTool('todo_create', { title: 'Task 1' })
        await mcp.callTool('todo_create', { title: 'Task 2' })

        const result = await mcp.getPrompt('analyze_todo', {})

        expect(result.messages).toBeDefined()
        // The prompt should include embedded resource data
        expect(result.messages[0].content.text).toContain('Task 1')
        expect(result.messages[0].content.text).toContain('Task 2')
      })
    })
  })

  describe('Sampling Support', () => {
    it('should support sampling capability', () => {
      const mcp = createTestMCP()

      const capabilities = mcp.getCapabilities()

      expect(capabilities.sampling).toBeDefined()
    })

    it('should create sampling request', async () => {
      const mcp = createTestMCP()

      const request = mcp.createSamplingRequest({
        messages: [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
        maxTokens: 100,
      })

      expect(request).toHaveProperty('messages')
      expect(request).toHaveProperty('maxTokens', 100)
      expect(request.messages).toHaveLength(1)
    })

    it('should include model preferences in sampling request', () => {
      const mcp = createTestMCP()

      const request = mcp.createSamplingRequest({
        messages: [{ role: 'user', content: { type: 'text', text: 'Test' } }],
        modelPreferences: {
          hints: [{ name: 'claude-3-opus' }],
          intelligencePriority: 0.8,
          speedPriority: 0.2,
        },
      })

      expect(request.modelPreferences).toBeDefined()
      expect(request.modelPreferences!.hints![0].name).toBe('claude-3-opus')
    })
  })

  describe('stdio Transport', () => {
    it('should create stdio transport handler', () => {
      const mcp = createTestMCP()

      const transport = mcp.createStdioTransport()

      expect(transport).toBeDefined()
      expect(transport).toHaveProperty('handleMessage')
      expect(transport).toHaveProperty('start')
      expect(transport).toHaveProperty('close')
    })

    it('should handle initialize request', async () => {
      const mcp = createTestMCP()
      const transport = mcp.createStdioTransport()

      const response = await transport.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      })

      expect(response.result).toBeDefined()
      const result = response.result as { protocolVersion: string; serverInfo: { name: string }; capabilities: { tools: unknown } }
      expect(result.protocolVersion).toBe('2024-11-05')
      expect(result.serverInfo).toHaveProperty('name')
      expect(result.capabilities).toHaveProperty('tools')
    })

    it('should handle tools/list request', async () => {
      const mcp = createTestMCP()
      const transport = mcp.createStdioTransport()

      // Initialize first
      await transport.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      })

      const response = await transport.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      })

      expect(response.result).toBeDefined()
      const result = response.result as { tools: unknown[] }
      expect(result.tools).toBeDefined()
      expect(Array.isArray(result.tools)).toBe(true)
    })

    it('should handle tools/call request', async () => {
      const mcp = createTestMCP()
      const transport = mcp.createStdioTransport()

      // Initialize first
      await transport.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      })

      const response = await transport.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'todo_create',
          arguments: { title: 'Test Todo' },
        },
      })

      expect(response.result).toBeDefined()
      expect((response.result as { content: unknown }).content).toBeDefined()
    })

    it('should handle resources/list request', async () => {
      const mcp = createTestMCP()
      const transport = mcp.createStdioTransport()

      // Initialize first
      await transport.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      })

      const response = await transport.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/list',
        params: {},
      })

      expect(response.result).toBeDefined()
      const result = response.result as { resources: unknown[] }
      expect(result.resources).toBeDefined()
      expect(Array.isArray(result.resources)).toBe(true)
    })

    it('should handle resources/read request', async () => {
      const mcp = createTestMCP()
      const transport = mcp.createStdioTransport()

      // Initialize first
      await transport.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      })

      const response = await transport.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/read',
        params: {
          uri: 'saaskit://todo',
        },
      })

      expect(response.result).toBeDefined()
      expect((response.result as { contents: unknown }).contents).toBeDefined()
    })

    it('should handle prompts/list request', async () => {
      const mcp = createTestMCP()
      const transport = mcp.createStdioTransport()

      // Initialize first
      await transport.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      })

      const response = await transport.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'prompts/list',
        params: {},
      })

      expect(response.result).toBeDefined()
      expect((response.result as { prompts: unknown }).prompts).toBeDefined()
    })

    it('should handle prompts/get request', async () => {
      const mcp = createTestMCP({
        prompts: {
          test: {
            description: 'Test prompt',
            template: 'Hello {{name}}',
            arguments: [{ name: 'name', description: 'Name', required: true }],
          },
        },
      })
      const transport = mcp.createStdioTransport()

      // Initialize first
      await transport.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      })

      const response = await transport.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'prompts/get',
        params: {
          name: 'test',
          arguments: { name: 'World' },
        },
      })

      expect(response.result).toBeDefined()
      const result = response.result as { messages: Array<{ content: { text: string } }> }
      expect(result.messages).toBeDefined()
      expect(result.messages[0].content.text).toBe('Hello World')
    })

    it('should return error for unknown method', async () => {
      const mcp = createTestMCP()
      const transport = mcp.createStdioTransport()

      // Initialize first
      await transport.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      })

      const response = await transport.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'unknown/method',
        params: {},
      })

      expect(response.error).toBeDefined()
      expect(response.error!.code).toBe(-32601) // Method not found
    })

    it('should return error before initialization', async () => {
      const mcp = createTestMCP()
      const transport = mcp.createStdioTransport()

      const response = await transport.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      })

      expect(response.error).toBeDefined()
      expect(response.error!.message).toMatch(/not initialized/i)
    })
  })

  describe('Standalone generateMCPServer Function', () => {
    it('should generate MCP server config from noun/verb definitions', () => {
      const config = generateMCPServer({
        nouns: {
          Product: { id: 'string', name: 'string', price: 'number' },
          Order: { id: 'string', total: 'number', status: 'string' },
        },
        verbs: {
          Order: {
            fulfill: () => {},
            cancel: () => {},
          },
        },
      })

      expect(config).toHaveProperty('tools')
      expect(config).toHaveProperty('resources')
      expect(config.tools).toContainEqual(
        expect.objectContaining({
          name: 'order_fulfill',
        })
      )
      expect(config.resources).toContainEqual(
        expect.objectContaining({
          uri: 'saaskit://product',
        })
      )
    })

    it('should accept custom server name and version', () => {
      const config = generateMCPServer({
        nouns: { Item: { id: 'string', name: 'string' } },
        serverInfo: {
          name: 'custom-server',
          version: '2.0.0',
        },
      })

      expect(config.serverInfo.name).toBe('custom-server')
      expect(config.serverInfo.version).toBe('2.0.0')
    })

    it('should accept custom URI scheme', () => {
      const config = generateMCPServer({
        nouns: { Item: { id: 'string', name: 'string' } },
        uriScheme: 'myapp',
      })

      expect(config.resources).toContainEqual(
        expect.objectContaining({
          uri: 'myapp://item',
        })
      )
    })
  })

  describe('Integration with App Config', () => {
    it('should generate MCP server from app config format', () => {
      const mcp = createMCPGenerator({
        // Using app config format
        appConfig: {
          nouns: ['Todo', 'User', 'Project'],
          verbs: {
            Todo: ['complete', 'archive'],
            User: ['invite', 'suspend'],
            Project: ['archive'],
          },
        },
      })

      const tools = mcp.listTools()
      const resources = mcp.listResources()

      // Should have tools for verbs
      expect(tools).toContainEqual(
        expect.objectContaining({
          name: 'todo_complete',
        })
      )

      // Should have resources for nouns
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: 'saaskit://project',
        })
      )
    })

    it('should generate default schemas for array noun config', () => {
      const mcp = createMCPGenerator({
        appConfig: {
          nouns: ['Task'],
        },
      })

      const tools = mcp.listTools()
      const createTool = tools.find((t) => t.name === 'task_create')

      // Should have default schema with id field
      expect(createTool!.inputSchema.properties).toHaveProperty('id')
    })
  })
})
