import type { Meta, StoryObj } from '@storybook/react'
import { SaaS } from './SaaS'

const meta: Meta<typeof SaaS> = {
  title: 'SaaSKit/SaaS',
  component: SaaS,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof SaaS>

/**
 * Basic SaaS configuration with nouns and verbs
 */
export const Default: Story = {
  render: () => (
    <SaaS name="TodoApp">
      {($) => {
        $.nouns({
          Todo: {
            title: 'string',
            description: 'text?',
            done: 'boolean',
            dueDate: 'date?',
            priority: 'enum:low,medium,high',
          },
          User: {
            name: 'string',
            email: 'email',
            avatar: 'url?',
          },
        })

        $.verbs({
          Todo: {
            complete: () => ({ done: true }),
            uncomplete: () => ({ done: false }),
          },
        })
      }}
    </SaaS>
  ),
}

/**
 * SaaS with relationships between nouns
 */
export const WithRelationships: Story = {
  render: () => (
    <SaaS name="ProjectManager">
      {($) => {
        $.nouns({
          Project: {
            name: 'string',
            description: 'text?',
            status: 'enum:planning,active,completed,archived',
          },
          Task: {
            title: 'string',
            description: 'text?',
            status: 'enum:todo,in_progress,done',
            project: '-> Project',
            assignee: '-> User?',
          },
          User: {
            name: 'string',
            email: 'email',
            role: 'enum:admin,member,viewer',
          },
        })

        $.verbs({
          Task: {
            start: () => ({ status: 'in_progress' }),
            complete: () => ({ status: 'done' }),
            assign: (ctx) => ({ assignee: ctx }),
          },
          Project: {
            archive: () => ({ status: 'archived' }),
            activate: () => ({ status: 'active' }),
          },
        })
      }}
    </SaaS>
  ),
}

/**
 * E-commerce SaaS configuration
 */
export const Ecommerce: Story = {
  render: () => (
    <SaaS name="StorefrontApp">
      {($) => {
        $.nouns({
          Product: {
            name: 'string',
            description: 'text',
            price: 'number',
            sku: 'string',
            inStock: 'boolean',
            category: '-> Category',
          },
          Category: {
            name: 'string',
            slug: 'string',
            parent: '-> Category?',
          },
          Order: {
            customer: '-> Customer',
            status: 'enum:pending,processing,shipped,delivered,canceled',
            total: 'number',
            shippingAddress: 'text',
          },
          Customer: {
            name: 'string',
            email: 'email',
            phone: 'string?',
          },
        })

        $.verbs({
          Order: {
            process: () => ({ status: 'processing' }),
            ship: () => ({ status: 'shipped' }),
            deliver: () => ({ status: 'delivered' }),
            cancel: () => ({ status: 'canceled' }),
          },
          Product: {
            restock: () => ({ inStock: true }),
            markOutOfStock: () => ({ inStock: false }),
          },
        })
      }}
    </SaaS>
  ),
}

/**
 * CRM SaaS configuration
 */
export const CRM: Story = {
  render: () => (
    <SaaS name="CRMApp">
      {($) => {
        $.nouns({
          Contact: {
            firstName: 'string',
            lastName: 'string',
            email: 'email',
            phone: 'string?',
            company: '-> Company?',
            status: 'enum:lead,prospect,customer,churned',
          },
          Company: {
            name: 'string',
            domain: 'url?',
            industry: 'string?',
            size: 'enum:startup,small,medium,enterprise',
          },
          Deal: {
            title: 'string',
            value: 'number',
            stage: 'enum:qualification,proposal,negotiation,closed_won,closed_lost',
            contact: '-> Contact',
            company: '-> Company?',
            closeDate: 'date?',
          },
          Activity: {
            type: 'enum:call,email,meeting,note',
            description: 'text',
            contact: '-> Contact',
            deal: '-> Deal?',
            completedAt: 'datetime?',
          },
        })

        $.verbs({
          Deal: {
            qualify: () => ({ stage: 'qualification' }),
            propose: () => ({ stage: 'proposal' }),
            negotiate: () => ({ stage: 'negotiation' }),
            win: () => ({ stage: 'closed_won' }),
            lose: () => ({ stage: 'closed_lost' }),
          },
          Contact: {
            convert: () => ({ status: 'customer' }),
            markAsChurned: () => ({ status: 'churned' }),
          },
        })
      }}
    </SaaS>
  ),
}

/**
 * SaaS with event handlers
 */
export const WithEvents: Story = {
  render: () => (
    <SaaS name="EventDrivenApp">
      {($) => {
        $.nouns({
          User: {
            name: 'string',
            email: 'email',
            verified: 'boolean',
          },
          Notification: {
            message: 'string',
            read: 'boolean',
            user: '-> User',
          },
        })

        $.verbs({
          User: {
            verify: () => ({ verified: true }),
          },
          Notification: {
            markRead: () => ({ read: true }),
          },
        })

        // Register event handlers
        $.on.User.created((user, _ctx) => {
          console.log('User created:', user)
        })

        $.on.User.verify((user, _ctx) => {
          console.log('User verified:', user)
        })
      }}
    </SaaS>
  ),
}

/**
 * SaaS with scheduled tasks
 */
export const WithSchedules: Story = {
  render: () => (
    <SaaS name="ScheduledApp">
      {($) => {
        $.nouns({
          Report: {
            name: 'string',
            generatedAt: 'datetime',
            data: 'json',
          },
          Subscription: {
            user: '-> User',
            plan: 'enum:free,pro,enterprise',
            expiresAt: 'datetime',
          },
          User: {
            name: 'string',
            email: 'email',
          },
        })

        // Schedule daily report generation
        $.every.day.at('09:00')((_ctx) => {
          console.log('Generating daily report...')
        })

        // Schedule weekly digest email
        $.every.Monday.at('10:00')((_ctx) => {
          console.log('Sending weekly digest...')
        })
      }}
    </SaaS>
  ),
}

/**
 * Minimal SaaS configuration
 */
export const Minimal: Story = {
  render: () => (
    <SaaS name="SimpleApp">
      {($) => {
        $.nouns({
          Note: {
            title: 'string',
            content: 'text',
          },
        })
      }}
    </SaaS>
  ),
}
