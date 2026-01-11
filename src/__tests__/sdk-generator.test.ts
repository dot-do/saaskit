/**
 * SDK Generator Tests (RED Phase - TDD)
 *
 * These tests define the expected API for the SDK generator that creates
 * type-safe client libraries from noun/verb definitions.
 *
 * The SDK generator provides:
 * - TypeScript SDK with full type definitions
 * - Python SDK with type hints
 * - Go SDK with proper structs and methods
 * - CRUD method templates for each noun
 * - Verb method templates for custom actions
 * - Pagination support
 * - Error handling with typed errors
 * - Retry logic with exponential backoff
 * - WebSocket subscription client
 * - Auth configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

import { createSDKGenerator, generateTypeScriptSDK, generatePythonSDK, generateGoSDK } from '../sdk-generator'
import type {
  SDKGenerator,
  SDKConfig,
  GeneratedSDK,
  TypeScriptSDKConfig,
  PythonSDKConfig,
  GoSDKConfig,
} from '../sdk-generator/types'

describe('SDK Generator', () => {
  /**
   * Factory function for creating test SDK generators
   */
  const createTestGenerator = (config: Partial<SDKConfig> = {}) => {
    return createSDKGenerator({
      nouns: config.nouns ?? {
        User: { name: 'string', email: 'string', role: 'admin | member | guest' },
        Post: { title: 'string', body: 'string', author: '->User', published: 'boolean' },
      },
      verbs: config.verbs ?? {
        User: {
          create: ($: any) => $.db.User.create($.input),
          invite: ($: any) => ({ sent: true }),
          ban: ($: any) => $.db.User.update($.id, { banned: true }),
        },
        Post: {
          create: ($: any) => $.db.Post.create($.input),
          publish: ($: any) => $.db.Post.update($.id, { published: true }),
          archive: ($: any) => $.db.Post.update($.id, { archived: true }),
        },
      },
      packageName: config.packageName ?? 'test-sdk',
      version: config.version ?? '1.0.0',
      baseUrl: config.baseUrl ?? 'https://api.example.com',
    })
  }

  // ============================================================================
  // Core SDK Generator
  // ============================================================================

  describe('Core SDK Generator', () => {
    it('should create an SDK generator from config', () => {
      const generator = createTestGenerator()

      expect(generator).toBeDefined()
      expect(generator.generateTypeScript).toBeDefined()
      expect(generator.generatePython).toBeDefined()
      expect(generator.generateGo).toBeDefined()
    })

    it('should include package metadata in generated SDKs', () => {
      const generator = createTestGenerator({
        packageName: 'my-app-sdk',
        version: '2.0.0',
      })

      const tsSDK = generator.generateTypeScript()

      expect(tsSDK.packageName).toBe('my-app-sdk')
      expect(tsSDK.version).toBe('2.0.0')
    })

    it('should generate resource classes for each noun', () => {
      const generator = createTestGenerator()

      const tsSDK = generator.generateTypeScript()

      expect(tsSDK.resources).toContain('User')
      expect(tsSDK.resources).toContain('Post')
    })
  })

  // ============================================================================
  // TypeScript SDK Generation
  // ============================================================================

  describe('TypeScript SDK Generation', () => {
    describe('Client Class', () => {
      it('should generate a main Client class', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        expect(sdk.files['src/client.ts']).toBeDefined()
        expect(sdk.files['src/client.ts']).toContain('class Client')
        expect(sdk.files['src/client.ts']).toContain('constructor')
      })

      it('should accept configuration options', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const clientCode = sdk.files['src/client.ts']

        expect(clientCode).toContain('apiKey')
        expect(clientCode).toContain('baseUrl')
        expect(clientCode).toMatch(/timeout|maxRetries/i)
      })

      it('should expose resource namespaces on the client', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const clientCode = sdk.files['src/client.ts']

        expect(clientCode).toContain('users')
        expect(clientCode).toContain('posts')
      })
    })

    describe('Type Definitions', () => {
      it('should generate TypeScript interfaces for each noun', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        expect(sdk.files['src/types.ts']).toBeDefined()

        const typesCode = sdk.files['src/types.ts']

        expect(typesCode).toContain('interface User')
        expect(typesCode).toContain('interface Post')
      })

      it('should generate correct field types', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const typesCode = sdk.files['src/types.ts']

        // String fields
        expect(typesCode).toMatch(/name:\s*string/)
        expect(typesCode).toMatch(/email:\s*string/)

        // Boolean fields
        expect(typesCode).toMatch(/published:\s*boolean/)

        // Enum/union types
        expect(typesCode).toMatch(/role:\s*['"]admin['"]\s*\|\s*['"]member['"]\s*\|\s*['"]guest['"]/)
      })

      it('should generate relationship types correctly', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const typesCode = sdk.files['src/types.ts']

        // Relationship should be typed as string ID or the related type
        expect(typesCode).toMatch(/author:\s*string|author:\s*User/)
      })

      it('should generate input types for create/update operations', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const typesCode = sdk.files['src/types.ts']

        expect(typesCode).toContain('UserCreateInput')
        expect(typesCode).toContain('UserUpdateInput')
        expect(typesCode).toContain('PostCreateInput')
        expect(typesCode).toContain('PostUpdateInput')
      })

      it('should make optional fields optional in create input', () => {
        const generator = createSDKGenerator({
          nouns: {
            Item: { name: 'string', description: 'string?' },
          },
          verbs: {},
          packageName: 'test',
          version: '1.0.0',
        })

        const sdk = generator.generateTypeScript()
        const typesCode = sdk.files['src/types.ts']

        // description should be optional
        expect(typesCode).toMatch(/description\?:\s*string/)
      })
    })

    describe('Resource Classes', () => {
      it('should generate CRUD methods for each noun', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const usersCode = sdk.files['src/resources/users.ts']

        expect(usersCode).toContain('list(')
        expect(usersCode).toContain('get(')
        expect(usersCode).toContain('create(')
        expect(usersCode).toContain('update(')
        expect(usersCode).toContain('delete(')
      })

      it('should generate custom verb methods', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const usersCode = sdk.files['src/resources/users.ts']
        const postsCode = sdk.files['src/resources/posts.ts']

        expect(usersCode).toContain('invite(')
        expect(usersCode).toContain('ban(')
        expect(postsCode).toContain('publish(')
        expect(postsCode).toContain('archive(')
      })

      it('should return typed responses from CRUD methods', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const usersCode = sdk.files['src/resources/users.ts']

        // list returns PaginatedResponse<User>
        expect(usersCode).toMatch(/list\(.*\):\s*Promise<PaginatedResponse<User>>/)
        expect(usersCode).toMatch(/get\(.*\):\s*Promise<User>/)
        expect(usersCode).toMatch(/create\(.*\):\s*Promise<User>/)
      })

      it('should support pagination parameters in list method', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const usersCode = sdk.files['src/resources/users.ts']

        expect(usersCode).toMatch(/list\(.*options\?.*\)/)
        expect(usersCode).toMatch(/limit|offset|cursor/)
      })
    })

    describe('Pagination Support', () => {
      it('should generate PaginatedResponse type', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const typesCode = sdk.files['src/types.ts']

        expect(typesCode).toContain('PaginatedResponse')
        expect(typesCode).toMatch(/data:\s*T\[\]/)
        expect(typesCode).toMatch(/pagination|meta/)
      })

      it('should support auto-pagination with async iterator', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const usersCode = sdk.files['src/resources/users.ts']

        // Should have an iterable method
        expect(usersCode).toMatch(/\[Symbol\.asyncIterator\]|iterate|autoPaginate/)
      })
    })

    describe('Error Handling', () => {
      it('should generate typed error classes', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const errorsCode = sdk.files['src/errors.ts']

        expect(errorsCode).toBeDefined()
        expect(errorsCode).toContain('APIError')
        expect(errorsCode).toContain('NotFoundError')
        expect(errorsCode).toContain('ValidationError')
        expect(errorsCode).toContain('RateLimitError')
        expect(errorsCode).toContain('AuthenticationError')
      })

      it('should include error details in error classes', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const errorsCode = sdk.files['src/errors.ts']

        expect(errorsCode).toMatch(/status(Code)?:\s*number/)
        expect(errorsCode).toMatch(/code:\s*string/)
        expect(errorsCode).toMatch(/message:\s*string/)
        expect(errorsCode).toMatch(/requestId:\s*string/)
      })
    })

    describe('Retry Logic', () => {
      it('should include retry configuration options', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        // Client passes config to HTTP layer
        const clientCode = sdk.files['src/client.ts']
        expect(clientCode).toMatch(/maxRetries/)

        // HTTP layer implements the backoff
        const httpCode = sdk.files['src/http.ts']
        expect(httpCode).toMatch(/Backoff|backoff/)
      })

      it('should implement exponential backoff', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        // Check for retry logic in HTTP layer
        const httpCode = sdk.files['src/http.ts'] || sdk.files['src/client.ts']

        expect(httpCode).toMatch(/exponential|backoff|Math\.pow|2\s*\*\*/)
      })
    })

    describe('Package Files', () => {
      it('should generate package.json', () => {
        const generator = createTestGenerator({
          packageName: 'my-sdk',
          version: '1.2.3',
        })
        const sdk = generator.generateTypeScript()

        expect(sdk.files['package.json']).toBeDefined()

        const pkg = JSON.parse(sdk.files['package.json'])

        expect(pkg.name).toBe('my-sdk')
        expect(pkg.version).toBe('1.2.3')
        expect(pkg.types).toBeDefined()
        expect(pkg.main).toBeDefined()
      })

      it('should generate tsconfig.json', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        expect(sdk.files['tsconfig.json']).toBeDefined()

        const tsconfig = JSON.parse(sdk.files['tsconfig.json'])

        expect(tsconfig.compilerOptions).toBeDefined()
        expect(tsconfig.compilerOptions.declaration).toBe(true)
      })

      it('should generate index.ts with all exports', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateTypeScript()

        const indexCode = sdk.files['src/index.ts']

        expect(indexCode).toContain('export')
        expect(indexCode).toContain('Client')
        expect(indexCode).toMatch(/User|UserCreateInput/)
        expect(indexCode).toMatch(/Post|PostCreateInput/)
      })
    })
  })

  // ============================================================================
  // Python SDK Generation
  // ============================================================================

  describe('Python SDK Generation', () => {
    describe('Client Class', () => {
      it('should generate a main Client class', () => {
        const generator = createTestGenerator()
        const sdk = generator.generatePython()

        expect(sdk.files['src/client.py']).toBeDefined()
        expect(sdk.files['src/client.py']).toContain('class Client')
        expect(sdk.files['src/client.py']).toContain('def __init__')
      })

      it('should use Python naming conventions (snake_case)', () => {
        const generator = createTestGenerator()
        const sdk = generator.generatePython()

        const clientCode = sdk.files['src/client.py']

        expect(clientCode).toContain('api_key')
        expect(clientCode).toContain('base_url')
        expect(clientCode).toContain('max_retries')
      })

      it('should expose resource namespaces', () => {
        const generator = createTestGenerator()
        const sdk = generator.generatePython()

        const clientCode = sdk.files['src/client.py']

        expect(clientCode).toContain('self.users')
        expect(clientCode).toContain('self.posts')
      })
    })

    describe('Type Hints', () => {
      it('should generate dataclasses or TypedDicts for nouns', () => {
        const generator = createTestGenerator()
        const sdk = generator.generatePython()

        const typesCode = sdk.files['src/types.py']

        expect(typesCode).toBeDefined()
        expect(typesCode).toMatch(/@dataclass|class User\(TypedDict\)|class User:/)
        expect(typesCode).toMatch(/@dataclass|class Post\(TypedDict\)|class Post:/)
      })

      it('should use correct Python types', () => {
        const generator = createTestGenerator()
        const sdk = generator.generatePython()

        const typesCode = sdk.files['src/types.py']

        expect(typesCode).toMatch(/str/)
        expect(typesCode).toMatch(/bool/)
        expect(typesCode).toMatch(/int|float/)
      })

      it('should use Literal for enum types', () => {
        const generator = createTestGenerator()
        const sdk = generator.generatePython()

        const typesCode = sdk.files['src/types.py']

        expect(typesCode).toMatch(/Literal\[.*admin.*member.*guest.*\]/)
      })

      it('should use Optional for nullable fields', () => {
        const generator = createSDKGenerator({
          nouns: {
            Item: { name: 'string', note: 'string?' },
          },
          verbs: {},
          packageName: 'test',
          version: '1.0.0',
        })

        const sdk = generator.generatePython()
        const typesCode = sdk.files['src/types.py']

        expect(typesCode).toMatch(/Optional\[str\]|str\s*\|\s*None/)
      })
    })

    describe('Resource Classes', () => {
      it('should generate CRUD methods for each noun', () => {
        const generator = createTestGenerator()
        const sdk = generator.generatePython()

        const usersCode = sdk.files['src/resources/users.py']

        expect(usersCode).toContain('def list(')
        expect(usersCode).toContain('def get(')
        expect(usersCode).toContain('def create(')
        expect(usersCode).toContain('def update(')
        expect(usersCode).toContain('def delete(')
      })

      it('should generate custom verb methods with snake_case names', () => {
        const generator = createTestGenerator()
        const sdk = generator.generatePython()

        const usersCode = sdk.files['src/resources/users.py']
        const postsCode = sdk.files['src/resources/posts.py']

        expect(usersCode).toContain('def invite(')
        expect(usersCode).toContain('def ban(')
        expect(postsCode).toContain('def publish(')
        expect(postsCode).toContain('def archive(')
      })

      it('should include type hints on method signatures', () => {
        const generator = createTestGenerator()
        const sdk = generator.generatePython()

        const usersCode = sdk.files['src/resources/users.py']

        expect(usersCode).toMatch(/def get\(.*id:\s*str.*\)\s*->\s*User/)
        expect(usersCode).toMatch(/def create\(.*\)\s*->\s*User/)
      })
    })

    describe('Package Files', () => {
      it('should generate pyproject.toml', () => {
        const generator = createTestGenerator({
          packageName: 'my-sdk',
          version: '1.2.3',
        })
        const sdk = generator.generatePython()

        expect(sdk.files['pyproject.toml']).toBeDefined()
        expect(sdk.files['pyproject.toml']).toContain('my-sdk')
        expect(sdk.files['pyproject.toml']).toContain('1.2.3')
      })

      it('should generate __init__.py with exports', () => {
        const generator = createTestGenerator()
        const sdk = generator.generatePython()

        const initCode = sdk.files['src/__init__.py']

        expect(initCode).toBeDefined()
        expect(initCode).toContain('Client')
        expect(initCode).toContain('User')
        expect(initCode).toContain('Post')
      })
    })
  })

  // ============================================================================
  // Go SDK Generation
  // ============================================================================

  describe('Go SDK Generation', () => {
    describe('Client Struct', () => {
      it('should generate a main Client struct', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateGo()

        expect(sdk.files['client.go']).toBeDefined()
        expect(sdk.files['client.go']).toContain('type Client struct')
        expect(sdk.files['client.go']).toContain('func NewClient')
      })

      it('should use Go naming conventions (PascalCase/camelCase)', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateGo()

        const clientCode = sdk.files['client.go']

        expect(clientCode).toContain('APIKey')
        expect(clientCode).toContain('BaseURL')
      })

      it('should expose resource services', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateGo()

        const clientCode = sdk.files['client.go']

        expect(clientCode).toContain('Users')
        expect(clientCode).toContain('Posts')
      })
    })

    describe('Type Definitions', () => {
      it('should generate structs for each noun', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateGo()

        const typesCode = sdk.files['types.go']

        expect(typesCode).toBeDefined()
        expect(typesCode).toContain('type User struct')
        expect(typesCode).toContain('type Post struct')
      })

      it('should use correct Go types', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateGo()

        const typesCode = sdk.files['types.go']

        expect(typesCode).toMatch(/string/)
        expect(typesCode).toMatch(/bool/)
      })

      it('should use json tags for struct fields', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateGo()

        const typesCode = sdk.files['types.go']

        expect(typesCode).toMatch(/`json:"name"`/)
        expect(typesCode).toMatch(/`json:"email"`/)
      })

      it('should use pointers for optional fields', () => {
        const generator = createSDKGenerator({
          nouns: {
            Item: { name: 'string', note: 'string?' },
          },
          verbs: {},
          packageName: 'test',
          version: '1.0.0',
        })

        const sdk = generator.generateGo()
        const typesCode = sdk.files['types.go']

        expect(typesCode).toMatch(/Note\s+\*string/)
      })
    })

    describe('Service Methods', () => {
      it('should generate CRUD methods for each noun', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateGo()

        const usersCode = sdk.files['users.go']

        expect(usersCode).toContain('func (s *UsersService) List(')
        expect(usersCode).toContain('func (s *UsersService) Get(')
        expect(usersCode).toContain('func (s *UsersService) Create(')
        expect(usersCode).toContain('func (s *UsersService) Update(')
        expect(usersCode).toContain('func (s *UsersService) Delete(')
      })

      it('should generate custom verb methods with PascalCase names', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateGo()

        const usersCode = sdk.files['users.go']
        const postsCode = sdk.files['posts.go']

        expect(usersCode).toContain('func (s *UsersService) Invite(')
        expect(usersCode).toContain('func (s *UsersService) Ban(')
        expect(postsCode).toContain('func (s *PostsService) Publish(')
        expect(postsCode).toContain('func (s *PostsService) Archive(')
      })

      it('should accept context as first parameter', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateGo()

        const usersCode = sdk.files['users.go']

        expect(usersCode).toMatch(/func \(s \*UsersService\) Get\(ctx context\.Context/)
        expect(usersCode).toMatch(/func \(s \*UsersService\) List\(ctx context\.Context/)
      })

      it('should return error as second return value', () => {
        const generator = createTestGenerator()
        const sdk = generator.generateGo()

        const usersCode = sdk.files['users.go']

        expect(usersCode).toMatch(/\(\*User, error\)/)
        expect(usersCode).toMatch(/\(\[\]User, error\)|ListResponse/)
      })
    })

    describe('Package Files', () => {
      it('should generate go.mod', () => {
        const generator = createTestGenerator({
          packageName: 'github.com/example/sdk',
          version: '1.0.0',
        })
        const sdk = generator.generateGo()

        expect(sdk.files['go.mod']).toBeDefined()
        expect(sdk.files['go.mod']).toContain('module')
      })
    })
  })

  // ============================================================================
  // WebSocket Subscriptions
  // ============================================================================

  describe('WebSocket Subscriptions', () => {
    it('should generate subscription client for TypeScript SDK', () => {
      const generator = createTestGenerator()
      const sdk = generator.generateTypeScript()

      const wsCode = sdk.files['src/subscriptions.ts'] || sdk.files['src/client.ts']

      expect(wsCode).toMatch(/subscribe|onEvent|WebSocket/)
    })

    it('should generate subscription types for events', () => {
      const generator = createTestGenerator()
      const sdk = generator.generateTypeScript()

      const typesCode = sdk.files['src/types.ts']

      // Should have event types for subscription handlers
      expect(typesCode).toMatch(/UserCreated|UserEvent|PostEvent/)
    })

    it('should support filtering subscriptions', () => {
      const generator = createTestGenerator()
      const sdk = generator.generateTypeScript()

      const wsCode = sdk.files['src/subscriptions.ts'] || sdk.files['src/client.ts']

      expect(wsCode).toMatch(/filter|where|options/)
    })
  })

  // ============================================================================
  // Standalone Functions
  // ============================================================================

  describe('Standalone Generation Functions', () => {
    it('should export generateTypeScriptSDK function', () => {
      const sdk = generateTypeScriptSDK({
        nouns: { Item: { name: 'string' } },
        verbs: {},
        packageName: 'test',
        version: '1.0.0',
      })

      expect(sdk).toBeDefined()
      expect(sdk.files).toBeDefined()
    })

    it('should export generatePythonSDK function', () => {
      const sdk = generatePythonSDK({
        nouns: { Item: { name: 'string' } },
        verbs: {},
        packageName: 'test',
        version: '1.0.0',
      })

      expect(sdk).toBeDefined()
      expect(sdk.files).toBeDefined()
    })

    it('should export generateGoSDK function', () => {
      const sdk = generateGoSDK({
        nouns: { Item: { name: 'string' } },
        verbs: {},
        packageName: 'test',
        version: '1.0.0',
      })

      expect(sdk).toBeDefined()
      expect(sdk.files).toBeDefined()
    })
  })

  // ============================================================================
  // Auth Configuration
  // ============================================================================

  describe('Auth Configuration', () => {
    it('should support Bearer token authentication', () => {
      const generator = createTestGenerator()
      const sdk = generator.generateTypeScript()

      // Auth headers are set in the HTTP layer
      const httpCode = sdk.files['src/http.ts']

      expect(httpCode).toMatch(/Bearer|Authorization/)
    })

    it('should support custom header authentication', () => {
      const generator = createSDKGenerator({
        nouns: { Item: { name: 'string' } },
        verbs: {},
        packageName: 'test',
        version: '1.0.0',
        auth: {
          type: 'header',
          headerName: 'X-API-Key',
        },
      })

      const sdk = generator.generateTypeScript()
      // Auth headers are set in the HTTP layer
      const httpCode = sdk.files['src/http.ts']

      expect(httpCode).toContain('X-API-Key')
    })
  })
})
