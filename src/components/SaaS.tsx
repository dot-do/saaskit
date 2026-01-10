import type { ReactNode, ReactElement } from 'react'
import * as React from 'react'

/**
 * Parsed field type information
 */
interface ParsedFieldType {
  type: string
  optional: boolean
}

/**
 * Parsed relation type information
 */
interface ParsedRelation {
  type: 'relation'
  target: string
  direction: 'forward' | 'reverse' | 'semantic' | 'reverse-semantic'
  cardinality: 'one' | 'many'
}

/**
 * Relation record for tracking all parsed relations
 */
interface RelationRecord {
  from: string
  to: string
  field: string
  type: 'forward' | 'reverse' | 'semantic' | 'reverse-semantic'
  cardinality: 'one' | 'many'
}

/**
 * Verb anatomy - all the forms of a verb
 */
interface VerbAnatomy {
  action: string // imperative: "pay"
  activity: string // present participle: "paying"
  event: string // past tense: "paid"
  reverse: string // reverse action: "unpay"
  inverse: string // inverse state: "unpaid"
}

/**
 * Schedule handler function
 */
type ScheduleHandler = (ctx: SaaSContext) => void | Promise<void>

/**
 * Schedule registration record
 */
interface ScheduleRecord {
  interval: string
  time?: string
  handler: ScheduleHandler
}

/**
 * Event handler function
 */
type EventHandler = (entity: unknown, ctx: SaaSContext) => void | Promise<void>

/**
 * Schedule builder for fluent API
 */
interface ScheduleBuilder {
  at: (time: string) => (handler: ScheduleHandler) => void
}

/**
 * Every builder for schedule registration
 */
interface EveryBuilder {
  day: ScheduleBuilder
  Monday: ScheduleBuilder
  Tuesday: ScheduleBuilder
  Wednesday: ScheduleBuilder
  Thursday: ScheduleBuilder
  Friday: ScheduleBuilder
  Saturday: ScheduleBuilder
  Sunday: ScheduleBuilder
  [key: string]: ScheduleBuilder
}

/**
 * On builder for event registration (proxy-based)
 */
interface OnBuilder {
  [noun: string]: {
    [event: string]: (handler: EventHandler) => void
  }
}

/**
 * SaaS context ($) provided to children function
 */
interface SaaSContext {
  /** Register noun definitions */
  nouns: (definitions: Record<string, Record<string, string | string[]>>) => void
  /** Register verb handlers */
  verbs: (handlers: Record<string, Record<string, (ctx: unknown) => unknown>>) => void
  /** Registered nouns (internal) */
  _registeredNouns: Record<string, Record<string, ParsedFieldType | ParsedRelation>>
  /** Registered verbs (internal) */
  _registeredVerbs: Record<string, Record<string, (ctx: unknown) => unknown>>
  /** Verb anatomy for all registered verbs (internal) */
  _verbAnatomy: Record<string, Record<string, VerbAnatomy>>
  /** Parsed relations (internal) */
  _parsedRelations: RelationRecord[]
  /** Registered events (internal) */
  _registeredEvents: Record<string, EventHandler>
  /** Registered schedules (internal) */
  _registeredSchedules: ScheduleRecord[]
  /** Event registration via $.on.Noun.verb pattern */
  on: OnBuilder
  /** Schedule registration via $.every pattern */
  every: EveryBuilder
}

/**
 * Props for SaaS component with children function API
 */
export interface SaaSChildrenProps {
  /** App name */
  name: string
  /** Children function that receives the $ context */
  children: (ctx: SaaSContext) => void
}

/**
 * Config returned when SaaS is called as a function
 */
export interface SaaSConfig {
  name: string
  nouns: Record<string, Record<string, ParsedFieldType | ParsedRelation>>
  verbs: Record<string, Record<string, (ctx: unknown) => unknown>>
}

/**
 * Type assertion helper to use SaaS as a JSX component
 * This allows TypeScript to accept SaaS in JSX without union type issues
 */
export type SaaSComponent = (props: SaaSChildrenProps) => ReactElement

// =====================================================
// Field Type Parsing
// =====================================================

