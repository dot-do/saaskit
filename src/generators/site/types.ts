/**
 * Site Generator Types
 *
 * Type definitions for the Site generator that creates
 * marketing landing pages from noun/verb definitions.
 *
 * @packageDocumentation
 */

import type { ComponentType } from 'react'

// ============================================================================
// Section Types
// ============================================================================

/**
 * Built-in section types supported by the site generator
 */
export type BuiltInSectionType =
  | 'hero'
  | 'features'
  | 'pricing'
  | 'cta'
  | 'footer'
  | 'header'
  | 'navbar'
  | 'testimonials'
  | 'blog'
  | 'logos'
  | 'faq'
  | 'stats'

/**
 * A section in the generated site
 *
 * Sections are the building blocks of a landing page. Each section
 * has a type, optional component reference, and content/props.
 */
export interface SiteSection {
  /**
   * Section type identifier
   * Can be a built-in type or custom string for custom sections
   */
  type: BuiltInSectionType | string

  /**
   * Component name to render this section
   * @example 'Hero', 'Features', 'Pricing'
   */
  component?: string

  /**
   * Package source for the component
   * @example '@mdxui/beacon'
   */
  componentSource?: string

  /**
   * Content data for the section (semantic structure)
   */
  content: Record<string, unknown>

  /**
   * Props to pass to the component (may differ from content)
   */
  props?: Record<string, unknown>
}

// ============================================================================
// Meta Types
// ============================================================================

/**
 * Open Graph meta tag configuration
 */
export interface OpenGraphMeta {
  title?: string
  description?: string
  type?: string
  image?: string
  url?: string
  siteName?: string
}

/**
 * Twitter Card meta tag configuration
 */
export interface TwitterCardMeta {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player'
  title?: string
  description?: string
  image?: string
  site?: string
  creator?: string
}

/**
 * SEO and meta tag configuration for the site
 */
export interface SiteMeta {
  /** Page title */
  title?: string

  /** Meta description */
  description?: string

  /** Viewport configuration */
  viewport?: string

  /** SEO keywords (comma-separated) */
  keywords?: string

  /** Content author */
  author?: string

  /** Robots directive */
  robots?: string

  /** Canonical URL */
  canonical?: string

  /** Open Graph meta tags */
  og?: OpenGraphMeta

  /** Twitter Card meta tags */
  twitter?: TwitterCardMeta

  /** JSON-LD structured data */
  jsonLd?: Record<string, unknown>
}

// ============================================================================
// Layout Types
// ============================================================================

/**
 * Mobile layout configuration
 */
export interface MobileLayout {
  /** Layout direction (column for stacked sections) */
  direction?: 'column' | 'row'
}

/**
 * Site layout configuration
 */
export interface SiteLayout {
  /** Mobile-specific layout settings */
  mobile?: MobileLayout
}

// ============================================================================
// Theme Types
// ============================================================================

/**
 * Built-in theme presets
 */
export type ThemePreset =
  | 'default'
  | 'dark'
  | 'light'
  | 'minimal'
  | 'bold'
  | 'gradient'
  | 'enterprise'
  | 'startup'

/**
 * Custom theme configuration
 *
 * Allows fine-grained control over the site's visual appearance.
 */
export interface ThemeConfig {
  /** Theme preset to use as base */
  preset?: ThemePreset

  /** Primary brand color (CSS color value) */
  primaryColor?: string

  /** Secondary/accent color */
  secondaryColor?: string

  /** Background style */
  background?: 'solid' | 'gradient' | 'pattern' | 'image'

  /** Background value (color, gradient, or image URL) */
  backgroundValue?: string

  /** Border radius style */
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full'

  /** Font family for headings */
  headingFont?: string

  /** Font family for body text */
  bodyFont?: string

  /** Enable dark mode support */
  darkMode?: boolean

  /** Custom CSS class to apply to root */
  className?: string
}

// ============================================================================
// StoryBrand Types
// ============================================================================

/**
 * StoryBrand messaging framework configuration
 *
 * Based on Donald Miller's StoryBrand framework for
 * creating compelling marketing copy.
 */
export interface StoryBrand {
  /** The customer as hero of the story */
  hero?: string

  /** The problem/enemy they face */
  villain?: string

  /** Your product as the guide */
  guide?: string

  /** The plan to solve their problem */
  plan?: string

  /** What success looks like */
  successOutcome?: string

  /** What failure looks like (stakes) */
  failureOutcome?: string
}

// ============================================================================
// Blog Integration Types
// ============================================================================

/**
 * Blog section configuration
 */
export interface BlogConfig {
  /** Enable blog section */
  enabled?: boolean

  /** Number of recent posts to show */
  recentPosts?: number

  /** Blog section title */
  title?: string

  /** Blog section description */
  description?: string

  /** Link to full blog page */
  viewAllLink?: string

  /** Blog posts source (CMS collection name) */
  source?: string
}

// ============================================================================
// Testimonials Types
// ============================================================================

/**
 * Individual testimonial
 */
export interface Testimonial {
  /** Quote text */
  quote: string

  /** Author name */
  author: string

  /** Author role/title */
  role?: string

  /** Company name */
  company?: string

  /** Author avatar URL */
  avatar?: string

  /** Company logo URL */
  logo?: string

  /** Rating (1-5 stars) */
  rating?: number
}

/**
 * Testimonials section configuration
 */
export interface TestimonialsConfig {
  /** Enable testimonials section */
  enabled?: boolean

  /** Testimonials to display */
  items?: Testimonial[]

  /** Section title */
  title?: string

  /** Display variant */
  variant?: 'cards' | 'carousel' | 'masonry' | 'single'
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Analytics provider configuration
 */
export interface AnalyticsProvider {
  /** Provider name */
  name: 'google' | 'plausible' | 'fathom' | 'posthog' | 'mixpanel' | 'custom'

