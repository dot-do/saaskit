/**
 * saaskit components
 *
 * Export all components including the main SaaS component and built-in pages.
 */

// Main SaaS component
export { SaaS, default as SaaSAdmin } from './SaaS'
export type { SaaSProps, ResourceConfig } from './SaaS'

// Built-in pages
export * from './pages'