/**
 * Parse a field type string into structured type info
 * Examples:
 * - 'string' -> { type: 'string', optional: false }
 * - 'markdown?' -> { type: 'markdown', optional: true }
 * - '->Customer' -> relation
 */
function parseFieldType(
  fieldType: string | string[],
  nounName: string,
  fieldName: string,
  relations: RelationRecord[]
): ParsedFieldType | ParsedRelation {
  // Handle array types (many relations)
  if (Array.isArray(fieldType)) {
    const innerType = fieldType[0]
    return parseRelationType(innerType, nounName, fieldName, 'many', relations)
  }

  // Check for relation operators
  if (
    fieldType.startsWith('->') ||
    fieldType.startsWith('<-') ||
    fieldType.startsWith('~>') ||
    fieldType.startsWith('<~')
  ) {
    return parseRelationType(fieldType, nounName, fieldName, 'one', relations)
  }

  // Simple type with optional marker
  const optional = fieldType.endsWith('?')
  const type = optional ? fieldType.slice(0, -1) : fieldType

  return { type, optional }
}

/**
 * Parse a relation type string
 */
function parseRelationType(
  fieldType: string,
  nounName: string,
  fieldName: string,
  cardinality: 'one' | 'many',
  relations: RelationRecord[]
): ParsedRelation {
  let direction: 'forward' | 'reverse' | 'semantic' | 'reverse-semantic'
  let target: string

  if (fieldType.startsWith('->')) {
    direction = 'forward'
    target = fieldType.slice(2)
  } else if (fieldType.startsWith('<-')) {
    direction = 'reverse'
    target = fieldType.slice(2)
  } else if (fieldType.startsWith('~>')) {
    direction = 'semantic'
    target = fieldType.slice(2)
  } else if (fieldType.startsWith('<~')) {
    direction = 'reverse-semantic'
    target = fieldType.slice(2)
  } else {
    throw new Error(`Unknown relation operator in: ${fieldType}`)
  }

  // Track the relation
  relations.push({
    from: nounName,
    to: target,
    field: fieldName,
    type: direction,
    cardinality,
  })

  return {
    type: 'relation',
    target,
    direction,
    cardinality,
  }
}

// =====================================================
// Verb Anatomy Generation
// =====================================================

/**
 * Irregular verb past tenses
 */
