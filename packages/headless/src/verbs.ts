/**
 * Verb Conjugation System
 *
 * Provides complete conjugation for verbs across all tenses.
 * Based on the comprehensive system from @graphdl/semantics.
 *
 * @see https://verbs.org.ai
 * @license CC-BY-SA-4.0
 */

/**
 * Irregular past tense forms
 */
export const IRREGULAR_PAST_TENSE: Record<string, string> = {
  send: 'sent',
  build: 'built',
  buy: 'bought',
  catch: 'caught',
  fight: 'fought',
  find: 'found',
  get: 'got',
  have: 'had',
  hear: 'heard',
  keep: 'kept',
  leave: 'left',
  lose: 'lost',
  make: 'made',
  meet: 'met',
  pay: 'paid',
  read: 'read',
  run: 'ran',
  say: 'said',
  sell: 'sold',
  set: 'set',
  sit: 'sat',
  speak: 'spoke',
  spend: 'spent',
  stand: 'stood',
  take: 'took',
  teach: 'taught',
  tell: 'told',
  think: 'thought',
  understand: 'understood',
  write: 'wrote',
  go: 'went',
  come: 'came',
  know: 'knew',
  see: 'saw',
  give: 'gave',
  bring: 'brought',
  begin: 'began',
  break: 'broke',
  choose: 'chose',
  win: 'won',
  draw: 'drew',
  drive: 'drove',
  eat: 'ate',
  fall: 'fell',
  fly: 'flew',
  forget: 'forgot',
  grow: 'grew',
  hide: 'hid',
  hold: 'held',
  lead: 'led',
  lie: 'lay',
  ride: 'rode',
  ring: 'rang',
  rise: 'rose',
  shake: 'shook',
  shine: 'shone',
  show: 'showed',
  sing: 'sang',
  sink: 'sank',
  sleep: 'slept',
  slide: 'slid',
  spring: 'sprang',
  steal: 'stole',
  stick: 'stuck',
  strike: 'struck',
  swear: 'swore',
  sweep: 'swept',
  swim: 'swam',
  swing: 'swung',
  tear: 'tore',
  throw: 'threw',
  wake: 'woke',
  wear: 'wore',
  weep: 'wept',
}

/**
 * Irregular third person forms
 */
export const IRREGULAR_THIRD_PERSON: Record<string, string> = {
  be: 'is',
  have: 'has',
  do: 'does',
  go: 'goes',
}

/**
 * Irregular subject nouns (actor forms)
 */
export const IRREGULAR_SUBJECT_NOUNS: Record<string, string> = {
  act: 'Actor',
  advise: 'Advisor',
  audit: 'Auditor',
  create: 'Creator',
  direct: 'Director',
  edit: 'Editor',
  educate: 'Educator',
  invent: 'Inventor',
  invest: 'Investor',
  navigate: 'Navigator',
  operate: 'Operator',
  supervise: 'Supervisor',
  survey: 'Surveyor',
  translate: 'Translator',
  vend: 'Vendor',
  visit: 'Visitor',
}

/**
 * Irregular object nouns (result forms)
 */
export const IRREGULAR_OBJECT_NOUNS: Record<string, string> = {
  arrive: 'Arrival',
  approve: 'Approval',
  deny: 'Denial',
  dispose: 'Disposal',
  propose: 'Proposal',
  refuse: 'Refusal',
  remove: 'Removal',
  renew: 'Renewal',
  retrieve: 'Retrieval',
  reverse: 'Reversal',
  survive: 'Survival',
  try: 'Trial',
  betray: 'Betrayal',
  bury: 'Burial',
  defend: 'Defense',
  die: 'Death',
  live: 'Life',
  lose: 'Loss',
  prove: 'Proof',
  speak: 'Speech',
  succeed: 'Success',
  fail: 'Failure',
  behave: 'Behavior',
  choose: 'Choice',
  fly: 'Flight',
  grow: 'Growth',
  please: 'Pleasure',
  press: 'Pressure',
  see: 'Sight',
  sell: 'Sale',
  serve: 'Service',
  sit: 'Seat',
  solve: 'Solution',
  think: 'Thought',
  weigh: 'Weight',
  know: 'Knowledge',
  move: 'Movement',
  destroy: 'Destruction',
  receive: 'Reception',
  transport: 'Transportation',
  develop: 'Development',
  determine: 'Determination',
}

