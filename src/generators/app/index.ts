/**
 * App Generator Module
 *
 * Generates React admin dashboard pages from noun/verb definitions.
 */

export { generateApp } from './generate-app'
export { renderWithProviders, screen, waitFor, fireEvent } from './test-utils'
export type {
  AppGeneratorConfig,
  GeneratedApp,
  AppRoute,
  RenderOptions,
  RenderResult,
  AppUser,
  ParsedNoun,
  ParsedField,
  NounsConfig,
  VerbsConfig,
} from './types'
