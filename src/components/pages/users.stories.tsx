import type { Meta, StoryObj } from '@storybook/react'
import { UsersPage } from './users'
import type { User } from './users'

/**
 * Mock users data for stories
 */
const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'john@example.com',
    name: 'John Doe',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    role: 'admin',
    status: 'active',
    lastLoginAt: '2024-01-15T10:30:00Z',
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'user-2',
    email: 'jane@example.com',
    name: 'Jane Smith',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
    role: 'member',
    status: 'active',
    lastLoginAt: '2024-01-14T15:45:00Z',
    createdAt: '2023-08-15T00:00:00Z',
    updatedAt: '2024-01-14T15:45:00Z',
  },
  {
    id: 'user-3',
    email: 'bob@example.com',
    name: 'Bob Wilson',
    role: 'member',
    status: 'invited',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'user-4',
    email: 'alice@example.com',
    name: 'Alice Johnson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    role: 'viewer',
    status: 'active',
    lastLoginAt: '2024-01-12T09:00:00Z',
    createdAt: '2023-11-01T00:00:00Z',
    updatedAt: '2024-01-12T09:00:00Z',
  },
  {
    id: 'user-5',
    email: 'charlie@example.com',
    name: 'Charlie Brown',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
    role: 'member',
    status: 'suspended',
    lastLoginAt: '2023-12-01T00:00:00Z',
    createdAt: '2023-07-01T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
  },
]

const mockRoles = ['admin', 'member', 'viewer', 'billing']

const meta: Meta<typeof UsersPage> = {
  title: 'SaaSKit/Pages/Users',
  component: UsersPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof UsersPage>

/**
 * Default state with multiple users
 */
export const Default: Story = {
  args: {
    users: mockUsers,
    currentUserId: 'user-1',
    availableRoles: mockRoles,
    allowInvite: true,
    allowDelete: true,
    allowImpersonate: false,
    onInvite: async (email, role) => {
      console.log('Invite user:', email, role)
      return {
        id: 'new-user',
        email,
        role,
        status: 'invited',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    onUpdate: async (id, data) => {
      console.log('Update user:', id, data)
      return mockUsers.find((u) => u.id === id)!
    },
    onDelete: async (id) => {
      console.log('Delete user:', id)
    },
  },
}

/**
 * Empty state when no users exist
 */
export const Empty: Story = {
  args: {
    users: [],
    availableRoles: mockRoles,
    allowInvite: true,
    allowDelete: true,
  },
}

/**
 * With impersonation enabled (admin feature)
 */
export const WithImpersonation: Story = {
  args: {
    users: mockUsers,
    currentUserId: 'user-1',
    availableRoles: mockRoles,
    allowInvite: true,
    allowDelete: true,
    allowImpersonate: true,
    onImpersonate: async (id) => {
      console.log('Impersonate user:', id)
    },
  },
}

/**
 * Read-only mode (no invite/delete)
 */
export const ReadOnly: Story = {
  args: {
    users: mockUsers,
    currentUserId: 'user-1',
    availableRoles: mockRoles,
    allowInvite: false,
    allowDelete: false,
  },
}

/**
 * Users without avatars
 */
export const NoAvatars: Story = {
  args: {
    users: mockUsers.map((user) => ({ ...user, avatar: undefined })),
    currentUserId: 'user-1',
    availableRoles: mockRoles,
    allowInvite: true,
    allowDelete: true,
  },
}

/**
 * All users active
 */
export const AllActive: Story = {
  args: {
    users: mockUsers.map((user) => ({ ...user, status: 'active' as const })),
    currentUserId: 'user-1',
    availableRoles: mockRoles,
    allowInvite: true,
    allowDelete: true,
  },
}

/**
 * Single user (current user only)
 */
export const SingleUser: Story = {
  args: {
    users: [mockUsers[0]],
    currentUserId: 'user-1',
    availableRoles: mockRoles,
    allowInvite: true,
    allowDelete: true,
  },
}

/**
 * Custom empty state component
 */
export const CustomEmptyState: Story = {
  args: {
    users: [],
    availableRoles: mockRoles,
    allowInvite: true,
    emptyState: (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>Invite Your Team</h3>
        <p>Add team members to collaborate on your projects.</p>
      </div>
    ),
  },
}

/**
 * Many users (testing table layout)
 */
export const ManyUsers: Story = {
  args: {
    users: [
      ...mockUsers,
      {
        id: 'user-6',
        email: 'david@example.com',
        name: 'David Lee',
        role: 'member',
        status: 'active',
        lastLoginAt: '2024-01-14T00:00:00Z',
        createdAt: '2023-09-01T00:00:00Z',
        updatedAt: '2024-01-14T00:00:00Z',
      },
      {
        id: 'user-7',
        email: 'emma@example.com',
        name: 'Emma Davis',
        role: 'viewer',
        status: 'active',
        lastLoginAt: '2024-01-13T00:00:00Z',
        createdAt: '2023-10-01T00:00:00Z',
        updatedAt: '2024-01-13T00:00:00Z',
      },
      {
        id: 'user-8',
        email: 'frank@example.com',
        name: 'Frank Miller',
        role: 'billing',
        status: 'active',
        lastLoginAt: '2024-01-11T00:00:00Z',
        createdAt: '2023-11-01T00:00:00Z',
        updatedAt: '2024-01-11T00:00:00Z',
      },
    ],
    currentUserId: 'user-1',
    availableRoles: mockRoles,
    allowInvite: true,
    allowDelete: true,
  },
}
