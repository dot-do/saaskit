/**
 * App Generator Parser
 *
 * Parses noun and verb configurations into structured data
 * for generating React components.
 */

import type { NounsConfig, VerbsConfig, ParsedField, ParsedNoun } from './types'

/**
 * Pluralize a noun name (simple pluralization)
 */
export function pluralize(name: string): string {
  if (name.endsWith('y')) {
    return name.slice(0, -1) + 'ies'
  }
  if (name.endsWith('s') || name.endsWith('x') || name.endsWith('ch') || name.endsWith('sh')) {
    return name + 'es'
  }
  return name + 's'
}

/**
 * Convert PascalCase to kebab-case for URLs
 */
export function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Parse a field type string into a structured field definition
 */
export function parseFieldType(name: string, type: string | string[]): ParsedField {
  // Handle array types (many relations)
  if (Array.isArray(type)) {
    const innerType = type[0]
    const parsed = parseFieldType(name, innerType)
    parsed.cardinality = 'many'
    return parsed
  }

  // Check for optional marker
  const optional = type.endsWith('?')
  const cleanType = optional ? type.slice(0, -1) : type

  // Check for union type (e.g., 'pending | paid | shipped')
  if (cleanType.includes(' | ')) {
    const options = cleanType.split(' | ').map((s) => s.trim())
    return {
      name,
      type: 'union',
      optional,
      options,
      cardinality: 'one',
    }
  }

  // Check for relation operators
  if (cleanType.startsWith('->')) {
    return {
      name,
      type: 'relation',
      optional,
      relationTarget: cleanType.slice(2),
      relationDirection: 'forward',
      cardinality: 'one',
    }
  }

  if (cleanType.startsWith('<-')) {
    return {
      name,
      type: 'relation',
      optional,
      relationTarget: cleanType.slice(2),
      relationDirection: 'reverse',
      cardinality: 'one',
    }
  }

  if (cleanType.startsWith('~>')) {
    return {
      name,
      type: 'relation',
      optional,
      relationTarget: cleanType.slice(2),
      relationDirection: 'forward',
      cardinality: 'one',
    }
  }

  if (cleanType.startsWith('<~')) {
    return {
      name,
      type: 'relation',
      optional,
      relationTarget: cleanType.slice(2),
      relationDirection: 'reverse',
      cardinality: 'one',
    }
  }

  // Simple types
  const simpleType = cleanType as 'string' | 'number' | 'boolean' | 'date' | 'markdown'
  return {
    name,
    type: simpleType,
    optional,
    cardinality: 'one',
  }
}

/**
 * Parse nouns configuration into structured noun definitions
 */
export function parseNouns(nouns: NounsConfig): ParsedNoun[] {
  return Object.entries(nouns).map(([name, fields]) => {
    const parsedFields = Object.entries(fields).map(([fieldName, fieldType]) =>
      parseFieldType(fieldName, fieldType as string | string[])
    )

    return {
      name,
      pluralName: pluralize(name).toLowerCase(),
      fields: parsedFields,
    }
  })
}

/**
 * Get verbs for a specific noun
 */
export function getVerbsForNoun(verbs: VerbsConfig | undefined, nounName: string): string[] {
  if (!verbs || !verbs[nounName]) {
    return []
  }
  return Object.keys(verbs[nounName])
}

/**
 * Check if a verb is destructive (requires confirmation)
 */
export function isDestructiveVerb(verbName: string): boolean {
  const destructiveVerbs = ['delete', 'remove', 'cancel', 'revoke', 'terminate', 'destroy']
  return destructiveVerbs.includes(verbName.toLowerCase())
}

/**
 * Generate available webhook events from nouns and verbs
 */
export function generateWebhookEvents(nouns: ParsedNoun[], verbs: VerbsConfig | undefined): string[] {
  const events: string[] = []

  for (const noun of nouns) {
    // Built-in CRUD events
    events.push(`${noun.name}.created`)
    events.push(`${noun.name}.updated`)
    events.push(`${noun.name}.deleted`)

    // Verb events
    const nounVerbs = getVerbsForNoun(verbs, noun.name)
    for (const verb of nounVerbs) {
      // Convert verb to past tense for event name
      const pastTense = verb.endsWith('e') ? verb + 'd' : verb + 'ed'
      events.push(`${noun.name}.${pastTense}`)
    }
  }

  return events
}
