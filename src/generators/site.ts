/**
 * Site Generator - Marketing Landing Page Generation
 *
 * Generates a marketing landing page from the app definition.
 * Uses @mdxui/beacon components for the UI.
 */

import type { AppConfig, ResolvedApp } from '../types'

// ============================================================================
// Types
// ============================================================================

export interface SiteSection {
  type: 'hero' | 'features' | 'pricing' | 'cta' | 'footer' | 'header' | 'navbar' | 'testimonials' | string
  component?: string
  componentSource?: string
  content: Record<string, unknown>
  props?: Record<string, unknown>
}

export interface SiteMeta {
  title?: string
  description?: string
  viewport?: string
  keywords?: string
  author?: string
  robots?: string
  canonical?: string
  og?: {
    title?: string
    description?: string
    type?: string
    image?: string
  }
  twitter?: {
    card?: string
    title?: string
    description?: string
    image?: string
  }
  jsonLd?: Record<string, unknown>
}

export interface SiteLayout {
  mobile?: {
    direction?: string
  }
}

export interface StoryBrand {
  hero?: string
  villain?: string
  guide?: string
  plan?: string
  successOutcome?: string
  failureOutcome?: string
}

export interface GeneratedSite {
  type: string
  sections: SiteSection[]
  meta: SiteMeta
  layout: SiteLayout
  responsive: boolean
  aiGenerated?: boolean
  fromCache?: boolean
  storyBrand?: StoryBrand
  Component?: React.ComponentType
  render: () => void
  toReact: () => React.ComponentType
  toMDX: () => string
  toHTML: () => string
  toJSON: () => string
  regenerateSection: (sectionType: string) => Promise<GeneratedSite>
}

export interface SiteConfig {
  hero?: {
    variant?: string
    secondaryCTA?: {
      text: string
      href: string
    }
  }
  features?: {
    columns?: number
    items?: Array<{ title: string; description: string; icon?: string }>
  }
  pricing?: {
    toggle?: boolean
  }
  cta?: {
    headline?: string
    subheadline?: string
    button?: {
      text: string
      href: string
    }
  }
  footer?: {
    social?: {
      twitter?: string
      github?: string
      linkedin?: string
    }
  }
  meta?: {
    keywords?: string
    author?: string
    robots?: string
  }
}

export interface GenerateSiteOptions {
  useAI?: boolean
  useCache?: boolean
  _testAIFailure?: boolean
}

// Extended AppConfig with site-specific options
interface ExtendedAppConfig extends AppConfig {
  name?: string
  description?: string
  domain?: string
  plans?: Record<string, { price: number; features: string[]; recommended?: boolean }>
  site?: SiteConfig
  context?: Record<string, string>
}

// ============================================================================
// Icon Mapping for Verbs
// ============================================================================

const VERB_ICON_MAP: Record<string, string> = {
  create: 'plus',
  add: 'plus',
  new: 'plus',
  complete: 'check',
  finish: 'check',
  done: 'check',
  archive: 'archive',
  store: 'archive',
  delete: 'trash',
  remove: 'trash',
  edit: 'edit',
  update: 'edit',
  modify: 'edit',
  invite: 'user-plus',
  share: 'share',
  export: 'download',
  import: 'upload',
  generate: 'sparkles',
  assign: 'user',
  prioritize: 'star',
  search: 'search',
  filter: 'filter',
  sort: 'sort',
  view: 'eye',
  send: 'send',
  report: 'chart',
}

function getIconForVerbs(verbs: string[]): string {
  for (const verb of verbs) {
    const icon = VERB_ICON_MAP[verb.toLowerCase()]
    if (icon) return icon
  }
  return 'box' // default icon
}

// ============================================================================
// Cache for AI-generated content
// ============================================================================

const aiCache = new Map<string, GeneratedSite>()

function getCacheKey(app: ExtendedAppConfig): string {
  return JSON.stringify({
    name: app.name,
    nouns: app.nouns,
    verbs: app.verbs,
    context: app.context,
  })
}

// ============================================================================
// Section Generators
// ============================================================================

function generateHeroSection(config: ExtendedAppConfig, _options?: GenerateSiteOptions): SiteSection {
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
    componentSource: '@mdxui/beacon',
    content,
    props: {
      heading: `Welcome to ${appName}`,
      subheading: description,
    },
  }
}

