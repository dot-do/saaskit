/**
 * Zapier App Generator
 *
 * Generates a complete Zapier app definition from a SaaSkit app configuration.
 * Combines triggers, actions, and searches into a single exportable format.
 */

import type {
  ZapierApp,
  ZapierGeneratorOptions,
  ZapierAuthentication,
  ZapierTrigger,
  ZapierAction,
  ZapierSearch,
} from './types'
import { toZapierKey, toDisplayLabel } from './types'
import { generateTriggersFromEvents, generateTriggersForNoun, triggersToRecord } from './triggers'
import { generateActionsFromVerbs, generateActionsForNoun, actionsToRecord } from './actions'
import { generateSearchesFromNouns, searchesToRecord, type NounSchemaField } from './searches'

/**
 * SaaSkit app configuration shape (subset of AppConfig)
 */
export interface SaaSKitAppConfig {
  /** App identifier (e.g., 'https://api.your-app.do') */
  do?: string
  /** App name */
  name?: string
  /** Nouns defined in the app */
  nouns?: readonly string[]
  /** Verbs per noun */
  verbs?: Record<string, readonly string[]>
  /** Event handlers */
  events?: Record<string, unknown>
  /** Optional noun schemas for search fields */
  schemas?: Record<string, NounSchemaField[]>
}

/**
 * Generate authentication configuration for Zapier
 */
export function generateAuthentication(options: ZapierGeneratorOptions): ZapierAuthentication | undefined {
  const { authType, apiBaseUrl, oauthAuthorizeUrl, oauthTokenUrl } = options

  if (authType === 'oauth2' && oauthAuthorizeUrl && oauthTokenUrl) {
    return {
      type: 'oauth2',
      oauth2Config: {
        authorizeUrl: oauthAuthorizeUrl,
        getAccessToken: {
          url: oauthTokenUrl,
          method: 'POST',
          body: {
            code: '{{bundle.inputData.code}}',
            client_id: '{{process.env.CLIENT_ID}}',
            client_secret: '{{process.env.CLIENT_SECRET}}',
            redirect_uri: '{{bundle.inputData.redirect_uri}}',
            grant_type: 'authorization_code',
          },
        },
        refreshAccessToken: {
          url: oauthTokenUrl,
          method: 'POST',
          body: {
            refresh_token: '{{bundle.authData.refresh_token}}',
            client_id: '{{process.env.CLIENT_ID}}',
            client_secret: '{{process.env.CLIENT_SECRET}}',
            grant_type: 'refresh_token',
          },
        },
        test: {
          url: `${apiBaseUrl}/me`,
          method: 'GET',
        },
      },
    }
  }

  // Default to API key authentication
  return {
    type: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'string',
        required: true,
        helpText: 'Your API key from the settings page.',
      },
    ],
    test: {
      url: `${apiBaseUrl}/me`,
      method: 'GET',
    },
    connectionLabel: '{{bundle.inputData.email}}',
  }
}

/**
 * Generate a complete Zapier app from a SaaSkit configuration
 *
 * @example
 * ```ts
 * const app = defineApp({
 *   do: 'https://api.example.com.ai',
 *   nouns: ['User', 'Order', 'Product'],
 *   verbs: {
 *     User: ['create', 'update', 'invite'],
 *     Order: ['create', 'fulfill', 'cancel'],
 *   },
 *   events: {
 *     'Order.created': handler,
 *     'User.invited': handler,
 *   },
 * })
 *
 * const zapierApp = generateZapierApp(app, {
 *   apiBaseUrl: 'https://api.example.com.ai',
 *   appName: 'My App',
 * })
 * ```
 */
