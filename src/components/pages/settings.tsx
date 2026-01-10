import type { ReactNode } from 'react'

/**
 * App settings configuration
 */
export interface AppSettings {
  general: {
    appName: string
    appLogo?: string
    timezone: string
    dateFormat: string
    language: string
  }
  security: {
    mfaRequired: boolean
    sessionTimeout: number // minutes
    passwordPolicy: {
      minLength: number
      requireUppercase: boolean
      requireNumbers: boolean
      requireSymbols: boolean
    }
    ipAllowlist?: string[]
  }
  notifications: {
    emailEnabled: boolean
    slackEnabled: boolean
    webhooksEnabled: boolean
    digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly'
  }
  integrations: {
    [key: string]: {
      enabled: boolean
      config?: Record<string, unknown>
    }
  }
  billing: {
    currency: string
    taxRate?: number
    invoicePrefix?: string
  }
  branding: {
    primaryColor?: string
    accentColor?: string
    favicon?: string
    customCss?: string
  }
}

/**
 * Props for the Settings page component
 */
export interface SettingsPageProps {
  /**
   * Current settings values
   */
  settings?: Partial<AppSettings>

  /**
   * Callback when settings are saved
   */
  onSave?: (settings: Partial<AppSettings>) => Promise<void>

  /**
   * Callback when settings are reset to defaults
   */
  onReset?: () => Promise<void>

  /**
   * Available integrations to configure
   */
  availableIntegrations?: Array<{
    id: string
    name: string
    description?: string
    icon?: ReactNode
    configFields?: Array<{
      key: string
      label: string
      type: 'text' | 'password' | 'select' | 'boolean'
      options?: string[]
      required?: boolean
    }>
  }>

  /**
   * Available languages
   */
  availableLanguages?: Array<{
    code: string
    name: string
  }>

  /**
   * Available timezones
   */
  availableTimezones?: string[]

  /**
   * Sections to show (hide unwanted sections)
   */
  sections?: {
    general?: boolean
    security?: boolean
    notifications?: boolean
    integrations?: boolean
    billing?: boolean
    branding?: boolean
  }

  /**
   * Whether settings are being saved
   */
  saving?: boolean

  /**
   * Custom empty state component
   */
  emptyState?: ReactNode
}

/**
 * SettingsPage - App settings interface
 *
 * Provides a complete UI for managing application settings.
 *
 * ## Features
 *
 * - General settings (name, timezone, language)
 * - Security settings (MFA, session, passwords)
 * - Notification settings (email, Slack, webhooks)
 * - Integration settings (third-party services)
 * - Billing settings (currency, tax)
 * - Branding settings (colors, logo)
 *
 * ## Sections
 *
 * | Section | Description |
 * |---------|-------------|
 * | General | Basic app configuration |
 * | Security | Authentication and access controls |
 * | Notifications | Alert and messaging preferences |
 * | Integrations | Third-party service connections |
 * | Billing | Payment and invoicing configuration |
 * | Branding | Visual customization |
 *
 * @example
 * ```tsx
 * <SettingsPage
 *   settings={currentSettings}
 *   availableIntegrations={[
 *     { id: 'slack', name: 'Slack', configFields: [...] },
 *     { id: 'github', name: 'GitHub', configFields: [...] },
 *   ]}
 *   onSave={async (settings) => {
 *     await api.settings.update(settings)
 *   }}
 * />
 * ```
 */
