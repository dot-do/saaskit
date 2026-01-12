import type { Meta, StoryObj } from '@storybook/react'
import { APIKeysPage } from './api-keys'
import type { APIKey } from './api-keys'

/**
 * Mock API keys data for stories
 */
const mockAPIKeys: APIKey[] = [
  {
    id: '1',
    name: 'Production API Key',
    key: 'sk_live_abc123',
    prefix: 'sk_live_',
    lastUsedAt: '2024-01-15T10:30:00Z',
    expiresAt: '2025-01-15T00:00:00Z',
    scopes: ['read', 'write'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'Test API Key',
    key: 'sk_test_xyz789',
    prefix: 'sk_test_',
    lastUsedAt: '2024-01-14T08:00:00Z',
    scopes: ['read'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-14T08:00:00Z',
  },
  {
    id: '3',
    name: 'CI/CD Integration',
    key: 'sk_live_def456',
    prefix: 'sk_live_',
    scopes: ['read', 'write', 'admin'],
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
  },
]

const mockScopes = [
  { id: 'read', name: 'Read', description: 'Read-only access to resources' },
  { id: 'write', name: 'Write', description: 'Create and update resources' },
  { id: 'delete', name: 'Delete', description: 'Delete resources' },
  { id: 'admin', name: 'Admin', description: 'Full administrative access' },
]

const meta: Meta<typeof APIKeysPage> = {
  title: 'SaaSKit/Pages/APIKeys',
  component: APIKeysPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof APIKeysPage>

/**
 * Default state with populated API keys
 */
export const Default: Story = {
  args: {
    apiKeys: mockAPIKeys,
    availableScopes: mockScopes,
    allowCreate: true,
    onCreate: async (data) => {
      console.log('Create API key:', data)
      return {
        ...mockAPIKeys[0],
        id: 'new',
        name: data.name,
        secretKey: 'sk_live_newkey123456789',
      }
    },
    onRevoke: async (id) => {
      console.log('Revoke API key:', id)
    },
    onRegenerate: async (id) => {
      console.log('Regenerate API key:', id)
      return {
        ...mockAPIKeys[0],
        id,
        secretKey: 'sk_live_regenerated123456',
      }
    },
  },
}

/**
 * Empty state when no API keys exist
 */
export const Empty: Story = {
  args: {
    apiKeys: [],
    availableScopes: mockScopes,
    allowCreate: true,
  },
}

/**
 * Empty state with creation disabled
 */
export const EmptyReadOnly: Story = {
  args: {
    apiKeys: [],
    availableScopes: mockScopes,
    allowCreate: false,
  },
}

/**
 * Keys without scopes (full access)
 */
export const NoScopes: Story = {
  args: {
    apiKeys: mockAPIKeys.map((key) => ({ ...key, scopes: [] })),
    availableScopes: [],
    allowCreate: true,
  },
}

/**
 * Single API key
 */
export const SingleKey: Story = {
  args: {
    apiKeys: [mockAPIKeys[0]],
    availableScopes: mockScopes,
    allowCreate: true,
  },
}

/**
 * Custom empty state component
 */
export const CustomEmptyState: Story = {
  args: {
    apiKeys: [],
    availableScopes: mockScopes,
    allowCreate: true,
    emptyState: (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>No API Keys Yet</h3>
        <p>Create your first API key to start integrating with our API.</p>
      </div>
    ),
  },
}
