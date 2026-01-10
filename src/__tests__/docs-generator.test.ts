/**
 * Docs Generator Tests (RED Phase - TDD)
 *
 * These tests define the expected API for the documentation generator
 * that creates API references, quickstarts, and guides from the app definition.
 *
 * SaaSkit generates documentation using Fumadocs. The docs are derived from:
 * - Nouns -> API Reference pages for each noun (CRUD + custom verbs)
 * - Verbs -> Endpoint documentation with examples
 * - Events -> Webhook event reference
 * - Schema -> SDK quickstart guides (JS, Python, Go)
 *
 * Documentation structure (from README):
 * ```
 * docs.yourapp.io.sb
 * ├── Getting Started
 * │   ├── Quick Start
 * │   ├── Authentication
 * │   └── Your First Request
 * ├── API Reference
 * │   ├── Customers
 * │   ├── Orders
 * │   └── Products
 * ├── Webhooks
 * │   └── Event Reference
 * └── SDKs
 *     ├── JavaScript
 *     ├── Python
 *     └── Go
 * ```
 */

import { describe, it, expect, beforeEach } from 'vitest'

// These imports will fail until implementation exists
// @ts-expect-error - Implementation not yet created
import { generateDocs, DocsGenerator } from '../docs'
// @ts-expect-error - Implementation not yet created
import type {
  DocsConfig,
  DocsPage,
  DocsSection,
  APIEndpoint,
  WebhookEvent,
  SDKQuickstart,
} from '../docs/types'
// @ts-expect-error - Implementation not yet created
import { createSaaS } from '../database'