const IRREGULAR_PAST: Record<string, string> = {
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
 * Generate the past tense of a verb
 */
function generatePastTense(verb: string): string {
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
 * Generate the present participle (-ing form) of a verb
 */
function generateParticiple(verb: string): string {
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
 * Generate complete verb anatomy
 */
function generateVerbAnatomy(verb: string): VerbAnatomy {
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

// =====================================================
// Context Creation
// =====================================================

/**
 * Create the $ context for the SaaS children function
 */
function createContext(): SaaSContext {
  const registeredNouns: Record<string, Record<string, ParsedFieldType | ParsedRelation>> = {}
  const registeredVerbs: Record<string, Record<string, (ctx: unknown) => unknown>> = {}
  const verbAnatomy: Record<string, Record<string, VerbAnatomy>> = {}
  const parsedRelations: RelationRecord[] = []
  const registeredEvents: Record<string, EventHandler> = {}
  const registeredSchedules: ScheduleRecord[] = []

  // Create the on proxy for event registration
  const onProxy = new Proxy(
    {},
    {
      get(_target, nounName: string) {
        return new Proxy(
          {},
          {
            get(_innerTarget, eventName: string) {
              return (handler: EventHandler) => {
                registeredEvents[`${nounName}.${eventName}`] = handler
              }
            },
          }
        )
      },
    }
  ) as OnBuilder

  // Create the every proxy for schedule registration
  const createScheduleBuilder = (interval: string): ScheduleBuilder => ({
    at: (time: string) => (handler: ScheduleHandler) => {
      registeredSchedules.push({ interval, time, handler })
    },
  })

  const everyProxy = new Proxy(
    {},
    {
      get(_target, interval: string) {
        return createScheduleBuilder(interval)
      },
    }
  ) as EveryBuilder

  const context: SaaSContext = {
    nouns: (definitions) => {
      for (const [nounName, fields] of Object.entries(definitions)) {
        registeredNouns[nounName] = {}
        for (const [fieldName, fieldType] of Object.entries(fields)) {
          registeredNouns[nounName][fieldName] = parseFieldType(fieldType, nounName, fieldName, parsedRelations)
        }
      }
    },
    verbs: (handlers) => {
      for (const [nounName, verbs] of Object.entries(handlers)) {
        registeredVerbs[nounName] = verbs
        verbAnatomy[nounName] = {}
        for (const verbName of Object.keys(verbs)) {
          verbAnatomy[nounName][verbName] = generateVerbAnatomy(verbName)
        }
      }
    },
    _registeredNouns: registeredNouns,
    _registeredVerbs: registeredVerbs,
    _verbAnatomy: verbAnatomy,
    _parsedRelations: parsedRelations,
    _registeredEvents: registeredEvents,
    _registeredSchedules: registeredSchedules,
    on: onProxy,
    every: everyProxy,
  }

  return context
}

// =====================================================
// SaaS Component / Function
// =====================================================

/**
 * Internal React component that handles JSX rendering
 */
function SaaSComponent({ name, children }: SaaSChildrenProps): ReactElement {
  // Create the context
  const ctx = createContext()

  // Execute the children function to register nouns, verbs, etc.
  children(ctx)

  // Return JSX element
  return React.createElement(
    'div',
    {
      'data-saas-name': name,
      'data-saas-admin': true,
    },
    null
  )
}

/**
 * Detect if we're being called from within React's render cycle
 * by checking the call stack for React internal functions
 */
function isInReactRender(): boolean {
  try {
    const stack = new Error().stack || ''
    // React render cycle functions we can detect
    return (
      stack.includes('renderWithHooks') ||
      stack.includes('updateFunctionComponent') ||
      stack.includes('beginWork') ||
      stack.includes('performUnitOfWork') ||
      stack.includes('workLoopSync') ||
      stack.includes('renderRootSync')
    )
  } catch {
    return false
  }
}

/**
 * SaaS - Dual-use component/function for defining a SaaS application
 *
 * Can be used as:
 * 1. JSX Component: <SaaS name="MyApp">{$ => { ... }}</SaaS>
 * 2. Function call: SaaS({ name: 'MyApp', children: $ => { ... } })
 *
 * @example JSX usage
 * ```tsx
 * <SaaS name="MyApp">
 *   {$ => {
 *     $.nouns({ Todo: { title: 'string', done: 'boolean' } })
 *     $.verbs({ Todo: { complete: $ => $.db.Todo.update($.id, { done: true }) } })
 *   }}
 * </SaaS>
 * ```
 *
 * @example Function usage
 * ```tsx
 * const config = SaaS({
 *   name: 'MyApp',
 *   children: $ => {
 *     $.nouns({ Todo: { title: 'string', done: 'boolean' } })
 *   }
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SaaS(props: SaaSChildrenProps): any {
  const { name, children } = props

  // Create the context
  const ctx = createContext()

  // Execute the children function to register nouns, verbs, etc.
  children(ctx)

  // Detect if we're in a React render context by checking the call stack
  if (isInReactRender()) {
    // Return JSX element
    return React.createElement(
      'div',
      {
        'data-saas-name': name,
        'data-saas-admin': true,
      },
      null
    )
  }

  // Return config object when called as a function
  return {
    name,
    nouns: ctx._registeredNouns,
    verbs: ctx._registeredVerbs,
  }
}

/**
 * SaaSAdmin - Alternative export name for the SaaS component
 */
export const SaaSAdmin = SaaS

export default SaaS

// =====================================================
// Legacy Types (for backwards compatibility)
// =====================================================

export interface ResourceConfig {
  name: string
  label?: string
  icon?: ReactNode
  list?: ReactNode
  edit?: ReactNode
  create?: ReactNode
  listFields?: string[]
  formFields?: string[]
  disableCreate?: boolean
  disableEdit?: boolean
  disableDelete?: boolean
}

export interface SaaSProps extends SaaSChildrenProps {}
