import type { Meta, StoryObj } from '@storybook/react'
import { SettingsPage } from './settings'
import type { AppSettings } from './settings'

/**
 * Mock settings data
 */
const mockSettings: Partial<AppSettings> = {
  general: {
    appName: 'My SaaS App',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    language: 'en',
  },
  security: {
    mfaRequired: false,
    sessionTimeout: 60,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
    },
    ipAllowlist: [],
  },
  notifications: {
    emailEnabled: true,
    slackEnabled: false,
    webhooksEnabled: true,
    digestFrequency: 'daily',
  },
  integrations: {
    slack: { enabled: false },
    github: { enabled: true, config: { org: 'my-org' } },
  },
  billing: {
    currency: 'USD',
    taxRate: 8.25,
    invoicePrefix: 'INV-',
  },
  branding: {
    primaryColor: '#000000',
    accentColor: '#0066cc',
  },
}

const mockIntegrations = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications to Slack channels',
    configFields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text' as const, required: true },
      { key: 'channel', label: 'Default Channel', type: 'text' as const },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect your GitHub repositories',
    configFields: [
      { key: 'org', label: 'Organization', type: 'text' as const, required: true },
      { key: 'privateRepos', label: 'Allow Private Repos', type: 'boolean' as const },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing integration',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password' as const, required: true },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' as const },
    ],
  },
]

const mockLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
]

const mockTimezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

const meta: Meta<typeof SettingsPage> = {
  title: 'SaaSKit/Pages/Settings',
  component: SettingsPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof SettingsPage>

/**
 * Default state with all sections
 */
export const Default: Story = {
  args: {
    settings: mockSettings,
    availableIntegrations: mockIntegrations,
    availableLanguages: mockLanguages,
    availableTimezones: mockTimezones,
    onSave: async (settings) => {
      console.log('Save settings:', settings)
    },
    onReset: async () => {
      console.log('Reset settings')
    },
  },
}

/**
 * General settings section only
 */
export const GeneralOnly: Story = {
  args: {
    settings: mockSettings,
    sections: {
      general: true,
      security: false,
      notifications: false,
      integrations: false,
      billing: false,
      branding: false,
    },
    availableLanguages: mockLanguages,
    availableTimezones: mockTimezones,
  },
}

/**
 * Security settings section only
 */
export const SecurityOnly: Story = {
  args: {
    settings: mockSettings,
    sections: {
      general: false,
      security: true,
      notifications: false,
      integrations: false,
      billing: false,
      branding: false,
    },
  },
}

/**
 * With integrations enabled
 */
export const WithIntegrations: Story = {
  args: {
    settings: {
      ...mockSettings,
      integrations: {
        slack: { enabled: true, config: { webhookUrl: 'https://hooks.slack.com/...' } },
        github: { enabled: true, config: { org: 'my-org' } },
        stripe: { enabled: false },
      },
    },
    availableIntegrations: mockIntegrations,
    sections: {
      general: false,
      security: false,
      notifications: false,
      integrations: true,
      billing: false,
      branding: false,
    },
  },
}

/**
 * Saving state
 */
export const Saving: Story = {
  args: {
    settings: mockSettings,
    availableIntegrations: mockIntegrations,
    availableLanguages: mockLanguages,
    availableTimezones: mockTimezones,
    saving: true,
  },
}

/**
 * Empty settings (first time setup)
 */
export const Empty: Story = {
  args: {
    settings: {},
    availableIntegrations: mockIntegrations,
    availableLanguages: mockLanguages,
    availableTimezones: mockTimezones,
  },
}

/**
 * Strict security settings
 */
export const StrictSecurity: Story = {
  args: {
    settings: {
      ...mockSettings,
      security: {
        mfaRequired: true,
        sessionTimeout: 15,
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireNumbers: true,
          requireSymbols: true,
        },
        ipAllowlist: ['192.168.1.0/24', '10.0.0.0/8'],
      },
    },
    sections: {
      general: false,
      security: true,
      notifications: false,
      integrations: false,
      billing: false,
      branding: false,
    },
  },
}

/**
 * Billing settings only
 */
export const BillingOnly: Story = {
  args: {
    settings: mockSettings,
    sections: {
      general: false,
      security: false,
      notifications: false,
      integrations: false,
      billing: true,
      branding: false,
    },
  },
}

/**
 * Branding settings only
 */
export const BrandingOnly: Story = {
  args: {
    settings: mockSettings,
    sections: {
      general: false,
      security: false,
      notifications: false,
      integrations: false,
      billing: false,
      branding: true,
    },
  },
}
