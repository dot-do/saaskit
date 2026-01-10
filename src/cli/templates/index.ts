/**
 * Template exports
 */

export * from './minimal'
export * from './todo'
export * from './ecommerce'
export * from './recruiter'

export type TemplateName = 'minimal' | 'todo' | 'ecommerce' | 'recruiter'

export const AVAILABLE_TEMPLATES: TemplateName[] = ['minimal', 'todo', 'ecommerce', 'recruiter']

export const TEMPLATE_DESCRIPTIONS: Record<TemplateName, string> = {
  minimal: 'A minimal starter template with basic structure',
  todo: 'A todo list application with CRUD operations',
  ecommerce: 'An e-commerce platform with customers, orders, and products',
  recruiter: 'An AI-powered recruiting platform with candidate matching',
}