export function generateZapierApp(
  config: SaaSKitAppConfig,
  options: ZapierGeneratorOptions
): ZapierApp {
  const {
    appKey,
    appName,
    description,
    iconUrl,
    brandColor,
    apiBaseUrl,
    webhookBaseUrl,
    platformVersion = '15.0.0',
  } = options

  // Extract nouns and verbs from config
  const nouns = config.nouns ? [...config.nouns] : []
  const verbs = config.verbs || {}
  const events = config.events || {}
  const schemas = config.schemas || {}

  // Generate app identity
  const name = appName || config.name || 'SaaSkit App'
  const key = appKey || toZapierKey(name).replace(/_/g, '-')

  // Generate triggers from events
  const eventTriggers = generateTriggersFromEvents(events, {
    apiBaseUrl,
    webhookBaseUrl,
  })

  // Also generate default triggers for nouns without explicit events
  const nounsWithEvents = new Set(Object.keys(events).map((e) => e.split('.')[0]))
  const nounsWithoutEvents = nouns.filter((n) => !nounsWithEvents.has(n))
  const defaultTriggers: ZapierTrigger[] = []
  for (const nounName of nounsWithoutEvents) {
    // Only add 'created' trigger for nouns without explicit events
    defaultTriggers.push(
      ...generateTriggersForNoun(nounName, {
        apiBaseUrl,
        webhookBaseUrl,
        events: ['created'],
      })
    )
  }

  // Generate actions from verbs
  const actions = generateActionsFromVerbs(verbs, {
    apiBaseUrl,
  })

  // Also generate default CRUD actions for nouns without explicit verbs
  const nounsWithVerbs = new Set(Object.keys(verbs))
  const nounsWithoutVerbs = nouns.filter((n) => !nounsWithVerbs.has(n))
  const defaultActions: ZapierAction[] = []
  for (const nounName of nounsWithoutVerbs) {
    defaultActions.push(
      ...generateActionsForNoun(nounName, {
        apiBaseUrl,
        verbs: ['create', 'update', 'delete'],
      })
    )
  }

  // Generate searches for all nouns
  const searches = generateSearchesFromNouns(nouns, {
    apiBaseUrl,
    nounSchemas: schemas,
    includeFindOrCreate: true,
  })

  // Generate authentication
  const authentication = generateAuthentication(options)

  return {
    version: '1.0.0',
    platformVersion,
    identity: {
      key,
      name,
      description: description || `${name} integration powered by SaaSkit`,
      iconUrl,
      brandColor,
    },
    authentication,
    triggers: triggersToRecord([...eventTriggers, ...defaultTriggers]),
    creates: actionsToRecord([...actions, ...defaultActions]),
    searches: searchesToRecord(searches),
    beforeRequest: [
      {
        // Add authentication header to all requests
        url: '',
        headers: {
          Authorization: 'Bearer {{bundle.authData.api_key}}',
          'Content-Type': 'application/json',
        },
      },
    ],
    afterResponse: [
      {
        status: 401,
        throwForStatus: true,
      },
    ],
  }
}

/**
 * Export a Zapier app to CLI format (index.js)
 *
 * This generates the JavaScript module that can be used with the Zapier CLI.
 */
export function exportToZapierCliFormat(app: ZapierApp): string {
  return `/**
 * ${app.identity.name} - Zapier Integration
 *
 * Auto-generated by SaaSkit
 * @see https://saaskit.do
 */

const authentication = ${JSON.stringify(app.authentication, null, 2)};

const triggers = ${JSON.stringify(app.triggers, null, 2)};

const creates = ${JSON.stringify(app.creates, null, 2)};

const searches = ${JSON.stringify(app.searches, null, 2)};

module.exports = {
  version: '${app.version}',
  platformVersion: '${app.platformVersion}',

  authentication,

  triggers,

  creates,

  searches,

  // Add auth header to all requests
  beforeRequest: [
    (request, z, bundle) => {
      if (bundle.authData.api_key) {
        request.headers['Authorization'] = \`Bearer \${bundle.authData.api_key}\`;
      }
      return request;
    },
  ],

  // Handle auth errors
  afterResponse: [
    (response, z, bundle) => {
      if (response.status === 401) {
        throw new z.errors.ExpiredAuthError('API key is invalid or expired');
      }
      return response;
    },
  ],
};
`
}

/**
 * Generate package.json for a Zapier app
 */
export function generateZapierPackageJson(app: ZapierApp): string {
  const key = app.identity.key.replace(/-/g, '_')

  return JSON.stringify(
    {
      name: `zapier-${app.identity.key}`,
      version: app.version,
      description: app.identity.description,
      main: 'index.js',
      scripts: {
        test: 'zapier test',
        push: 'zapier push',
        validate: 'zapier validate',
      },
      dependencies: {
        'zapier-platform-core': `^${app.platformVersion}`,
      },
      devDependencies: {
        'zapier-platform-cli': `^${app.platformVersion}`,
      },
      private: true,
    },
    null,
    2
  )
}

/**
 * Generate a complete Zapier app directory structure
 */
export interface ZapierAppFiles {
  'index.js': string
  'package.json': string
  '.zapierapprc': string
}

export function generateZapierAppFiles(app: ZapierApp): ZapierAppFiles {
  return {
    'index.js': exportToZapierCliFormat(app),
    'package.json': generateZapierPackageJson(app),
    '.zapierapprc': JSON.stringify(
      {
        id: 0, // Placeholder, will be assigned by Zapier
        key: app.identity.key,
      },
      null,
      2
    ),
  }
}
