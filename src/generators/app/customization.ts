/**
 * App Generator Customization Hooks
 *
 * Provides a flexible customization system for overriding components,
 * field renderers, and extending pages with plugins.
 *
 * @module generators/app/customization
 */

import type { ComponentType, ReactNode } from 'react'
import type { ParsedField, ParsedNoun, AppGeneratorConfig } from './types'

// =============================================================================
// Field Renderer Types
// =============================================================================

/**
 * Context provided to custom field renderers
 *
 * @remarks
 * Contains all information needed to render a field, including
 * the field definition, current value, and form state.
 */
export interface FieldRendererContext {
  /** The parsed field definition */
  field: ParsedField
  /** Current field value */
  value: unknown
  /** Callback to update the field value */
  onChange: (value: unknown) => void
  /** Whether the field is disabled */
  disabled?: boolean
  /** Validation error message, if any */
  error?: string
  /** The full form data */
  formData: Record<string, unknown>
  /** The noun this field belongs to */
  noun: ParsedNoun
  /** Whether this is an edit form (vs create) */
  isEdit?: boolean
}

/**
 * Custom field renderer function type
 *
 * @param context - The field renderer context
 * @returns A React node to render the field
 *
 * @example
 * ```tsx
 * const customStringRenderer: FieldRenderer = (ctx) => {
 *   return createElement('input', {
 *     type: 'text',
 *     value: ctx.value || '',
 *     onChange: (e) => ctx.onChange(e.target.value),
 *     disabled: ctx.disabled,
 *     className: 'custom-input',
 *   })
 * }
 * ```
 */
export type FieldRenderer = (context: FieldRendererContext) => ReactNode

/**
 * Field renderer registry
 *
 * Maps field types to custom renderer functions. Can also specify
 * renderers by specific field name using `fieldName:nounName` format.
 *
 * @example
 * ```typescript
 * const renderers: FieldRendererRegistry = {
 *   // Override all string fields
 *   string: customStringRenderer,
 *   // Override specific field by name
 *   'email:Customer': emailRenderer,
 *   // Override all union type fields
 *   union: customSelectRenderer,
 * }
 * ```
 */
export interface FieldRendererRegistry {
  /** Renderer for string fields */
  string?: FieldRenderer
  /** Renderer for number fields */
  number?: FieldRenderer
  /** Renderer for boolean fields */
  boolean?: FieldRenderer
  /** Renderer for date fields */
  date?: FieldRenderer
  /** Renderer for markdown fields */
  markdown?: FieldRenderer
  /** Renderer for union/enum fields */
  union?: FieldRenderer
  /** Renderer for relation fields */
  relation?: FieldRenderer
  /** Field-specific renderers using `fieldName:nounName` format */
  [fieldKey: string]: FieldRenderer | undefined
}

// =============================================================================
// Component Override Types
// =============================================================================

/**
 * Props passed to custom dashboard component
 */
export interface DashboardComponentProps {
  /** Parsed noun definitions */
  nouns: ParsedNoun[]
  /** Verb configuration */
  verbs?: AppGeneratorConfig['verbs']
  /** Navigation function */
  navigate: (path: string) => void
  /** Current data state */
  data: Record<string, unknown>
  /** Real-time connection status */
  realtimeStatus: string
}

/**
 * Props passed to custom list page component
 */
export interface ListPageComponentProps {
  /** The noun being listed */
  noun: ParsedNoun
  /** Available verbs for this noun */
  verbList: string[]
  /** Record data array */
  records: Array<Record<string, unknown>>
  /** Total count for pagination */
  totalCount: number
  /** Whether there are more records */
  hasMore: boolean
  /** Navigation function */
  navigate: (path: string) => void
  /** Callback for sorting */
  onSort?: (sort: { field: string; direction: string }) => void
}

/**
 * Props passed to custom show page component
 */
