/**
 * Zapier Integration Module
 *
 * Provides utilities for generating Zapier apps from SaaSkit configurations.
 *
 * @example
 * ```ts
 * import { generateZapierApp, exportToZapierCliFormat } from 'saaskit/integrations/zapier'
 *
 * const app = defineApp({ ... })
 * const zapierApp = generateZapierApp(app, {
 *   apiBaseUrl: 'https://api.example.com.ai',
 *   appName: 'My App',
 * })
 *
 * // Export to Zapier CLI format
 * const indexJs = exportToZapierCliFormat(zapierApp)
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  ZapierFieldType,
  ZapierField,
  ZapierSample,
  ZapierPerformRequest,
  ZapierOperation,
  ZapierTrigger,
  ZapierAction,
  ZapierSearch,
  ZapierOAuth2Config,
  ZapierApiKeyConfig,
  ZapierSessionConfig,
  ZapierAuthentication,
  ZapierAppVersion,
  ZapierApp,
  ZapierGeneratorOptions,
} from './types'

export { FIELD_TYPE_MAP, toZapierKey, toDisplayLabel } from './types'

// Triggers
export type { TriggerEventVerb, GenerateTriggerOptions } from './triggers'

export {
  TRIGGER_EVENT_VERBS,
  generateWebhookUrl,
  generateTrigger,
  generateTriggersForNoun,
  generateTriggersFromEvents,
  triggersToRecord,
} from './triggers'

// Actions
export type { CrudVerb, VerbParameter, GenerateActionOptions } from './actions'

export {
  CRUD_VERBS,
  parameterToField,
  getHttpMethodForVerb,
  generateAction,
  generateActionsForNoun,
  generateActionsFromVerbs,
  actionsToRecord,
} from './actions'

// Searches
export type { NounSchemaField, GenerateSearchOptions } from './searches'

export {
  schemaFieldToZapierField,
  getDefaultSearchFields,
  generateSearch,
  generateFindOrCreate,
  generateSearchesForNoun,
  generateSearchesFromNouns,
  searchesToRecord,
} from './searches'

// Generator
export type { SaaSKitAppConfig, ZapierAppFiles } from './generator'

export {
  generateAuthentication,
  generateZapierApp,
  exportToZapierCliFormat,
  generateZapierPackageJson,
  generateZapierAppFiles,
} from './generator'
