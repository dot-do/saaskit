/**
 * Site Section Generators
 *
 * Individual section generators for each landing page component.
 * Each generator creates a SiteSection with content and props
 * suitable for @mdxui/beacon components.
 *
 * @packageDocumentation
 */

import type { SiteSection, GenerateSiteOptions, SiteConfig } from './types'
import type { AppConfig } from '../../types'
import {
  VERB_ICON_MAP,
  DEFAULT_ICON,
  DEFAULT_PRICING_TIERS,
  DEFAULT_COMPONENT_SOURCE,
  DEFAULT_FOOTER_LINKS,
  DEFAULT_NAVBAR_LINKS,
} from './constants'

// ============================================================================
// Extended Config Type
// ============================================================================

/**
 * Extended app configuration with site-specific options
 * @internal
 */
export interface ExtendedAppConfig extends AppConfig {
  name?: string
  description?: string
  domain?: string
  plans?: Record<
    string,
    { price: number; features: string[]; recommended?: boolean }
  >
  site?: SiteConfig
  context?: Record<string, string>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get an icon name based on a list of verbs
 *
 * @param verbs - Array of verb strings to match against
 * @returns Icon name from the verb map, or default icon
 */
export function getIconForVerbs(verbs: string[]): string {
  for (const verb of verbs) {
    const icon = VERB_ICON_MAP[verb.toLowerCase()]
    if (icon) return icon
  }
  return DEFAULT_ICON
}

// ============================================================================
// Section Generators
// ============================================================================

/**
 * Generate the Hero section
 *
 * Creates a hero section with headline, tagline, and CTAs.
 * Content is derived from the app name and description.
 *
 * @param config - App configuration
 * @param options - Generation options
 * @returns Hero section definition
 */
export function generateHeroSection(
  config: ExtendedAppConfig,
  _options?: GenerateSiteOptions
): SiteSection {
  const appName = config.name || 'App'
  const description = config.description || `Welcome to ${appName}`
  const siteConfig = config.site?.hero

  const content: Record<string, unknown> = {
    headline: `Welcome to ${appName}`,
    tagline: config.description || undefined,
    primaryCTA: {
      text: 'Get Started',
      href: '/signup',
    },
  }

  if (siteConfig?.secondaryCTA) {
    content.secondaryCTA = siteConfig.secondaryCTA
  }

  return {
    type: 'hero',
    component: 'Hero',
    componentSource: DEFAULT_COMPONENT_SOURCE,
    content,
    props: {
      heading: `Welcome to ${appName}`,
      subheading: description,
    },
  }
}

/**
 * Generate the Features section
 *
 * Creates a features section from nouns and verbs, or uses
 * custom features if provided in the site config.
 *
 * @param config - App configuration
 * @returns Features section definition
 */
export function generateFeaturesSection(config: ExtendedAppConfig): SiteSection {
  const siteConfig = config.site?.features

  // If custom features are provided, use them
  if (siteConfig?.items && siteConfig.items.length > 0) {
    const items = siteConfig.items.map((item) => ({
      title: item.title,
      description: item.description,
      icon: item.icon || DEFAULT_ICON,
    }))

    return {
      type: 'features',
      component: 'Features',
      componentSource: DEFAULT_COMPONENT_SOURCE,
      content: { items },
      props: {
        items,
        columns: siteConfig.columns || 3,
      },
    }
  }

  // Generate features from nouns and verbs
  const nouns = Array.isArray(config.nouns) ? config.nouns : []
  const verbs = config.verbs || {}

  const items = nouns.map((noun) => {
    const nounVerbs = (verbs as Record<string, string[]>)[noun] || []
    const verbList = nounVerbs.length > 0 ? nounVerbs.join(', ') : 'manage'

    return {
      title: `${noun} Management`,
      description: `Easily ${verbList} your ${noun.toLowerCase()}s with powerful tools.`,
      icon: getIconForVerbs(nounVerbs),
    }
  })

  return {
    type: 'features',
    component: 'Features',
    componentSource: DEFAULT_COMPONENT_SOURCE,
    content: { items },
    props: {
      items,
      columns: siteConfig?.columns || 3,
    },
  }
}

/**
 * Generate the Pricing section
 *
 * Creates a pricing section from the app's plans configuration,
 * or uses default pricing tiers if no plans are defined.
 *
 * @param config - App configuration
 * @returns Pricing section definition
 */
export function generatePricingSection(config: ExtendedAppConfig): SiteSection {
  const plans = config.plans

  // If no plans defined, generate a default pricing structure
  if (!plans || Object.keys(plans).length === 0) {
    return {
      type: 'pricing',
      component: 'Pricing',
      componentSource: DEFAULT_COMPONENT_SOURCE,
      content: { tiers: [...DEFAULT_PRICING_TIERS] },
      props: {
        tiers: [...DEFAULT_PRICING_TIERS],
        toggle: config.site?.pricing?.toggle,
      },
    }
  }

  const tiers = Object.entries(plans).map(([name, plan]) => ({
    name,
    price: plan.price,
    features: plan.features,
    highlighted: plan.recommended === true,
  }))

  return {
    type: 'pricing',
    component: 'Pricing',
    componentSource: DEFAULT_COMPONENT_SOURCE,
    content: { tiers },
    props: {
      tiers,
      toggle: config.site?.pricing?.toggle,
    },
  }
}

/**
 * Generate the CTA section
 *
 * Creates a call-to-action section with headline,
 * subheadline, and action button.
 *
 * @param config - App configuration
 * @returns CTA section definition
 */
export function generateCTASection(config: ExtendedAppConfig): SiteSection {
  const appName = config.name || 'App'
  const siteConfig = config.site?.cta

  const content: Record<string, unknown> = {
    headline: siteConfig?.headline || `Ready to get started with ${appName}?`,
    subheadline: siteConfig?.subheadline,
    button: siteConfig?.button || {
      text: 'Start Free Trial',
      href: '/signup',
    },
  }

  return {
    type: 'cta',
    component: 'CTA',
    componentSource: DEFAULT_COMPONENT_SOURCE,
    content,
    props: {
      heading: content.headline,
      subheading: content.subheadline,
      buttonText: (content.button as { text: string }).text,
      buttonHref: (content.button as { href: string }).href,
    },
  }
}

/**
 * Generate the Footer section
 *
 * Creates a footer section with brand name, copyright,
 * navigation links, and optional social media links.
 *
 * @param config - App configuration
 * @returns Footer section definition
 */
export function generateFooterSection(config: ExtendedAppConfig): SiteSection {
  const appName = config.name || 'App'
  const currentYear = new Date().getFullYear()
  const siteConfig = config.site?.footer

  const content: Record<string, unknown> = {
    brandName: appName,
    copyright: `\u00A9 ${currentYear} ${appName}. All rights reserved.`,
    links: [...DEFAULT_FOOTER_LINKS],
  }

  if (siteConfig?.social) {
    content.social = siteConfig.social
  }

  return {
    type: 'footer',
    component: 'Footer',
    componentSource: DEFAULT_COMPONENT_SOURCE,
    content,
    props: {
      brandName: appName,
      copyright: content.copyright,
      links: content.links,
      social: content.social,
    },
  }
}

/**
 * Generate the Header/Navbar section
 *
 * Creates a navigation header with brand name,
 * navigation links, and mobile menu support.
 *
 * @param config - App configuration
 * @returns Navbar section definition
 */
export function generateHeaderSection(config: ExtendedAppConfig): SiteSection {
  const appName = config.name || 'App'

  return {
    type: 'navbar',
    component: 'Navbar',
    componentSource: DEFAULT_COMPONENT_SOURCE,
    content: {
      brandName: appName,
      links: [...DEFAULT_NAVBAR_LINKS],
      mobileMenu: {
        enabled: true,
        breakpoint: 'md',
      },
    },
    props: {
      brandName: appName,
    },
  }
}

/**
 * Generate the Testimonials section
 *
 * Creates a testimonials section from provided testimonials
 * in the site config.
 *
 * @param config - App configuration
 * @returns Testimonials section definition or undefined if not configured
 */
export function generateTestimonialsSection(
  config: ExtendedAppConfig
): SiteSection | undefined {
  const testimonialsConfig = config.site?.testimonials

  // Only generate if testimonials are enabled and provided
  if (!testimonialsConfig?.enabled || !testimonialsConfig.items?.length) {
    return undefined
  }

  return {
    type: 'testimonials',
    component: 'Testimonials',
    componentSource: DEFAULT_COMPONENT_SOURCE,
    content: {
      title: testimonialsConfig.title || 'What our customers say',
      items: testimonialsConfig.items,
    },
    props: {
      title: testimonialsConfig.title || 'What our customers say',
      items: testimonialsConfig.items,
      variant: testimonialsConfig.variant || 'cards',
    },
  }
}

/**
 * Generate the Blog section
 *
 * Creates a blog preview section that links to full blog content.
 *
 * @param config - App configuration
 * @returns Blog section definition or undefined if not configured
 */
export function generateBlogSection(
  config: ExtendedAppConfig
): SiteSection | undefined {
  const blogConfig = config.site?.blog

  // Only generate if blog is enabled
  if (!blogConfig?.enabled) {
    return undefined
  }

  return {
    type: 'blog',
    component: 'Blog',
    componentSource: DEFAULT_COMPONENT_SOURCE,
    content: {
      title: blogConfig.title || 'Latest from our blog',
      description: blogConfig.description,
      viewAllLink: blogConfig.viewAllLink || '/blog',
      recentPosts: blogConfig.recentPosts || 3,
      source: blogConfig.source || 'posts',
    },
    props: {
      title: blogConfig.title || 'Latest from our blog',
      description: blogConfig.description,
      viewAllLink: blogConfig.viewAllLink || '/blog',
      limit: blogConfig.recentPosts || 3,
    },
  }
}

/**
 * Generate all sections for the site
 *
 * Creates all enabled sections based on the configuration,
 * respecting custom section order and exclusions.
 *
 * @param config - App configuration
 * @param options - Generation options
 * @returns Array of site sections
 */
export function generateAllSections(
  config: ExtendedAppConfig,
  options?: GenerateSiteOptions
): SiteSection[] {
  const sections: SiteSection[] = []

  // Header/Navbar
  sections.push(generateHeaderSection(config))

  // Hero
  sections.push(generateHeroSection(config, options))

  // Features
  sections.push(generateFeaturesSection(config))

  // Testimonials (if configured)
  const testimonials = generateTestimonialsSection(config)
  if (testimonials) {
    sections.push(testimonials)
  }

  // Pricing (always include - uses defaults if no plans defined)
  sections.push(generatePricingSection(config))

  // Blog (if configured)
  const blog = generateBlogSection(config)
  if (blog) {
    sections.push(blog)
  }

  // CTA
  sections.push(generateCTASection(config))

  // Footer
  sections.push(generateFooterSection(config))

  // Add custom sections
  if (config.site?.customSections) {
    sections.push(...config.site.customSections)
  }

  // Filter out excluded sections
  const excludedSections = config.site?.excludeSections || []
  const filteredSections = sections.filter(
    (s) => !excludedSections.includes(s.type)
  )

  // Reorder sections if custom order is specified
  if (config.site?.sectionOrder) {
    return reorderSections(filteredSections, config.site.sectionOrder)
  }

  return filteredSections
}

/**
 * Reorder sections based on a custom order array
 *
 * @param sections - Array of sections to reorder
 * @param order - Desired order of section types
 * @returns Reordered array of sections
 */
function reorderSections(sections: SiteSection[], order: string[]): SiteSection[] {
  const orderedSections: SiteSection[] = []

  // Add sections in the specified order
  for (const type of order) {
    const section = sections.find((s) => s.type === type)
    if (section) {
      orderedSections.push(section)
    }
  }

  // Add any sections not in the order list at the end
  for (const section of sections) {
    if (!order.includes(section.type)) {
      orderedSections.push(section)
    }
  }

  return orderedSections
}