/**
 * Convert a verb to action form (base/infinitive)
 * @example toAction('create') // 'create'
 */
export function toAction(verb: string): string {
  if (!verb?.trim()) throw new Error('toAction: verb cannot be empty')
  return verb
}

/**
 * Convert a verb to activity form (gerund/present continuous)
 * @example toActivity('create') // 'creating'
 */
export function toActivity(verb: string): string {
  if (!verb?.trim()) throw new Error('toActivity: verb cannot be empty')

  // Double final consonant for CVC pattern (short words)
  if (/[^aeiou][aeiou][^aeiouwxy]$/i.test(verb) && verb.length <= 5) {
    return verb + verb[verb.length - 1] + 'ing'
  }

  // Words ending in 'ie': change to 'ying'
  if (/ie$/i.test(verb)) {
    return verb.slice(0, -2) + 'ying'
  }

  // Words ending in 'e' (not 'ee', 'oe', 'ye'): drop 'e' and add 'ing'
  if (/[^eoy]e$/i.test(verb)) {
    return verb.slice(0, -1) + 'ing'
  }

  return verb + 'ing'
}

/**
 * Convert a verb to event form (past tense)
 * @example toEvent('create') // 'created'
 * @example toEvent('send') // 'sent'
 */
export function toEvent(verb: string): string {
  if (!verb?.trim()) throw new Error('toEvent: verb cannot be empty')

  const lower = verb.toLowerCase()

  // Check for irregular past tense
  if (IRREGULAR_PAST_TENSE[lower]) {
    return preserveCase(verb, IRREGULAR_PAST_TENSE[lower])
  }

  // Words ending in 'e': add 'd'
  if (/e$/i.test(verb)) {
    return appendWithCase(verb, 'd')
  }

  // Words ending in consonant + 'y': change to 'ied'
  if (/[^aeiou]y$/i.test(verb)) {
    return appendWithCase(verb.slice(0, -1), 'ied')
  }

  // Double final consonant for CVC pattern (short words)
  if (/[^aeiou][aeiou][^aeiouwxy]$/i.test(verb) && verb.length <= 5) {
    return appendWithCase(verb + verb[verb.length - 1], 'ed')
  }

  return appendWithCase(verb, 'ed')
}

/**
 * Convert a verb to inverse/passive form (past + By)
 * @example toInverse('create') // 'createdBy'
 */
export function toInverse(verb: string): string {
  if (!verb?.trim()) throw new Error('toInverse: verb cannot be empty')
  return toEvent(verb) + 'By'
}

/**
 * Convert a verb to third person singular form
 * @example toThirdPerson('create') // 'creates'
 */
export function toThirdPerson(verb: string): string {
  if (!verb?.trim()) throw new Error('toThirdPerson: verb cannot be empty')

  const lower = verb.toLowerCase()

  if (IRREGULAR_THIRD_PERSON[lower]) {
    return preserveCase(verb, IRREGULAR_THIRD_PERSON[lower])
  }

  // Words ending in consonant + 'y': change to 'ies'
  if (/[^aeiou]y$/i.test(verb)) {
    return appendWithCase(verb.slice(0, -1), 'ies')
  }

  // Words ending in 's', 'ss', 'x', 'z', 'ch', 'sh': add 'es'
  if (/(?:s|ss|x|z|ch|sh)$/i.test(verb)) {
    return appendWithCase(verb, 'es')
  }

  // Words ending in 'o' preceded by consonant: add 'es'
  if (/[^aeiou]o$/i.test(verb)) {
    return appendWithCase(verb, 'es')
  }

  return appendWithCase(verb, 's')
}

