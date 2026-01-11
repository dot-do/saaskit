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
  VerbHandler,
  VerbContext,
  FieldType,
  NounFields,
  RealtimeEvent,
} from './types'

// Re-export customization types and helpers
export type {
  AppCustomization,
  FieldRenderer,
  FieldRendererContext,
  FieldRendererRegistry,
  AppPlugin,
  PluginContext,
  PluginPosition,
  AppTheme,
  MobileConfig,
  ComponentOverrides,
  DashboardComponentProps,
  ListPageComponentProps,
  ShowPageComponentProps,
  FormPageComponentProps,
} from './customization'

export {
  getFieldRenderer,
  getComponentOverride,
  getPluginsForPosition,
  getThemeCSSVariables,
  isHiddenOnMobile,
  getResponsiveClasses,
  mergeCustomization,
  defaultCustomization,
} from './customization'