export interface ShowPageComponentProps {
  /** The noun being shown */
  noun: ParsedNoun
  /** Available verbs for this noun */
  verbList: string[]
  /** The record being displayed */
  record: Record<string, unknown> | undefined
  /** Navigation function */
  navigate: (path: string) => void
  /** Verb execution handlers */
  onExecuteVerb: (verb: string) => Promise<void>
}

/**
 * Props passed to custom create/edit page component
 */
export interface FormPageComponentProps {
  /** The noun being created/edited */
  noun: ParsedNoun
  /** Whether this is an edit form */
  isEdit: boolean
  /** Current form data */
  formData: Record<string, unknown>
  /** Callback to update form data */
  onFormDataChange: (field: string, value: unknown) => void
  /** Callback for form submission */
  onSubmit: () => Promise<void>
  /** Current record (for edit) */
  record?: Record<string, unknown>
  /** Validation errors */
  errors: Record<string, string>
  /** Whether form is currently submitting */
  isSubmitting: boolean
}

/**
 * Registry of component overrides
 *
 * @remarks
 * Components can be overridden at multiple levels:
 * - Global: Override all instances of a page type
 * - Per-noun: Override for a specific noun only
 *
 * @example
 * ```typescript
 * const overrides: ComponentOverrides = {
 *   // Custom global dashboard
 *   Dashboard: MyCustomDashboard,
 *   // Custom list page for all nouns
 *   ListPage: MyCustomListPage,
 *   // Custom show page only for Order noun
 *   'ShowPage:Order': MyOrderShowPage,
 * }
 * ```
 */
export interface ComponentOverrides {
  /** Custom dashboard component */
  Dashboard?: ComponentType<DashboardComponentProps>
  /** Custom list page component (global) */
  ListPage?: ComponentType<ListPageComponentProps>
  /** Custom show page component (global) */
  ShowPage?: ComponentType<ShowPageComponentProps>
  /** Custom create page component (global) */
  CreatePage?: ComponentType<FormPageComponentProps>
  /** Custom edit page component (global) */
  EditPage?: ComponentType<FormPageComponentProps>
  /** Custom shell/layout component */
  Shell?: ComponentType<{ children: ReactNode }>
  /** Noun-specific overrides using `PageType:NounName` format */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: ComponentType<any> | undefined
}

// =============================================================================
// Plugin System Types
// =============================================================================

/**
 * Position where plugin content should be injected
 */
export type PluginPosition =
  | 'before-title'
  | 'after-title'
  | 'before-content'
  | 'after-content'
  | 'sidebar'
  | 'footer'

/**
 * Plugin context with page state information
 */
export interface PluginContext {
  /** Current page type */
  pageType: 'dashboard' | 'list' | 'show' | 'create' | 'edit' | 'settings' | 'team' | 'billing' | 'api-keys' | 'webhooks'
  /** Current noun (if applicable) */
  noun?: ParsedNoun
  /** Current record (if applicable) */
  record?: Record<string, unknown>
  /** Page data */
  data: Record<string, unknown>
  /** Navigation function */
  navigate: (path: string) => void
  /** Current user */
  user?: { id: string; role: string; permissions?: string[] }
}

/**
 * Plugin definition
 *
 * @remarks
 * Plugins can inject content at specific positions in pages,
 * and can optionally be conditional based on page state.
 *
 * @example
 * ```typescript
 * const analyticsPlugin: AppPlugin = {
 *   id: 'analytics-widget',
 *   position: 'sidebar',
 *   pages: ['dashboard'],
 *   render: (ctx) => createElement('div', null, 'Analytics Widget'),
 * }
 * ```
 */
export interface AppPlugin {
  /** Unique plugin identifier */
  id: string
  /** Where to inject the plugin content */
  position: PluginPosition
  /** Which pages to apply this plugin to */
  pages?: Array<PluginContext['pageType']> | '*'
  /** Which nouns to apply this plugin to (for noun-specific pages) */
  nouns?: string[] | '*'
  /** Conditional rendering based on context */
  condition?: (ctx: PluginContext) => boolean
  /** Plugin render function */
  render: (ctx: PluginContext) => ReactNode
  /** Plugin priority (higher = rendered first) */
  priority?: number
}

