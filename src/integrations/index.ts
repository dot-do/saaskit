/**
 * SaaSkit Integrations Layer
 *
 * Provides utilities for integrating SaaSkit apps with external services
 * like Zapier, Make (Integromat), and other automation platforms.
 *
 * @example
 * ```ts
 * import { zapier } from 'saaskit/integrations'
 *
 * // Generate a Zapier app from your SaaSkit config
 * const zapierApp = zapier.generateZapierApp(app, {
 *   apiBaseUrl: 'https://api.example.com',
 * })
 *
 * // Export for Zapier CLI
 * const files = zapier.generateZapierAppFiles(zapierApp)
 * ```
 *
 * @packageDocumentation
 */

// Re-export all Zapier utilities
export * as zapier from './zapier'

// Also export commonly used items directly for convenience
export {
  generateZapierApp,
  exportToZapierCliFormat,
  generateZapierAppFiles,
  generateTrigger,
  generateAction,
  generateSearch,
} from './zapier'

export type {
  ZapierApp,
  ZapierTrigger,
  ZapierAction,
  ZapierSearch,
  ZapierGeneratorOptions,
  ZapierField,
} from './zapier'
