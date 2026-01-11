/**
 * CLI Generator Tests (RED Phase - TDD)
 *
 * These tests define the expected API for the CLI generator that creates
 * a complete command-line interface for SaaS applications. All tests should
 * FAIL initially because the implementation doesn't exist yet.
 *
 * The CLI generator provides:
 * - `yourapp login` - Authenticate user
 * - `yourapp [noun] list` - List records of a noun type
 * - `yourapp [noun] create` - Create a new record
 * - `yourapp [noun] get <id>` - Get a single record
 * - `yourapp [noun] [verb] <id>` - Execute a verb on a record
 * - `yourapp config set` - Store configuration values
 * - `yourapp config get` - Retrieve configuration values
 * - Shell completions - Autocomplete for bash/zsh/fish
 * - Help text - Generated documentation for all commands
 * - Error messages - Helpful error formatting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// These imports will fail until implementation exists
// @ts-expect-error - Implementation not yet created
import { createCLIGenerator, generateCLI, createCLIRunner } from '../cli-generator'
// @ts-expect-error - Implementation not yet created
import type { CLIConfig, CLIGenerator, GeneratedCLI, CLIRunner, CommandResult } from '../cli-generator/types'

describe('CLI Generator', () => {
  /**
   * Factory function for creating test CLI generators
   */
  const createTestGenerator = (config: Partial<CLIConfig> = {}): CLIGenerator => {
    return createCLIGenerator({
      nouns: config.nouns ?? {
        User: { name: 'string', email: 'string', role: 'admin | member | guest' },
        Post: { title: 'string', body: 'string', author: '->User', published: 'boolean?' },
      },
      verbs: config.verbs ?? {
        User: {
          invite: ($: unknown) => ({}),
          ban: ($: unknown) => ({}),
        },
        Post: {
          publish: ($: unknown) => ({}),
          archive: ($: unknown) => ({}),
        },
      },
      cliName: config.cliName ?? 'testcli',
      packageName: config.packageName ?? 'testcli-cli',
      version: config.version ?? '1.0.0',
      baseUrl: config.baseUrl ?? 'https://api.test.com',
    })
  }

  // ============================================================================
  // Core CLI Generator
  // ============================================================================

  describe('Core CLI Generator', () => {
    it('should create a CLI generator from config', () => {
      const generator = createTestGenerator()

      expect(generator).toBeDefined()
      expect(generator.generate).toBeDefined()
      expect(generator.getCommands).toBeDefined()
      expect(generator.getCompletionScript).toBeDefined()
    })

    it('should include package metadata in generated CLI', () => {
      const generator = createTestGenerator({
        cliName: 'myapp',
        packageName: 'myapp-cli',
        version: '2.0.0',
      })

      const cli = generator.generate()

      expect(cli.cliName).toBe('myapp')
      expect(cli.packageName).toBe('myapp-cli')
      expect(cli.version).toBe('2.0.0')
    })

    it('should generate resource list for each noun', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      expect(cli.resources).toContain('User')
      expect(cli.resources).toContain('Post')
    })

    it('should generate command list including CRUD and verbs', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      // Auth commands
      expect(cli.commands).toContain('login')
      expect(cli.commands).toContain('logout')

      // Config commands
      expect(cli.commands).toContain('config')
      expect(cli.commands).toContain('completion')

      // CRUD commands
      expect(cli.commands).toContain('user list')
      expect(cli.commands).toContain('user get')
      expect(cli.commands).toContain('user create')
      expect(cli.commands).toContain('user update')
      expect(cli.commands).toContain('user delete')

      // Verb commands
      expect(cli.commands).toContain('user invite')
      expect(cli.commands).toContain('user ban')
      expect(cli.commands).toContain('post publish')
      expect(cli.commands).toContain('post archive')
    })
  })

  // ============================================================================
  // Authentication Commands
  // ============================================================================

  describe('Authentication Commands', () => {
    it('should generate login command', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      expect(cli.files['src/commands/login.ts']).toBeDefined()
      expect(cli.files['src/commands/login.ts']).toContain('loginCommand')
      expect(cli.files['src/commands/login.ts']).toContain("description('Authenticate")
    })

    it('should generate logout command', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      expect(cli.files['src/commands/logout.ts']).toBeDefined()
      expect(cli.files['src/commands/logout.ts']).toContain('logoutCommand')
      expect(cli.files['src/commands/logout.ts']).toContain('clearConfig')
    })

    it('should support API key authentication', () => {
      const generator = createCLIGenerator({
        nouns: { User: { name: 'string' } },
        verbs: {},
        cliName: 'myapp',
        packageName: 'myapp-cli',
        version: '1.0.0',
        auth: {
          type: 'api-key',
          envVar: 'MY_API_KEY',
        },
      })
      const cli = generator.generate()

      const loginCode = cli.files['src/commands/login.ts']
      expect(loginCode).toContain('API key')
      expect(loginCode).toContain('MY_API_KEY')
    })

    it('should support OAuth/browser authentication', () => {
      const generator = createCLIGenerator({
        nouns: { Item: { name: 'string' } },
        verbs: {},
        cliName: 'test',
        packageName: 'test-cli',
        version: '1.0.0',
        auth: {
          type: 'oauth',
          authUrl: 'https://auth.example.com/authorize',
        },
      })
      const cli = generator.generate()

      const loginCode = cli.files['src/commands/login.ts']
      expect(loginCode).toContain('browser')
    })
  })

  // ============================================================================
  // CRUD Commands
  // ============================================================================

  describe('CRUD Commands', () => {
    it('should generate list command for each noun', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const listCode = cli.files['src/commands/user/list.ts']
      expect(listCode).toBeDefined()
      expect(listCode).toContain('listUserCommand')
      expect(listCode).toContain("description('List all")
      expect(listCode).toContain('--limit')
      expect(listCode).toContain('--offset')
      expect(listCode).toContain('--filter')
    })

    it('should generate get command for each noun', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const getCode = cli.files['src/commands/user/get.ts']
      expect(getCode).toBeDefined()
      expect(getCode).toContain('getUserCommand')
      expect(getCode).toContain(".argument('<id>'")
    })

    it('should generate create command with field options', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const createCode = cli.files['src/commands/user/create.ts']
      expect(createCode).toBeDefined()
      expect(createCode).toContain('createUserCommand')
      expect(createCode).toContain('--name')
      expect(createCode).toContain('--email')
      expect(createCode).toContain('--interactive')
    })

    it('should generate update command with field options', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const updateCode = cli.files['src/commands/user/update.ts']
      expect(updateCode).toBeDefined()
      expect(updateCode).toContain('updateUserCommand')
      expect(updateCode).toContain(".argument('<id>'")
      expect(updateCode).toContain('--name')
    })

    it('should generate delete command with confirmation', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const deleteCode = cli.files['src/commands/user/delete.ts']
      expect(deleteCode).toBeDefined()
      expect(deleteCode).toContain('deleteUserCommand')
      expect(deleteCode).toContain("argument('<id>'")
      expect(deleteCode).toContain('--force')
      expect(deleteCode).toContain('confirm')
    })

    it('should handle optional fields in create command', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const createCode = cli.files['src/commands/post/create.ts']
      // published is optional (boolean?)
      expect(createCode).toContain('published')
      expect(createCode).toContain('optional')
    })

    it('should handle enum fields with select prompt', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const createCode = cli.files['src/commands/user/create.ts']
      expect(createCode).toContain('select')
      expect(createCode).toContain('admin')
      expect(createCode).toContain('member')
      expect(createCode).toContain('guest')
    })

    it('should handle relationship fields', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const createCode = cli.files['src/commands/post/create.ts']
      // author is a relationship to User
      expect(createCode).toContain('author')
      expect(createCode).toContain('User ID')
    })
  })

  // ============================================================================
  // Verb Commands
  // ============================================================================

  describe('Verb Commands', () => {
    it('should generate verb commands for each noun', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      // User verbs
      expect(cli.files['src/commands/user/invite.ts']).toBeDefined()
      expect(cli.files['src/commands/user/ban.ts']).toBeDefined()

      // Post verbs
      expect(cli.files['src/commands/post/publish.ts']).toBeDefined()
      expect(cli.files['src/commands/post/archive.ts']).toBeDefined()
    })

    it('should generate verb command with id argument', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const inviteCode = cli.files['src/commands/user/invite.ts']
      expect(inviteCode).toContain('inviteUserCommand')
      expect(inviteCode).toContain(".argument('<id>'")
      expect(inviteCode).toContain('/invite')
    })

    it('should support JSON input for verb commands', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const publishCode = cli.files['src/commands/post/publish.ts']
      expect(publishCode).toContain('--input')
      expect(publishCode).toContain('JSON.parse')
    })
  })

  // ============================================================================
  // Config Commands
  // ============================================================================

  describe('Config Commands', () => {
    it('should generate config module', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const configModule = cli.files['src/config.ts']
      expect(configModule).toBeDefined()
      expect(configModule).toContain('loadConfig')
      expect(configModule).toContain('saveConfig')
      expect(configModule).toContain('getConfig')
      expect(configModule).toContain('clearConfig')
    })

    it('should generate config command with subcommands', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const configCmd = cli.files['src/commands/config.ts']
      expect(configCmd).toBeDefined()
      expect(configCmd).toContain('configCommand')
      expect(configCmd).toContain("Command('get')")
      expect(configCmd).toContain("Command('set')")
      expect(configCmd).toContain("Command('delete')")
      expect(configCmd).toContain("Command('path')")
      expect(configCmd).toContain("Command('reset')")
    })

    it('should store config in user home directory', () => {
      const generator = createTestGenerator({ cliName: 'myapp' })
      const cli = generator.generate()

      const configModule = cli.files['src/config.ts']
      expect(configModule).toContain("'.myapp'")
      expect(configModule).toContain('homedir()')
    })

    it('should store credentials separately for security', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const configModule = cli.files['src/config.ts']
      expect(configModule).toContain('credentials.json')
      expect(configModule).toContain('0o600') // Secure file permissions
    })

    it('should support environment variable overrides', () => {
      const generator = createTestGenerator({ cliName: 'myapp' })
      const cli = generator.generate()

      const configModule = cli.files['src/config.ts']
      expect(configModule).toContain('MYAPP_API_KEY')
      expect(configModule).toContain('MYAPP_BASE_URL')
    })

    it('should require authentication for protected commands', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const configModule = cli.files['src/config.ts']
      expect(configModule).toContain('requireAuth')
      expect(configModule).toContain('isAuthenticated')

      // CRUD commands should require auth
      const listCode = cli.files['src/commands/user/list.ts']
      expect(listCode).toContain('requireAuth()')
    })
  })

  // ============================================================================
  // Shell Completions
  // ============================================================================

  describe('Shell Completions', () => {
    it('should generate completion command', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      expect(cli.files['src/commands/completion.ts']).toBeDefined()
      expect(cli.files['src/commands/completion.ts']).toContain('completionCommand')
      expect(cli.files['src/commands/completion.ts']).toContain('bash')
      expect(cli.files['src/commands/completion.ts']).toContain('zsh')
      expect(cli.files['src/commands/completion.ts']).toContain('fish')
      expect(cli.files['src/commands/completion.ts']).toContain('powershell')
    })

    it('should generate bash completion script', () => {
      const generator = createTestGenerator({ cliName: 'myapp' })
      const script = generator.getCompletionScript('bash')

      expect(script).toContain('_myapp_completions')
      expect(script).toContain('complete -F')
      expect(script).toContain('user')
      expect(script).toContain('post')
      expect(script).toContain('list')
      expect(script).toContain('create')
    })

    it('should generate zsh completion script', () => {
      const generator = createTestGenerator({ cliName: 'myapp' })
      const script = generator.getCompletionScript('zsh')

      expect(script).toContain('#compdef myapp')
      expect(script).toContain('_myapp')
      expect(script).toContain('_values')
    })

    it('should generate fish completion script', () => {
      const generator = createTestGenerator({ cliName: 'myapp' })
      const script = generator.getCompletionScript('fish')

      expect(script).toContain('complete -c myapp')
      expect(script).toContain('__fish_use_subcommand')
      expect(script).toContain('__fish_seen_subcommand_from')
    })

    it('should generate powershell completion script', () => {
      const generator = createTestGenerator({ cliName: 'myapp' })
      const script = generator.getCompletionScript('powershell')

      expect(script).toContain('Register-ArgumentCompleter')
      expect(script).toContain('-CommandName myapp')
      expect(script).toContain('CompletionResult')
    })

    it('should include verb commands in completions', () => {
      const generator = createTestGenerator({ cliName: 'myapp' })
      const script = generator.getCompletionScript('bash')

      expect(script).toContain('invite')
      expect(script).toContain('ban')
      expect(script).toContain('publish')
      expect(script).toContain('archive')
    })
  })

  // ============================================================================
  // Output Formatting
  // ============================================================================

  describe('Output Formatting', () => {
    it('should generate output module with formatters', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const outputModule = cli.files['src/output.ts']
      expect(outputModule).toBeDefined()
      expect(outputModule).toContain('formatOutput')
      expect(outputModule).toContain('formatTable')
      expect(outputModule).toContain('formatCSV')
      expect(outputModule).toContain('formatYAML')
    })

    it('should support multiple output formats', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const listCode = cli.files['src/commands/user/list.ts']
      expect(listCode).toContain("--output <format>'")
      expect(listCode).toContain('table')
      expect(listCode).toContain('json')
      expect(listCode).toContain('yaml')
      expect(listCode).toContain('csv')
    })

    it('should include color helpers', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const outputModule = cli.files['src/output.ts']
      expect(outputModule).toContain('color')
      expect(outputModule).toContain('success')
      expect(outputModule).toContain('error')
      expect(outputModule).toContain('warn')
      expect(outputModule).toContain('info')
    })
  })

  // ============================================================================
  // Package Files
  // ============================================================================

  describe('Package Files', () => {
    it('should generate package.json with bin entry', () => {
      const generator = createTestGenerator({
        cliName: 'myapp',
        packageName: 'myapp-cli',
        version: '1.2.3',
      })
      const cli = generator.generate()

      const pkg = JSON.parse(cli.files['package.json'])
      expect(pkg.name).toBe('myapp-cli')
      expect(pkg.version).toBe('1.2.3')
      expect(pkg.bin.myapp).toBe('./dist/index.js')
    })

    it('should include required dependencies', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const pkg = JSON.parse(cli.files['package.json'])
      expect(pkg.dependencies.commander).toBeDefined()
      expect(pkg.dependencies['@inquirer/prompts']).toBeDefined()
    })

    it('should generate tsconfig.json', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      expect(cli.files['tsconfig.json']).toBeDefined()
      const tsconfig = JSON.parse(cli.files['tsconfig.json'])
      expect(tsconfig.compilerOptions).toBeDefined()
      expect(tsconfig.compilerOptions.outDir).toBe('./dist')
    })

    it('should generate main entry point with shebang', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const mainFile = cli.files['src/index.ts']
      expect(mainFile).toContain('#!/usr/bin/env node')
      expect(mainFile).toContain('program.parse()')
    })

    it('should import all noun commands in main file', () => {
      const generator = createTestGenerator()
      const cli = generator.generate()

      const mainFile = cli.files['src/index.ts']
      expect(mainFile).toContain("from './commands/user'")
      expect(mainFile).toContain("from './commands/post'")
      expect(mainFile).toContain('addCommand(userCommand)')
      expect(mainFile).toContain('addCommand(postCommand)')
    })
  })

  // ============================================================================
  // Command Info
  // ============================================================================

  describe('Command Info', () => {
    it('should return structured command info', () => {
      const generator = createTestGenerator()
      const commands = generator.getCommands()

      expect(commands.length).toBeGreaterThan(0)

      const loginCmd = commands.find(c => c.command === 'login')
      expect(loginCmd).toBeDefined()
      expect(loginCmd?.description).toContain('Authenticate')

      const configCmd = commands.find(c => c.command === 'config')
      expect(configCmd).toBeDefined()
      expect(configCmd?.subcommands).toBeDefined()
      expect(configCmd?.subcommands?.length).toBeGreaterThan(0)
    })

    it('should include noun commands with subcommands', () => {
      const generator = createTestGenerator()
      const commands = generator.getCommands()

      const userCmd = commands.find(c => c.command === 'user')
      expect(userCmd).toBeDefined()
      expect(userCmd?.subcommands).toBeDefined()

      const subcommandNames = userCmd?.subcommands?.map(s => s.command)
      expect(subcommandNames).toContain('list')
      expect(subcommandNames).toContain('get')
      expect(subcommandNames).toContain('create')
      expect(subcommandNames).toContain('update')
      expect(subcommandNames).toContain('delete')
      expect(subcommandNames).toContain('invite')
      expect(subcommandNames).toContain('ban')
    })
  })

  // ============================================================================
  // Standalone Function
  // ============================================================================

  describe('Standalone Function', () => {
    it('should export generateCLI convenience function', () => {
      const cli = generateCLI({
        nouns: { Item: { name: 'string' } },
        verbs: {},
        cliName: 'test',
        packageName: 'test-cli',
        version: '1.0.0',
      })

      expect(cli).toBeDefined()
      expect(cli.files).toBeDefined()
      expect(cli.cliName).toBe('test')
    })
  })

  // ============================================================================
  // CLI Runner Tests - Runtime Execution
  // ============================================================================

  describe('CLI Runner', () => {
    /**
     * Helper to create a CLI runner for testing
     */
    const createTestRunner = (config?: Partial<CLIConfig>): CLIRunner => {
      return createCLIRunner({
        nouns: config?.nouns ?? {
          Customer: { name: 'string', email: 'string' },
          Order: { total: 'number', status: 'pending | paid | shipped' },
        },
        verbs: config?.verbs ?? {
          Order: { pay: ($: unknown) => {}, ship: ($: unknown) => {} },
        },
        cliName: config?.cliName ?? 'testapp',
        packageName: config?.packageName ?? 'testapp-cli',
        version: config?.version ?? '1.0.0',
        baseUrl: config?.baseUrl ?? 'https://api.test.com',
      })
    }

    describe('yourapp login', () => {
      let testConfigDir: string

      beforeEach(() => {
        testConfigDir = join(tmpdir(), `cli-test-${Date.now()}`)
        mkdirSync(testConfigDir, { recursive: true })
      })

      afterEach(() => {
        if (existsSync(testConfigDir)) {
          rmSync(testConfigDir, { recursive: true, force: true })
        }
      })

      it('should authenticate user with API key', async () => {
        const runner = createTestRunner()

        const result = await runner.execute(['login', '--api-key', 'sk_test_12345'], {
          configDir: testConfigDir,
        })

        expect(result.success).toBe(true)
        expect(result.message).toMatch(/logged in|authenticated|success/i)
      })

      it('should store credentials after successful login', async () => {
        const runner = createTestRunner()

        await runner.execute(['login', '--api-key', 'sk_test_12345'], {
          configDir: testConfigDir,
        })

        const credentialsPath = join(testConfigDir, 'credentials.json')
        expect(existsSync(credentialsPath)).toBe(true)
      })

      it('should reject invalid API key format', async () => {
        const runner = createTestRunner()

        const result = await runner.execute(['login', '--api-key', 'invalid'], {
          configDir: testConfigDir,
        })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/invalid.*key|format/i)
      })

      it('should display user info after successful login', async () => {
        const runner = createTestRunner()
        const mockValidate = vi.fn().mockResolvedValue({
          valid: true,
          user: { email: 'user@example.com', organization: 'Acme' },
        })

        const result = await runner.execute(['login', '--api-key', 'sk_valid'], {
          configDir: testConfigDir,
          validateCredentials: mockValidate,
        })

        expect(result.success).toBe(true)
        expect(result.output).toMatch(/user@example.com/)
      })
    })

    describe('yourapp [noun] list', () => {
      it('should return list of records', async () => {
        const runner = createTestRunner()
        const mockFetch = vi.fn().mockResolvedValue({
          data: [
            { id: 'cust_1', name: 'John', email: 'john@example.com' },
            { id: 'cust_2', name: 'Jane', email: 'jane@example.com' },
          ],
        })

        const result = await runner.execute(['customer', 'list'], {
          fetch: mockFetch,
        })

        expect(result.success).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            path: '/customers',
          })
        )
      })

      it('should support --limit and --offset pagination', async () => {
        const runner = createTestRunner()
        const mockFetch = vi.fn().mockResolvedValue({ data: [] })

        await runner.execute(['customer', 'list', '--limit', '10', '--offset', '20'], {
          fetch: mockFetch,
        })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({ limit: '10', offset: '20' }),
          })
        )
      })

      it('should support --filter for filtering', async () => {
        const runner = createTestRunner()
        const mockFetch = vi.fn().mockResolvedValue({ data: [] })

        await runner.execute(['order', 'list', '--filter', 'status=paid'], {
          fetch: mockFetch,
        })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({ status: 'paid' }),
          })
        )
      })

      it('should support --output json format', async () => {
        const runner = createTestRunner()
        const mockFetch = vi.fn().mockResolvedValue({
          data: [{ id: 'c1', name: 'Test' }],
        })

        const result = await runner.execute(['customer', 'list', '--output', 'json'], {
          fetch: mockFetch,
        })

        expect(() => JSON.parse(result.output)).not.toThrow()
      })

      it('should require authentication', async () => {
        const runner = createTestRunner()

        const result = await runner.execute(['customer', 'list'], {
          authenticated: false,
        })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/not authenticated|login required/i)
      })
    })

    describe('yourapp [noun] create', () => {
      it('should create a new record', async () => {
        const runner = createTestRunner()
        const mockFetch = vi.fn().mockResolvedValue({
          id: 'cust_new',
          name: 'New Customer',
          email: 'new@example.com',
        })

        const result = await runner.execute(
          ['customer', 'create', '--name', 'New Customer', '--email', 'new@example.com'],
          { fetch: mockFetch }
        )

        expect(result.success).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            path: '/customers',
            body: expect.objectContaining({
              name: 'New Customer',
              email: 'new@example.com',
            }),
          })
        )
      })

      it('should accept JSON input with --data flag', async () => {
        const runner = createTestRunner()
        const mockFetch = vi.fn().mockResolvedValue({ id: 'cust_new' })

        await runner.execute(
          ['customer', 'create', '--data', '{"name":"JSON","email":"json@example.com"}'],
          { fetch: mockFetch }
        )

        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              name: 'JSON',
              email: 'json@example.com',
            }),
          })
        )
      })

      it('should validate required fields', async () => {
        const runner = createTestRunner()

        const result = await runner.execute(['customer', 'create', '--name', 'No Email'], {
          fetch: vi.fn(),
        })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/missing.*required|email.*required/i)
      })
    })

    describe('yourapp [noun] get <id>', () => {
      it('should return a single record by id', async () => {
        const runner = createTestRunner()
        const mockFetch = vi.fn().mockResolvedValue({
          id: 'cust_123',
          name: 'John Doe',
          email: 'john@example.com',
        })

        const result = await runner.execute(['customer', 'get', 'cust_123'], {
          fetch: mockFetch,
        })

        expect(result.success).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            path: '/customers/cust_123',
          })
        )
      })

      it('should handle not found error', async () => {
        const runner = createTestRunner()
        const mockFetch = vi.fn().mockRejectedValue({
          status: 404,
          error: 'Not found',
        })

        const result = await runner.execute(['customer', 'get', 'nonexistent'], {
          fetch: mockFetch,
        })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/not found/i)
      })

      it('should require id argument', async () => {
        const runner = createTestRunner()

        const result = await runner.execute(['customer', 'get'], {
          fetch: vi.fn(),
        })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/missing.*id|id.*required/i)
      })
    })

    describe('yourapp [noun] [verb] <id>', () => {
      it('should execute a verb on a record', async () => {
        const runner = createTestRunner()
        const mockFetch = vi.fn().mockResolvedValue({
          id: 'order_123',
          status: 'paid',
        })

        const result = await runner.execute(['order', 'pay', 'order_123'], {
          fetch: mockFetch,
        })

        expect(result.success).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            path: '/orders/order_123/pay',
          })
        )
      })

      it('should pass input to verb', async () => {
        const runner = createTestRunner()
        const mockFetch = vi.fn().mockResolvedValue({ success: true })

        await runner.execute(
          ['order', 'ship', 'order_123', '--tracking', 'TRACK123'],
          { fetch: mockFetch }
        )

        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              tracking: 'TRACK123',
            }),
          })
        )
      })

      it('should require id for verb execution', async () => {
        const runner = createTestRunner()

        const result = await runner.execute(['order', 'pay'], {
          fetch: vi.fn(),
        })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/missing.*id|id.*required/i)
      })

      it('should handle unknown verb', async () => {
        const runner = createTestRunner()

        const result = await runner.execute(['customer', 'unknownverb', 'cust_123'], {
          fetch: vi.fn(),
        })

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/unknown.*verb|verb.*not found|invalid.*command/i)
      })
    })

    describe('yourapp config set/get', () => {
      let testConfigDir: string

      beforeEach(() => {
        testConfigDir = join(tmpdir(), `cli-config-${Date.now()}`)
        mkdirSync(testConfigDir, { recursive: true })
      })

      afterEach(() => {
        if (existsSync(testConfigDir)) {
          rmSync(testConfigDir, { recursive: true, force: true })
        }
      })

      it('should store config values', async () => {
        const runner = createTestRunner()

        const result = await runner.execute(
          ['config', 'set', 'api.url', 'https://custom.api.com'],
          { configDir: testConfigDir }
        )

        expect(result.success).toBe(true)
      })

      it('should retrieve config values', async () => {
        const runner = createTestRunner()

        await runner.execute(
          ['config', 'set', 'api.url', 'https://custom.api.com'],
          { configDir: testConfigDir }
        )

        const result = await runner.execute(
          ['config', 'get', 'api.url'],
          { configDir: testConfigDir }
        )

        expect(result.success).toBe(true)
        expect(result.output).toContain('https://custom.api.com')
      })

      it('should persist config to file', async () => {
        const runner = createTestRunner()

        await runner.execute(
          ['config', 'set', 'output.format', 'json'],
          { configDir: testConfigDir }
        )

        const configPath = join(testConfigDir, 'config.json')
        expect(existsSync(configPath)).toBe(true)

        const config = JSON.parse(readFileSync(configPath, 'utf-8'))
        expect(config.output?.format).toBe('json')
      })

      it('should list all config values', async () => {
        const runner = createTestRunner()

        await runner.execute(['config', 'set', 'key1', 'value1'], { configDir: testConfigDir })
        await runner.execute(['config', 'set', 'key2', 'value2'], { configDir: testConfigDir })

        const result = await runner.execute(['config', 'list'], { configDir: testConfigDir })

        expect(result.output).toContain('key1')
        expect(result.output).toContain('key2')
      })
    })
  })

  // ============================================================================
  // Help Text Generation
  // ============================================================================

  describe('Help Text', () => {
    const createTestRunner = (config?: Partial<CLIConfig>): CLIRunner => {
      return createCLIRunner({
        nouns: config?.nouns ?? {
          Customer: { name: 'string', email: 'string' },
          Order: { total: 'number', status: 'pending | paid' },
        },
        verbs: config?.verbs ?? {
          Order: { pay: ($: unknown) => {}, cancel: ($: unknown) => {} },
        },
        cliName: config?.cliName ?? 'myapp',
        packageName: config?.packageName ?? 'myapp-cli',
        version: config?.version ?? '1.0.0',
        description: config?.description ?? 'My SaaS CLI',
        baseUrl: config?.baseUrl ?? 'https://api.test.com',
      })
    }

    it('should display main help with --help flag', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['--help'])

      expect(result.success).toBe(true)
      expect(result.output).toContain('myapp')
      expect(result.output).toContain('My SaaS CLI')
    })

    it('should list all available commands in main help', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['--help'])

      expect(result.output).toContain('customer')
      expect(result.output).toContain('order')
      expect(result.output).toContain('login')
      expect(result.output).toContain('config')
    })

    it('should display command-specific help', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['customer', '--help'])

      expect(result.output).toContain('customer')
      expect(result.output).toContain('list')
      expect(result.output).toContain('create')
      expect(result.output).toContain('get')
      expect(result.output).toContain('update')
      expect(result.output).toContain('delete')
    })

    it('should display subcommand help with options', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['customer', 'create', '--help'])

      expect(result.output).toContain('create')
      expect(result.output).toContain('--name')
      expect(result.output).toContain('--email')
    })

    it('should show verb help with id argument', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['order', 'pay', '--help'])

      expect(result.output).toContain('pay')
      expect(result.output).toContain('<id>')
    })

    it('should include examples in help', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['customer', '--help'])

      expect(result.output).toMatch(/example|usage/i)
    })

    it('should display version with --version flag', async () => {
      const runner = createTestRunner({ version: '2.5.0' })

      const result = await runner.execute(['--version'])

      expect(result.success).toBe(true)
      expect(result.output).toContain('2.5.0')
    })

    it('should support help command syntax', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['help', 'customer'])

      expect(result.success).toBe(true)
      expect(result.output).toContain('customer')
    })
  })

  // ============================================================================
  // Error Message Quality
  // ============================================================================

  describe('Error Messages', () => {
    const createTestRunner = (config?: Partial<CLIConfig>): CLIRunner => {
      return createCLIRunner({
        nouns: config?.nouns ?? {
          Customer: { name: 'string', email: 'string' },
        },
        verbs: config?.verbs ?? {},
        cliName: config?.cliName ?? 'testapp',
        packageName: config?.packageName ?? 'testapp-cli',
        version: config?.version ?? '1.0.0',
        baseUrl: config?.baseUrl ?? 'https://api.test.com',
      })
    }

    it('should provide helpful error for unknown command', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['unknowncommand'])

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/unknown.*command|command.*not found/i)
    })

    it('should suggest similar command on typo', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['custmer']) // typo

      expect(result.success).toBe(false)
      expect(result.suggestion).toMatch(/customer/i)
    })

    it('should show usage on missing required arguments', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['customer', 'get'])

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/missing.*id|id.*required/i)
      expect(result.usage).toBeDefined()
      expect(result.usage).toContain('customer get <id>')
    })

    it('should provide helpful error for invalid flag value', async () => {
      const runner = createTestRunner()

      const result = await runner.execute(['customer', 'list', '--limit', 'abc'])

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/limit.*number|invalid.*limit/i)
    })

    it('should format API errors nicely', async () => {
      const runner = createTestRunner()
      const mockFetch = vi.fn().mockRejectedValue({
        status: 400,
        error: 'Validation failed',
        details: [{ field: 'email', message: 'Invalid email' }],
      })

      const result = await runner.execute(
        ['customer', 'create', '--name', 'Test', '--email', 'bad'],
        { fetch: mockFetch }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('email')
    })

    it('should handle network errors gracefully', async () => {
      const runner = createTestRunner()
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await runner.execute(['customer', 'list'], {
        fetch: mockFetch,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/network|connect|unavailable/i)
    })

    it('should handle timeout errors', async () => {
      const runner = createTestRunner()
      const mockFetch = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'))

      const result = await runner.execute(['customer', 'list'], {
        fetch: mockFetch,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/timeout|timed out/i)
    })

    it('should include request ID in verbose mode', async () => {
      const runner = createTestRunner()
      const mockFetch = vi.fn().mockRejectedValue({
        status: 500,
        error: 'Internal error',
        requestId: 'req_abc123',
      })

      const result = await runner.execute(['customer', 'list', '--verbose'], {
        fetch: mockFetch,
      })

      expect(result.error).toContain('req_abc123')
    })
  })
})
