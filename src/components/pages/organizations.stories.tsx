import type { Meta, StoryObj } from '@storybook/react'
import { OrganizationsPage } from './organizations'
import type { Organization } from './organizations'

/**
 * Mock organizations data for stories
 */
const mockOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=acme',
    plan: 'Enterprise',
    status: 'active',
    memberCount: 45,
    createdAt: '2023-06-15T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'org-2',
    name: 'Startup Labs',
    slug: 'startup-labs',
    logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=startup',
    plan: 'Pro',
    status: 'active',
    memberCount: 12,
    createdAt: '2023-09-01T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
  },
  {
    id: 'org-3',
    name: 'Test Organization',
    slug: 'test-org',
    plan: 'Free',
    status: 'pending',
    memberCount: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'org-4',
    name: 'Suspended Corp',
    slug: 'suspended-corp',
    plan: 'Pro',
    status: 'suspended',
    memberCount: 8,
    createdAt: '2023-03-01T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
  },
]

const meta: Meta<typeof OrganizationsPage> = {
  title: 'SaaSKit/Pages/Organizations',
  component: OrganizationsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof OrganizationsPage>

/**
 * Default state with multiple organizations
 */
export const Default: Story = {
  args: {
    organizations: mockOrganizations,
    activeOrgId: 'org-1',
    allowCreate: true,
    allowDelete: true,
    onCreate: async (data) => {
      console.log('Create organization:', data)
      return {
        id: 'new-org',
        name: data.name || 'New Organization',
        slug: data.slug || 'new-org',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    onUpdate: async (id, data) => {
      console.log('Update organization:', id, data)
      return mockOrganizations.find((o) => o.id === id)!
    },
    onDelete: async (id) => {
      console.log('Delete organization:', id)
    },
    onSwitch: async (id) => {
      console.log('Switch to organization:', id)
    },
  },
}

/**
 * Empty state when user has no organizations
 */
export const Empty: Story = {
  args: {
    organizations: [],
    allowCreate: true,
    allowDelete: true,
  },
}

/**
 * Single organization (personal workspace)
 */
export const SingleOrganization: Story = {
  args: {
    organizations: [mockOrganizations[0]],
    activeOrgId: 'org-1',
    allowCreate: true,
    allowDelete: true,
  },
}

/**
 * Read-only mode (no create/delete)
 */
export const ReadOnly: Story = {
  args: {
    organizations: mockOrganizations,
    activeOrgId: 'org-1',
    allowCreate: false,
    allowDelete: false,
  },
}

/**
 * Organizations without logos
 */
export const NoLogos: Story = {
  args: {
    organizations: mockOrganizations.map((org) => ({ ...org, logo: undefined })),
    activeOrgId: 'org-1',
    allowCreate: true,
    allowDelete: true,
  },
}

/**
 * All organizations pending
 */
export const AllPending: Story = {
  args: {
    organizations: mockOrganizations.map((org) => ({
      ...org,
      status: 'pending' as const,
    })),
    activeOrgId: undefined,
    allowCreate: true,
    allowDelete: true,
  },
}

/**
 * Custom empty state component
 */
export const CustomEmptyState: Story = {
  args: {
    organizations: [],
    allowCreate: true,
    emptyState: (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>Welcome to Your Workspace</h3>
        <p>Create your first organization to get started with your team.</p>
      </div>
    ),
  },
}