// =============================================================================
// Theme Types
// =============================================================================

/**
 * Theme color palette
 */
export interface ThemeColors {
  /** Primary brand color */
  primary: string
  /** Secondary accent color */
  secondary?: string
  /** Background color */
  background: string
  /** Foreground/text color */
  foreground: string
  /** Muted/subtle color */
  muted?: string
  /** Border color */
  border?: string
  /** Destructive/error color */
  destructive?: string
  /** Success color */
  success?: string
  /** Warning color */
  warning?: string
}

/**
 * Theme spacing configuration
 */
export interface ThemeSpacing {
  /** Extra small spacing */
  xs?: string
  /** Small spacing */
  sm?: string
  /** Medium spacing */
  md?: string
  /** Large spacing */
  lg?: string
  /** Extra large spacing */
  xl?: string
}

/**
 * Theme typography configuration
 */
export interface ThemeTypography {
  /** Font family for body text */
  fontFamily?: string
  /** Font family for headings */
  headingFontFamily?: string
  /** Base font size */
  baseFontSize?: string
  /** Line height */
  lineHeight?: string
}

/**
 * Complete theme configuration
 *
 * @remarks
 * Themes control the visual appearance of generated pages.
 * All properties are optional - defaults are used for unspecified values.
 *
 * @example
 * ```typescript
 * const darkTheme: AppTheme = {
 *   colors: {
 *     primary: '#3b82f6',
 *     background: '#1f2937',
 *     foreground: '#f9fafb',
 *   },
 *   borderRadius: '0.5rem',
 * }
 * ```
 */
export interface AppTheme {
  /** Color palette */
  colors?: Partial<ThemeColors>
  /** Spacing scale */
  spacing?: Partial<ThemeSpacing>
  /** Typography settings */
  typography?: Partial<ThemeTypography>
  /** Border radius */
  borderRadius?: string
  /** Box shadow */
  shadow?: string
  /** Custom CSS variables */
  cssVariables?: Record<string, string>
}

// =============================================================================
// Mobile/Responsive Types
// =============================================================================

/**
 * Breakpoint configuration
 */
export interface ResponsiveBreakpoints {
  /** Small screens (phones) */
  sm?: string
  /** Medium screens (tablets) */
  md?: string
  /** Large screens (desktops) */
  lg?: string
  /** Extra large screens */
  xl?: string
}

/**
 * Mobile-specific behavior configuration
 */
export interface MobileConfig {
  /** Whether to show bottom navigation on mobile */
  bottomNavigation?: boolean
  /** Whether to use swipe gestures */
  swipeGestures?: boolean
  /** Whether to enable pull-to-refresh */
  pullToRefresh?: boolean
  /** Custom breakpoints */
  breakpoints?: ResponsiveBreakpoints
  /** Hide certain elements on mobile */
  hideOnMobile?: string[]
}

// =============================================================================
// Main Customization Configuration
// =============================================================================

/**
 * Complete customization configuration for the App generator
 *
 * @remarks
 * **IMPORTANT CONSTRAINTS FOR AI/PROGRAMMATIC GENERATION:**
 * - All properties are optional - the generator works without customization
 * - Field renderers must match expected field types
 * - Component overrides must implement expected props interfaces
 * - Plugins are rendered in priority order (higher first)
 *
 * @example
 * ```typescript
 * const customization: AppCustomization = {
 *   fieldRenderers: {
 *     markdown: myMarkdownEditor,
 *     'avatar:User': avatarUploader,
 *   },
 *   componentOverrides: {
 *     Dashboard: MyCustomDashboard,
 *   },
 *   plugins: [analyticsWidget, helpButton],
 *   theme: darkTheme,
 *   mobile: {
 *     bottomNavigation: true,
 *   },
 * }
 * ```
 */