describe('Docs Generator', () => {
  // ============================================================================
  // Docs Site Rendering
  // ============================================================================

  describe('Docs Site Rendering', () => {
    it('should generate a complete docs site from app definition', () => {
      const $ = createSaaS()

      $.nouns({
        Customer: {
          name: 'string',
          email: 'string',
        },
        Order: {
          total: 'number',
          customer: '->Customer',
        },
      })

      $.verbs({
        Order: {
          create: ($: any) => $.db.Order.create($.input),
          pay: ($: any) => $.db.Order.update($.id, { status: 'paid' }),
        },
      })

      const docs = generateDocs($)

      expect(docs).toBeDefined()
      expect(docs.pages).toBeDefined()
      expect(docs.pages.length).toBeGreaterThan(0)
    })

    it('should generate docs with correct base URL structure', () => {
      const $ = createSaaS()

      $.nouns({
        Product: { name: 'string', price: 'number' },
      })

      const docs = generateDocs($, { baseUrl: 'docs.myapp.io.sb' })

      expect(docs.baseUrl).toBe('docs.myapp.io.sb')
    })

    it('should support custom branding in docs', () => {
      const $ = createSaaS()

      $.nouns({
        Item: { name: 'string' },
      })

      const docs = generateDocs($, {
        appName: 'MyAwesomeApp',
        logo: '/logo.svg',
        primaryColor: '#3b82f6',
      })

      expect(docs.config.appName).toBe('MyAwesomeApp')
      expect(docs.config.logo).toBe('/logo.svg')
      expect(docs.config.primaryColor).toBe('#3b82f6')
    })
  })

  // ============================================================================
  // Getting Started Section
  // ============================================================================

  describe('Getting Started Section', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS()
      $.nouns({
        Customer: { name: 'string', email: 'string' },
      })
      $.verbs({
        Customer: {
          create: ($: any) => $.db.Customer.create($.input),
        },
      })
    })

    it('should generate Getting Started page with Quick Start guide', () => {
      const docs = generateDocs($)

      const gettingStarted = docs.pages.find(
        (p: DocsPage) => p.slug === 'getting-started' || p.title === 'Getting Started'
      )

      expect(gettingStarted).toBeDefined()
    })

    it('should include Quick Start subpage', () => {
      const docs = generateDocs($)

      const quickStart = docs.pages.find(
        (p: DocsPage) => p.slug === 'getting-started/quick-start' || p.title === 'Quick Start'
      )

      expect(quickStart).toBeDefined()
      expect(quickStart?.content).toContain('npm install')
    })

    it('should include Authentication subpage explaining API keys', () => {
      const docs = generateDocs($)

      const authPage = docs.pages.find(
        (p: DocsPage) =>
          p.slug === 'getting-started/authentication' || p.title === 'Authentication'
      )

      expect(authPage).toBeDefined()
      expect(authPage?.content).toMatch(/api.?key/i)
      expect(authPage?.content).toMatch(/authorization/i)
      expect(authPage?.content).toContain('Bearer')
    })

    it('should include Your First Request subpage with working example', () => {
      const docs = generateDocs($)

      const firstRequest = docs.pages.find(
        (p: DocsPage) =>
          p.slug === 'getting-started/your-first-request' || p.title === 'Your First Request'
      )

      expect(firstRequest).toBeDefined()
      // Should include actual API call example
      expect(firstRequest?.content).toMatch(/curl|fetch|axios/i)
      // Should reference actual nouns from the schema
      expect(firstRequest?.content).toMatch(/customer/i)
    })
  })

  // ============================================================================
  // API Reference Generation
  // ============================================================================

  describe('API Reference Generation', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS()
      $.nouns({
        Customer: {
          name: 'string',
          email: 'string',
          plan: '->Plan',
        },
        Order: {
          total: 'number',
          status: 'pending | paid | shipped',
          customer: '->Customer',
        },
        Plan: {
          name: 'string',
          price: 'number',
        },
      })
      $.verbs({
        Customer: {
          create: ($: any) => $.db.Customer.create($.input),
          update: ($: any) => $.db.Customer.update($.id, $.input),
          delete: ($: any) => $.db.Customer.delete($.id),
        },
        Order: {
          create: ($: any) => $.db.Order.create($.input),
          pay: ($: any) => $.db.Order.update($.id, { status: 'paid' }),
          ship: ($: any) => $.db.Order.update($.id, { status: 'shipped' }),
          refund: ($: any) => $.db.Order.update($.id, { status: 'refunded' }),
        },
      })
    })

    it('should generate API Reference page for each noun', () => {
      const docs = generateDocs($)

      const customerRef = docs.pages.find(
        (p: DocsPage) =>
          p.slug === 'api-reference/customers' ||
          p.slug === 'api-reference/customer' ||
          p.title === 'Customers'
      )
      const orderRef = docs.pages.find(
        (p: DocsPage) =>
          p.slug === 'api-reference/orders' ||
          p.slug === 'api-reference/order' ||
          p.title === 'Orders'
      )
      const planRef = docs.pages.find(
        (p: DocsPage) =>
          p.slug === 'api-reference/plans' ||
          p.slug === 'api-reference/plan' ||
          p.title === 'Plans'
      )

      expect(customerRef).toBeDefined()
      expect(orderRef).toBeDefined()
      expect(planRef).toBeDefined()
    })

    it('should document CRUD endpoints for each noun', () => {
      const docs = generateDocs($)

      const customerRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('customer') || p.title?.includes('Customer')
      )

      // Should have CRUD operations documented
      expect(customerRef?.endpoints).toBeDefined()

      const endpoints = customerRef?.endpoints as APIEndpoint[]

      // List
      expect(endpoints.find((e) => e.method === 'GET' && e.path === '/customers')).toBeDefined()
      // Get one
      expect(endpoints.find((e) => e.method === 'GET' && e.path === '/customers/:id')).toBeDefined()
      // Create
      expect(endpoints.find((e) => e.method === 'POST' && e.path === '/customers')).toBeDefined()
      // Update
      expect(endpoints.find((e) => e.method === 'PUT' && e.path === '/customers/:id')).toBeDefined()
      // Delete
      expect(
        endpoints.find((e) => e.method === 'DELETE' && e.path === '/customers/:id')
      ).toBeDefined()
    })

    it('should document custom verb endpoints', () => {
      const docs = generateDocs($)

      const orderRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('order') || p.title?.includes('Order')
      )

      const endpoints = orderRef?.endpoints as APIEndpoint[]

      // Custom verbs should be POST endpoints
      expect(
        endpoints.find((e) => e.method === 'POST' && e.path === '/orders/:id/pay')
      ).toBeDefined()
      expect(
        endpoints.find((e) => e.method === 'POST' && e.path === '/orders/:id/ship')
      ).toBeDefined()
      expect(
        endpoints.find((e) => e.method === 'POST' && e.path === '/orders/:id/refund')
      ).toBeDefined()
    })

    it('should include request/response examples for each endpoint', () => {
      const docs = generateDocs($)

      const customerRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('customer') || p.title?.includes('Customer')
      )

      const endpoints = customerRef?.endpoints as APIEndpoint[]
      const createEndpoint = endpoints.find(
        (e) => e.method === 'POST' && e.path === '/customers'
      )

      expect(createEndpoint).toBeDefined()
      expect(createEndpoint?.requestExample).toBeDefined()
      expect(createEndpoint?.responseExample).toBeDefined()

      // Request example should match schema
      expect(createEndpoint?.requestExample).toHaveProperty('name')
      expect(createEndpoint?.requestExample).toHaveProperty('email')

      // Response example should have id
      expect(createEndpoint?.responseExample).toHaveProperty('id')
    })

    it('should document field types and relationships', () => {
      const docs = generateDocs($)

      const customerRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('customer') || p.title?.includes('Customer')
      )

      expect(customerRef?.schema).toBeDefined()

      // Should document field types
      expect(customerRef?.schema.name).toEqual({ type: 'string', required: true })
      expect(customerRef?.schema.email).toEqual({ type: 'string', required: true })

      // Should document relationships
      expect(customerRef?.schema.plan).toMatchObject({
        type: 'relation',
        target: 'Plan',
      })
    })

    it('should document enum/union types for status fields', () => {
      const docs = generateDocs($)

      const orderRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('order') || p.title?.includes('Order')
      )

      expect(orderRef?.schema.status).toMatchObject({
        type: 'enum',
        values: ['pending', 'paid', 'shipped'],
      })
    })
  })

  // ============================================================================
  // Endpoint Documentation
  // ============================================================================

  describe('Endpoint Documentation', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS()
      $.nouns({
        Product: {
          name: 'string',
          price: 'number',
          description: 'markdown?',
        },
      })
      $.verbs({
        Product: {
          create: ($: any) => $.db.Product.create($.input),
          restock: ($: any) =>
            $.db.Product.update($.id, {
              inventory: $.record.inventory + $.input.quantity,
            }),
        },
      })
    })

    it('should generate curl examples for each endpoint', () => {
      const docs = generateDocs($)

      const productRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('product') || p.title?.includes('Product')
      )

      const endpoints = productRef?.endpoints as APIEndpoint[]
      const createEndpoint = endpoints.find(
        (e) => e.method === 'POST' && e.path === '/products'
      )

      expect(createEndpoint?.curlExample).toBeDefined()
      expect(createEndpoint?.curlExample).toContain('curl')
      expect(createEndpoint?.curlExample).toContain('-X POST')
      expect(createEndpoint?.curlExample).toContain('/products')
    })

    it('should generate JavaScript/TypeScript examples', () => {
      const docs = generateDocs($)

      const productRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('product') || p.title?.includes('Product')
      )

      const endpoints = productRef?.endpoints as APIEndpoint[]
      const createEndpoint = endpoints.find(
        (e) => e.method === 'POST' && e.path === '/products'
      )

      expect(createEndpoint?.jsExample).toBeDefined()
      expect(createEndpoint?.jsExample).toMatch(/await|fetch|client\.products/i)
    })

    it('should generate Python examples', () => {
      const docs = generateDocs($)

      const productRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('product') || p.title?.includes('Product')
      )

      const endpoints = productRef?.endpoints as APIEndpoint[]
      const createEndpoint = endpoints.find(
        (e) => e.method === 'POST' && e.path === '/products'
      )

      expect(createEndpoint?.pythonExample).toBeDefined()
      expect(createEndpoint?.pythonExample).toMatch(/import|client\.products|requests/i)
    })

    it('should generate Go examples', () => {
      const docs = generateDocs($)

      const productRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('product') || p.title?.includes('Product')
      )

      const endpoints = productRef?.endpoints as APIEndpoint[]
      const createEndpoint = endpoints.find(
        (e) => e.method === 'POST' && e.path === '/products'
      )

      expect(createEndpoint?.goExample).toBeDefined()
      expect(createEndpoint?.goExample).toMatch(/package|client\.Products|http/i)
    })

    it('should document required vs optional parameters', () => {
      const docs = generateDocs($)

      const productRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('product') || p.title?.includes('Product')
      )

      const endpoints = productRef?.endpoints as APIEndpoint[]
      const createEndpoint = endpoints.find(
        (e) => e.method === 'POST' && e.path === '/products'
      )

      expect(createEndpoint?.parameters).toBeDefined()

      const nameParam = createEndpoint?.parameters.find((p: any) => p.name === 'name')
      const descParam = createEndpoint?.parameters.find((p: any) => p.name === 'description')

      expect(nameParam?.required).toBe(true)
      expect(descParam?.required).toBe(false) // description is markdown?
    })

    it('should document error responses', () => {
      const docs = generateDocs($)

      const productRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('product') || p.title?.includes('Product')
      )

      const endpoints = productRef?.endpoints as APIEndpoint[]
      const getEndpoint = endpoints.find(
        (e) => e.method === 'GET' && e.path === '/products/:id'
      )

      expect(getEndpoint?.errorResponses).toBeDefined()
      expect(getEndpoint?.errorResponses).toContainEqual(
        expect.objectContaining({ status: 404, description: expect.any(String) })
      )
      expect(getEndpoint?.errorResponses).toContainEqual(
        expect.objectContaining({ status: 401, description: expect.any(String) })
      )
    })
  })

  // ============================================================================
  // Webhook Events Reference
  // ============================================================================

  describe('Webhook Events Reference', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS()
      $.nouns({
        Order: {
          total: 'number',
          status: 'pending | paid | shipped',
        },
        Customer: {
          name: 'string',
          email: 'string',
        },
      })
      $.verbs({
        Order: {
          create: ($: any) => $.db.Order.create($.input),
          pay: ($: any) => $.db.Order.update($.id, { status: 'paid' }),
          ship: ($: any) => $.db.Order.update($.id, { status: 'shipped' }),
        },
        Customer: {
          create: ($: any) => $.db.Customer.create($.input),
          delete: ($: any) => $.db.Customer.delete($.id),
        },
      })

      // Register event handlers
      $.on.Order.created(async () => {})
      $.on.Order.paid(async () => {})
      $.on.Order.shipped(async () => {})
      $.on.Customer.created(async () => {})
      $.on.Customer.deleted(async () => {})
    })

    it('should generate Webhook Events Reference page', () => {
      const docs = generateDocs($)

      const webhooksPage = docs.pages.find(
        (p: DocsPage) =>
          p.slug === 'webhooks' ||
          p.slug === 'webhooks/events' ||
          p.title === 'Webhooks' ||
          p.title === 'Event Reference'
      )

      expect(webhooksPage).toBeDefined()
    })

    it('should document all registered events', () => {
      const docs = generateDocs($)

      const webhooksPage = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('webhook') || p.title?.includes('Webhook')
      )

      expect(webhooksPage?.events).toBeDefined()

      const events = webhooksPage?.events as WebhookEvent[]

      expect(events.find((e) => e.name === 'order.created')).toBeDefined()
      expect(events.find((e) => e.name === 'order.paid')).toBeDefined()
      expect(events.find((e) => e.name === 'order.shipped')).toBeDefined()
      expect(events.find((e) => e.name === 'customer.created')).toBeDefined()
      expect(events.find((e) => e.name === 'customer.deleted')).toBeDefined()
    })

    it('should include payload schema for each event', () => {
      const docs = generateDocs($)

      const webhooksPage = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('webhook') || p.title?.includes('Webhook')
      )

      const events = webhooksPage?.events as WebhookEvent[]
      const orderCreated = events.find((e) => e.name === 'order.created')

      expect(orderCreated?.payload).toBeDefined()
      expect(orderCreated?.payload).toHaveProperty('id')
      expect(orderCreated?.payload).toHaveProperty('total')
      expect(orderCreated?.payload).toHaveProperty('status')
    })

    it('should include example webhook payloads', () => {
      const docs = generateDocs($)

      const webhooksPage = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('webhook') || p.title?.includes('Webhook')
      )

      const events = webhooksPage?.events as WebhookEvent[]
      const orderPaid = events.find((e) => e.name === 'order.paid')

      expect(orderPaid?.examplePayload).toBeDefined()
      expect(orderPaid?.examplePayload).toHaveProperty('event', 'order.paid')
      expect(orderPaid?.examplePayload).toHaveProperty('data')
      expect(orderPaid?.examplePayload).toHaveProperty('timestamp')
    })

    it('should document webhook signature verification', () => {
      const docs = generateDocs($)

      const webhooksPage = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('webhook') || p.title?.includes('Webhook')
      )

      expect(webhooksPage?.content).toMatch(/signature|verify|X-Webhook-Signature/i)
    })

    it('should include retry policy documentation', () => {
      const docs = generateDocs($)

      const webhooksPage = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('webhook') || p.title?.includes('Webhook')
      )

      expect(webhooksPage?.content).toMatch(/retry|attempts|backoff/i)
    })
  })

  // ============================================================================
  // SDK Quickstart Pages
  // ============================================================================

  describe('SDK Quickstart Pages', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS()
      $.nouns({
        Todo: {
          title: 'string',
          completed: 'boolean',
        },
      })
      $.verbs({
        Todo: {
          create: ($: any) => $.db.Todo.create($.input),
          complete: ($: any) => $.db.Todo.update($.id, { completed: true }),
        },
      })
    })

    it('should generate JavaScript SDK quickstart page', () => {
      const docs = generateDocs($)

      const jsSDK = docs.pages.find(
        (p: DocsPage) =>
          p.slug === 'sdks/javascript' ||
          p.slug === 'sdks/js' ||
          p.title === 'JavaScript' ||
          p.title === 'JavaScript SDK'
      )

      expect(jsSDK).toBeDefined()
    })

    it('should include npm install instructions for JS SDK', () => {
      const docs = generateDocs($, { appName: 'myapp' })

      const jsSDK = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('javascript') || p.slug?.includes('js')
      )

      expect(jsSDK?.content).toMatch(/npm install|yarn add|pnpm add/i)
      expect(jsSDK?.content).toContain('myapp')
    })

    it('should generate Python SDK quickstart page', () => {
      const docs = generateDocs($)

      const pythonSDK = docs.pages.find(
        (p: DocsPage) =>
          p.slug === 'sdks/python' ||
          p.title === 'Python' ||
          p.title === 'Python SDK'
      )

      expect(pythonSDK).toBeDefined()
    })

    it('should include pip install instructions for Python SDK', () => {
      const docs = generateDocs($, { appName: 'myapp' })

      const pythonSDK = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('python')
      )

      expect(pythonSDK?.content).toMatch(/pip install|poetry add/i)
      expect(pythonSDK?.content).toContain('myapp')
    })

    it('should generate Go SDK quickstart page', () => {
      const docs = generateDocs($)

      const goSDK = docs.pages.find(
        (p: DocsPage) =>
          p.slug === 'sdks/go' ||
          p.title === 'Go' ||
          p.title === 'Go SDK'
      )

      expect(goSDK).toBeDefined()
    })

    it('should include go get instructions for Go SDK', () => {
      const docs = generateDocs($, { appName: 'myapp' })

      const goSDK = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('go')
      )

      expect(goSDK?.content).toMatch(/go get|go mod/i)
    })

    it('should include initialization code for each SDK', () => {
      const docs = generateDocs($, { appName: 'myapp' })

      const jsSDK = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('javascript') || p.slug?.includes('js')
      ) as SDKQuickstart
      const pythonSDK = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('python')
      ) as SDKQuickstart
      const goSDK = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('go')
      ) as SDKQuickstart

      // JS initialization
      expect(jsSDK?.initCode).toMatch(/new.*Client|import.*from/i)
      expect(jsSDK?.initCode).toMatch(/apiKey/i)

      // Python initialization
      expect(pythonSDK?.initCode).toMatch(/Client|import/i)
      expect(pythonSDK?.initCode).toMatch(/api_key/i)

      // Go initialization
      expect(goSDK?.initCode).toMatch(/NewClient|package/i)
    })

    it('should include CRUD examples in each SDK', () => {
      const docs = generateDocs($)

      const jsSDK = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('javascript') || p.slug?.includes('js')
      ) as SDKQuickstart

      expect(jsSDK?.examples).toBeDefined()
      expect(jsSDK?.examples?.create).toBeDefined()
      expect(jsSDK?.examples?.list).toBeDefined()
      expect(jsSDK?.examples?.get).toBeDefined()
      expect(jsSDK?.examples?.update).toBeDefined()
      expect(jsSDK?.examples?.delete).toBeDefined()
    })

    it('should include custom verb examples in SDKs', () => {
      const docs = generateDocs($)

      const jsSDK = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('javascript') || p.slug?.includes('js')
      ) as SDKQuickstart

      // Should have complete verb example
      expect(jsSDK?.examples?.complete).toBeDefined()
      expect(jsSDK?.examples?.complete).toMatch(/todo.*complete/i)
    })
  })

  // ============================================================================
  // Code Examples Correctness
  // ============================================================================

  describe('Code Examples Correctness', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS()
      $.nouns({
        User: {
          name: 'string',
          email: 'string',
          role: 'admin | member | guest',
        },
      })
      $.verbs({
        User: {
          create: ($: any) => $.db.User.create($.input),
          promote: ($: any) => $.db.User.update($.id, { role: 'admin' }),
        },
      })
    })

    it('should generate syntactically valid curl commands', () => {
      const docs = generateDocs($)

      const userRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('user') || p.title?.includes('User')
      )

      const endpoints = userRef?.endpoints as APIEndpoint[]
      const createEndpoint = endpoints.find(
        (e) => e.method === 'POST' && e.path === '/users'
      )

      const curl = createEndpoint?.curlExample

      // Should be valid curl syntax
      expect(curl).toMatch(/^curl\s/)
      expect(curl).toMatch(/-H\s+['"]Authorization:\s*Bearer/i)
      expect(curl).toMatch(/-H\s+['"]Content-Type:\s*application\/json/i)
      expect(curl).toMatch(/-d\s+['"]?\{.*\}['"]?/s)
    })

    it('should generate syntactically valid JavaScript code', () => {
      const docs = generateDocs($)

      const userRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('user') || p.title?.includes('User')
      )

      const endpoints = userRef?.endpoints as APIEndpoint[]
      const createEndpoint = endpoints.find(
        (e) => e.method === 'POST' && e.path === '/users'
      )

      const jsCode = createEndpoint?.jsExample

      // Should use proper syntax
      expect(jsCode).toMatch(/const|let|var/)
      expect(jsCode).toMatch(/await/)
      // Should not have syntax errors like unmatched brackets
      const openBraces = (jsCode?.match(/\{/g) || []).length
      const closeBraces = (jsCode?.match(/\}/g) || []).length
      expect(openBraces).toBe(closeBraces)
    })

    it('should generate syntactically valid Python code', () => {
      const docs = generateDocs($)

      const userRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('user') || p.title?.includes('User')
      )

      const endpoints = userRef?.endpoints as APIEndpoint[]
      const createEndpoint = endpoints.find(
        (e) => e.method === 'POST' && e.path === '/users'
      )

      const pythonCode = createEndpoint?.pythonExample

      // Should use proper Python syntax
      expect(pythonCode).not.toMatch(/const |let |var /)
      expect(pythonCode).toMatch(/=/)
      // Python uses snake_case
      expect(pythonCode).toMatch(/api_key|client/)
    })

    it('should generate code examples with correct field names from schema', () => {
      const docs = generateDocs($)

      const userRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('user') || p.title?.includes('User')
      )

      const endpoints = userRef?.endpoints as APIEndpoint[]
      const createEndpoint = endpoints.find(
        (e) => e.method === 'POST' && e.path === '/users'
      )

      // Should include actual schema fields
      expect(createEndpoint?.jsExample).toMatch(/name/)
      expect(createEndpoint?.jsExample).toMatch(/email/)
      expect(createEndpoint?.curlExample).toMatch(/name/)
      expect(createEndpoint?.curlExample).toMatch(/email/)
    })

    it('should generate correct enum values in examples', () => {
      const docs = generateDocs($)

      const userRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('user') || p.title?.includes('User')
      )

      // Schema documentation should show enum values
      expect(userRef?.schema.role.values).toContain('admin')
      expect(userRef?.schema.role.values).toContain('member')
      expect(userRef?.schema.role.values).toContain('guest')
    })
  })

  // ============================================================================
  // Auto-Update on Schema Changes
  // ============================================================================

  describe('Auto-Update on Schema Changes', () => {
    it('should update docs when nouns are added', () => {
      const $ = createSaaS()

      $.nouns({
        Post: { title: 'string' },
      })

      const docs1 = generateDocs($)
      const postRef1 = docs1.pages.find((p: DocsPage) =>
        p.slug?.includes('post') || p.title?.includes('Post')
      )

      expect(postRef1).toBeDefined()

      // Add another noun
      $.addNoun('Comment', {
        body: 'string',
        post: '->Post',
      })

      const docs2 = generateDocs($)
      const commentRef = docs2.pages.find((p: DocsPage) =>
        p.slug?.includes('comment') || p.title?.includes('Comment')
      )

      expect(commentRef).toBeDefined()
    })

    it('should update docs when verbs are added', () => {
      const $ = createSaaS()

      $.nouns({
        Article: { title: 'string', published: 'boolean' },
      })
      $.verbs({
        Article: {
          create: ($: any) => $.db.Article.create($.input),
        },
      })

      const docs1 = generateDocs($)
      const articleRef1 = docs1.pages.find((p: DocsPage) =>
        p.slug?.includes('article') || p.title?.includes('Article')
      )
      const endpoints1 = articleRef1?.endpoints as APIEndpoint[]

      // Should not have publish endpoint yet
      expect(
        endpoints1.find((e) => e.path === '/articles/:id/publish')
      ).toBeUndefined()

      // Add verb
      $.addVerb('Article', 'publish', ($: any) =>
        $.db.Article.update($.id, { published: true })
      )

      const docs2 = generateDocs($)
      const articleRef2 = docs2.pages.find((p: DocsPage) =>
        p.slug?.includes('article') || p.title?.includes('Article')
      )
      const endpoints2 = articleRef2?.endpoints as APIEndpoint[]

      // Should now have publish endpoint
      expect(
        endpoints2.find((e) => e.path === '/articles/:id/publish')
      ).toBeDefined()
    })

    it('should update docs when fields are added to nouns', () => {
      const $ = createSaaS()

      $.nouns({
        Task: { title: 'string' },
      })

      const docs1 = generateDocs($)
      const taskRef1 = docs1.pages.find((p: DocsPage) =>
        p.slug?.includes('task') || p.title?.includes('Task')
      )

      expect(taskRef1?.schema.priority).toBeUndefined()

      // Update noun with new field
      $.updateNoun('Task', {
        title: 'string',
        priority: 'low | medium | high',
      })

      const docs2 = generateDocs($)
      const taskRef2 = docs2.pages.find((p: DocsPage) =>
        p.slug?.includes('task') || p.title?.includes('Task')
      )

      expect(taskRef2?.schema.priority).toBeDefined()
      expect(taskRef2?.schema.priority.values).toContain('high')
    })

    it('should regenerate examples when schema changes', () => {
      const $ = createSaaS()

      $.nouns({
        Item: { name: 'string' },
      })
      $.verbs({
        Item: {
          create: ($: any) => $.db.Item.create($.input),
        },
      })

      const docs1 = generateDocs($)
      const itemRef1 = docs1.pages.find((p: DocsPage) =>
        p.slug?.includes('item') || p.title?.includes('Item')
      )
      const endpoints1 = itemRef1?.endpoints as APIEndpoint[]
      const createEndpoint1 = endpoints1.find(
        (e) => e.method === 'POST' && e.path === '/items'
      )

      // Should not have quantity field
      expect(createEndpoint1?.requestExample).not.toHaveProperty('quantity')

      // Add new field
      $.updateNoun('Item', {
        name: 'string',
        quantity: 'number',
      })

      const docs2 = generateDocs($)
      const itemRef2 = docs2.pages.find((p: DocsPage) =>
        p.slug?.includes('item') || p.title?.includes('Item')
      )
      const endpoints2 = itemRef2?.endpoints as APIEndpoint[]
      const createEndpoint2 = endpoints2.find(
        (e) => e.method === 'POST' && e.path === '/items'
      )

      // Should now have quantity field in examples
      expect(createEndpoint2?.requestExample).toHaveProperty('quantity')
    })
  })

  // ============================================================================
  // Fumadocs Integration
  // ============================================================================

  describe('Fumadocs Integration', () => {
    let $: ReturnType<typeof createSaaS>

    beforeEach(() => {
      $ = createSaaS()
      $.nouns({
        Widget: { name: 'string', color: 'string' },
      })
      $.verbs({
        Widget: {
          create: ($: any) => $.db.Widget.create($.input),
        },
      })
    })

    it('should generate valid MDX content for Fumadocs', () => {
      const docs = generateDocs($)

      // All pages should have valid MDX content
      docs.pages.forEach((page: DocsPage) => {
        expect(page.content).toBeDefined()
        expect(typeof page.content).toBe('string')
      })
    })

    it('should include Fumadocs frontmatter', () => {
      const docs = generateDocs($)

      const widgetRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('widget') || p.title?.includes('Widget')
      )

      // Should have frontmatter
      expect(widgetRef?.frontmatter).toBeDefined()
      expect(widgetRef?.frontmatter.title).toBeDefined()
      expect(widgetRef?.frontmatter.description).toBeDefined()
    })

    it('should generate correct navigation structure', () => {
      const docs = generateDocs($)

      expect(docs.navigation).toBeDefined()

      // Should have main sections
      expect(docs.navigation).toContainEqual(
        expect.objectContaining({ title: 'Getting Started' })
      )
      expect(docs.navigation).toContainEqual(
        expect.objectContaining({ title: 'API Reference' })
      )
      expect(docs.navigation).toContainEqual(
        expect.objectContaining({ title: expect.stringMatching(/webhook/i) })
      )
      expect(docs.navigation).toContainEqual(
        expect.objectContaining({ title: 'SDKs' })
      )
    })

    it('should generate docs meta files for Fumadocs', () => {
      const docs = generateDocs($)

      // Should have meta.json content
      expect(docs.meta).toBeDefined()
      expect(Array.isArray(docs.meta.pages)).toBe(true)
    })

    it('should support Fumadocs components in generated content', () => {
      const docs = generateDocs($)

      const quickStart = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('quick-start') || p.title?.includes('Quick Start')
      )

      // Should use Fumadocs components like Tabs, Callout, etc.
      expect(quickStart?.content).toMatch(/<(Tabs|Callout|Steps|Card)/i)
    })

    it('should generate OpenAPI spec compatible with Fumadocs OpenAPI plugin', () => {
      const docs = generateDocs($)

      expect(docs.openapi).toBeDefined()
      expect(docs.openapi.openapi).toMatch(/^3\./)
      expect(docs.openapi.info).toBeDefined()
      expect(docs.openapi.paths).toBeDefined()

      // Should have Widget paths
      expect(docs.openapi.paths['/widgets']).toBeDefined()
      expect(docs.openapi.paths['/widgets/{id}']).toBeDefined()
    })

    it('should export docs as file structure for static generation', () => {
      const docs = generateDocs($)

      const fileStructure = docs.toFileStructure()

      expect(fileStructure).toBeDefined()
      expect(fileStructure['getting-started/index.mdx']).toBeDefined()
      expect(fileStructure['api-reference/widgets.mdx']).toBeDefined()
    })
  })

  // ============================================================================
  // DocsGenerator Class
  // ============================================================================

  describe('DocsGenerator Class', () => {
    it('should be instantiable with app context', () => {
      const $ = createSaaS()
      $.nouns({ Test: { name: 'string' } })

      const generator = new DocsGenerator($)

      expect(generator).toBeDefined()
      expect(generator.generate).toBeDefined()
    })

    it('should support configuration via constructor options', () => {
      const $ = createSaaS()
      $.nouns({ Test: { name: 'string' } })

      const generator = new DocsGenerator($, {
        appName: 'TestApp',
        baseUrl: 'docs.test.io',
        version: '2.0.0',
      })

      const docs = generator.generate()

      expect(docs.config.appName).toBe('TestApp')
      expect(docs.baseUrl).toBe('docs.test.io')
      expect(docs.version).toBe('2.0.0')
    })

    it('should allow custom page templates', () => {
      const $ = createSaaS()
      $.nouns({ Test: { name: 'string' } })

      const generator = new DocsGenerator($, {
        templates: {
          apiReference: (noun: string) => `# Custom API Reference for ${noun}`,
        },
      })

      const docs = generator.generate()
      const testRef = docs.pages.find((p: DocsPage) =>
        p.slug?.includes('test') || p.title?.includes('Test')
      )

      expect(testRef?.content).toContain('Custom API Reference')
    })

    it('should support plugins for extending docs', () => {
      const $ = createSaaS()
      $.nouns({ Test: { name: 'string' } })

      const customPlugin = {
        name: 'custom-plugin',
        afterGenerate: (docs: any) => {
          docs.pages.push({
            slug: 'custom-page',
            title: 'Custom Page',
            content: '# Custom content from plugin',
          })
          return docs
        },
      }

      const generator = new DocsGenerator($, {
        plugins: [customPlugin],
      })

      const docs = generator.generate()
      const customPage = docs.pages.find((p: DocsPage) => p.slug === 'custom-page')

      expect(customPage).toBeDefined()
      expect(customPage?.content).toContain('Custom content from plugin')
    })

    it('should support incremental generation', () => {
      const $ = createSaaS()
      $.nouns({
        User: { name: 'string' },
        Post: { title: 'string' },
      })

      const generator = new DocsGenerator($)

      // Generate only for specific nouns
      const userDocs = generator.generateForNoun('User')

      expect(userDocs).toBeDefined()
      expect(userDocs.slug).toMatch(/user/i)
    })
  })
})
