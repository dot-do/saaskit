import type { Meta, StoryObj } from '@storybook/react'
import { AuditLogPage } from './audit-log'
import type { AuditLogEntry } from './audit-log'

/**
 * Mock audit log entries for stories
 */
const mockEntries: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15T14:30:00Z',
    actor: {
      id: 'user-1',
      type: 'user',
      name: 'John Doe',
      email: 'john@example.com',
    },
    action: 'user.login',
    resource: {
      type: 'session',
      id: 'session-123',
      name: 'Web Session',
    },
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: {
      country: 'United States',
      city: 'San Francisco',
    },
  },
  {
    id: '2',
    timestamp: '2024-01-15T14:25:00Z',
    actor: {
      id: 'api-key-1',
      type: 'api_key',
      name: 'Production Key',
    },
    action: 'user.create',
    resource: {
      type: 'user',
      id: 'user-456',
      name: 'Jane Smith',
    },
    ip: '10.0.0.1',
    metadata: {
      role: 'member',
      invitedBy: 'john@example.com',
    },
  },
  {
    id: '3',
    timestamp: '2024-01-15T14:20:00Z',
    actor: {
      id: 'system',
      type: 'system',
    },
    action: 'subscription.renewed',
    resource: {
      type: 'subscription',
      id: 'sub-789',
      name: 'Pro Plan',
    },
    metadata: {
      amount: 9900,
      currency: 'USD',
    },
  },
  {
    id: '4',
    timestamp: '2024-01-15T14:15:00Z',
    actor: {
      id: 'user-2',
      type: 'user',
      name: 'Admin User',
      email: 'admin@example.com',
    },
    action: 'api_key.revoke',
    resource: {
      type: 'api_key',
      id: 'key-old',
      name: 'Old Production Key',
    },
    ip: '192.168.1.50',
    location: {
      country: 'United States',
      city: 'New York',
    },
  },
  {
    id: '5',
    timestamp: '2024-01-15T14:10:00Z',
    actor: {
      id: 'user-1',
      type: 'user',
      name: 'John Doe',
      email: 'john@example.com',
    },
    action: 'settings.update',
    resource: {
      type: 'settings',
      id: 'org-settings',
      name: 'Organization Settings',
    },
    ip: '192.168.1.100',
    metadata: {
      changed: ['timezone', 'language'],
    },
  },
]

const mockActions = [
  'user.login',
  'user.logout',
  'user.create',
  'user.update',
  'user.delete',
  'api_key.create',
  'api_key.revoke',
  'settings.update',
  'subscription.renewed',
  'subscription.canceled',
]

const mockResourceTypes = [
  'user',
  'api_key',
  'webhook',
  'subscription',
  'settings',
  'session',
]

const meta: Meta<typeof AuditLogPage> = {
  title: 'SaaSKit/Pages/AuditLog',
  component: AuditLogPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof AuditLogPage>

/**
 * Default state with populated audit log entries
 */
export const Default: Story = {
  args: {
    entries: mockEntries,
    totalCount: 150,
    page: 1,
    pageSize: 50,
    availableActions: mockActions,
    availableResourceTypes: mockResourceTypes,
    onFilterChange: (filters) => {
      console.log('Filter changed:', filters)
    },
    onPageChange: (page) => {
      console.log('Page changed:', page)
    },
    onViewDetails: (id) => {
      console.log('View details:', id)
    },
    onExport: async (filters, format) => {
      console.log('Export:', filters, format)
    },
  },
}

/**
 * Empty state when no audit log entries exist
 */
export const Empty: Story = {
  args: {
    entries: [],
    totalCount: 0,
    page: 1,
    pageSize: 50,
    availableActions: mockActions,
    availableResourceTypes: mockResourceTypes,
  },
}

/**
 * With active filters applied
 */
export const WithFilters: Story = {
  args: {
    entries: mockEntries.filter((e) => e.actor.type === 'user'),
    totalCount: 25,
    page: 1,
    pageSize: 50,
    filters: {
      actorType: 'user',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    },
    availableActions: mockActions,
    availableResourceTypes: mockResourceTypes,
  },
}

/**
 * Multiple pages of results
 */
export const Paginated: Story = {
  args: {
    entries: mockEntries,
    totalCount: 500,
    page: 3,
    pageSize: 50,
    availableActions: mockActions,
    availableResourceTypes: mockResourceTypes,
  },
}

/**
 * Single entry
 */
export const SingleEntry: Story = {
  args: {
    entries: [mockEntries[0]],
    totalCount: 1,
    page: 1,
    pageSize: 50,
    availableActions: mockActions,
    availableResourceTypes: mockResourceTypes,
  },
}

/**
 * System events only
 */
export const SystemEventsOnly: Story = {
  args: {
    entries: mockEntries.filter((e) => e.actor.type === 'system'),
    totalCount: 10,
    page: 1,
    pageSize: 50,
    filters: {
      actorType: 'system',
    },
    availableActions: mockActions,
    availableResourceTypes: mockResourceTypes,
  },
}

/**
 * Custom empty state component
 */
export const CustomEmptyState: Story = {
  args: {
    entries: [],
    totalCount: 0,
    availableActions: mockActions,
    availableResourceTypes: mockResourceTypes,
    emptyState: (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>No Activity Recorded</h3>
        <p>Audit logs will appear here once there is activity in your account.</p>
      </div>
    ),
  },
}