function generateFeaturesSection(config: ExtendedAppConfig): SiteSection {
  const siteConfig = config.site?.features

  // If custom features are provided, use them
  if (siteConfig?.items && siteConfig.items.length > 0) {
    const items = siteConfig.items.map((item) => ({
      title: item.title,
      description: item.description,
      icon: item.icon || 'box',
    }))

    return {
      type: 'features',
      component: 'Features',
      componentSource: '@mdxui/beacon',
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
    componentSource: '@mdxui/beacon',
    content: { items },
    props: {
      items,
      columns: siteConfig?.columns || 3,
    },
  }
}

function generatePricingSection(config: ExtendedAppConfig): SiteSection {
  const plans = config.plans

  // If no plans defined, generate a default pricing structure
  if (!plans || Object.keys(plans).length === 0) {
    // const _appName = config.name || 'App'
    const defaultTiers = [
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
    ]

    return {
      type: 'pricing',
      component: 'Pricing',
      componentSource: '@mdxui/beacon',
      content: { tiers: defaultTiers },
      props: {
        tiers: defaultTiers,
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
    componentSource: '@mdxui/beacon',
    content: { tiers },
    props: {
      tiers,
      toggle: config.site?.pricing?.toggle,
    },
  }
}

function generateCTASection(config: ExtendedAppConfig): SiteSection {
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
    componentSource: '@mdxui/beacon',
    content,
    props: {
      heading: content.headline,
      subheading: content.subheadline,
      buttonText: (content.button as { text: string }).text,
      buttonHref: (content.button as { href: string }).href,
    },
  }
}

function generateFooterSection(config: ExtendedAppConfig): SiteSection {
  const appName = config.name || 'App'
  const currentYear = new Date().getFullYear()
  const siteConfig = config.site?.footer

  const content: Record<string, unknown> = {
    brandName: appName,
    copyright: `© ${currentYear} ${appName}. All rights reserved.`,
    links: [
      { text: 'Privacy', href: '/privacy' },
      { text: 'Terms', href: '/terms' },
      { text: 'Contact', href: '/contact' },
    ],
  }

  if (siteConfig?.social) {
    content.social = siteConfig.social
  }

  return {
    type: 'footer',
    component: 'Footer',
    componentSource: '@mdxui/beacon',
    content,
    props: {
      brandName: appName,
      copyright: content.copyright,
      links: content.links,
      social: content.social,
    },
  }
}

function generateHeaderSection(config: ExtendedAppConfig): SiteSection {
  const appName = config.name || 'App'

  return {
    type: 'navbar',
    component: 'Navbar',
    componentSource: '@mdxui/beacon',
    content: {
      brandName: appName,
      links: [
        { text: 'Features', href: '#features' },
        { text: 'Pricing', href: '#pricing' },
        { text: 'Contact', href: '/contact' },
      ],
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

// ============================================================================
// Meta Tags Generator
// ============================================================================

function generateMeta(config: ExtendedAppConfig): SiteMeta {
  const appName = config.name || 'App'
  const description = config.description || `${appName} - Your solution`
  const customMeta = config.site?.meta

  const meta: SiteMeta = {
    title: appName,
    description,
    viewport: 'width=device-width, initial-scale=1',
    og: {
      title: appName,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: appName,
      description,
    },
    jsonLd: {
      '@type': 'SoftwareApplication',
      name: appName,
      description,
    },
  }

  // Add canonical URL if domain is provided
  if (config.domain) {
    meta.canonical = `https://${config.domain}`
  }

  // Merge custom meta
  if (customMeta) {
    if (customMeta.keywords) meta.keywords = customMeta.keywords
    if (customMeta.author) meta.author = customMeta.author
    if (customMeta.robots) meta.robots = customMeta.robots
  }

  return meta
}

// ============================================================================
// Export Methods
// ============================================================================

function createExportMethods(site: Omit<GeneratedSite, 'toReact' | 'toMDX' | 'toHTML' | 'toJSON' | 'regenerateSection' | 'render' | 'Component'>): Pick<GeneratedSite, 'toReact' | 'toMDX' | 'toHTML' | 'toJSON' | 'regenerateSection' | 'render' | 'Component'> {
  const LandingPage = () => null // Placeholder React component

  return {
    Component: LandingPage,
    render: () => {
      // Placeholder render method
    },
    toReact: () => LandingPage,
    toMDX: () => {
      const imports = site.sections
        .filter((s) => s.component && s.componentSource)
        .map((s) => `import { ${s.component} } from '${s.componentSource}'`)
        .join('\n')

      const sections = site.sections
        .filter((s) => s.component)
        .map((s) => `<${s.component} {...${JSON.stringify(s.props || {})}} />`)
        .join('\n\n')

      return `${imports}\n\nexport default function LandingPage() {\n  return (\n    <>\n      ${sections}\n    </>\n  )\n}`
    },
    toHTML: () => {
      const title = site.meta.title || 'Landing Page'
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="${site.meta.viewport || 'width=device-width, initial-scale=1'}">
  <title>${title}</title>
  ${site.meta.description ? `<meta name="description" content="${site.meta.description}">` : ''}
</head>
<body>
  <div id="root">
    <!-- ${title} Landing Page -->
  </div>
</body>
</html>`
    },
    toJSON: () => JSON.stringify({
      sections: site.sections,
      meta: site.meta,
      layout: site.layout,
      responsive: site.responsive,
    }, null, 2),
    regenerateSection: async (_sectionType: string) => {
      // Return a new site with the same structure
      return {
        ...site,
        ...createExportMethods(site),
      } as GeneratedSite
    },
  }
}

// ============================================================================
// Main Export: generateSite
// ============================================================================

/**
 * Generate a marketing landing page site from an app definition.
 *
 * @param app - The app configuration or resolved app
 * @param options - Generation options (AI, caching, etc.)
 * @returns Generated site with sections and meta
 */
export function generateSite(
  app: AppConfig | ResolvedApp,
  options?: GenerateSiteOptions
): GeneratedSite {
  // Extract config from resolved app or use directly
  const config: ExtendedAppConfig = 'config' in app ? (app.config as ExtendedAppConfig) : (app as ExtendedAppConfig)

  // Check cache if useCache is enabled
  if (options?.useCache) {
    const cacheKey = getCacheKey(config)
    const cached = aiCache.get(cacheKey)
    if (cached) {
      return {
        ...cached,
        fromCache: true,
      }
    }
  }

  // Generate sections
  const sections: SiteSection[] = []

  // Header/Navbar
  sections.push(generateHeaderSection(config))

  // Hero
  sections.push(generateHeroSection(config, options))

  // Features
  sections.push(generateFeaturesSection(config))

  // Pricing (always include - uses defaults if no plans defined)
  sections.push(generatePricingSection(config))

  // CTA
  sections.push(generateCTASection(config))

  // Footer
  sections.push(generateFooterSection(config))

  // Generate meta
  const meta = generateMeta(config)

  // Build the site object
  const baseSite = {
    type: 'landing-page',
    sections,
    meta,
    layout: {
      mobile: {
        direction: 'column',
      },
    },
    responsive: true,
    aiGenerated: options?.useAI === true,
  }

  // Add storyBrand if context has story brand elements
  let storyBrand: StoryBrand | undefined
  if (config.context) {
    const ctx = config.context
    if (ctx.hero || ctx.villain || ctx.guide || ctx.plan || ctx.successOutcome || ctx.failureOutcome) {
      storyBrand = {
        hero: ctx.hero,
        villain: ctx.villain,
        guide: ctx.guide,
        plan: ctx.plan,
        successOutcome: ctx.successOutcome,
        failureOutcome: ctx.failureOutcome,
      }
    }
  }

  const site: GeneratedSite = {
    ...baseSite,
    storyBrand,
    ...createExportMethods(baseSite),
  }

  // Cache the result if AI was used
  if (options?.useAI && !options?._testAIFailure) {
    const cacheKey = getCacheKey(config)
    aiCache.set(cacheKey, site)
  }

  return site
}

// ============================================================================
// SiteGenerator Class
// ============================================================================

/**
 * Builder class for customizing site generation.
 */
export class SiteGenerator {
  app: AppConfig | ResolvedApp
  private _heroConfig?: Record<string, unknown>
  private _featuresConfig?: Record<string, unknown>
  private _pricingConfig?: Record<string, unknown>
  private _theme?: string
  private _sectionOrder?: string[]
  private _customSections: SiteSection[] = []
  private _removedSections: Set<string> = new Set()

  constructor(app: AppConfig | ResolvedApp) {
    this.app = app
  }

  withHero(config: Record<string, unknown>): this {
    this._heroConfig = config
    return this
  }

  withFeatures(config: Record<string, unknown>): this {
    this._featuresConfig = config
    return this
  }

  withPricing(config: Record<string, unknown>): this {
    this._pricingConfig = config
    return this
  }

  withTheme(theme: string): this {
    this._theme = theme
    return this
  }

  setSectionOrder(order: string[]): this {
    this._sectionOrder = order
    return this
  }

  addSection(section: SiteSection): this {
    this._customSections.push(section)
    return this
  }

  removeSection(sectionType: string): this {
    this._removedSections.add(sectionType)
    return this
  }

  build(): GeneratedSite {
    // Reserved for future configuration support (suppress unused warnings)
    void this._heroConfig
    void this._featuresConfig
    void this._pricingConfig
    void this._theme

    // Generate base site
    const site = generateSite(this.app)

    // Filter out removed sections
    let sections = site.sections.filter((s) => !this._removedSections.has(s.type))

    // Add custom sections
    sections = [...sections, ...this._customSections]

    // Reorder sections if order is specified
    if (this._sectionOrder) {
      const orderedSections: SiteSection[] = []
      for (const type of this._sectionOrder) {
        const section = sections.find((s) => s.type === type)
        if (section) {
          orderedSections.push(section)
        }
      }
      // Add any sections not in the order list at the end
      for (const section of sections) {
        if (!this._sectionOrder.includes(section.type)) {
          orderedSections.push(section)
        }
      }
      sections = orderedSections
    }

    const baseSite = {
      ...site,
      sections,
    }

    return {
      ...baseSite,
      ...createExportMethods(baseSite),
    }
  }
}