/**
 * Convert a verb to subject noun form (actor)
 * @example toSubjectNoun('create') // 'Creator'
 */
export function toSubjectNoun(verb: string): string {
  if (!verb?.trim()) throw new Error('toSubjectNoun: verb cannot be empty')

  const lower = verb.toLowerCase()

  if (IRREGULAR_SUBJECT_NOUNS[lower]) {
    return IRREGULAR_SUBJECT_NOUNS[lower]
  }

  // Words ending in 'e': drop 'e' and add 'er'
  if (/[^aeiou]e$/i.test(verb)) {
    const stem = verb.slice(0, -1)
    return capitalize(stem) + 'er'
  }

  // Words ending in consonant + 'y': change to 'ier'
  if (/[^aeiou]y$/i.test(verb)) {
    const stem = verb.slice(0, -1)
    return capitalize(stem) + 'ier'
  }

  // Double final consonant for CVC pattern (short words)
  if (/[^aeiou][aeiou][^aeiouwxy]$/i.test(verb) && verb.length <= 5) {
    return capitalize(verb + verb[verb.length - 1]) + 'er'
  }

  return capitalize(verb) + 'er'
}

/**
 * Convert a verb to object noun form (result)
 * @example toObjectNoun('create') // 'Creation'
 */
export function toObjectNoun(verb: string): string {
  if (!verb?.trim()) throw new Error('toObjectNoun: verb cannot be empty')

  const lower = verb.toLowerCase()

  if (IRREGULAR_OBJECT_NOUNS[lower]) {
    return IRREGULAR_OBJECT_NOUNS[lower]
  }

  // Words ending in 'ate': change to 'ation'
  if (/ate$/i.test(verb)) {
    return capitalize(verb.slice(0, -3)) + 'ation'
  }

  // Words ending in 'ify': change to 'ification'
  if (/ify$/i.test(verb)) {
    return capitalize(verb.slice(0, -3)) + 'ification'
  }

  // Words ending in 'ize': change to 'ization'
  if (/ize$/i.test(verb)) {
    return capitalize(verb.slice(0, -3)) + 'ization'
  }

  // Words ending in 'e': change to 'ion'
  if (/[^i]e$/i.test(verb)) {
    return capitalize(verb.slice(0, -1)) + 'ion'
  }

  // Words ending in consonant + 'y': change to 'ication'
  if (/[^aeiou]y$/i.test(verb)) {
    return capitalize(verb.slice(0, -1)) + 'ication'
  }

  // Words ending in 't': use -ion
  if (/[^s]t$/i.test(verb)) {
    return capitalize(verb) + 'ion'
  }

  return capitalize(verb) + 'ment'
}

/**
 * Check if a word is in past tense
 */
export function isPastTense(word: string): boolean {
  const pastTenses = Object.values(IRREGULAR_PAST_TENSE)
  if (pastTenses.includes(word.toLowerCase())) return true
  if (word.endsWith('ed')) return true
  if (word.endsWith('ied')) return true
  return false
}

/**
 * Get all conjugation forms for a verb
 */
export function conjugate(verb: string) {
  return {
    base: toAction(verb),
    activity: toActivity(verb),
    event: toEvent(verb),
    inverse: toInverse(verb),
    thirdPerson: toThirdPerson(verb),
    subjectNoun: toSubjectNoun(verb),
    objectNoun: toObjectNoun(verb),
  }
}

// Helper functions
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function preserveCase(original: string, transformed: string): string {
  if (original === original.toUpperCase() && original !== original.toLowerCase()) {
    return transformed.toUpperCase()
  }
  if (original[0] === original[0].toUpperCase()) {
    return transformed[0].toUpperCase() + transformed.slice(1)
  }
  return transformed
}

function appendWithCase(word: string, suffix: string): string {
  if (word === word.toUpperCase() && word !== word.toLowerCase()) {
    return word + suffix.toUpperCase()
  }
  return word + suffix
}