export function SettingsPage({
  settings = {},
  onSave,
  onReset,
  availableIntegrations = [],
  availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
  ],
  availableTimezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
  ],
  sections = {
    general: true,
    security: true,
    notifications: true,
    integrations: true,
    billing: true,
    branding: true,
  },
  saving = false,
}: SettingsPageProps): ReactNode {
  // TODO: Implement settings form with validation
  // TODO: Implement section tabs/accordion
  // TODO: Implement integration configuration modals
  // TODO: Implement color picker for branding
  // TODO: Implement logo/favicon upload
  // TODO: Implement IP allowlist editor
  // TODO: Add unsaved changes warning

  return (
    <div data-page="settings">
      <header>
        <h1>Settings</h1>
        <div data-header-actions>
          <button type="button" onClick={() => onReset?.()} disabled={saving}>
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={() => onSave?.(settings)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>

      <div data-settings-container>
        {/* General Settings */}
        {sections.general && (
          <section data-section="general">
            <h2>General</h2>
            <div data-form-group>
              <label>
                App Name
                <input
                  type="text"
                  value={settings.general?.appName || ''}
                  placeholder="My SaaS App"
                />
              </label>
            </div>
            <div data-form-group>
              <label>
                Language
                <select value={settings.general?.language || 'en'}>
                  {availableLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div data-form-group>
              <label>
                Timezone
                <select value={settings.general?.timezone || 'UTC'}>
                  {availableTimezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div data-form-group>
              <label>
                Date Format
                <select value={settings.general?.dateFormat || 'MM/DD/YYYY'}>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </label>
            </div>
          </section>
        )}

        {/* Security Settings */}
        {sections.security && (
          <section data-section="security">
            <h2>Security</h2>
            <div data-form-group>
              <label>
                <input
                  type="checkbox"
                  checked={settings.security?.mfaRequired || false}
                />
                Require MFA for all users
              </label>
            </div>
            <div data-form-group>
              <label>
                Session Timeout (minutes)
                <input
                  type="number"
                  value={settings.security?.sessionTimeout || 60}
                  min={5}
                  max={1440}
                />
              </label>
            </div>
            <fieldset data-form-group>
              <legend>Password Policy</legend>
              <label>
                Minimum Length
                <input
                  type="number"
                  value={settings.security?.passwordPolicy?.minLength || 8}
                  min={6}
                  max={32}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={
                    settings.security?.passwordPolicy?.requireUppercase || false
                  }
                />
                Require uppercase letters
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={
                    settings.security?.passwordPolicy?.requireNumbers || false
                  }
                />
                Require numbers
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={
                    settings.security?.passwordPolicy?.requireSymbols || false
                  }
                />
                Require symbols
              </label>
            </fieldset>
          </section>
        )}

        {/* Notification Settings */}
        {sections.notifications && (
          <section data-section="notifications">
            <h2>Notifications</h2>
            <div data-form-group>
              <label>
                <input
                  type="checkbox"
                  checked={settings.notifications?.emailEnabled ?? true}
                />
                Enable email notifications
              </label>
            </div>
            <div data-form-group>
              <label>
                <input
                  type="checkbox"
                  checked={settings.notifications?.slackEnabled || false}
                />
                Enable Slack notifications
              </label>
            </div>
            <div data-form-group>
              <label>
                <input
                  type="checkbox"
                  checked={settings.notifications?.webhooksEnabled || false}
                />
                Enable webhook notifications
              </label>
            </div>
            <div data-form-group>
              <label>
                Digest Frequency
                <select
                  value={settings.notifications?.digestFrequency || 'realtime'}
                >
                  <option value="realtime">Real-time</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
            </div>
          </section>
        )}

        {/* Integration Settings */}
        {sections.integrations && availableIntegrations.length > 0 && (
          <section data-section="integrations">
            <h2>Integrations</h2>
            <div data-integrations-list>
              {availableIntegrations.map((integration) => (
                <div key={integration.id} data-integration-card>
                  <div data-integration-header>
                    {integration.icon}
                    <div>
                      <h3>{integration.name}</h3>
                      {integration.description && (
                        <p>{integration.description}</p>
                      )}
                    </div>
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          settings.integrations?.[integration.id]?.enabled ||
                          false
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  {integration.configFields &&
                    settings.integrations?.[integration.id]?.enabled && (
                      <div data-integration-config>
                        {integration.configFields.map((field) => (
                          <div key={field.key} data-form-group>
                            <label>
                              {field.label}
                              {field.type === 'boolean' ? (
                                <input type="checkbox" />
                              ) : field.type === 'select' ? (
                                <select>
                                  {field.options?.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input type={field.type} />
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Billing Settings */}
        {sections.billing && (
          <section data-section="billing">
            <h2>Billing</h2>
            <div data-form-group>
              <label>
                Currency
                <select value={settings.billing?.currency || 'USD'}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </label>
            </div>
            <div data-form-group>
              <label>
                Tax Rate (%)
                <input
                  type="number"
                  value={settings.billing?.taxRate || 0}
                  min={0}
                  max={100}
                  step={0.01}
                />
              </label>
            </div>
            <div data-form-group>
              <label>
                Invoice Prefix
                <input
                  type="text"
                  value={settings.billing?.invoicePrefix || 'INV-'}
                  placeholder="INV-"
                />
              </label>
            </div>
          </section>
        )}

        {/* Branding Settings */}
        {sections.branding && (
          <section data-section="branding">
            <h2>Branding</h2>
            <div data-form-group>
              <label>
                Primary Color
                <input
                  type="color"
                  value={settings.branding?.primaryColor || '#000000'}
                />
              </label>
            </div>
            <div data-form-group>
              <label>
                Accent Color
                <input
                  type="color"
                  value={settings.branding?.accentColor || '#0066cc'}
                />
              </label>
            </div>
            <div data-form-group>
              <label>
                Logo URL
                <input
                  type="url"
                  value={settings.branding?.favicon || ''}
                  placeholder="https://..."
                />
              </label>
            </div>
            <div data-form-group>
              <label>
                Custom CSS
                <textarea
                  value={settings.branding?.customCss || ''}
                  placeholder="/* Custom CSS styles */"
                  rows={6}
                />
              </label>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
