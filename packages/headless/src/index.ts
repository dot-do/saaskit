/**
 * @saaskit/headless
 *
 * A minimal, elegant interface for defining headless SaaS apps for AI Agents.
 *
 * Properties are strings, actions/events are functions, null blocks standard actions.
 * Standard CRUD (create, get, update, delete, find) is automatic for all nouns.
 * Search uses mongo-style queries built into the platform.
 *
 * @example
 * ```typescript
 * const CRM = SaaS('crm', {
 *   Contact: {
 *     // Properties
 *     email: 'string!',
 *     name: 'string',
 *     company: '-> Company',
 *
 *     // Custom action (verb)
 *     merge: (target, $) => $.Contact.update(target.id, { ...$.args }),
 *
 *     // Custom event handler (past tense)
 *     scored: (contact, $) => $.emit('contact.high-value', contact),
 *
 *     // Block standard action
 *     delete: null,
 *
 *     // Conditionally block
 *     create: (data, $) => $.actor?.type === 'admin' ? data : null,
 *   },
 *
 *   Company: {
 *     name: 'string!',
 *     domain: 'string',
 *     contacts: '<- Contact.company[]',
 *   },
 * })
 *
 * // Every noun automatically gets:
 * // - Actions: create, get, update, delete (unless blocked)
 * // - Events: created, updated, deleted (automatic)
 * // - Search: $.Contact.find({ email: 'foo@bar.com' }) (mongo-style)
 * ```
 */

import type { ActionFn, EventFn, NounDefinition, NounDefinitions, ParsedNoun, ParsedNouns, ParsedProperty, ParsedRelation, SaaSApp } from './types'

export * from './types'

// Re-export verb conjugation from verbs.org.ai
// TODO: Once package resolution is set up, import from 'verbs.org.ai'
export { toEvent, toActivity, toInverse, isPastTense, conjugate } from './verbs'

/**
 * Create a headless SaaS app
 */
export function SaaS<TNouns extends NounDefinitions>(name: string, nouns: TNouns): SaaSApp<TNouns> {
  const parsedNouns = {} as Record<string, ParsedNoun>
  const triggers = {} as Record<string, string[]>
  const actions = {} as Record<string, string[]>

  // Parse each noun definition
  for (const [nounName, definition] of Object.entries(nouns)) {
    const parsed = parseNoun(nounName, definition)
    parsedNouns[nounName] = parsed

    // Generate Zapier-style interface from parsed noun
    triggers[nounName] = generateTriggers(parsed)
    actions[nounName] = generateActions(parsed)
  }

  return {
    name,
    nouns: parsedNouns as ParsedNouns<TNouns>,
    triggers: triggers as { [K in keyof TNouns]: string[] },
    actions: actions as { [K in keyof TNouns]: string[] },
  }
}

// Import verb functions for internal use
import { toEvent, isPastTense } from './verbs'

/**
 * Parse a noun definition into properties, relations, actions, events, and blocked
 */
function parseNoun(name: string, definition: NounDefinition): ParsedNoun {
  const properties: Record<string, ParsedProperty> = {}
  const relations: Record<string, ParsedRelation> = {}
  const actions: Record<string, ActionFn> = {}
  const events: Record<string, EventFn> = {}
  const blocked: Set<string> = new Set()

  for (const [key, value] of Object.entries(definition)) {
    if (value === null) {
      // Explicitly blocked action
      blocked.add(key)
    } else if (typeof value === 'function') {
      // Function - could be action or event
      // Past tense = event handler, otherwise = action
      if (isPastTense(key)) {
        events[key] = value as EventFn
      } else {
        actions[key] = value as ActionFn
      }
    } else if (typeof value === 'string') {
      // String - property or relation
      const relation = parseRelation(key, value)
      if (relation) {
        relations[key] = relation
      } else {
        properties[key] = parseProperty(key, value)
      }
    }
  }

  return { name, properties, relations, actions, events, blocked }
}

/**
 * Parse a property type definition
 */
function parseProperty(name: string, typeDef: string): ParsedProperty {
  let type = typeDef
  let required = false
  let indexed = false
  let array = false

  // Check modifiers
  if (type.endsWith('!')) {
    required = true
    type = type.slice(0, -1)
  }
  if (type.endsWith('#')) {
    indexed = true
    type = type.slice(0, -1)
  }
  if (type.endsWith('[]')) {
    array = true
    type = type.slice(0, -2)
  }
  if (type.endsWith('?')) {
    type = type.slice(0, -1)
  }

  return { name, type, required, indexed, array }
}

/**
 * Parse a relation definition, returns null if not a relation
 */
function parseRelation(name: string, typeDef: string): ParsedRelation | null {
  const forwardMatch = typeDef.match(/^->\s*(.+)$/)
  const backwardMatch = typeDef.match(/^<-\s*(.+)$/)
  const fuzzyForwardMatch = typeDef.match(/^~>\s*(.+)$/)
  const fuzzyBackwardMatch = typeDef.match(/^<~\s*(.+)$/)

  if (forwardMatch) {
    const [target, array] = parseRelationTarget(forwardMatch[1])
    return { name, target, type: 'forward', array }
  }

  if (backwardMatch) {
    const [target, array, field] = parseRelationTarget(backwardMatch[1])
    return { name, target, type: 'backward', array, field }
  }

  if (fuzzyForwardMatch) {
    const [target, array] = parseRelationTarget(fuzzyForwardMatch[1])
    return { name, target, type: 'fuzzy-forward', array }
  }

  if (fuzzyBackwardMatch) {
    const [target, array] = parseRelationTarget(fuzzyBackwardMatch[1])
    return { name, target, type: 'fuzzy-backward', array }
  }

  return null
}

/**
 * Parse relation target (e.g., "Contact.company[]" -> ["Contact", true, "company"])
 */
function parseRelationTarget(target: string): [string, boolean, string?] {
  const array = target.endsWith('[]')
  const clean = array ? target.slice(0, -2) : target

  const dotIndex = clean.indexOf('.')
  if (dotIndex > 0) {
    return [clean.slice(0, dotIndex), array, clean.slice(dotIndex + 1)]
  }

  return [clean, array]
}

/**
 * Generate triggers for a noun (events that can trigger workflows)
 */
function generateTriggers(noun: ParsedNoun): string[] {
  const triggers: string[] = []

  // Standard CRUD triggers (unless blocked)
  if (!noun.blocked.has('create')) triggers.push('created')
  if (!noun.blocked.has('update')) triggers.push('updated')
  if (!noun.blocked.has('delete')) triggers.push('deleted')

  // Triggers from custom actions (action -> event via past tense)
  for (const actionName of Object.keys(noun.actions)) {
    triggers.push(toEvent(actionName))
  }

  // Custom event handlers are also triggers
  for (const eventName of Object.keys(noun.events)) {
    triggers.push(eventName)
  }

  return [...new Set(triggers)]
}

/**
 * Generate actions for a noun (operations that can be performed)
 */
function generateActions(noun: ParsedNoun): string[] {
  const actions: string[] = []

  // Standard CRUD actions (unless blocked)
  if (!noun.blocked.has('create')) actions.push('create')
  if (!noun.blocked.has('get')) actions.push('get')
  if (!noun.blocked.has('update')) actions.push('update')
  if (!noun.blocked.has('delete')) actions.push('delete')
  if (!noun.blocked.has('find')) actions.push('find')

  // Custom actions from the noun definition
  for (const actionName of Object.keys(noun.actions)) {
    actions.push(actionName)
  }

  return [...new Set(actions)]
}
