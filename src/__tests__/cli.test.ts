/**
 * CLI Developer Experience Tests (RED Phase - TDD)
 *
 * These tests define the expected API for the SaaSKit CLI tools.
 * All tests should FAIL initially because the implementation doesn't exist yet.
 *
 * The CLI provides:
 * - `npx saaskit init` - Scaffolds a new SaaSKit project
 * - `npx saaskit dev` - Starts development server with hot reload
 * - `npx saaskit deploy` - Deploys to SaaS.Dev
 * - Hot reload on file changes
 * - TypeScript compilation with helpful errors
 * - Working examples in scaffolded project
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// These imports will fail until implementation exists
// @ts-expect-error - Implementation not yet created
import { init, dev, deploy, build } from '../cli'
// @ts-expect-error - Implementation not yet created
import type { InitOptions, DevOptions, DeployOptions, CLIResult } from '../cli/types'

describe('CLI: npx saaskit init', () => {
  let testDir: string

  beforeEach(() => {
    // Create a fresh temp directory for each test
    testDir = join(tmpdir(), `saaskit-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  // ============================================================================
  // Project Scaffolding
  // ============================================================================

  describe('project scaffolding', () => {
    it('should create a new project with default structure', async () => {
      const result = await init({
        name: 'my-saas',
        directory: testDir,
      })

      expect(result.success).toBe(true)

      // Should create essential files
      expect(existsSync(join(testDir, 'package.json'))).toBe(true)
      expect(existsSync(join(testDir, 'tsconfig.json'))).toBe(true)
      expect(existsSync(join(testDir, 'app.tsx'))).toBe(true)
    })

    it('should create package.json with correct dependencies', async () => {
      await init({
        name: 'my-saas',
        directory: testDir,
      })

      const packageJson = JSON.parse(
        readFileSync(join(testDir, 'package.json'), 'utf-8')
      )

      expect(packageJson.name).toBe('my-saas')
      expect(packageJson.dependencies).toHaveProperty('saaskit')
      expect(packageJson.dependencies).toHaveProperty('react')
      expect(packageJson.devDependencies).toHaveProperty('typescript')
    })

    it('should create app.tsx with SaaS component boilerplate', async () => {
      await init({
        name: 'my-saas',
        directory: testDir,
      })

      const appContent = readFileSync(join(testDir, 'app.tsx'), 'utf-8')

      expect(appContent).toContain('import { SaaS }')
      expect(appContent).toContain('$.nouns')
      expect(appContent).toContain('$.verbs')
      expect(appContent).toContain('<SaaS')
    })

    it('should create tsconfig.json with correct configuration', async () => {
      await init({
        name: 'my-saas',
        directory: testDir,
      })

      const tsconfig = JSON.parse(
        readFileSync(join(testDir, 'tsconfig.json'), 'utf-8')
      )

      expect(tsconfig.compilerOptions.strict).toBe(true)
      expect(tsconfig.compilerOptions.jsx).toBe('react-jsx')
      expect(tsconfig.compilerOptions.target).toBeDefined()
    })

    it('should create .env.example with required environment variables', async () => {
      await init({
        name: 'my-saas',
        directory: testDir,
      })

      expect(existsSync(join(testDir, '.env.example'))).toBe(true)

      const envExample = readFileSync(join(testDir, '.env.example'), 'utf-8')

      expect(envExample).toContain('SAAS_API_KEY')
      expect(envExample).toContain('DATABASE_URL')
    })

    it('should create README.md with getting started instructions', async () => {
      await init({
        name: 'my-saas',
        directory: testDir,
      })

      expect(existsSync(join(testDir, 'README.md'))).toBe(true)

      const readme = readFileSync(join(testDir, 'README.md'), 'utf-8')

      expect(readme).toContain('npx saaskit dev')
      expect(readme).toContain('npx saaskit deploy')
    })
  })

  // ============================================================================
  // Init Options
  // ============================================================================

  describe('init options', () => {
    it('should accept a project name', async () => {
      const result = await init({
        name: 'custom-project-name',
        directory: testDir,
      })

      expect(result.success).toBe(true)

      const packageJson = JSON.parse(
        readFileSync(join(testDir, 'package.json'), 'utf-8')
      )
      expect(packageJson.name).toBe('custom-project-name')
    })

    it('should accept a template option', async () => {
      const result = await init({
        name: 'my-saas',
        directory: testDir,
        template: 'minimal',
      })

      expect(result.success).toBe(true)
    })

    it('should support todo template', async () => {
      const result = await init({
        name: 'my-saas',
        directory: testDir,
        template: 'todo',
      })

      expect(result.success).toBe(true)

      const appContent = readFileSync(join(testDir, 'app.tsx'), 'utf-8')
      expect(appContent).toContain('Todo')
    })

    it('should support ecommerce template', async () => {
      const result = await init({
        name: 'my-saas',
        directory: testDir,
        template: 'ecommerce',
      })

      expect(result.success).toBe(true)

      const appContent = readFileSync(join(testDir, 'app.tsx'), 'utf-8')
      expect(appContent).toContain('Customer')
      expect(appContent).toContain('Order')
      expect(appContent).toContain('Product')
    })

    it('should support recruiter template', async () => {
      const result = await init({
        name: 'my-saas',
        directory: testDir,
        template: 'recruiter',
      })

      expect(result.success).toBe(true)

      const appContent = readFileSync(join(testDir, 'app.tsx'), 'utf-8')
      expect(appContent).toContain('Candidate')
      expect(appContent).toContain('Search')
      expect(appContent).toContain('Match')
    })

    it('should skip git init when --no-git flag is passed', async () => {
      const result = await init({
        name: 'my-saas',
        directory: testDir,
        git: false,
      })

      expect(result.success).toBe(true)
      expect(existsSync(join(testDir, '.git'))).toBe(false)
    })

    it('should initialize git by default', async () => {
      const result = await init({
        name: 'my-saas',
        directory: testDir,
      })

      expect(result.success).toBe(true)
      expect(existsSync(join(testDir, '.git'))).toBe(true)
    })

    it('should skip install when --no-install flag is passed', async () => {
      const result = await init({
        name: 'my-saas',
        directory: testDir,
        install: false,
      })

      expect(result.success).toBe(true)
      expect(existsSync(join(testDir, 'node_modules'))).toBe(false)
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('init error handling', () => {
    it('should fail if directory already contains package.json', async () => {
      // Create existing package.json
      writeFileSync(join(testDir, 'package.json'), '{}')

      const result = await init({
        name: 'my-saas',
        directory: testDir,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/already exists|not empty/i)
    })

    it('should provide helpful error for invalid project name', async () => {
      const result = await init({
        name: 'INVALID NAME WITH SPACES',
        directory: testDir,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/invalid.*name/i)
    })

    it('should suggest valid name when name is invalid', async () => {
      const result = await init({
        name: 'My SaaS App',
        directory: testDir,
      })

      expect(result.success).toBe(false)
      expect(result.suggestion).toBe('my-saas-app')
    })

    it('should fail gracefully if template does not exist', async () => {
      const result = await init({
        name: 'my-saas',
        directory: testDir,
        // @ts-expect-error - testing invalid template
        template: 'nonexistent-template',
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/template.*not found|invalid template/i)
    })

    it('should show available templates on invalid template', async () => {
      const result = await init({
        name: 'my-saas',
        directory: testDir,
        // @ts-expect-error - testing invalid template
        template: 'nonexistent',
      })

      expect(result.availableTemplates).toBeDefined()
      expect(result.availableTemplates).toContain('minimal')
      expect(result.availableTemplates).toContain('todo')
    })
  })
})

describe('CLI: npx saaskit dev', () => {
  let testDir: string
  let devServer: { stop: () => Promise<void> } | null = null

  beforeEach(async () => {
    testDir = join(tmpdir(), `saaskit-dev-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })

    // Initialize a project for dev tests
    await init({
      name: 'dev-test',
      directory: testDir,
      install: false,
    })
  })

  afterEach(async () => {
    if (devServer) {
      await devServer.stop()
      devServer = null
    }
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  // ============================================================================
  // Dev Server Startup
  // ============================================================================

  describe('dev server startup', () => {
    it('should start development server', async () => {
      const result = await dev({
        directory: testDir,
        port: 0, // Random available port
      })

      devServer = result.server

      expect(result.success).toBe(true)
      expect(result.port).toBeGreaterThan(0)
    })

    it('should return server URL', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      expect(result.url).toMatch(/^http:\/\/localhost:\d+/)
    })

    it('should use default port 3000 when not specified', async () => {
      const result = await dev({
        directory: testDir,
      })

      devServer = result.server

      // Should either use 3000 or find next available
      expect(result.port).toBeGreaterThanOrEqual(3000)
    })

    it('should find next available port if default is taken', async () => {
      // Start first server
      const result1 = await dev({
        directory: testDir,
        port: 3000,
      })
      devServer = result1.server

      // Start second server - should use different port
      const result2 = await dev({
        directory: testDir,
      })

      expect(result2.port).not.toBe(result1.port)

      await result2.server.stop()
    })

    it('should compile TypeScript on startup', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      expect(result.compiled).toBe(true)
    })

    it('should report TypeScript errors without crashing', async () => {
      // Write invalid TypeScript
      writeFileSync(join(testDir, 'broken.ts'), 'const x: number = "string"')

      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      expect(result.success).toBe(true)
      expect(result.typeErrors).toBeDefined()
      expect(result.typeErrors.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Hot Reload
  // ============================================================================

  describe('hot reload', () => {
    it('should detect file changes', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      const changePromise = new Promise<string>((resolve) => {
        result.server.onReload((file: string) => resolve(file))
      })

      // Modify a file
      writeFileSync(join(testDir, 'app.tsx'), '// updated content')

      const changedFile = await changePromise

      expect(changedFile).toContain('app.tsx')
    })

    it('should rebuild on file changes', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      const rebuildPromise = new Promise<boolean>((resolve) => {
        result.server.onRebuild(() => resolve(true))
      })

      // Modify a file
      writeFileSync(join(testDir, 'app.tsx'), '// trigger rebuild')

      const rebuilt = await rebuildPromise

      expect(rebuilt).toBe(true)
    })

    it('should not crash on syntax errors during hot reload', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      // Write invalid syntax
      writeFileSync(join(testDir, 'app.tsx'), 'invalid {{{{ syntax')

      // Server should still be running
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.server.isRunning()).toBe(true)
    })

    it('should recover when syntax error is fixed', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      // Write invalid syntax
      writeFileSync(join(testDir, 'app.tsx'), 'invalid syntax')

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Fix the syntax
      writeFileSync(join(testDir, 'app.tsx'), 'export const valid = true')

      const rebuildPromise = new Promise<boolean>((resolve) => {
        result.server.onRebuild(() => resolve(true))
      })

      const rebuilt = await rebuildPromise

      expect(rebuilt).toBe(true)
    })

    it('should ignore node_modules changes', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      let reloadCalled = false
      result.server.onReload(() => {
        reloadCalled = true
      })

      // Create and modify a file in node_modules
      mkdirSync(join(testDir, 'node_modules'), { recursive: true })
      writeFileSync(join(testDir, 'node_modules', 'test.js'), 'test')

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(reloadCalled).toBe(false)
    })
  })

  // ============================================================================
  // Dev Server Features
  // ============================================================================

  describe('dev server features', () => {
    it('should serve admin dashboard', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      expect(result.endpoints).toContain('/admin')
    })

    it('should serve API endpoints', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      expect(result.endpoints).toContain('/api')
    })

    it('should show registered nouns', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      expect(result.nouns).toBeDefined()
      expect(Array.isArray(result.nouns)).toBe(true)
    })

    it('should show registered verbs', async () => {
      const result = await dev({
        directory: testDir,
        port: 0,
      })

      devServer = result.server

      expect(result.verbs).toBeDefined()
      expect(typeof result.verbs).toBe('object')
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('dev error handling', () => {
    it('should fail if not in a SaaSKit project', async () => {
      const emptyDir = join(tmpdir(), `empty-${Date.now()}`)
      mkdirSync(emptyDir, { recursive: true })

      const result = await dev({
        directory: emptyDir,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not.*saaskit|package.json/i)

      rmSync(emptyDir, { recursive: true, force: true })
    })

    it('should provide helpful error for missing dependencies', async () => {
      // Add a lock file to simulate a real project (not test mode)
      writeFileSync(join(testDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')

      // Remove node_modules
      const nodeModulesPath = join(testDir, 'node_modules')
      if (existsSync(nodeModulesPath)) {
        rmSync(nodeModulesPath, { recursive: true, force: true })
      }

      const result = await dev({
        directory: testDir,
      })

      // Should suggest running install
      expect(result.success).toBe(false)
      expect(result.suggestion).toMatch(/npm install|pnpm install/i)
    })
  })
})

describe('CLI: npx saaskit deploy', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `saaskit-deploy-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })

    // Initialize a project for deploy tests
    await init({
      name: 'deploy-test',
      directory: testDir,
      install: false,
    })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  // ============================================================================
  // Deployment
  // ============================================================================

  describe('deployment', () => {
    it('should deploy to SaaS.Dev', async () => {
      const result = await deploy({
        directory: testDir,
      })

      expect(result.success).toBe(true)
      expect(result.url).toMatch(/\.saas\.dev$/)
    })

    it('should return deployment URL', async () => {
      const result = await deploy({
        directory: testDir,
      })

      expect(result.url).toBeDefined()
      expect(result.url).toContain('deploy-test')
    })

    it('should return all generated URLs', async () => {
      const result = await deploy({
        directory: testDir,
      })

      expect(result.urls).toBeDefined()
      expect(result.urls.app).toMatch(/\.saas\.dev$/)
      expect(result.urls.api).toMatch(/api\..*\.saas\.dev$/)
      expect(result.urls.docs).toBeDefined()
    })

    it('should build before deploying', async () => {
      const result = await deploy({
        directory: testDir,
      })

      expect(result.buildSuccess).toBe(true)
    })

    it('should validate TypeScript before deploying', async () => {
      // Write invalid TypeScript
      writeFileSync(
        join(testDir, 'app.tsx'),
        'const x: number = "invalid"'
      )

      const result = await deploy({
        directory: testDir,
      })

      expect(result.success).toBe(false)
      expect(result.typeErrors).toBeDefined()
      expect(result.typeErrors.length).toBeGreaterThan(0)
    })

    it('should support dry run mode', async () => {
      const result = await deploy({
        directory: testDir,
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.dryRun).toBe(true)
      expect(result.wouldDeploy).toBe(true)
    })

    it('should show deployment progress', async () => {
      const progressSteps: string[] = []

      const result = await deploy({
        directory: testDir,
        onProgress: (step: string) => progressSteps.push(step),
      })

      expect(progressSteps).toContain('building')
      expect(progressSteps).toContain('uploading')
      expect(progressSteps).toContain('deploying')
    })
  })

  // ============================================================================
  // Deploy Options
  // ============================================================================

  describe('deploy options', () => {
    it('should accept custom subdomain', async () => {
      const result = await deploy({
        directory: testDir,
        subdomain: 'my-custom-subdomain',
      })

      expect(result.url).toContain('my-custom-subdomain')
    })

    it('should accept environment variables', async () => {
      const result = await deploy({
        directory: testDir,
        env: {
          STRIPE_KEY: 'sk_test_xxx',
          CUSTOM_VAR: 'value',
        },
      })

      expect(result.success).toBe(true)
      expect(result.envSet).toContain('STRIPE_KEY')
      expect(result.envSet).toContain('CUSTOM_VAR')
    })

    it('should support production flag', async () => {
      const result = await deploy({
        directory: testDir,
        production: true,
      })

      expect(result.environment).toBe('production')
    })

    it('should default to preview environment', async () => {
      const result = await deploy({
        directory: testDir,
      })

      expect(result.environment).toBe('preview')
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('deploy error handling', () => {
    it('should fail without authentication', async () => {
      // Clear any auth
      delete process.env.SAAS_API_KEY

      const result = await deploy({
        directory: testDir,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/auth|login|api.key/i)
    })

    it('should provide helpful auth instructions', async () => {
      delete process.env.SAAS_API_KEY

      const result = await deploy({
        directory: testDir,
      })

      expect(result.suggestion).toMatch(/saaskit login|SAAS_API_KEY/i)
    })

    it('should fail with helpful message for build errors', async () => {
      writeFileSync(join(testDir, 'app.tsx'), 'syntax error {{{{')

      const result = await deploy({
        directory: testDir,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/build.*fail|syntax/i)
    })

    it('should validate subdomain format', async () => {
      const result = await deploy({
        directory: testDir,
        subdomain: 'INVALID SUBDOMAIN!',
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/subdomain.*invalid/i)
    })

    it('should check subdomain availability', async () => {
      const result = await deploy({
        directory: testDir,
        subdomain: 'already-taken-subdomain',
      })

      // Should either succeed or tell us it's taken
      if (!result.success) {
        expect(result.error).toMatch(/taken|unavailable|already.*exists/i)
      }
    })
  })
})

describe('CLI: TypeScript Compilation', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `saaskit-ts-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })

    await init({
      name: 'ts-test',
      directory: testDir,
      install: false,
    })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  // ============================================================================
  // TypeScript Compilation
  // ============================================================================

  describe('compilation', () => {
    it('should compile TypeScript without errors', async () => {
      const result = await build({
        directory: testDir,
      })

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should report type errors with file location', async () => {
      writeFileSync(
        join(testDir, 'broken.ts'),
        'const x: number = "string"'
      )

      const result = await build({
        directory: testDir,
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toHaveProperty('file')
      expect(result.errors[0]).toHaveProperty('line')
      expect(result.errors[0]).toHaveProperty('message')
    })

    it('should provide helpful error messages', async () => {
      writeFileSync(
        join(testDir, 'broken.ts'),
        'const x: number = "string"'
      )

      const result = await build({
        directory: testDir,
      })

      expect(result.errors[0].message).toMatch(/string.*number|assignable/i)
    })

    it('should validate SaaS component types', async () => {
      writeFileSync(
        join(testDir, 'app.tsx'),
        `
        import { SaaS } from 'saaskit'

        export default () => (
          <SaaS name={123}> {/* Should error - name must be string */}
            {$ => {
              $.nouns({
                Todo: { title: 123 } // Should error - type must be string
              })
            }}
          </SaaS>
        )
      `
      )

      const result = await build({
        directory: testDir,
      })

      expect(result.success).toBe(false)
    })

    it('should support incremental compilation', async () => {
      // First build
      const result1 = await build({
        directory: testDir,
      })

      expect(result1.success).toBe(true)

      // Second build should be faster (using cache)
      const start = Date.now()
      const result2 = await build({
        directory: testDir,
      })
      const duration = Date.now() - start

      expect(result2.success).toBe(true)
      expect(result2.cached).toBe(true)
    })

    it('should output compiled files', async () => {
      const result = await build({
        directory: testDir,
      })

      expect(result.success).toBe(true)
      expect(existsSync(join(testDir, 'dist'))).toBe(true)
    })
  })

  // ============================================================================
  // Error Message Quality
  // ============================================================================

  describe('error message quality', () => {
    it('should suggest fixes for common errors', async () => {
      writeFileSync(
        join(testDir, 'app.tsx'),
        `
        import { SaS } from 'saaskit' // Typo
        `
      )

      const result = await build({
        directory: testDir,
      })

      expect(result.errors[0].suggestion).toMatch(/SaaS|import/i)
    })

    it('should provide context for noun type errors', async () => {
      writeFileSync(
        join(testDir, 'app.tsx'),
        `
        import { SaaS } from 'saaskit'

        export default () => (
          <SaaS name="Test">
            {$ => {
              $.nouns({
                Todo: {
                  status: 'invalidtype' // Not a valid type
                }
              })
            }}
          </SaaS>
        )
      `
      )

      const result = await build({
        directory: testDir,
      })

      expect(result.errors[0].message).toMatch(/type|string|number|boolean|->|~>/i)
    })

    it('should highlight the error location', async () => {
      writeFileSync(
        join(testDir, 'broken.ts'),
        `const a = 1
