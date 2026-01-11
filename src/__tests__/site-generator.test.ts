/**
 * Site Generator Tests - Marketing Landing Page Generation
 *
 * TDD RED phase: These tests define the contract for the Site generator.
 *
 * The Site generator creates a marketing landing page from the app definition.
 * It derives content from:
 * - App name → Hero headline
 * - Nouns/Verbs → Features section
 * - Plans → Pricing section
 * - StoryBrand messaging → Copy throughout
 *
 * Uses @mdxui/beacon components for UI rendering.
 *
 * From the design doc:
 * > Site (Sites.do)
 * > - Landing page with StoryBrand messaging
 * > - Hero, Features, Pricing sections
 * > - Powered by @mdxui/beacon components
 */

import { describe, it, expect, vi } from 'vitest'
import { generateSite, SiteGenerator, type SiteConfig, type GeneratedSite } from '../generators/site'
import { defineApp } from '../core'

describe('Site Generator', () => {
  // ============================================================================
  // Basic Site Generation
  // ============================================================================

  describe('Landing Page Generation', () => {
    it('should generate a landing page from app definition', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task', 'Project', 'User'],
        verbs: {
          Task: ['create', 'complete', 'archive'],
          Project: ['create', 'invite'],
        },
      })

      const site = generateSite(app)

      expect(site).toBeDefined()
      expect(site.type).toBe('landing-page')
    })

    it('should render landing page without errors', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task', 'Project'],
        verbs: {
          Task: ['create', 'complete'],
        },
      })

      const site = generateSite(app)

      // Site should have a render method or React component
      expect(site.render).toBeDefined()
      expect(typeof site.render).toBe('function')

      // Rendering should not throw
      expect(() => site.render()).not.toThrow()
    })

    it('should return React component for landing page', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      // Should export a React component
      expect(site.Component).toBeDefined()
      expect(typeof site.Component).toBe('function')
    })
  })

  // ============================================================================
  // Hero Section
  // ============================================================================

  describe('Hero Section', () => {
    it('should generate Hero section with app name', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      expect(site.sections).toContainEqual(
        expect.objectContaining({
          type: 'hero',
        })
      )

      const hero = site.sections.find(s => s.type === 'hero')
      expect(hero).toBeDefined()
      expect(hero?.content.headline).toContain('TaskFlow')
    })

    it('should generate Hero with tagline from app description', () => {
      const app = defineApp({
        name: 'TaskFlow',
        description: 'The easiest way to manage your tasks',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const hero = site.sections.find(s => s.type === 'hero')

      expect(hero?.content.tagline).toBe('The easiest way to manage your tasks')
    })

    it('should generate Hero with primary CTA button', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const hero = site.sections.find(s => s.type === 'hero')

      expect(hero?.content.primaryCTA).toBeDefined()
      expect((hero?.content.primaryCTA as { text?: string })?.text).toBeDefined()
      expect((hero?.content.primaryCTA as { href?: string })?.href).toBeDefined()
    })

    it('should support optional secondary CTA in Hero', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        site: {
          hero: {
            secondaryCTA: {
              text: 'Learn More',
              href: '#features',
            },
          },
        },
      })

      const site = generateSite(app)
      const hero = site.sections.find(s => s.type === 'hero')

      expect(hero?.content.secondaryCTA).toBeDefined()
      expect((hero?.content.secondaryCTA as { text?: string })?.text).toBe('Learn More')
    })
  })

  // ============================================================================
  // Features Section
  // ============================================================================

  describe('Features Section', () => {
    it('should generate Features section from nouns', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task', 'Project', 'Team'],
        verbs: {},
      })

      const site = generateSite(app)

      expect(site.sections).toContainEqual(
        expect.objectContaining({
          type: 'features',
        })
      )
    })

    it('should derive feature items from nouns and verbs', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task', 'Project', 'User'],
        verbs: {
          Task: ['create', 'complete', 'archive'],
          Project: ['create', 'invite', 'share'],
        },
      })

      const site = generateSite(app)
      const features = site.sections.find(s => s.type === 'features')

      expect(features?.content.items).toBeDefined()
      const items = features?.content.items as Array<{ title: string }>
      expect(items?.length).toBeGreaterThan(0)

      // Features should reference the domain model
      const featureTexts = items?.map(f => f.title.toLowerCase()).join(' ')
      expect(featureTexts).toMatch(/task|project|user/i)
    })

    it('should generate feature descriptions from verb capabilities', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {
          Task: ['create', 'complete', 'assign', 'prioritize'],
        },
      })

      const site = generateSite(app)
      const features = site.sections.find(s => s.type === 'features')

      // Each feature should have a description
      const items = features?.content.items as Array<{ description: string }>
      items?.forEach((item) => {
        expect(item.description).toBeDefined()
        expect(item.description.length).toBeGreaterThan(0)
      })
    })

    it('should support custom features override', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        site: {
          features: {
            items: [
              { title: 'Custom Feature 1', description: 'Custom description 1' },
              { title: 'Custom Feature 2', description: 'Custom description 2' },
            ],
          },
        },
      })

      const site = generateSite(app)
      const features = site.sections.find(s => s.type === 'features')
      const items = features?.content.items as Array<{ title: string }>

      expect(items?.[0]?.title).toBe('Custom Feature 1')
      expect(items?.[1]?.title).toBe('Custom Feature 2')
    })

    it('should generate feature icons based on verb types', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task', 'Report'],
        verbs: {
          Task: ['create', 'complete'],
          Report: ['generate', 'export'],
        },
      })

      const site = generateSite(app)
      const features = site.sections.find(s => s.type === 'features')

      // Each feature should have an icon
      const items = features?.content.items as Array<{ icon: string }>
      items?.forEach((item) => {
        expect(item.icon).toBeDefined()
      })
    })
  })

  // ============================================================================
  // Pricing Section
  // ============================================================================

  describe('Pricing Section', () => {
    it('should generate Pricing section from Plans', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        plans: {
          Free: { price: 0, features: ['5 tasks', '1 project'] },
          Pro: { price: 19, features: ['Unlimited tasks', 'Unlimited projects', 'Priority support'] },
          Enterprise: { price: 99, features: ['Everything in Pro', 'SSO', 'Custom integrations'] },
        },
      })

      const site = generateSite(app)

      expect(site.sections).toContainEqual(
        expect.objectContaining({
          type: 'pricing',
        })
      )
    })

    it('should render pricing tiers with correct prices', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        plans: {
          Free: { price: 0, features: ['Basic features'] },
          Pro: { price: 29, features: ['Advanced features'] },
        },
      })

      const site = generateSite(app)
      const pricing = site.sections.find(s => s.type === 'pricing')
      type PricingTier = { name: string; price: number; features?: string[]; highlighted?: boolean }
      const tiers = pricing?.content.tiers as PricingTier[] | undefined

      expect(tiers).toHaveLength(2)

      const freeTier = tiers?.find((t) => t.name === 'Free')
      const proTier = tiers?.find((t) => t.name === 'Pro')

      expect(freeTier?.price).toBe(0)
      expect(proTier?.price).toBe(29)
    })

    it('should include feature lists in pricing tiers', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        plans: {
          Pro: { price: 19, features: ['Feature A', 'Feature B', 'Feature C'] },
        },
      })

      const site = generateSite(app)
      const pricing = site.sections.find(s => s.type === 'pricing')
      type PricingTier = { name: string; features?: string[] }
      const tiers = pricing?.content.tiers as PricingTier[] | undefined

      const proTier = tiers?.find((t) => t.name === 'Pro')
      expect(proTier?.features).toEqual(['Feature A', 'Feature B', 'Feature C'])
    })

    it('should highlight recommended plan', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        plans: {
          Free: { price: 0, features: [] },
          Pro: { price: 19, features: [], recommended: true },
          Enterprise: { price: 99, features: [] },
        },
      })

      const site = generateSite(app)
      const pricing = site.sections.find(s => s.type === 'pricing')
      type PricingTier = { name: string; highlighted?: boolean }
      const tiers = pricing?.content.tiers as PricingTier[] | undefined

      const proTier = tiers?.find((t) => t.name === 'Pro')
      expect(proTier?.highlighted).toBe(true)
    })

    it('should generate default pricing when no plans defined', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        // No plans defined
      })

      const site = generateSite(app)
      const pricing = site.sections.find(s => s.type === 'pricing')
      const tiers = pricing?.content.tiers as unknown[] | undefined

      // Should generate reasonable defaults or omit section
      expect(pricing === undefined || (tiers?.length ?? 0) > 0).toBe(true)
    })
  })

  // ============================================================================
  // CTA Section
  // ============================================================================

  describe('CTA Section', () => {
    it('should generate CTA section', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      expect(site.sections).toContainEqual(
        expect.objectContaining({
          type: 'cta',
        })
      )
    })

    it('should render CTA with compelling headline', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const cta = site.sections.find(s => s.type === 'cta')
      const headline = cta?.content.headline as string | undefined

      expect(headline).toBeDefined()
      expect(headline?.length).toBeGreaterThan(0)
    })

    it('should render CTA with action button', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const cta = site.sections.find(s => s.type === 'cta')
      const button = cta?.content.button as { text?: string; href?: string } | undefined

      expect(button).toBeDefined()
      expect(button?.text).toBeDefined()
      expect(button?.href).toBeDefined()
    })

    it('should support custom CTA content', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        site: {
          cta: {
            headline: 'Start Your Free Trial Today',
            subheadline: 'No credit card required',
            button: {
              text: 'Get Started Free',
              href: '/signup',
            },
          },
        },
      })

      const site = generateSite(app)
      const cta = site.sections.find(s => s.type === 'cta')
      const button = cta?.content.button as { text?: string } | undefined

      expect(cta?.content.headline).toBe('Start Your Free Trial Today')
      expect(cta?.content.subheadline).toBe('No credit card required')
      expect(button?.text).toBe('Get Started Free')
    })
  })

  // ============================================================================
  // Footer Section
  // ============================================================================

  describe('Footer Section', () => {
    it('should generate Footer section', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      expect(site.sections).toContainEqual(
        expect.objectContaining({
          type: 'footer',
        })
      )
    })

    it('should render Footer with app name', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const footer = site.sections.find(s => s.type === 'footer')

      expect(footer?.content.brandName).toBe('TaskFlow')
    })

    it('should include copyright information', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const footer = site.sections.find(s => s.type === 'footer')

      expect(footer?.content.copyright).toBeDefined()
      expect(footer?.content.copyright).toContain(new Date().getFullYear().toString())
    })

    it('should include navigation links', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const footer = site.sections.find(s => s.type === 'footer')

      expect(footer?.content.links).toBeDefined()
      expect(Array.isArray(footer?.content.links)).toBe(true)
    })

    it('should support social media links', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        site: {
          footer: {
            social: {
              twitter: 'https://twitter.com/taskflow',
              github: 'https://github.com/taskflow',
              linkedin: 'https://linkedin.com/company/taskflow',
            },
          },
        },
      })

      const site = generateSite(app)
      const footer = site.sections.find(s => s.type === 'footer')
      const social = footer?.content.social as { twitter?: string } | undefined

      expect(social).toBeDefined()
      expect(social?.twitter).toBe('https://twitter.com/taskflow')
    })
  })

  // ============================================================================
  // @mdxui/beacon Components
  // ============================================================================

  describe('@mdxui/beacon Component Integration', () => {
    it('should use @mdxui/beacon Hero component', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const hero = site.sections.find(s => s.type === 'hero')

      // Component should reference beacon Hero
      expect(hero?.component).toBe('Hero')
      expect(hero?.componentSource).toBe('@mdxui/beacon')
    })

    it('should use @mdxui/beacon Features component', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task', 'Project'],
        verbs: {},
      })

      const site = generateSite(app)
      const features = site.sections.find(s => s.type === 'features')

      expect(features?.component).toBe('Features')
      expect(features?.componentSource).toBe('@mdxui/beacon')
    })

    it('should use @mdxui/beacon Pricing component', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        plans: {
          Free: { price: 0, features: [] },
        },
      })

      const site = generateSite(app)
      const pricing = site.sections.find(s => s.type === 'pricing')

      expect(pricing?.component).toBe('Pricing')
      expect(pricing?.componentSource).toBe('@mdxui/beacon')
    })

    it('should use @mdxui/beacon CTA component', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const cta = site.sections.find(s => s.type === 'cta')

      expect(cta?.component).toBe('CTA')
      expect(cta?.componentSource).toBe('@mdxui/beacon')
    })

    it('should use @mdxui/beacon Footer component', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const footer = site.sections.find(s => s.type === 'footer')

      expect(footer?.component).toBe('Footer')
      expect(footer?.componentSource).toBe('@mdxui/beacon')
    })

    it('should map props correctly to beacon component APIs', () => {
      const app = defineApp({
        name: 'TaskFlow',
        description: 'The best task manager',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const hero = site.sections.find(s => s.type === 'hero')

      // Props should be structured for @mdxui/beacon Hero
      expect(hero?.props).toBeDefined()
      expect(hero!.props!.heading).toBeDefined()
      expect(hero!.props!.subheading).toBeDefined()
    })
  })

  // ============================================================================
  // Responsive Design (Mobile)
  // ============================================================================

  describe('Responsive Design', () => {
    it('should generate mobile-responsive site structure', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      // Site should have responsive flag or breakpoint configs
      expect(site.responsive).toBe(true)
    })

    it('should include mobile viewport meta tag', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      expect(site.meta.viewport).toBe('width=device-width, initial-scale=1')
    })

    it('should support mobile navigation pattern', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      // Header/nav should have mobile menu support
      const header = site.sections.find(s => s.type === 'header' || s.type === 'navbar')
      expect(header?.content.mobileMenu).toBeDefined()
    })

    it('should stack sections vertically on mobile', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      // Layout should be mobile-first
      expect(site.layout.mobile).toBeDefined()
      expect(site.layout.mobile!.direction).toBe('column')
    })
  })

  // ============================================================================
  // SEO Meta Tags
  // ============================================================================

  describe('SEO Meta Tags', () => {
    it('should generate title meta tag', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      expect(site.meta.title).toBeDefined()
      expect(site.meta.title).toContain('TaskFlow')
    })

    it('should generate description meta tag', () => {
      const app = defineApp({
        name: 'TaskFlow',
        description: 'The easiest way to manage your tasks',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      expect(site.meta.description).toBeDefined()
      expect(site.meta.description).toBe('The easiest way to manage your tasks')
    })

    it('should generate Open Graph meta tags', () => {
      const app = defineApp({
        name: 'TaskFlow',
        description: 'Task management made simple',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      expect(site.meta.og).toBeDefined()
      expect(site.meta.og!.title).toContain('TaskFlow')
      expect(site.meta.og!.description).toBe('Task management made simple')
      expect(site.meta.og!.type).toBe('website')
    })

    it('should generate Twitter Card meta tags', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      expect(site.meta.twitter).toBeDefined()
      expect(site.meta.twitter!.card).toBe('summary_large_image')
      expect(site.meta.twitter!.title).toContain('TaskFlow')
    })

    it('should support custom meta tags', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        site: {
          meta: {
            keywords: 'task management, productivity, collaboration',
            author: 'TaskFlow Inc',
            robots: 'index, follow',
          },
        },
      })

      const site = generateSite(app)

      expect(site.meta.keywords).toBe('task management, productivity, collaboration')
      expect(site.meta.author).toBe('TaskFlow Inc')
      expect(site.meta.robots).toBe('index, follow')
    })

    it('should generate canonical URL when domain provided', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        domain: 'taskflow.io',
      })

      const site = generateSite(app)

      expect(site.meta.canonical).toBe('https://taskflow.io')
    })

    it('should include structured data (JSON-LD)', () => {
      const app = defineApp({
        name: 'TaskFlow',
        description: 'Task management platform',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)

      expect(site.meta.jsonLd).toBeDefined()
      expect(site.meta.jsonLd!['@type']).toBe('SoftwareApplication')
      expect(site.meta.jsonLd!.name).toBe('TaskFlow')
    })
  })

  // ============================================================================
  // AI Copy Generation
  // ============================================================================

  describe('AI Copy Generation', () => {
    it('should generate AI copy when context provided', async () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task', 'Project'],
        verbs: {
          Task: ['create', 'complete'],
        },
        context: {
          targetAudience: 'Small business owners',
          uniqueValue: 'AI-powered task prioritization',
          tone: 'professional',
        },
      })

      const site = await generateSite(app, { useAI: true })

      // AI-generated copy should be present
      expect(site.aiGenerated).toBe(true)
    })

    it('should generate hero copy with AI when enabled', async () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        context: {
          problem: 'Teams waste hours on task management',
          solution: 'AI-powered prioritization',
        },
      })

      const site = await generateSite(app, { useAI: true })
      const hero = site.sections.find(s => s.type === 'hero')

      // Hero should have AI-generated headline
      const headline = hero?.content.headline as string | undefined
      expect(headline).toBeDefined()
      expect(headline?.length).toBeGreaterThan(10)
    })

    it('should generate feature descriptions with AI', async () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task', 'Project', 'Team'],
        verbs: {
          Task: ['create', 'prioritize', 'assign'],
        },
        context: {
          targetAudience: 'Software development teams',
        },
      })

      const site = await generateSite(app, { useAI: true })
      const features = site.sections.find(s => s.type === 'features')

      // Feature descriptions should be meaningful
      const items = features?.content.items as Array<{ description: string }> | undefined
      items?.forEach((item) => {
        expect(item.description).toBeDefined()
        expect(item.description.length).toBeGreaterThan(20)
      })
    })

    it('should use StoryBrand framework for AI copy', async () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        context: {
          hero: 'Small business owners',
          villain: 'Chaos and missed deadlines',
          guide: 'TaskFlow',
          plan: 'Simple 3-step process',
          successOutcome: 'Peaceful, organized business',
          failureOutcome: 'Constant stress and lost revenue',
        },
      })

      const site = await generateSite(app, { useAI: true })

      // Copy should address the hero's journey
      expect(site.storyBrand).toBeDefined()
      expect(site.storyBrand!.hero).toBe('Small business owners')
    })

    it('should fall back to generated copy when AI fails', async () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        context: {
          // Intentionally minimal context
        },
      })

      // Mock AI failure
      const site = await generateSite(app, {
        useAI: true,
        _testAIFailure: true,
      })

      // Should still have content
      const hero = site.sections.find(s => s.type === 'hero')
      expect(hero?.content.headline).toBeDefined()
    })

    it('should cache AI-generated copy', async () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
        context: {
          targetAudience: 'Developers',
        },
      })

      // Generate twice
      const site1 = await generateSite(app, { useAI: true })
      const site2 = await generateSite(app, { useAI: true, useCache: true })

      // Should use cached version
      expect(site2.fromCache).toBe(true)
    })

    it('should allow regenerating specific sections', async () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = await generateSite(app, { useAI: true })

      // Regenerate just the hero
      const regenerated = await site.regenerateSection('hero')

      expect(regenerated.sections.find(s => s.type === 'hero')).toBeDefined()
    })
  })

  // ============================================================================
  // SiteGenerator Class
  // ============================================================================

  describe('SiteGenerator Class', () => {
    it('should instantiate with app config', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const generator = new SiteGenerator(app)

      expect(generator).toBeDefined()
      expect(generator.app).toBe(app)
    })

    it('should support builder pattern for customization', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = new SiteGenerator(app)
        .withHero({ variant: 'centered' })
        .withFeatures({ columns: 3 })
        .withPricing({ toggle: true })
        .withTheme('dark')
        .build()

      expect(site).toBeDefined()
    })

    it('should support custom section ordering', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = new SiteGenerator(app)
        .setSectionOrder(['hero', 'pricing', 'features', 'cta', 'footer'])
        .build()

      expect(site.sections[0].type).toBe('hero')
      expect(site.sections[1].type).toBe('pricing')
      expect(site.sections[2].type).toBe('features')
    })

    it('should support adding custom sections', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = new SiteGenerator(app)
        .addSection({
          type: 'testimonials',
          content: {
            items: [
              { quote: 'Great product!', author: 'John Doe', company: 'Acme' },
            ],
          },
        })
        .build()

      expect(site.sections).toContainEqual(
        expect.objectContaining({
          type: 'testimonials',
        })
      )
    })

    it('should support removing default sections', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = new SiteGenerator(app)
        .removeSection('pricing')
        .build()

      expect(site.sections.find(s => s.type === 'pricing')).toBeUndefined()
    })
  })

  // ============================================================================
  // Export Formats
  // ============================================================================

  describe('Export Formats', () => {
    it('should export as React component', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const Component = site.toReact()

      expect(Component).toBeDefined()
      expect(typeof Component).toBe('function')
    })

    it('should export as MDX', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const mdx = site.toMDX()

      expect(mdx).toBeDefined()
      expect(typeof mdx).toBe('string')
      expect(mdx).toContain('import')
    })

    it('should export as HTML', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const html = site.toHTML()

      expect(html).toBeDefined()
      expect(typeof html).toBe('string')
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('TaskFlow')
    })

    it('should export configuration as JSON', () => {
      const app = defineApp({
        name: 'TaskFlow',
        nouns: ['Task'],
        verbs: {},
      })

      const site = generateSite(app)
      const json = site.toJSON()

      expect(json).toBeDefined()
      expect(JSON.parse(json)).toHaveProperty('sections')
      expect(JSON.parse(json)).toHaveProperty('meta')
    })
  })
})
