/**
 * Site Meta Generator
 *
 * Generates SEO meta tags, Open Graph, Twitter Cards,
 * and JSON-LD structured data for the landing page.
 *
 * @packageDocumentation
 */

import type { SiteMeta } from './types'
import type { ExtendedAppConfig } from './sections'

// ============================================================================
// Meta Generation
// ============================================================================

/**
 * Generate comprehensive SEO meta tags
 *
 * Creates meta configuration including title, description,
 * Open Graph, Twitter Cards, and JSON-LD structured data.
 *
 * @param config - App configuration
 * @returns Complete meta configuration
 *
 * @example
 * ```ts
 * const meta = generateMeta({
 *   name: 'TaskFlow',
 *   description: 'Task management made simple',
 *   domain: 'taskflow.io',
 * })
 *
 * // meta.title === 'TaskFlow'
 * // meta.og.title === 'TaskFlow'
 * // meta.canonical === 'https://taskflow.io'
 * ```
 */
export function generateMeta(config: ExtendedAppConfig): SiteMeta {
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

    // Also add to Open Graph
    if (meta.og) {
      meta.og.url = `https://${config.domain}`
      meta.og.siteName = appName
    }
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
// JSON-LD Helpers
// ============================================================================

/**
 * Generate JSON-LD for SoftwareApplication schema
 *
 * @param config - App configuration
 * @returns JSON-LD object
 */
export function generateSoftwareApplicationLD(
  config: ExtendedAppConfig
): Record<string, unknown> {
  const appName = config.name || 'App'
  const description = config.description || `${appName} application`

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: appName,
    description,
    applicationCategory: 'BusinessApplication',
  }

  // Add URL if domain is provided
  if (config.domain) {
    jsonLd.url = `https://${config.domain}`
  }

  // Add pricing offers if plans are defined
  if (config.plans && Object.keys(config.plans).length > 0) {
    const offers = Object.entries(config.plans).map(([name, plan]) => ({
      '@type': 'Offer',
      name,
      price: plan.price,
      priceCurrency: 'USD',
    }))

    jsonLd.offers = offers
  }

  return jsonLd
}

/**
 * Generate JSON-LD for Organization schema
 *
 * @param config - App configuration
 * @returns JSON-LD object
 */
export function generateOrganizationLD(
  config: ExtendedAppConfig
): Record<string, unknown> {
  const appName = config.name || 'App'
  const social = config.site?.footer?.social

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: appName,
  }

  // Add URL if domain is provided
  if (config.domain) {
    jsonLd.url = `https://${config.domain}`
  }

  // Add social links
  if (social) {
    const sameAs: string[] = []
    if (social.twitter) sameAs.push(social.twitter)
    if (social.github) sameAs.push(social.github)
    if (social.linkedin) sameAs.push(social.linkedin)
    if (social.facebook) sameAs.push(social.facebook)
    if (social.instagram) sameAs.push(social.instagram)
    if (social.youtube) sameAs.push(social.youtube)

    if (sameAs.length > 0) {
      jsonLd.sameAs = sameAs
    }
  }

  return jsonLd
}