const b = 2
const c: number = "three" // Error on line 3
const d = 4`
      )

      const result = await build({
        directory: testDir,
      })

      expect(result.errors[0].line).toBe(3)
      expect(result.errors[0].column).toBeDefined()
    })

    it('should group errors by file', async () => {
      writeFileSync(join(testDir, 'broken1.ts'), 'const a: number = "x"')
      writeFileSync(join(testDir, 'broken2.ts'), 'const b: boolean = 123')

      const result = await build({
        directory: testDir,
      })

      expect(result.errorsByFile).toBeDefined()
      expect(Object.keys(result.errorsByFile).length).toBe(2)
    })
  })
})

describe('CLI: Example Projects', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `saaskit-examples-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  // ============================================================================
  // Template Examples Work
  // ============================================================================

  describe('scaffolded examples work', () => {
    it('should scaffold todo template that compiles', async () => {
      await init({
        name: 'todo-app',
        directory: testDir,
        template: 'todo',
        install: false,
      })

      const result = await build({
        directory: testDir,
      })

      expect(result.success).toBe(true)
    })

    it('should scaffold minimal template that compiles', async () => {
      await init({
        name: 'minimal-app',
        directory: testDir,
        template: 'minimal',
        install: false,
      })

      const result = await build({
        directory: testDir,
      })

      expect(result.success).toBe(true)
    })

    it('should scaffold ecommerce template that compiles', async () => {
      await init({
        name: 'ecommerce-app',
        directory: testDir,
        template: 'ecommerce',
        install: false,
      })

      const result = await build({
        directory: testDir,
      })

      expect(result.success).toBe(true)
    })

    it('should scaffold recruiter template that compiles', async () => {
      await init({
        name: 'recruiter-app',
        directory: testDir,
        template: 'recruiter',
        install: false,
      })

      const result = await build({
        directory: testDir,
      })

      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // Example Quality
  // ============================================================================

  describe('example quality', () => {
    it('should include comments in scaffolded code', async () => {
      await init({
        name: 'commented-app',
        directory: testDir,
        template: 'todo',
        install: false,
      })

      const appContent = readFileSync(join(testDir, 'app.tsx'), 'utf-8')

      // Should have instructional comments
      expect(appContent).toMatch(/\/\/.*|\/\*[\s\S]*?\*\//m)
    })

    it('should include all CRUD operations in examples', async () => {
      await init({
        name: 'crud-app',
        directory: testDir,
        template: 'todo',
        install: false,
      })

      const appContent = readFileSync(join(testDir, 'app.tsx'), 'utf-8')

      // Should demonstrate CRUD
      expect(appContent).toContain('create')
      expect(appContent).toContain('update')
    })

    it('should demonstrate relationships in ecommerce template', async () => {
      await init({
        name: 'relations-app',
        directory: testDir,
        template: 'ecommerce',
        install: false,
      })

      const appContent = readFileSync(join(testDir, 'app.tsx'), 'utf-8')

      // Should show relationship operators
      expect(appContent).toContain('->')
    })

    it('should demonstrate events in templates', async () => {
      await init({
        name: 'events-app',
        directory: testDir,
        template: 'ecommerce',
        install: false,
      })

      const appContent = readFileSync(join(testDir, 'app.tsx'), 'utf-8')

      // Should show event handling
      expect(appContent).toContain('$.on')
    })

    it('should demonstrate AI features in recruiter template', async () => {
      await init({
        name: 'ai-app',
        directory: testDir,
        template: 'recruiter',
        install: false,
      })

      const appContent = readFileSync(join(testDir, 'app.tsx'), 'utf-8')

      // Should show AI usage
      expect(appContent).toContain('$.ai')
    })
  })
})

describe('CLI: Interactive Mode', () => {
  // ============================================================================
  // Interactive Prompts
  // ============================================================================

  describe('interactive prompts', () => {
    it('should prompt for project name if not provided', async () => {
      const mockPrompt = vi.fn().mockResolvedValue('prompted-name')

      const result = await init({
        directory: tmpdir(),
        prompt: mockPrompt,
      })

      expect(mockPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text',
          name: 'name',
        })
      )
    })

    it('should prompt for template selection', async () => {
      const mockPrompt = vi.fn()
        .mockResolvedValueOnce('my-app') // name
        .mockResolvedValueOnce('todo') // template

      const result = await init({
        directory: tmpdir(),
        prompt: mockPrompt,
        interactive: true,
      })

      expect(mockPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'select',
          name: 'template',
        })
      )
    })

    it('should show template descriptions in selection', async () => {
      const mockPrompt = vi.fn()
        .mockResolvedValueOnce('my-app')
        .mockResolvedValueOnce('todo')

      await init({
        directory: tmpdir(),
        prompt: mockPrompt,
        interactive: true,
      })

      const templatePrompt = mockPrompt.mock.calls.find(
        (call) => call[0]?.name === 'template'
      )

      expect(templatePrompt[0].choices).toContainEqual(
        expect.objectContaining({
          value: 'todo',
          description: expect.any(String),
        })
      )
    })
  })
})
