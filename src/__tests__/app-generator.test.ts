/**
 * App Generator Tests (RED Phase - TDD)
 *
 * These tests define the expected behavior for the App generator that creates
 * a complete React admin dashboard from noun/verb definitions. All tests should
 * FAIL initially because the implementation doesn't exist yet.
 *
 * The App generator produces:
 * - Dashboard page with metrics
 * - List pages for each noun (CRUD)
 * - Create pages with forms based on noun fields
 * - Edit pages with populated forms
 * - Show pages with record display
 * - Verb action buttons on record pages
 * - Real-time updates via WebSocket
 * - Settings, Team, Billing pages
 * - API Keys and Webhooks pages
 * - RBAC enforcement
 *
 * Expected App Routes (from README):
 * ├── /dashboard          → Overview with metrics
 * ├── /<nouns>            → CRUD list/create/edit/show
 * ├── /settings           → Organization settings
 * ├── /team               → User management
 * ├── /billing            → Stripe customer portal
 * ├── /api-keys           → Key management
 * └── /webhooks           → Webhook configuration
 */

import { describe, it, expect, vi } from 'vitest'
import { createElement, type ComponentType, type ReactElement } from 'react'
import { generateApp, renderWithProviders, screen, waitFor, fireEvent } from '../generators/app'
import type { AppRoute, GeneratedApp, RenderOptions, RenderResult, AppGeneratorConfig } from '../generators/app'

