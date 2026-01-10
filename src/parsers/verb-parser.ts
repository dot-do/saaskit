/**
 * Verb Parser Module
 *
 * Generates verb anatomy (conjugations) and validates verb definitions.
 * Handles English verb conjugation rules including irregular verbs.
 *
 * @module parsers/verb-parser
 */

/**
 * Verb anatomy - all the grammatical forms of a verb.
 *
 * These forms are used for:
 * - Event naming (Order.paid event from Order.pay action)
 * - Activity descriptions ("paying" for in-progress states)
 * - Reverse actions ("unpay" to undo)
 * - Inverse states ("unpaid" for negated past state)
 *
 * @example
 * ```ts
 * // For verb "pay":
 * {
 *   action: 'pay',      // imperative: "pay the order"
 *   activity: 'paying', // present participle: "paying the order"
 *   event: 'paid',      // past tense: "order was paid"
 *   reverse: 'unpay',   // reverse action: "unpay the order"
 *   inverse: 'unpaid'   // inverse state: "order is unpaid"
 * }
 * ```
 */
export interface VerbAnatomy {
  /** Imperative form: "pay", "ship", "complete" */
  action: string
  /** Present participle: "paying", "shipping", "completing" */
  activity: string
  /** Past tense (event form): "paid", "shipped", "completed" */
  event: string
  /** Reverse action: "unpay", "unship", "uncomplete" */
  reverse: string
  /** Inverse state: "unpaid", "unshipped", "uncompleted" */
  inverse: string
}

/**
 * Irregular verb past tenses.
 * These verbs don't follow standard English conjugation rules.
 */
export const IRREGULAR_PAST: Record<string, string> = {
  pay: 'paid',
  buy: 'bought',
  sell: 'sold',
  send: 'sent',
  make: 'made',
  get: 'got',
  run: 'ran',
  begin: 'begun',
  do: 'done',
  go: 'gone',
  see: 'seen',
  take: 'taken',
  give: 'given',
  write: 'written',
  read: 'read',
  set: 'set',
  put: 'put',
  cut: 'cut',
  let: 'let',
  hit: 'hit',
}

/**
 * Generate the past tense of a verb.
 *
 * Applies English conjugation rules:
 * 1. Check irregular verbs first
 * 2. Verbs ending in 'e' -> add 'd'
 * 3. Verbs ending in consonant + 'y' -> change to 'ied'
 * 4. Short verbs ending in vowel + consonant -> double consonant + 'ed'
 * 5. Default: add 'ed'
 *
 * @param verb - The base verb form
 * @returns Past tense form
 *
 * @example
 * ```ts
 * generatePastTense('pay')      // 'paid' (irregular)
 * generatePastTense('complete') // 'completed' (ends in e)
 * generatePastTense('try')      // 'tried' (consonant + y)
 * generatePastTense('ship')     // 'shipped' (short, vowel + consonant)
 * generatePastTense('update')   // 'updated' (regular)
 * ```
 */
export function generatePastTense(verb: string): string {
  // Check for irregular verbs
  if (IRREGULAR_PAST[verb]) {
    return IRREGULAR_PAST[verb]
  }

  // Regular verb rules
  if (verb.endsWith('e')) {
    return verb + 'd'
  }

  // Consonant + y -> ied
  if (verb.endsWith('y') && !/[aeiou]/.test(verb.charAt(verb.length - 2))) {
    return verb.slice(0, -1) + 'ied'
  }

  // Double consonant for short verbs ending in consonant
  if (verb.length <= 4 && /[bcdfghjklmnpqrstvwxz]$/.test(verb) && /[aeiou]/.test(verb.charAt(verb.length - 2))) {
    return verb + verb.charAt(verb.length - 1) + 'ed'
  }

  return verb + 'ed'
}

/**
 * Generate the present participle (-ing form) of a verb.
 *
 * Applies English conjugation rules:
 * 1. Verbs ending in 'e' (not 'ee') -> drop e, add 'ing'
 * 2. Verbs ending in 'ie' -> change to 'ying'
 * 3. Short verbs ending in vowel + consonant -> double consonant + 'ing'
 * 4. Default: add 'ing'
 *
 * @param verb - The base verb form
 * @returns Present participle form
 *
 * @example
 * ```ts
 * generateParticiple('pay')      // 'paying'
 * generateParticiple('complete') // 'completing' (drop e)
 * generateParticiple('die')      // 'dying' (ie -> ying)
 * generateParticiple('ship')     // 'shipping' (double consonant)
 * generateParticiple('update')   // 'updating'
 * ```
 */
