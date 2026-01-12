import type { Meta, StoryObj } from '@storybook/react'
import { TeamsPage } from './teams'
import type { Team } from './teams'

/**
 * Mock teams data for stories
 */
const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Engineering',
    description: 'Product development and infrastructure',
    memberCount: 15,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'team-2',
    name: 'Design',
    description: 'UI/UX design and brand',
    memberCount: 5,
    createdAt: '2023-07-15T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
  },
  {
    id: 'team-3',
    name: 'Marketing',
    description: 'Growth, content, and communications',
    memberCount: 8,
    createdAt: '2023-08-01T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
  },
  {
    id: 'team-4',
    name: 'Sales',
    description: 'Business development and customer success',
    memberCount: 12,
    createdAt: '2023-09-01T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
  {
    id: 'team-5',
    name: 'Operations',
    memberCount: 3,
    createdAt: '2023-10-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
]

const meta: Meta<typeof TeamsPage> = {
  title: 'SaaSKit/Pages/Teams',
  component: TeamsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof TeamsPage>

/**
 * Default state with multiple teams
 */
export const Default: Story = {
  args: {
    teams: mockTeams,
    allowCreate: true,
    allowDelete: true,
    onCreate: async (data) => {
      console.log('Create team:', data)
      return {
        id: 'new-team',
        name: data.name || 'New Team',
        memberCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    onUpdate: async (id, data) => {
      console.log('Update team:', id, data)
      return mockTeams.find((t) => t.id === id)!
    },
    onDelete: async (id) => {
      console.log('Delete team:', id)
    },
    onView: (id) => {
      console.log('View team:', id)
    },
  },
}

/**
 * Empty state when no teams exist
 */
export const Empty: Story = {
  args: {
    teams: [],
    allowCreate: true,
    allowDelete: true,
  },
}

/**
 * Single team
 */
export const SingleTeam: Story = {
  args: {
    teams: [mockTeams[0]],
    allowCreate: true,
    allowDelete: true,
  },
}

/**
 * Read-only mode (no create/delete)
 */
export const ReadOnly: Story = {
  args: {
    teams: mockTeams,
    allowCreate: false,
    allowDelete: false,
  },
}

/**
 * Teams without descriptions
 */
export const NoDescriptions: Story = {
  args: {
    teams: mockTeams.map((team) => ({ ...team, description: undefined })),
    allowCreate: true,
    allowDelete: true,
  },
}

/**
 * Many teams (grid layout)
 */
export const ManyTeams: Story = {
  args: {
    teams: [
      ...mockTeams,
      {
        id: 'team-6',
        name: 'Finance',
        description: 'Budget and accounting',
        memberCount: 4,
        createdAt: '2023-11-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'team-7',
        name: 'HR',
        description: 'People operations',
        memberCount: 2,
        createdAt: '2023-12-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'team-8',
        name: 'Legal',
        description: 'Contracts and compliance',
        memberCount: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
    allowCreate: true,
    allowDelete: true,
  },
}

/**
 * Custom empty state component
 */
export const CustomEmptyState: Story = {
  args: {
    teams: [],
    allowCreate: true,
    emptyState: (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>No Teams Yet</h3>
        <p>Teams help you organize members and manage permissions effectively.</p>
      </div>
    ),
  },
}