describe('App Generator', () => {
  /**
   * Helper to create a test app configuration
   */
  const createTestConfig = () => ({
    name: 'TestApp',
    nouns: {
      Customer: {
        name: 'string',
        email: 'string',
        plan: '->Plan',
        orders: ['<-Order'],
      },
      Order: {
        total: 'number',
        status: 'pending | paid | shipped | delivered',
        customer: '->Customer',
        items: ['->Product'],
      },
      Product: {
        name: 'string',
        price: 'number',
        inventory: 'number',
      },
      Plan: {
        name: 'string',
        price: 'number',
      },
    },
    verbs: {
      Order: {
        pay: (ctx: unknown) => {},
        ship: (ctx: unknown) => {},
        cancel: (ctx: unknown) => {},
        refund: (ctx: unknown) => {},
      },
      Product: {
        restock: (ctx: unknown) => {},
      },
    },
  }) satisfies AppGeneratorConfig

  describe('App Structure Generation', () => {
    it('should generate an app with all required routes', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      expect(app).toBeDefined()
      expect(app.routes).toBeDefined()
      expect(Array.isArray(app.routes)).toBe(true)
    })

    it('should include dashboard route', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      const dashboardRoute = app.routes.find((r: AppRoute) => r.path === '/dashboard')
      expect(dashboardRoute).toBeDefined()
      expect(dashboardRoute!.component).toBeDefined()
    })

    it('should include settings route', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      const settingsRoute = app.routes.find((r: AppRoute) => r.path === '/settings')
      expect(settingsRoute).toBeDefined()
    })

    it('should include team route', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      const teamRoute = app.routes.find((r: AppRoute) => r.path === '/team')
      expect(teamRoute).toBeDefined()
    })

    it('should include billing route', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      const billingRoute = app.routes.find((r: AppRoute) => r.path === '/billing')
      expect(billingRoute).toBeDefined()
    })

    it('should include api-keys route', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      const apiKeysRoute = app.routes.find((r: AppRoute) => r.path === '/api-keys')
      expect(apiKeysRoute).toBeDefined()
    })

    it('should include webhooks route', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      const webhooksRoute = app.routes.find((r: AppRoute) => r.path === '/webhooks')
      expect(webhooksRoute).toBeDefined()
    })
  })

  describe('Dashboard Page', () => {
    it('should render dashboard with metrics', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Dashboard = app.getPage('dashboard')

      const { container } = renderWithProviders(createElement(Dashboard), { app: config })

      expect(container.querySelector('[data-page="dashboard"]')).toBeTruthy()
    })

    it('should display total count for each noun', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Dashboard = app.getPage('dashboard')

      const mockData = {
        Customer: { totalCount: 150 },
        Order: { totalCount: 1234 },
        Product: { totalCount: 89 },
      }

      renderWithProviders(createElement(Dashboard), {
        app: config,
        initialData: mockData,
      })

      await waitFor(() => {
        expect(screen.getByText(/150/)).toBeTruthy()
        expect(screen.getByText(/1234/)).toBeTruthy()
        expect(screen.getByText(/89/)).toBeTruthy()
      })
    })

    it('should display recent activity', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Dashboard = app.getPage('dashboard')

      renderWithProviders(createElement(Dashboard), { app: config })

      await waitFor(() => {
        expect(screen.getByText(/recent activity/i)).toBeTruthy()
      })
    })

    it('should display quick action buttons', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Dashboard = app.getPage('dashboard')

      renderWithProviders(createElement(Dashboard), { app: config })

      // Should have quick actions for creating new records
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new customer/i })).toBeTruthy()
        expect(screen.getByRole('button', { name: /new order/i })).toBeTruthy()
        expect(screen.getByRole('button', { name: /new product/i })).toBeTruthy()
      })
    })

    it('should show real-time connection status', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Dashboard = app.getPage('dashboard')

      renderWithProviders(createElement(Dashboard), { app: config })

      await waitFor(() => {
        const statusElement = screen.getByTestId('realtime-status')
        expect(statusElement).toBeTruthy()
      })
    })
  })

  describe('List Page Generation', () => {
    it('should generate list page for each noun', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      // Should have list routes for each noun
      expect(app.routes.find((r: AppRoute) => r.path === '/customers')).toBeDefined()
      expect(app.routes.find((r: AppRoute) => r.path === '/orders')).toBeDefined()
      expect(app.routes.find((r: AppRoute) => r.path === '/products')).toBeDefined()
      expect(app.routes.find((r: AppRoute) => r.path === '/plans')).toBeDefined()
    })

    it('should render list with table headers based on noun fields', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CustomerList = app.getPage('customers')

      renderWithProviders(createElement(CustomerList), { app: config })

      await waitFor(() => {
        expect(screen.getByText(/name/i)).toBeTruthy()
        expect(screen.getByText(/email/i)).toBeTruthy()
      })
    })

    it('should display data rows from API', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CustomerList = app.getPage('customers')

      const mockCustomers = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ]

      renderWithProviders(createElement(CustomerList), {
        app: config,
        initialData: { Customer: { data: mockCustomers } },
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy()
        expect(screen.getByText('jane@example.com')).toBeTruthy()
      })
    })

    it('should have "Create" button that navigates to create page', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CustomerList = app.getPage('customers')
      const navigate = vi.fn()

      renderWithProviders(createElement(CustomerList), {
        app: config,
        navigate,
      })

      const createButton = await screen.findByRole('button', { name: /create|new|add/i })
      fireEvent.click(createButton)

      expect(navigate).toHaveBeenCalledWith('/customers/new')
    })

    it('should support pagination', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const OrderList = app.getPage('orders')

      renderWithProviders(createElement(OrderList), {
        app: config,
        initialData: {
          Order: {
            data: Array(25).fill({ id: '1', total: 100, status: 'pending' }),
            totalCount: 100,
            hasMore: true,
          },
        },
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeTruthy()
        expect(screen.getByText(/1.*of.*100/i)).toBeTruthy()
      })
    })

    it('should support sorting columns', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ProductList = app.getPage('products')
      const onSort = vi.fn()

      renderWithProviders(createElement(ProductList), {
        app: config,
        onSort,
      })

      const nameHeader = await screen.findByText(/name/i)
      fireEvent.click(nameHeader)

      expect(onSort).toHaveBeenCalledWith(expect.objectContaining({
        field: 'name',
        direction: expect.any(String),
      }))
    })

    it('should support filtering', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const OrderList = app.getPage('orders')

      renderWithProviders(createElement(OrderList), { app: config })

      // Should have filter controls
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /filter/i })
        expect(filterButton).toBeTruthy()
      })
    })

    it('should show row actions (view, edit, delete)', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CustomerList = app.getPage('customers')

      const mockCustomers = [
        { id: 'cus_1', name: 'John Doe', email: 'john@example.com' },
      ]

      renderWithProviders(createElement(CustomerList), {
        app: config,
        initialData: { Customer: { data: mockCustomers } },
      })

      await waitFor(() => {
        const actionsMenu = screen.getByTestId('row-actions-cus_1')
        expect(actionsMenu).toBeTruthy()
      })
    })
  })

  describe('Create Page Generation', () => {
    it('should generate create page for each noun', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      expect(app.routes.find((r: AppRoute) => r.path === '/customers/new')).toBeDefined()
      expect(app.routes.find((r: AppRoute) => r.path === '/orders/new')).toBeDefined()
      expect(app.routes.find((r: AppRoute) => r.path === '/products/new')).toBeDefined()
    })

    it('should render form fields based on noun schema', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CreateProduct = app.getPage('products/new')

      renderWithProviders(createElement(CreateProduct), { app: config })

      await waitFor(() => {
        // String field
        expect(screen.getByLabelText(/name/i)).toBeTruthy()
        // Number fields
        expect(screen.getByLabelText(/price/i)).toBeTruthy()
        expect(screen.getByLabelText(/inventory/i)).toBeTruthy()
      })
    })

    it('should render correct input types for field types', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CreateProduct = app.getPage('products/new')

      renderWithProviders(createElement(CreateProduct), { app: config })

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement
        const priceInput = screen.getByLabelText(/price/i) as HTMLInputElement

        expect(nameInput.type).toBe('text')
        expect(priceInput.type).toBe('number')
      })
    })

    it('should render select for union type fields', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CreateOrder = app.getPage('orders/new')

      renderWithProviders(createElement(CreateOrder), { app: config })

      await waitFor(() => {
        const statusSelect = screen.getByLabelText(/status/i)
        expect(statusSelect.tagName.toLowerCase()).toBe('select')

        // Check options
        expect(screen.getByRole('option', { name: 'pending' })).toBeTruthy()
        expect(screen.getByRole('option', { name: 'paid' })).toBeTruthy()
        expect(screen.getByRole('option', { name: 'shipped' })).toBeTruthy()
        expect(screen.getByRole('option', { name: 'delivered' })).toBeTruthy()
      })
    })

    it('should render relation selector for -> fields', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CreateCustomer = app.getPage('customers/new')

      renderWithProviders(createElement(CreateCustomer), { app: config })

      await waitFor(() => {
        // plan: '->Plan' should render as a select/combobox
        const planSelector = screen.getByLabelText(/plan/i)
        expect(planSelector).toBeTruthy()
      })
    })

    it('should submit form and create record', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CreateProduct = app.getPage('products/new')
      const onCreate = vi.fn().mockResolvedValue({ id: 'prod_1' })

      renderWithProviders(createElement(CreateProduct), {
        app: config,
        mutations: { Product: { create: onCreate } },
      })

      // Fill form
      const nameInput = await screen.findByLabelText(/name/i)
      const priceInput = await screen.findByLabelText(/price/i)
      const inventoryInput = await screen.findByLabelText(/inventory/i)

      fireEvent.change(nameInput, { target: { value: 'Widget' } })
      fireEvent.change(priceInput, { target: { value: '29.99' } })
      fireEvent.change(inventoryInput, { target: { value: '100' } })

      // Submit
      const submitButton = screen.getByRole('button', { name: /create|save|submit/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Widget',
            price: 29.99,
            inventory: 100,
          })
        )
      })
    })

    it('should show validation errors', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CreateCustomer = app.getPage('customers/new')

      renderWithProviders(createElement(CreateCustomer), { app: config })

      // Submit without filling required fields
      const submitButton = await screen.findByRole('button', { name: /create|save|submit/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/required|cannot be empty/i)).toBeTruthy()
      })
    })

    it('should navigate back to list on successful creation', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CreateProduct = app.getPage('products/new')
      const navigate = vi.fn()
      const onCreate = vi.fn().mockResolvedValue({ id: 'prod_1' })

      renderWithProviders(createElement(CreateProduct), {
        app: config,
        navigate,
        mutations: { Product: { create: onCreate } },
      })

      const nameInput = await screen.findByLabelText(/name/i)
      fireEvent.change(nameInput, { target: { value: 'Widget' } })

      const submitButton = screen.getByRole('button', { name: /create|save|submit/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/products')
      })
    })
  })

  describe('Edit Page Generation', () => {
    it('should generate edit page routes for each noun', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      expect(app.routes.find((r: AppRoute) => r.path === '/customers/:id/edit')).toBeDefined()
      expect(app.routes.find((r: AppRoute) => r.path === '/orders/:id/edit')).toBeDefined()
      expect(app.routes.find((r: AppRoute) => r.path === '/products/:id/edit')).toBeDefined()
    })

    it('should populate form with existing record data', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const EditProduct = app.getPage('products/:id/edit')

      const existingProduct = {
        id: 'prod_1',
        name: 'Existing Widget',
        price: 49.99,
        inventory: 50,
      }

      renderWithProviders(createElement(EditProduct), {
        app: config,
        params: { id: 'prod_1' },
        initialData: { Product: { record: existingProduct } },
      })

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement
        const priceInput = screen.getByLabelText(/price/i) as HTMLInputElement

        expect(nameInput.value).toBe('Existing Widget')
        expect(priceInput.value).toBe('49.99')
      })
    })

    it('should submit form and update record', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const EditProduct = app.getPage('products/:id/edit')
      const onUpdate = vi.fn().mockResolvedValue({ id: 'prod_1' })

      const existingProduct = {
        id: 'prod_1',
        name: 'Old Name',
        price: 29.99,
        inventory: 50,
      }

      renderWithProviders(createElement(EditProduct), {
        app: config,
        params: { id: 'prod_1' },
        initialData: { Product: { record: existingProduct } },
        mutations: { Product: { update: onUpdate } },
      })

      const nameInput = await screen.findByLabelText(/name/i)
      fireEvent.change(nameInput, { target: { value: 'New Name' } })

      const submitButton = screen.getByRole('button', { name: /save|update|submit/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          'prod_1',
          expect.objectContaining({ name: 'New Name' })
        )
      })
    })

    it('should show loading state while fetching record', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const EditProduct = app.getPage('products/:id/edit')

      renderWithProviders(createElement(EditProduct), {
        app: config,
        params: { id: 'prod_1' },
        initialData: { Product: { isLoading: true } },
      })

      expect(screen.getByTestId('loading-spinner')).toBeTruthy()
    })

    it('should handle delete from edit page', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const EditProduct = app.getPage('products/:id/edit')
      const onDelete = vi.fn().mockResolvedValue(undefined)
      const navigate = vi.fn()

      const existingProduct = {
        id: 'prod_1',
        name: 'Widget',
        price: 29.99,
        inventory: 50,
      }

      renderWithProviders(createElement(EditProduct), {
        app: config,
        params: { id: 'prod_1' },
        navigate,
        initialData: { Product: { record: existingProduct } },
        mutations: { Product: { remove: onDelete } },
      })

      const deleteButton = await screen.findByRole('button', { name: /delete/i })
      fireEvent.click(deleteButton)

      // Should show confirmation
      const confirmButton = await screen.findByRole('button', { name: /confirm|yes/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith('prod_1')
        expect(navigate).toHaveBeenCalledWith('/products')
      })
    })
  })

  describe('Show Page Generation', () => {
    it('should generate show page routes for each noun', () => {
      const config = createTestConfig()
      const app = generateApp(config)

      expect(app.routes.find((r: AppRoute) => r.path === '/customers/:id')).toBeDefined()
      expect(app.routes.find((r: AppRoute) => r.path === '/orders/:id')).toBeDefined()
      expect(app.routes.find((r: AppRoute) => r.path === '/products/:id')).toBeDefined()
    })

    it('should display record fields', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowCustomer = app.getPage('customers/:id')

      const customer = {
        id: 'cus_1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2024-01-01T00:00:00Z',
      }

      renderWithProviders(createElement(ShowCustomer), {
        app: config,
        params: { id: 'cus_1' },
        initialData: { Customer: { record: customer } },
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy()
        expect(screen.getByText('john@example.com')).toBeTruthy()
      })
    })

    it('should display related records', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowCustomer = app.getPage('customers/:id')

      const customer = {
        id: 'cus_1',
        name: 'John Doe',
        email: 'john@example.com',
        orders: [
          { id: 'ord_1', total: 100, status: 'paid' },
          { id: 'ord_2', total: 250, status: 'shipped' },
        ],
        plan: { id: 'plan_1', name: 'Pro', price: 99 },
      }

      renderWithProviders(createElement(ShowCustomer), {
        app: config,
        params: { id: 'cus_1' },
        initialData: { Customer: { record: customer } },
      })

      await waitFor(() => {
        // Should show related orders
        expect(screen.getByText(/orders/i)).toBeTruthy()
        expect(screen.getByText('$100')).toBeTruthy()
        // Should show related plan
        expect(screen.getByText('Pro')).toBeTruthy()
      })
    })

    it('should have edit button', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowCustomer = app.getPage('customers/:id')
      const navigate = vi.fn()

      const customer = { id: 'cus_1', name: 'John Doe', email: 'john@example.com' }

      renderWithProviders(createElement(ShowCustomer), {
        app: config,
        params: { id: 'cus_1' },
        navigate,
        initialData: { Customer: { record: customer } },
      })

      const editButton = await screen.findByRole('button', { name: /edit/i })
      fireEvent.click(editButton)

      expect(navigate).toHaveBeenCalledWith('/customers/cus_1/edit')
    })
  })

  describe('Verb Buttons', () => {
    it('should render verb buttons on record show page', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowOrder = app.getPage('orders/:id')

      const order = {
        id: 'ord_1',
        total: 100,
        status: 'pending',
        customer: { id: 'cus_1', name: 'John' },
      }

      renderWithProviders(createElement(ShowOrder), {
        app: config,
        params: { id: 'ord_1' },
        initialData: { Order: { record: order } },
      })

      await waitFor(() => {
        // Order verbs: pay, ship, cancel, refund
        expect(screen.getByRole('button', { name: /pay/i })).toBeTruthy()
        expect(screen.getByRole('button', { name: /ship/i })).toBeTruthy()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy()
        expect(screen.getByRole('button', { name: /refund/i })).toBeTruthy()
      })
    })

    it('should execute verb when button is clicked', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowOrder = app.getPage('orders/:id')
      const executeVerb = vi.fn().mockResolvedValue({ status: 'paid' })

      const order = {
        id: 'ord_1',
        total: 100,
        status: 'pending',
        customer: { id: 'cus_1' },
      }

      renderWithProviders(createElement(ShowOrder), {
        app: config,
        params: { id: 'ord_1' },
        initialData: { Order: { record: order } },
        verbs: { Order: { pay: executeVerb } },
      })

      const payButton = await screen.findByRole('button', { name: /pay/i })
      fireEvent.click(payButton)

      await waitFor(() => {
        expect(executeVerb).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'ord_1' })
        )
      })
    })

    it('should show loading state during verb execution', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowOrder = app.getPage('orders/:id')

      let resolveVerb: () => void
      const executeVerb = vi.fn().mockImplementation(
        () => new Promise(resolve => { resolveVerb = () => resolve({ status: 'paid' }) })
      )

      const order = { id: 'ord_1', total: 100, status: 'pending' }

      renderWithProviders(createElement(ShowOrder), {
        app: config,
        params: { id: 'ord_1' },
        initialData: { Order: { record: order } },
        verbs: { Order: { pay: executeVerb } },
      })

      const payButton = await screen.findByRole('button', { name: /pay/i })
      fireEvent.click(payButton)

      // Should show loading state
      await waitFor(() => {
        expect(payButton).toHaveAttribute('disabled')
      })

      // Resolve and verify completion
      resolveVerb!()
      await waitFor(() => {
        expect(payButton).not.toHaveAttribute('disabled')
      })
    })

    it('should show verb buttons on list page rows', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const OrderList = app.getPage('orders')

      const orders = [
        { id: 'ord_1', total: 100, status: 'pending' },
      ]

      renderWithProviders(createElement(OrderList), {
        app: config,
        initialData: { Order: { data: orders } },
      })

      await waitFor(() => {
        // Row actions should include verbs
        const actionsMenu = screen.getByTestId('row-actions-ord_1')
        fireEvent.click(actionsMenu)

        expect(screen.getByRole('menuitem', { name: /pay/i })).toBeTruthy()
        expect(screen.getByRole('menuitem', { name: /ship/i })).toBeTruthy()
      })
    })

    it('should conditionally show verbs based on record state', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowOrder = app.getPage('orders/:id')

      // Order is already shipped, some verbs may not apply
      const order = { id: 'ord_1', total: 100, status: 'shipped' }

      renderWithProviders(createElement(ShowOrder), {
        app: config,
        params: { id: 'ord_1' },
        initialData: { Order: { record: order } },
      })

      await waitFor(() => {
        // Ship button should be disabled or hidden for already shipped orders
        const shipButton = screen.queryByRole('button', { name: /ship/i })
        if (shipButton) {
          expect(shipButton).toHaveAttribute('disabled')
        }
      })
    })

    it('should show confirmation dialog for destructive verbs', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowOrder = app.getPage('orders/:id')
      const executeVerb = vi.fn()

      const order = { id: 'ord_1', total: 100, status: 'pending' }

      renderWithProviders(createElement(ShowOrder), {
        app: config,
        params: { id: 'ord_1' },
        initialData: { Order: { record: order } },
        verbs: { Order: { cancel: executeVerb } },
      })

      const cancelButton = await screen.findByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeTruthy()
      })

      // Verb should not be executed yet
      expect(executeVerb).not.toHaveBeenCalled()

      // Confirm the action
      const confirmButton = screen.getByRole('button', { name: /confirm|yes/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(executeVerb).toHaveBeenCalled()
      })
    })
  })

  describe('Real-time Updates via WebSocket', () => {
    it('should connect to WebSocket on mount', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Dashboard = app.getPage('dashboard')
      const wsConnect = vi.fn()

      renderWithProviders(createElement(Dashboard), {
        app: config,
        realtime: { connect: wsConnect },
      })

      await waitFor(() => {
        expect(wsConnect).toHaveBeenCalled()
      })
    })

    it('should update list when record is created', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CustomerList = app.getPage('customers')

      const initialCustomers = [
        { id: 'cus_1', name: 'John', email: 'john@example.com' },
      ]

      const { realtimeEmit } = renderWithProviders(createElement(CustomerList), {
        app: config,
        initialData: { Customer: { data: initialCustomers } },
      })

      // Simulate WebSocket event for new customer
      realtimeEmit({
        type: 'created',
        noun: 'Customer',
        id: 'cus_2',
        data: { id: 'cus_2', name: 'Jane', email: 'jane@example.com' },
      })

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeTruthy()
      })
    })

    it('should update record when it is modified', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowOrder = app.getPage('orders/:id')

      const order = { id: 'ord_1', total: 100, status: 'pending' }

      const { realtimeEmit } = renderWithProviders(createElement(ShowOrder), {
        app: config,
        params: { id: 'ord_1' },
        initialData: { Order: { record: order } },
      })

      // Simulate WebSocket event for order update
      realtimeEmit({
        type: 'updated',
        noun: 'Order',
        id: 'ord_1',
        data: { id: 'ord_1', total: 100, status: 'paid' },
      })

      await waitFor(() => {
        expect(screen.getByText(/paid/i)).toBeTruthy()
      })
    })

    it('should remove record from list when deleted', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CustomerList = app.getPage('customers')

      const initialCustomers = [
        { id: 'cus_1', name: 'John', email: 'john@example.com' },
        { id: 'cus_2', name: 'Jane', email: 'jane@example.com' },
      ]

      const { realtimeEmit } = renderWithProviders(createElement(CustomerList), {
        app: config,
        initialData: { Customer: { data: initialCustomers } },
      })

      // Initially both should be visible
      expect(screen.getByText('John')).toBeTruthy()
      expect(screen.getByText('Jane')).toBeTruthy()

      // Simulate WebSocket event for deletion
      realtimeEmit({
        type: 'deleted',
        noun: 'Customer',
        id: 'cus_1',
      })

      await waitFor(() => {
        expect(screen.queryByText('John')).toBeNull()
        expect(screen.getByText('Jane')).toBeTruthy()
      })
    })

    it('should show real-time status indicator', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Dashboard = app.getPage('dashboard')

      const { setRealtimeStatus } = renderWithProviders(createElement(Dashboard), {
        app: config,
      })

      // Initially connecting
      await waitFor(() => {
        expect(screen.getByTestId('realtime-status')).toHaveAttribute('data-status', 'connecting')
      })

      // Then connected
      setRealtimeStatus('connected')
      await waitFor(() => {
        expect(screen.getByTestId('realtime-status')).toHaveAttribute('data-status', 'connected')
      })

      // Handle disconnection
      setRealtimeStatus('disconnected')
      await waitFor(() => {
        expect(screen.getByTestId('realtime-status')).toHaveAttribute('data-status', 'disconnected')
      })
    })

    it('should reconnect automatically on disconnect', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Dashboard = app.getPage('dashboard')
      const wsConnect = vi.fn()

      const { setRealtimeStatus } = renderWithProviders(createElement(Dashboard), {
        app: config,
        realtime: { connect: wsConnect },
      })

      // Initial connection
      expect(wsConnect).toHaveBeenCalledTimes(1)

      // Simulate disconnection
      setRealtimeStatus('disconnected')

      // Should attempt to reconnect
      await waitFor(() => {
        expect(wsConnect).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Settings Page', () => {
    it('should render settings page', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Settings = app.getPage('settings')

      renderWithProviders(createElement(Settings), { app: config })

      await waitFor(() => {
        expect(screen.getByText(/settings/i)).toBeTruthy()
      })
    })

    it('should display organization settings form', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Settings = app.getPage('settings')

      const orgSettings = {
        name: 'Acme Corp',
        slug: 'acme',
        domain: 'acme.example.com',
      }

      renderWithProviders(createElement(Settings), {
        app: config,
        initialData: { settings: orgSettings },
      })

      await waitFor(() => {
        expect(screen.getByLabelText(/organization name/i)).toBeTruthy()
        expect(screen.getByDisplayValue('Acme Corp')).toBeTruthy()
      })
    })

    it('should save settings changes', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Settings = app.getPage('settings')
      const onSave = vi.fn().mockResolvedValue({})

      const orgSettings = { name: 'Acme Corp' }

      renderWithProviders(createElement(Settings), {
        app: config,
        initialData: { settings: orgSettings },
        mutations: { settings: { update: onSave } },
      })

      const nameInput = await screen.findByLabelText(/organization name/i)
      fireEvent.change(nameInput, { target: { value: 'New Corp' } })

      const saveButton = screen.getByRole('button', { name: /save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'New Corp' })
        )
      })
    })
  })

  describe('Team Page', () => {
    it('should render team page with user list', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Team = app.getPage('team')

      const teamMembers = [
        { id: 'usr_1', email: 'admin@example.com', name: 'Admin', role: 'admin' },
        { id: 'usr_2', email: 'member@example.com', name: 'Member', role: 'member' },
      ]

      renderWithProviders(createElement(Team), {
        app: config,
        initialData: { teamMembers },
      })

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeTruthy()
        expect(screen.getByText('member@example.com')).toBeTruthy()
      })
    })

    it('should have invite user button', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Team = app.getPage('team')

      renderWithProviders(createElement(Team), { app: config })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /invite/i })).toBeTruthy()
      })
    })

    it('should open invite modal when invite button clicked', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Team = app.getPage('team')

      renderWithProviders(createElement(Team), { app: config })

      const inviteButton = await screen.findByRole('button', { name: /invite/i })
      fireEvent.click(inviteButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeTruthy()
        expect(screen.getByLabelText(/role/i)).toBeTruthy()
      })
    })

    it('should invite user with email and role', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Team = app.getPage('team')
      const onInvite = vi.fn().mockResolvedValue({})

      renderWithProviders(createElement(Team), {
        app: config,
        mutations: { team: { invite: onInvite } },
      })

      const inviteButton = await screen.findByRole('button', { name: /invite/i })
      fireEvent.click(inviteButton)

      const emailInput = await screen.findByLabelText(/email/i)
      const roleSelect = screen.getByLabelText(/role/i)

      fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
      fireEvent.change(roleSelect, { target: { value: 'member' } })

      const sendInviteButton = screen.getByRole('button', { name: /send invite/i })
      fireEvent.click(sendInviteButton)

      await waitFor(() => {
        expect(onInvite).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'new@example.com',
            role: 'member',
          })
        )
      })
    })

    it('should allow removing team members', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Team = app.getPage('team')
      const onRemove = vi.fn().mockResolvedValue({})

      const teamMembers = [
        { id: 'usr_1', email: 'admin@example.com', name: 'Admin', role: 'admin' },
        { id: 'usr_2', email: 'member@example.com', name: 'Member', role: 'member' },
      ]

      renderWithProviders(createElement(Team), {
        app: config,
        initialData: { teamMembers },
        mutations: { team: { remove: onRemove } },
      })

      // Find remove button for member
      const removeButton = await screen.findByTestId('remove-usr_2')
      fireEvent.click(removeButton)

      // Confirm removal
      const confirmButton = await screen.findByRole('button', { name: /confirm|yes/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(onRemove).toHaveBeenCalledWith('usr_2')
      })
    })

    it('should allow changing user roles', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Team = app.getPage('team')
      const onUpdateRole = vi.fn().mockResolvedValue({})

      const teamMembers = [
        { id: 'usr_2', email: 'member@example.com', name: 'Member', role: 'member' },
      ]

      renderWithProviders(createElement(Team), {
        app: config,
        initialData: { teamMembers },
        mutations: { team: { updateRole: onUpdateRole } },
      })

      const roleSelect = await screen.findByTestId('role-select-usr_2')
      fireEvent.change(roleSelect, { target: { value: 'admin' } })

      await waitFor(() => {
        expect(onUpdateRole).toHaveBeenCalledWith('usr_2', 'admin')
      })
    })
  })

  describe('Billing Page', () => {
    it('should render billing page', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Billing = app.getPage('billing')

      renderWithProviders(createElement(Billing), { app: config })

      await waitFor(() => {
        expect(screen.getByText(/billing/i)).toBeTruthy()
      })
    })

    it('should display current plan', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Billing = app.getPage('billing')

      const subscription = {
        plan: { name: 'Pro', price: 99 },
        status: 'active',
        currentPeriodEnd: '2024-02-01',
      }

      renderWithProviders(createElement(Billing), {
        app: config,
        initialData: { subscription },
      })

      await waitFor(() => {
        expect(screen.getByText('Pro')).toBeTruthy()
        expect(screen.getByText('$99')).toBeTruthy()
        expect(screen.getByText(/active/i)).toBeTruthy()
      })
    })

    it('should have Stripe portal link', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Billing = app.getPage('billing')
      const onManageBilling = vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/xxx' })

      renderWithProviders(createElement(Billing), {
        app: config,
        mutations: { billing: { createPortalSession: onManageBilling } },
      })

      const manageButton = await screen.findByRole('button', { name: /manage billing|stripe portal/i })
      fireEvent.click(manageButton)

      await waitFor(() => {
        expect(onManageBilling).toHaveBeenCalled()
      })
    })

    it('should display usage information', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Billing = app.getPage('billing')

      const usage = {
        apiCalls: 15000,
        apiLimit: 50000,
        storage: 2.5,
        storageLimit: 10,
      }

      renderWithProviders(createElement(Billing), {
        app: config,
        initialData: { usage },
      })

      await waitFor(() => {
        expect(screen.getByText(/15,000.*50,000/)).toBeTruthy()
        expect(screen.getByText(/2.5.*10/)).toBeTruthy()
      })
    })

    it('should display invoice history', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Billing = app.getPage('billing')

      const invoices = [
        { id: 'inv_1', amount: 99, status: 'paid', date: '2024-01-01' },
        { id: 'inv_2', amount: 99, status: 'paid', date: '2023-12-01' },
      ]

      renderWithProviders(createElement(Billing), {
        app: config,
        initialData: { invoices },
      })

      await waitFor(() => {
        expect(screen.getByText(/invoices/i)).toBeTruthy()
        expect(screen.getAllByText('$99').length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe('API Keys Page', () => {
    it('should render API keys page', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const APIKeys = app.getPage('api-keys')

      renderWithProviders(createElement(APIKeys), { app: config })

      await waitFor(() => {
        expect(screen.getByText(/api keys/i)).toBeTruthy()
      })
    })

    it('should display existing API keys', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const APIKeys = app.getPage('api-keys')

      const apiKeys = [
        { id: 'key_1', name: 'Production', key: 'sk_live_abc...xyz', lastUsedAt: '2024-01-15' },
        { id: 'key_2', name: 'Development', key: 'sk_test_abc...xyz', lastUsedAt: null },
      ]

      renderWithProviders(createElement(APIKeys), {
        app: config,
        initialData: { apiKeys },
      })

      await waitFor(() => {
        expect(screen.getByText('Production')).toBeTruthy()
        expect(screen.getByText('Development')).toBeTruthy()
      })
    })

    it('should create new API key', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const APIKeys = app.getPage('api-keys')
      const onCreate = vi.fn().mockResolvedValue({
        id: 'key_new',
        name: 'New Key',
        key: 'sk_live_fullkeyvalue',
        secretKey: 'sk_live_fullkeyvalue',
      })

      renderWithProviders(createElement(APIKeys), {
        app: config,
        mutations: { apiKeys: { create: onCreate } },
      })

      const createButton = await screen.findByRole('button', { name: /create.*key/i })
      fireEvent.click(createButton)

      const nameInput = await screen.findByLabelText(/name/i)
      fireEvent.change(nameInput, { target: { value: 'New Key' } })

      const submitButton = screen.getByRole('button', { name: /create|generate/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'New Key' })
        )
      })
    })

    it('should show full key only once after creation', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const APIKeys = app.getPage('api-keys')
      const fullKey = 'sk_live_this_is_the_full_secret_key_value'
      const onCreate = vi.fn().mockResolvedValue({
        id: 'key_new',
        name: 'New Key',
        secretKey: fullKey,
      })

      renderWithProviders(createElement(APIKeys), {
        app: config,
        mutations: { apiKeys: { create: onCreate } },
      })

      const createButton = await screen.findByRole('button', { name: /create.*key/i })
      fireEvent.click(createButton)

      const nameInput = await screen.findByLabelText(/name/i)
      fireEvent.change(nameInput, { target: { value: 'New Key' } })

      const submitButton = screen.getByRole('button', { name: /create|generate/i })
      fireEvent.click(submitButton)

      // Full key should be displayed
      await waitFor(() => {
        expect(screen.getByText(fullKey)).toBeTruthy()
        expect(screen.getByText(/copy|clipboard/i)).toBeTruthy()
        expect(screen.getByText(/will not be shown again/i)).toBeTruthy()
      })
    })

    it('should revoke API key', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const APIKeys = app.getPage('api-keys')
      const onRevoke = vi.fn().mockResolvedValue({})

      const apiKeys = [
        { id: 'key_1', name: 'Production', key: 'sk_live_abc...xyz' },
      ]

      renderWithProviders(createElement(APIKeys), {
        app: config,
        initialData: { apiKeys },
        mutations: { apiKeys: { revoke: onRevoke } },
      })

      const revokeButton = await screen.findByRole('button', { name: /revoke/i })
      fireEvent.click(revokeButton)

      // Confirm revocation
      const confirmButton = await screen.findByRole('button', { name: /confirm|yes/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(onRevoke).toHaveBeenCalledWith('key_1')
      })
    })

    it('should support scoped API keys', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const APIKeys = app.getPage('api-keys')
      const onCreate = vi.fn().mockResolvedValue({ id: 'key_new', secretKey: 'sk_live_xxx' })

      const availableScopes = [
        { id: 'read', name: 'Read', description: 'Read-only access' },
        { id: 'write', name: 'Write', description: 'Write access' },
        { id: 'admin', name: 'Admin', description: 'Full access' },
      ]

      renderWithProviders(createElement(APIKeys), {
        app: config,
        initialData: { availableScopes },
        mutations: { apiKeys: { create: onCreate } },
      })

      const createButton = await screen.findByRole('button', { name: /create.*key/i })
      fireEvent.click(createButton)

      // Should show scope selection
      await waitFor(() => {
        expect(screen.getByLabelText(/scopes/i)).toBeTruthy()
      })
    })
  })

  describe('Webhooks Page', () => {
    it('should render webhooks page', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Webhooks = app.getPage('webhooks')

      renderWithProviders(createElement(Webhooks), { app: config })

      await waitFor(() => {
        expect(screen.getByText(/webhooks/i)).toBeTruthy()
      })
    })

    it('should display configured webhooks', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Webhooks = app.getPage('webhooks')

      const webhooks = [
        {
          id: 'wh_1',
          url: 'https://example.com/webhook',
          events: ['Order.created', 'Order.paid'],
          status: 'active',
        },
      ]

      renderWithProviders(createElement(Webhooks), {
        app: config,
        initialData: { webhooks },
      })

      await waitFor(() => {
        expect(screen.getByText('https://example.com/webhook')).toBeTruthy()
        expect(screen.getByText(/Order.created/)).toBeTruthy()
      })
    })

    it('should create new webhook', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Webhooks = app.getPage('webhooks')
      const onCreate = vi.fn().mockResolvedValue({ id: 'wh_new' })

      renderWithProviders(createElement(Webhooks), {
        app: config,
        mutations: { webhooks: { create: onCreate } },
      })

      const createButton = await screen.findByRole('button', { name: /add.*webhook|create.*webhook/i })
      fireEvent.click(createButton)

      const urlInput = await screen.findByLabelText(/url/i)
      fireEvent.change(urlInput, { target: { value: 'https://mysite.com/hooks' } })

      // Select events
      const orderCreatedCheckbox = screen.getByLabelText(/Order.created/i)
      fireEvent.click(orderCreatedCheckbox)

      const submitButton = screen.getByRole('button', { name: /create|save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            url: 'https://mysite.com/hooks',
            events: expect.arrayContaining(['Order.created']),
          })
        )
      })
    })

    it('should display available events based on nouns and verbs', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Webhooks = app.getPage('webhooks')

      renderWithProviders(createElement(Webhooks), { app: config })

      const createButton = await screen.findByRole('button', { name: /add.*webhook|create.*webhook/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        // Built-in events
        expect(screen.getByLabelText(/Customer.created/i)).toBeTruthy()
        expect(screen.getByLabelText(/Customer.updated/i)).toBeTruthy()
        expect(screen.getByLabelText(/Customer.deleted/i)).toBeTruthy()

        // Verb events
        expect(screen.getByLabelText(/Order.paid/i)).toBeTruthy()
        expect(screen.getByLabelText(/Order.shipped/i)).toBeTruthy()
        expect(screen.getByLabelText(/Product.restocked/i)).toBeTruthy()
      })
    })

    it('should test webhook endpoint', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Webhooks = app.getPage('webhooks')
      const onTest = vi.fn().mockResolvedValue({ success: true, statusCode: 200 })

      const webhooks = [
        { id: 'wh_1', url: 'https://example.com/webhook', events: ['Order.created'], status: 'active' },
      ]

      renderWithProviders(createElement(Webhooks), {
        app: config,
        initialData: { webhooks },
        mutations: { webhooks: { test: onTest } },
      })

      const testButton = await screen.findByRole('button', { name: /test/i })
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(onTest).toHaveBeenCalledWith('wh_1')
        expect(screen.getByText(/success|200/i)).toBeTruthy()
      })
    })

    it('should show webhook delivery history', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Webhooks = app.getPage('webhooks')

      const webhooks = [
        {
          id: 'wh_1',
          url: 'https://example.com/webhook',
          events: ['Order.created'],
          status: 'active',
          deliveries: [
            { id: 'del_1', event: 'Order.created', statusCode: 200, timestamp: '2024-01-15T10:00:00Z' },
            { id: 'del_2', event: 'Order.created', statusCode: 500, timestamp: '2024-01-15T09:00:00Z' },
          ],
        },
      ]

      renderWithProviders(createElement(Webhooks), {
        app: config,
        initialData: { webhooks },
      })

      // Expand to view delivery history
      const expandButton = await screen.findByTestId('expand-wh_1')
      fireEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('200')).toBeTruthy()
        expect(screen.getByText('500')).toBeTruthy()
      })
    })

    it('should delete webhook', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Webhooks = app.getPage('webhooks')
      const onDelete = vi.fn().mockResolvedValue({})

      const webhooks = [
        { id: 'wh_1', url: 'https://example.com/webhook', events: ['Order.created'], status: 'active' },
      ]

      renderWithProviders(createElement(Webhooks), {
        app: config,
        initialData: { webhooks },
        mutations: { webhooks: { remove: onDelete } },
      })

      const deleteButton = await screen.findByRole('button', { name: /delete/i })
      fireEvent.click(deleteButton)

      const confirmButton = await screen.findByRole('button', { name: /confirm|yes/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith('wh_1')
      })
    })
  })

  describe('RBAC Enforcement', () => {
    it('should hide pages user does not have permission to access', async () => {
      const config = createTestConfig()
      const app = generateApp(config)

      // User without admin permissions
      const user = {
        id: 'usr_1',
        email: 'member@example.com',
        role: 'member',
        permissions: ['customers.read', 'orders.read'],
      }

      const AppShell = app.getShell()

      renderWithProviders(createElement(AppShell), {
        app: config,
        user,
      })

      await waitFor(() => {
        // Should not see admin-only pages
        expect(screen.queryByText(/team/i)).toBeNull()
        expect(screen.queryByText(/billing/i)).toBeNull()
        expect(screen.queryByText(/settings/i)).toBeNull()
      })
    })

    it('should show 403 page when accessing unauthorized route', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Team = app.getPage('team')

      const user = {
        id: 'usr_1',
        role: 'member',
        permissions: ['customers.read'],
      }

      renderWithProviders(createElement(Team), {
        app: config,
        user,
      })

      await waitFor(() => {
        expect(screen.getByText(/403|forbidden|access denied/i)).toBeTruthy()
      })
    })

    it('should hide verb buttons user cannot execute', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowOrder = app.getPage('orders/:id')

      const user = {
        id: 'usr_1',
        role: 'member',
        permissions: ['orders.read'], // Can read but not execute verbs
      }

      const order = { id: 'ord_1', total: 100, status: 'pending' }

      renderWithProviders(createElement(ShowOrder), {
        app: config,
        user,
        params: { id: 'ord_1' },
        initialData: { Order: { record: order } },
      })

      await waitFor(() => {
        // Verb buttons should be hidden or disabled
        expect(screen.queryByRole('button', { name: /pay/i })).toBeNull()
        expect(screen.queryByRole('button', { name: /ship/i })).toBeNull()
      })
    })

    it('should disable create button without create permission', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const CustomerList = app.getPage('customers')

      const user = {
        id: 'usr_1',
        role: 'member',
        permissions: ['customers.read'], // No create permission
      }

      renderWithProviders(createElement(CustomerList), {
        app: config,
        user,
      })

      await waitFor(() => {
        const createButton = screen.queryByRole('button', { name: /create|new|add/i })
        // Either hidden or disabled
        if (createButton) {
          expect(createButton).toHaveAttribute('disabled')
        }
      })
    })

    it('should hide delete action without delete permission', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const EditProduct = app.getPage('products/:id/edit')

      const user = {
        id: 'usr_1',
        role: 'member',
        permissions: ['products.read', 'products.update'], // No delete
      }

      const product = { id: 'prod_1', name: 'Widget', price: 29.99, inventory: 50 }

      renderWithProviders(createElement(EditProduct), {
        app: config,
        user,
        params: { id: 'prod_1' },
        initialData: { Product: { record: product } },
      })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
      })
    })

    it('should support custom permission checks', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const ShowOrder = app.getPage('orders/:id')

      // User has permission to refund only if order total < 100
      const checkPermission = vi.fn((permission, context) => {
        if (permission === 'orders.refund') {
          return context.record.total < 100
        }
        return true
      })

      const order = { id: 'ord_1', total: 500, status: 'paid' }

      renderWithProviders(createElement(ShowOrder), {
        app: config,
        params: { id: 'ord_1' },
        initialData: { Order: { record: order } },
        checkPermission,
      })

      await waitFor(() => {
        // Refund button should be disabled because total > 100
        const refundButton = screen.getByRole('button', { name: /refund/i })
        expect(refundButton).toHaveAttribute('disabled')
      })
    })

    it('should support organization-level permissions', async () => {
      const config = createTestConfig()
      const app = generateApp(config)
      const Settings = app.getPage('settings')

      const user = {
        id: 'usr_1',
        role: 'member',
        organizationRole: 'owner', // Owner of the organization
        permissions: ['settings.read', 'settings.update'],
      }

      renderWithProviders(createElement(Settings), {
        app: config,
        user,
      })

      await waitFor(() => {
        // Owner should see settings
        expect(screen.getByText(/settings/i)).toBeTruthy()
        // Owner should be able to edit
        const saveButton = screen.getByRole('button', { name: /save/i })
        expect(saveButton).not.toHaveAttribute('disabled')
      })
    })
  })
})
