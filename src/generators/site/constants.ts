/**
 * Site Generator Constants
 *
 * Shared constants for the site generator including
 * icon mappings, default configurations, and theme presets.
 *
 * @packageDocumentation
 */

// ============================================================================
// Icon Mapping for Verbs
// ============================================================================

/**
 * Maps common verbs to appropriate icons
 *
 * Used to automatically select icons for feature sections
 * based on the verbs defined in the app config.
 */
export const VERB_ICON_MAP: Record<string, string> = {
  // Create/Add
  create: 'plus',
  add: 'plus',
  new: 'plus',

  // Complete/Finish
  complete: 'check',
  finish: 'check',
  done: 'check',

  // Archive/Store
  archive: 'archive',
  store: 'archive',

  // Delete/Remove
  delete: 'trash',
  remove: 'trash',

  // Edit/Update
  edit: 'edit',
  update: 'edit',
  modify: 'edit',

  // User actions
  invite: 'user-plus',
  assign: 'user',

  // Sharing
  share: 'share',
  export: 'download',
  import: 'upload',

  // AI/Generate
  generate: 'sparkles',
  ai: 'sparkles',

  // Organization
  prioritize: 'star',
  favorite: 'star',

  // Search/Filter
  search: 'search',
  filter: 'filter',
  sort: 'sort',

  // View
  view: 'eye',
  preview: 'eye',

  // Communication
  send: 'send',
  notify: 'bell',
  message: 'message',

  // Analytics
  report: 'chart',
  analyze: 'chart',
  track: 'trending-up',

  // Sync
  sync: 'refresh',
  refresh: 'refresh',

  // Settings
  configure: 'settings',
  settings: 'settings',

  // Security
  lock: 'lock',
  unlock: 'unlock',
  secure: 'shield',

  // Payment
  pay: 'credit-card',
  purchase: 'credit-card',
  subscribe: 'credit-card',
}

/**
 * Default icon when no verb match is found
 */
export const DEFAULT_ICON = 'box'

// ============================================================================
// Default Section Order
// ============================================================================

/**
 * Default order for sections in a landing page
 */
export const DEFAULT_SECTION_ORDER = [
  'navbar',
  'hero',
  'logos',
  'features',
  'testimonials',
  'pricing',
  'faq',
  'cta',
  'footer',
] as const

// ============================================================================
// Default Pricing Tiers
// ============================================================================

/**
 * Default pricing tiers when no plans are defined
 */
export const DEFAULT_PRICING_TIERS = [
  {
    name: 'Free',
    price: 0,
    features: ['Basic features', 'Community support'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 29,
    features: ['All Free features', 'Priority support', 'Advanced analytics'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    features: ['All Pro features', 'Custom integrations', 'Dedicated support'],
    highlighted: false,
  },
] as const

// ============================================================================
// Component Sources
// ============================================================================

/**
 * Default component source package
 */
export const DEFAULT_COMPONENT_SOURCE = '@mdxui/beacon'

/**
 * Maps section types to their default component names
 */
export const SECTION_COMPONENT_MAP: Record<string, string> = {
  hero: 'Hero',
  features: 'Features',
  pricing: 'Pricing',
  cta: 'CTA',
  footer: 'Footer',
  navbar: 'Navbar',
  header: 'Navbar',
  testimonials: 'Testimonials',
  blog: 'Blog',
  logos: 'Logos',
  faq: 'FAQ',
  stats: 'Stats',
}

// ============================================================================
// Theme Presets
// ============================================================================

/**
 * Theme preset configurations
 */
export const THEME_PRESETS = {
  default: {
    preset: 'default',
    borderRadius: 'md',
    darkMode: true,
  },
  dark: {
    preset: 'dark',
    background: 'solid',
    backgroundValue: '#0a0a0a',
    borderRadius: 'md',
    darkMode: false, // Already dark
  },
  light: {
    preset: 'light',
    background: 'solid',
    backgroundValue: '#ffffff',
    borderRadius: 'md',
    darkMode: true,
  },
  minimal: {
    preset: 'minimal',
    borderRadius: 'none',
    darkMode: true,
  },
  bold: {
    preset: 'bold',
    borderRadius: 'lg',
    darkMode: true,
  },
  gradient: {
    preset: 'gradient',
    background: 'gradient',
    borderRadius: 'lg',
    darkMode: true,
  },
  enterprise: {
    preset: 'enterprise',
    borderRadius: 'sm',
    darkMode: true,
  },
  startup: {
    preset: 'startup',
    borderRadius: 'full',
    darkMode: true,
  },
} as const

// ============================================================================
// Default Footer Links
// ============================================================================

/**
 * Default footer navigation links
 */
export const DEFAULT_FOOTER_LINKS = [
  { text: 'Privacy', href: '/privacy' },
  { text: 'Terms', href: '/terms' },
  { text: 'Contact', href: '/contact' },
] as const

// ============================================================================
// Default Navbar Links
// ============================================================================

/**
 * Default navbar navigation links
 */
export const DEFAULT_NAVBAR_LINKS = [
  { text: 'Features', href: '#features' },
  { text: 'Pricing', href: '#pricing' },
  { text: 'Contact', href: '/contact' },
] as const