export interface AppCustomization {
  /** Custom field renderers by type or field name */
  fieldRenderers?: FieldRendererRegistry
  /** Component overrides */
  componentOverrides?: ComponentOverrides
  /** Plugins to inject into pages */
  plugins?: AppPlugin[]
  /** Theme configuration */
  theme?: AppTheme
  /** Mobile/responsive configuration */
  mobile?: MobileConfig
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the appropriate field renderer for a field
 *
 * @param field - The field definition
 * @param noun - The noun the field belongs to
 * @param renderers - The field renderer registry
 * @returns The custom renderer or undefined for default rendering
 *
 * @example
 * ```typescript
 * const renderer = getFieldRenderer(field, noun, customization.fieldRenderers)
 * if (renderer) {
 *   return renderer({ field, value, onChange })
 * }
 * // Fall back to default rendering
 * ```
 */
export function getFieldRenderer(
  field: ParsedField,
  noun: ParsedNoun,
  renderers?: FieldRendererRegistry
): FieldRenderer | undefined {
  if (!renderers) return undefined

  // Check for field-specific renderer first (most specific)
  const fieldKey = `${field.name}:${noun.name}`
  if (renderers[fieldKey]) {
    return renderers[fieldKey]
  }

  // Check for type-based renderer
  return renderers[field.type]
}

/**
 * Get component override for a page type
 *
 * @param pageType - The page type (Dashboard, ListPage, etc.)
 * @param noun - Optional noun for noun-specific overrides
 * @param overrides - The component overrides registry
 * @returns The custom component or undefined for default
 */
export function getComponentOverride<T>(
  pageType: string,
  noun: ParsedNoun | undefined,
  overrides?: ComponentOverrides
): ComponentType<T> | undefined {
  if (!overrides) return undefined

  // Check for noun-specific override first
  if (noun) {
    const nounKey = `${pageType}:${noun.name}`
    if (overrides[nounKey]) {
      return overrides[nounKey] as ComponentType<T>
    }
  }

  // Check for global override
  return overrides[pageType] as ComponentType<T> | undefined
}

/**
 * Get plugins for a specific page and position
 *
 * @param context - The plugin context
 * @param position - The position to get plugins for
 * @param plugins - The plugins array
 * @returns Sorted array of applicable plugins
 */
export function getPluginsForPosition(
  context: PluginContext,
  position: PluginPosition,
  plugins?: AppPlugin[]
): AppPlugin[] {
  if (!plugins) return []

  return plugins
    .filter((plugin) => {
      // Check position
      if (plugin.position !== position) return false

      // Check page filter
      if (plugin.pages && plugin.pages !== '*') {
        if (!plugin.pages.includes(context.pageType)) return false
      }

      // Check noun filter
      if (plugin.nouns && plugin.nouns !== '*' && context.noun) {
        if (!plugin.nouns.includes(context.noun.name)) return false
      }

      // Check custom condition
      if (plugin.condition && !plugin.condition(context)) return false

      return true
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
}

/**
 * Apply theme to CSS variables
 *
 * @param theme - The theme configuration
 * @returns CSS variables object
 */
export function getThemeCSSVariables(theme?: AppTheme): Record<string, string> {
  if (!theme) return {}

  const vars: Record<string, string> = {}

  // Colors
  if (theme.colors) {
    if (theme.colors.primary) vars['--color-primary'] = theme.colors.primary
    if (theme.colors.secondary) vars['--color-secondary'] = theme.colors.secondary
    if (theme.colors.background) vars['--color-background'] = theme.colors.background
    if (theme.colors.foreground) vars['--color-foreground'] = theme.colors.foreground
    if (theme.colors.muted) vars['--color-muted'] = theme.colors.muted
    if (theme.colors.border) vars['--color-border'] = theme.colors.border
    if (theme.colors.destructive) vars['--color-destructive'] = theme.colors.destructive
    if (theme.colors.success) vars['--color-success'] = theme.colors.success
    if (theme.colors.warning) vars['--color-warning'] = theme.colors.warning
  }

  // Spacing
  if (theme.spacing) {
    if (theme.spacing.xs) vars['--spacing-xs'] = theme.spacing.xs
    if (theme.spacing.sm) vars['--spacing-sm'] = theme.spacing.sm
    if (theme.spacing.md) vars['--spacing-md'] = theme.spacing.md
    if (theme.spacing.lg) vars['--spacing-lg'] = theme.spacing.lg
    if (theme.spacing.xl) vars['--spacing-xl'] = theme.spacing.xl
  }

  // Typography
  if (theme.typography) {
    if (theme.typography.fontFamily) vars['--font-family'] = theme.typography.fontFamily
    if (theme.typography.headingFontFamily) vars['--font-family-heading'] = theme.typography.headingFontFamily
    if (theme.typography.baseFontSize) vars['--font-size-base'] = theme.typography.baseFontSize
    if (theme.typography.lineHeight) vars['--line-height'] = theme.typography.lineHeight
  }

  // Other
  if (theme.borderRadius) vars['--border-radius'] = theme.borderRadius
  if (theme.shadow) vars['--shadow'] = theme.shadow

  // Custom variables
  if (theme.cssVariables) {
    Object.assign(vars, theme.cssVariables)
  }

  return vars
}

/**
 * Check if element should be hidden on mobile
 *
 * @param elementId - The element identifier
 * @param mobile - Mobile configuration
 * @returns Whether the element should be hidden
 */
export function isHiddenOnMobile(elementId: string, mobile?: MobileConfig): boolean {
  if (!mobile?.hideOnMobile) return false
  return mobile.hideOnMobile.includes(elementId)
}

/**
 * Get responsive class names based on mobile config
 *
 * @param mobile - Mobile configuration
 * @returns Object with responsive class name helpers
 */
export function getResponsiveClasses(mobile?: MobileConfig): {
  hideOnMobile: string
  showOnMobile: string
  hideOnDesktop: string
  showOnDesktop: string
} {
  const breakpoint = mobile?.breakpoints?.md ?? '768px'
  return {
    hideOnMobile: `@media (max-width: ${breakpoint}) { display: none; }`,
    showOnMobile: `@media (min-width: ${breakpoint}) { display: none; }`,
    hideOnDesktop: `@media (min-width: ${breakpoint}) { display: none; }`,
    showOnDesktop: `@media (max-width: ${breakpoint}) { display: none; }`,
  }
}

/**
 * Default customization values
 */
export const defaultCustomization: AppCustomization = {
  fieldRenderers: {},
  componentOverrides: {},
  plugins: [],
  theme: {
    colors: {
      primary: '#3b82f6',
      background: '#ffffff',
      foreground: '#1f2937',
    },
  },
  mobile: {
    bottomNavigation: false,
    swipeGestures: false,
    pullToRefresh: false,
  },
}

/**
 * Merge user customization with defaults
 *
 * @param custom - User customization
 * @returns Merged customization
 */
export function mergeCustomization(custom?: Partial<AppCustomization>): AppCustomization {
  if (!custom) return defaultCustomization

  return {
    fieldRenderers: { ...defaultCustomization.fieldRenderers, ...custom.fieldRenderers },
    componentOverrides: { ...defaultCustomization.componentOverrides, ...custom.componentOverrides },
    plugins: [...(defaultCustomization.plugins ?? []), ...(custom.plugins ?? [])],
    theme: {
      colors: { ...defaultCustomization.theme?.colors, ...custom.theme?.colors },
      spacing: { ...defaultCustomization.theme?.spacing, ...custom.theme?.spacing },
      typography: { ...defaultCustomization.theme?.typography, ...custom.theme?.typography },
      borderRadius: custom.theme?.borderRadius ?? defaultCustomization.theme?.borderRadius,
      shadow: custom.theme?.shadow ?? defaultCustomization.theme?.shadow,
      cssVariables: { ...defaultCustomization.theme?.cssVariables, ...custom.theme?.cssVariables },
    },
    mobile: { ...defaultCustomization.mobile, ...custom.mobile },
  }
}
