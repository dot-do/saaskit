/**
 * E-commerce template - Multi-entity business application
 */

import {
  minimalPackageJson,
  minimalTsConfig,
  minimalEnvExample,
  minimalReadme,
  minimalGitignore,
} from './minimal'

export { minimalPackageJson as ecommercePackageJson }
export { minimalTsConfig as ecommerceTsConfig }
export { minimalEnvExample as ecommerceEnvExample }
export { minimalReadme as ecommerceReadme }
export { minimalGitignore as ecommerceGitignore }

export const ecommerceAppTsx = `/**
 * E-commerce Application
 *
 * A complete e-commerce platform demonstrating:
 * - Multiple related entities (Customer, Order, Product)
 * - Relationships between nouns (->)
 * - Event-driven workflows
 * - Complex business logic in verbs
 */

import { SaaS } from 'saaskit'

export default function App() {
  return (
    <SaaS name="E-commerce Platform">
      {$ => {
        // Define all data models
        $.nouns({
          // Customer entity
          Customer: {
            name: 'string',
            email: 'string',
            phone: 'string?',
            address: 'string?',
            createdAt: 'date',
          },

          // Product catalog
          Product: {
            name: 'string',
            description: 'string',
            price: 'number',
            sku: 'string',
            inventory: 'number',
            category: 'string?',
            active: 'boolean',
          },

          // Order - relates to Customer and Products
          Order: {
            // Relationship: Order belongs to Customer
            customer: '-> Customer',
            status: 'string',
            total: 'number',
            shippingAddress: 'string',
            createdAt: 'date',
            updatedAt: 'date',
          },

          // Order line items
          OrderItem: {
            // Relationships
            order: '-> Order',
            product: '-> Product',
            quantity: 'number',
            unitPrice: 'number',
            total: 'number',
          },

          // Payment records
          Payment: {
            order: '-> Order',
            amount: 'number',
            method: 'string',
            status: 'string',
            processedAt: 'date?',
          },
        })

        // Define business logic
        $.verbs({
          Customer: {
            create: async (data) => ({
              ...data,
              createdAt: new Date(),
            }),
            update: async (id, data) => ({ id, ...data }),
          },

          Product: {
            create: async (data) => ({
              ...data,
              active: true,
              inventory: data.inventory || 0,
            }),
            update: async (id, data) => ({ id, ...data }),
            adjustInventory: async (id, delta) => {
              console.log(\`Adjusting inventory for product \${id} by \${delta}\`)
              return { id, inventoryDelta: delta }
            },
          },

          Order: {
            // Create a new order
            create: async (data) => ({
              ...data,
              status: 'pending',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),

            // Update order details
            update: async (id, data) => ({
              id,
              ...data,
              updatedAt: new Date(),
            }),

            // Process the order
            process: async (id) => {
              console.log(\`Processing order \${id}\`)
              return {
                id,
                status: 'processing',
                updatedAt: new Date(),
              }
            },

            // Ship the order
            ship: async (id, trackingNumber) => {
              console.log(\`Shipping order \${id} with tracking \${trackingNumber}\`)
              return {
                id,
                status: 'shipped',
                trackingNumber,
                updatedAt: new Date(),
              }
            },

            // Complete/deliver the order
            complete: async (id) => ({
              id,
              status: 'completed',
              updatedAt: new Date(),
            }),

            // Cancel the order
            cancel: async (id, reason) => ({
              id,
              status: 'cancelled',
              cancelReason: reason,
              updatedAt: new Date(),
            }),
          },

          Payment: {
            create: async (data) => ({
              ...data,
              status: 'pending',
            }),
            process: async (id) => ({
              id,
              status: 'processed',
              processedAt: new Date(),
            }),
            refund: async (id, amount) => ({
              id,
              status: 'refunded',
              refundAmount: amount,
            }),
          },
        })

        // Event handlers for business workflows
        $.on('Order:created', async (order) => {
          console.log(\`New order created: \${order.id}\`)
          // Could send confirmation email, etc.
        })

        $.on('Order:shipped', async (order) => {
          console.log(\`Order shipped: \${order.id}\`)
          // Could notify customer, etc.
        })

        $.on('Payment:processed', async (payment) => {
          console.log(\`Payment processed for order: \${payment.order}\`)
          // Could trigger order processing
        })
      }}
    </SaaS>
  )
}
`