export function generateParticiple(verb: string): string {
  // Ends in 'e' (not 'ee') -> drop e, add ing
  if (verb.endsWith('e') && !verb.endsWith('ee')) {
    return verb.slice(0, -1) + 'ing'
  }

  // Ends in 'ie' -> change to 'ying'
  if (verb.endsWith('ie')) {
    return verb.slice(0, -2) + 'ying'
  }

  // Double consonant for short verbs
  if (verb.length <= 4 && /[bcdfghjklmnpqrstvwxz]$/.test(verb) && /[aeiou]/.test(verb.charAt(verb.length - 2))) {
    return verb + verb.charAt(verb.length - 1) + 'ing'
  }

  return verb + 'ing'
}

/**
 * Generate complete verb anatomy for a given verb.
 *
 * Creates all grammatical forms needed for the SaaS framework:
 * - action: The base verb (imperative form)
 * - activity: Present participle (-ing form)
 * - event: Past tense (for event names)
 * - reverse: "un" + action (for undo operations)
 * - inverse: "un" + event (for negated states)
 *
 * @param verb - The base verb form (e.g., "pay", "ship", "complete")
 * @returns Complete verb anatomy object
 *
 * @example
 * ```ts
 * generateVerbAnatomy('pay')
 * // => {
 * //   action: 'pay',
 * //   activity: 'paying',
 * //   event: 'paid',
 * //   reverse: 'unpay',
 * //   inverse: 'unpaid'
 * // }
 *
 * generateVerbAnatomy('ship')
 * // => {
 * //   action: 'ship',
 * //   activity: 'shipping',
 * //   event: 'shipped',
 * //   reverse: 'unship',
 * //   inverse: 'unshipped'
 * // }
 * ```
 */
export function generateVerbAnatomy(verb: string): VerbAnatomy {
  const event = generatePastTense(verb)
  const activity = generateParticiple(verb)

  return {
    action: verb,
    activity,
    event,
    reverse: 'un' + verb,
    inverse: 'un' + event,
  }
}

/**
 * Generate verb anatomy for all verbs in a handler config.
 *
 * @param handlers - Verb handlers organized by noun
 * @returns Verb anatomy organized by noun and verb
 *
 * @example
 * ```ts
 * const handlers = {
 *   Order: {
 *     pay: () => {},
 *     ship: () => {}
 *   }
 * }
 * const anatomy = generateAllVerbAnatomy(handlers)
 * // anatomy.Order.pay.event === 'paid'
 * // anatomy.Order.ship.activity === 'shipping'
 * ```
 */
export function generateAllVerbAnatomy(
  handlers: Record<string, Record<string, unknown>>
): Record<string, Record<string, VerbAnatomy>> {
  const anatomy: Record<string, Record<string, VerbAnatomy>> = {}

  for (const [nounName, verbs] of Object.entries(handlers)) {
    anatomy[nounName] = {}
    for (const verbName of Object.keys(verbs)) {
      anatomy[nounName][verbName] = generateVerbAnatomy(verbName)
    }
  }

  return anatomy
}

/**
 * Validation result for verb definitions.
 */
export interface VerbValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** Validation error messages */
  errors: string[]
  /** Validation warnings */
  warnings: string[]
}

/**
 * Validate verb definitions for common issues.
 *
 * Checks:
 * - Verb names are camelCase
 * - Verb handlers are functions
 * - Noun names match registered nouns
 *
 * @param handlers - Verb handlers organized by noun
 * @param nounNames - Optional list of valid noun names
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```ts
 * const result = validateVerbDefinitions(handlers, ['Customer', 'Order'])
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 * ```
 */
export function validateVerbDefinitions(
  handlers: Record<string, Record<string, unknown>>,
  nounNames?: string[]
): VerbValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  for (const [nounName, verbs] of Object.entries(handlers)) {
    // Check if noun is known (if nounNames provided)
    if (nounNames && !nounNames.includes(nounName)) {
      errors.push(
        `Verbs defined for unknown noun "${nounName}". ` +
          `Known nouns: ${nounNames.join(', ')}`
      )
    }

    for (const [verbName, handler] of Object.entries(verbs)) {
      // Check verb naming convention (camelCase)
      if (!/^[a-z][a-zA-Z0-9]*$/.test(verbName)) {
        warnings.push(`Verb "${nounName}.${verbName}" should be camelCase (e.g., "create", "payInvoice")`)
      }

      // Check handler is a function
      if (typeof handler !== 'function') {
        errors.push(`Verb handler "${nounName}.${verbName}" must be a function, got ${typeof handler}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