  /** Tracking ID or API key */
  trackingId?: string

  /** Custom script URL (for 'custom' provider) */
  scriptUrl?: string

  /** Additional configuration */
  config?: Record<string, unknown>
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Analytics providers to use */
  providers?: AnalyticsProvider[]

  /** Enable privacy-first mode (anonymize IPs, etc.) */
  privacyMode?: boolean

  /** Enable debug mode */
  debug?: boolean
}

// ============================================================================
// Site Configuration Types
// ============================================================================

/**
 * Hero section configuration
 */
export interface HeroSiteConfig {
  /** Hero variant to use */
  variant?: string

  /** Secondary CTA button */
  secondaryCTA?: {
    text: string
    href: string
  }

  /** Background media */
  background?: {
    type: 'image' | 'video' | 'gradient'
    src?: string
    overlay?: boolean
  }
}

/**
 * Features section configuration
 */
export interface FeaturesSiteConfig {
  /** Number of columns */
  columns?: number

  /** Custom feature items (overrides auto-generation) */
  items?: Array<{
    title: string
    description: string
    icon?: string
  }>

  /** Display variant */
  variant?: 'grid' | 'list' | 'cards' | 'bento'
}

/**
 * Pricing section configuration
 */
export interface PricingSiteConfig {
  /** Enable monthly/annual toggle */
  toggle?: boolean

  /** Annual discount percentage */
  annualDiscount?: number

  /** Display variant */
  variant?: 'cards' | 'table' | 'comparison'
}

/**
 * CTA section configuration
 */
export interface CTASiteConfig {
  /** CTA headline */
  headline?: string

  /** CTA subheadline */
  subheadline?: string

  /** CTA button */
  button?: {
    text: string
    href: string
  }

  /** Display variant */
  variant?: 'simple' | 'split' | 'gradient'
}

/**
 * Footer section configuration
 */
export interface FooterSiteConfig {
  /** Social media links */
  social?: {
    twitter?: string
    github?: string
    linkedin?: string
    facebook?: string
    instagram?: string
    youtube?: string
  }

  /** Footer navigation columns */
  columns?: Array<{
    title: string
    links: Array<{ text: string; href: string }>
  }>

  /** Display variant */
  variant?: 'simple' | 'columns' | 'centered'
}

/**
 * Custom meta tag configuration
 */
export interface MetaSiteConfig {
  keywords?: string
  author?: string
  robots?: string
}

/**
 * Complete site configuration
 *
 * This is the main configuration interface for customizing
 * the generated landing page.
 */
export interface SiteConfig {
  /** Hero section configuration */
  hero?: HeroSiteConfig

  /** Features section configuration */
  features?: FeaturesSiteConfig

  /** Pricing section configuration */
  pricing?: PricingSiteConfig

  /** CTA section configuration */
  cta?: CTASiteConfig

  /** Footer section configuration */
  footer?: FooterSiteConfig

  /** Meta tag configuration */
  meta?: MetaSiteConfig

  /** Theme configuration */
  theme?: ThemeConfig

  /** Blog integration */
  blog?: BlogConfig

  /** Testimonials configuration */
  testimonials?: TestimonialsConfig

  /** Analytics configuration */
  analytics?: AnalyticsConfig

  /**
   * Custom section order
   * @example ['navbar', 'hero', 'features', 'testimonials', 'pricing', 'cta', 'footer']
   */
  sectionOrder?: string[]

  /**
   * Sections to exclude from generation
   * @example ['pricing'] // Hide pricing section
   */
  excludeSections?: string[]

  /**
   * Custom sections to add
   */
  customSections?: SiteSection[]

  /**
   * Custom component overrides
   * Maps section types to custom component references
   * @example { hero: { component: 'CustomHero', source: './components' } }
   */
  componentOverrides?: Record<
    string,
    {
      component: string
      source: string
    }
  >
}

// ============================================================================
// Generation Options Types
// ============================================================================

/**
 * Options for site generation
 */
export interface GenerateSiteOptions {
  /** Enable AI-powered copy generation */
  useAI?: boolean

  /** Enable caching of AI-generated content */
  useCache?: boolean

  /** Test flag to simulate AI failure */
  _testAIFailure?: boolean
}

// ============================================================================
// Generated Site Types
// ============================================================================

/**
 * The generated site object
 *
 * Contains all sections, meta, and export methods for
 * the generated landing page.
 */
export interface GeneratedSite {
  /** Site type identifier */
  type: string

  /** Generated sections */
  sections: SiteSection[]

  /** SEO meta configuration */
  meta: SiteMeta

  /** Layout configuration */
  layout: SiteLayout

  /** Whether the site is responsive */
  responsive: boolean

  /** Whether AI was used for content generation */
  aiGenerated?: boolean

  /** Whether content was retrieved from cache */
  fromCache?: boolean

  /** StoryBrand messaging (if provided) */
  storyBrand?: StoryBrand

  /** Theme configuration */
  theme?: ThemeConfig

  /** Analytics configuration */
  analytics?: AnalyticsConfig

  /** React component for the landing page */
  Component?: ComponentType

  /** Render method (for SSR) */
  render: () => void

  /** Export as React component */
  toReact: () => ComponentType

  /** Export as MDX string */
  toMDX: () => string

  /** Export as HTML string */
  toHTML: () => string

  /** Export configuration as JSON string */
  toJSON: () => string

  /** Regenerate a specific section */
  regenerateSection: (sectionType: string) => Promise<GeneratedSite>
}

// ============================================================================
// Builder Types
// ============================================================================

/**
 * Section position for insertion
 */
export type SectionPosition =
  | 'start'
  | 'end'
  | { before: string }
  | { after: string }
