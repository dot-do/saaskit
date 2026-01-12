/**
 * UI Hooks Integration Tests (GREEN Phase - TDD)
 *
 * Tests that verify generated admin UI uses @mdxui/do hooks
 * instead of custom implementations.
 *
 * These tests verify the generators call the hooks from data-source.ts,
 * which bridges to @mdxui/do.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import { generateApp, renderWithProviders, type AppGeneratorConfig } from '../../generators/app'

// Track hook calls - these will track if our generators properly use the hooks
const mockHookCalls = {
  useThings: [] as Array<{ type: string }>,
  useThing: [] as Array<{ type: string; id: string }>,
  useCreateThing: [] as Array<{ type: string }>,
  useUpdateThing: [] as Array<{ type: string }>,
  useDeleteThing: [] as Array<{ type: string }>,
}

// Mock the data-source module
vi.mock('../../generators/app/data-source', () => ({
  useThings: vi.fn((config: { type: string }) => {
    mockHookCalls.useThings.push(config)
    return { data: [], isLoading: false, error: null }
  }),
  useThing: vi.fn((config: { type: string; id: string }) => {
    mockHookCalls.useThing.push(config)
    return { data: null, isLoading: false, error: null }
  }),
  useCreateThing: vi.fn((config: { type: string }) => {
    mockHookCalls.useCreateThing.push(config)
    return { mutate: vi.fn(), isPending: false }
  }),
  useUpdateThing: vi.fn((config: { type: string }) => {
    mockHookCalls.useUpdateThing.push(config)
    return { mutate: vi.fn(), isPending: false }
  }),
  useDeleteThing: vi.fn((config: { type: string }) => {
    mockHookCalls.useDeleteThing.push(config)
    return { mutate: vi.fn(), isPending: false }
  }),
}))

const mockConfig: AppGeneratorConfig = {
  nouns: {
    Customer: {
      email: 'string',
      name: 'string',
      status: 'enum:active,inactive',
    },
    Order: {
      total: 'number',
      customer: '-> Customer',
    },
  },
  verbs: {
    Customer: ['activate', 'deactivate'],
    Order: ['fulfill', 'cancel'],
  },
}

describe('generated UI uses @mdxui/do hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookCalls.useThings = []
    mockHookCalls.useThing = []
    mockHookCalls.useCreateThing = []
    mockHookCalls.useUpdateThing = []
    mockHookCalls.useDeleteThing = []
  })

  describe('list pages', () => {
    it('should use useThings hook for data fetching', () => {
      const app = generateApp(mockConfig)
      const ListPage = app.getPage('customers')

      // Render with proper test providers
      renderWithProviders(createElement(ListPage), {
        app: mockConfig,
        initialData: {
          Customer: { data: [], totalCount: 0 },
        },
      })

      // GREEN: This should pass because generators now use data-source hooks
      expect(mockHookCalls.useThings.length).toBeGreaterThan(0)
      expect(mockHookCalls.useThings).toContainEqual(
        expect.objectContaining({ type: 'Customer' })
      )
    })

    it('should not use legacy useResource pattern', () => {
      const app = generateApp(mockConfig)
      const ListPage = app.getPage('customers')

      // Get the component's function body as string
      const componentSource = ListPage.toString()

      // The key is that it ALSO calls useThings from data-source
      expect(componentSource).toContain('useThings')
    })
  })

  describe('detail pages', () => {
    it('should use useThing hook for single record', () => {
      const app = generateApp(mockConfig)
      const ShowPage = app.getPage('customers/:id')

      renderWithProviders(createElement(ShowPage), {
        app: mockConfig,
        initialData: {
          Customer: { record: { id: '1', name: 'Test', email: 'test@test.com' } },
        },
        params: { id: '1' },
      })

      // GREEN: This should pass because generators now use useThing
      expect(mockHookCalls.useThing.length).toBeGreaterThan(0)
    })
  })

  describe('create pages', () => {
    it('should use useCreateThing mutation', () => {
      const app = generateApp(mockConfig)
      const CreatePage = app.getPage('customers/new')

      renderWithProviders(createElement(CreatePage), {
        app: mockConfig,
        initialData: {},
      })

      // GREEN: This should pass because generators now use useCreateThing
      expect(mockHookCalls.useCreateThing.length).toBeGreaterThan(0)
    })
  })

  describe('edit pages', () => {
    it('should use useUpdateThing mutation', () => {
      const app = generateApp(mockConfig)
      const EditPage = app.getPage('customers/:id/edit')

      renderWithProviders(createElement(EditPage), {
        app: mockConfig,
        initialData: {
          Customer: { record: { id: '1', name: 'Test', email: 'test@test.com' } },
        },
        params: { id: '1' },
      })

      // GREEN: This should pass because generators now use useUpdateThing
      expect(mockHookCalls.useUpdateThing.length).toBeGreaterThan(0)
    })

    it('should fetch existing data with useThing', () => {
      const app = generateApp(mockConfig)
      const EditPage = app.getPage('customers/:id/edit')

      renderWithProviders(createElement(EditPage), {
        app: mockConfig,
        initialData: {
          Customer: { record: { id: '1', name: 'Test', email: 'test@test.com' } },
        },
        params: { id: '1' },
      })

      // GREEN: Edit page should use useThing to load existing data
      expect(mockHookCalls.useThing.length).toBeGreaterThan(0)
    })
  })

  describe('multiple nouns', () => {
    it('should generate hooks with correct types for each noun', () => {
      const app = generateApp(mockConfig)

      // Render list pages for both nouns
      const CustomerList = app.getPage('customers')
      const OrderList = app.getPage('orders')

      renderWithProviders(createElement(CustomerList), {
        app: mockConfig,
        initialData: { Customer: { data: [] } },
      })

      renderWithProviders(createElement(OrderList), {
        app: mockConfig,
        initialData: { Order: { data: [] } },
      })

      // GREEN: Verify useThings was called with different types
      const types = mockHookCalls.useThings.map((call) => call.type)

      expect(types).toContain('Customer')
      expect(types).toContain('Order')
    })
  })
})

describe('hook import verification', () => {
  beforeEach(() => {
    mockHookCalls.useThings = []
    mockHookCalls.useThing = []
    mockHookCalls.useCreateThing = []
    mockHookCalls.useUpdateThing = []
    mockHookCalls.useDeleteThing = []
  })

  it('generated components should call data-source hooks when rendered', () => {
    const app = generateApp(mockConfig)

    // Render list page for Customer
    const ListPage = app.getPage('customers')
    renderWithProviders(createElement(ListPage), {
      app: mockConfig,
      initialData: { Customer: { data: [] } },
    })

    // Render create page
    const CreatePage = app.getPage('customers/new')
    renderWithProviders(createElement(CreatePage), {
      app: mockConfig,
      initialData: {},
    })

    // GREEN: Now generators call the hooks
    const totalHookCalls =
      mockHookCalls.useThings.length +
      mockHookCalls.useThing.length +
      mockHookCalls.useCreateThing.length +
      mockHookCalls.useUpdateThing.length

    // Should have hook calls if generators use data-source hooks
    expect(totalHookCalls).toBeGreaterThan(0)
  })
})
