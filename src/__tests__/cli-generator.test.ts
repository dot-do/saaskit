/**
 * CLI Generator Tests
 *
 * Tests for the CLI generator that creates command-line interfaces
 * from noun/verb definitions.
 *
 * The CLI generator provides:
 * - Authentication commands (login, logout)
 * - CRUD commands for each noun
 * - Custom verb commands
 * - Configuration management
 * - Shell completions
 */

import { describe, it, expect } from 'vitest'

import { createCLIGenerator, generateCLI } from '../cli-generator'
import type { CLIConfig, CLIGenerator, GeneratedCLI } from '../cli-generator/types'

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
})
