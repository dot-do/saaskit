/**
 * Headless SaaS Type Definitions
 *
 * A minimal, elegant interface for defining headless SaaS apps.
 * Properties are string type definitions, actions/events are functions.
 * null blocks standard actions, () => null blocks conditionally.
 */

// Context object passed to action/event functions
export interface Context<TNouns extends NounDefinitions = NounDefinitions> {
  // Current request/action args
  args: Record<string, unknown>
  // Current actor/user
  actor?: { id: string; type: string }
  // Emit an event
  emit: (event: string, data: unknown) => void
  // Schedule a workflow
  schedule: (workflow: string, data: unknown, options?: { delay?: number }) => void
}

// Add noun accessors dynamically
export type ContextWithNouns<TNouns extends NounDefinitions> = Context<TNouns> & {
  [K in keyof TNouns]: NounAccessor<TNouns[K]>
}

// CRUD accessor for a noun (mongo-style)
export interface NounAccessor<T extends NounDefinition> {
  create: (data: Partial<InferNounData<T>>) => Promise<InferNounData<T>>
  get: (id: string) => Promise<InferNounData<T> | null>
  update: (id: string, data: Partial<InferNounData<T>>) => Promise<InferNounData<T>>
  delete: (id: string) => Promise<void>
  find: (query: Query<InferNounData<T>>) => Promise<InferNounData<T>[]>
  findOne: (query: Query<InferNounData<T>>) => Promise<InferNounData<T> | null>
}

// Mongo-style query
export type Query<T> = {
  [K in keyof T]?: T[K] | { $eq?: T[K]; $ne?: T[K]; $in?: T[K][]; $nin?: T[K][]; $gt?: T[K]; $gte?: T[K]; $lt?: T[K]; $lte?: T[K]; $contains?: string; $regex?: string }
} & {
  $and?: Query<T>[]
  $or?: Query<T>[]
  $limit?: number
  $offset?: number
  $sort?: { [K in keyof T]?: 'asc' | 'desc' }
}

// Type definitions as strings (icetype pattern)
export type TypeDef = string

// Relation types
export type ForwardRelation = `-> ${string}`
export type BackwardRelation = `<- ${string}`
export type FuzzyForward = `~> ${string}`
export type FuzzyBackward = `<~ ${string}`
export type RelationDef = ForwardRelation | BackwardRelation | FuzzyForward | FuzzyBackward

// Function types
export type ActionFn<TNouns extends NounDefinitions = NounDefinitions> = (target: unknown, $: ContextWithNouns<TNouns>) => unknown | Promise<unknown>
export type EventFn<TNouns extends NounDefinitions = NounDefinitions> = (data: unknown, $: ContextWithNouns<TNouns>) => void | Promise<void>

// A noun definition - properties are strings, actions/events are functions, null blocks
export type NounDefinition = {
  [key: string]: TypeDef | ActionFn | EventFn | null
}

// Collection of noun definitions
export type NounDefinitions = {
  [name: string]: NounDefinition
}

// Infer the data shape from a noun definition (properties only)
export type InferNounData<T extends NounDefinition> = {
  id: string
  $type: string
  $createdAt: number
  $updatedAt: number
} & {
  [K in keyof T as T[K] extends TypeDef ? K : never]: InferFieldType<T[K] & TypeDef>
}

// Infer TypeScript type from type definition string
export type InferFieldType<T extends TypeDef> = T extends `${infer Base}!`
  ? NonNullable<InferBaseType<Base>>
  : T extends `${infer Base}?`
    ? InferBaseType<Base> | null
    : T extends `${infer Base}[]`
      ? InferBaseType<Base>[]
      : InferBaseType<T>

type InferBaseType<T extends string> = T extends 'string'
  ? string
  : T extends 'text'
    ? string
    : T extends 'int' | 'integer'
      ? number
      : T extends 'float' | 'double' | 'decimal'
        ? number
        : T extends 'bool' | 'boolean'
          ? boolean
          : T extends 'date' | 'datetime' | 'timestamp'
            ? Date
            : T extends 'json'
              ? unknown
              : T extends `-> ${string}`
                ? string // Relation stores ID
                : T extends `<- ${string}`
                  ? string[] // Backward relation is array of IDs
                  : unknown

// SaaS app definition
export interface SaaSApp<TNouns extends NounDefinitions = NounDefinitions> {
  name: string
  nouns: ParsedNouns<TNouns>

  // Zapier-style interface per noun
  triggers: { [K in keyof TNouns]: string[] }
  actions: { [K in keyof TNouns]: string[] }
}

// Parsed noun with separated properties, actions, events, and blocked
export interface ParsedNoun {
  name: string
  properties: Record<string, ParsedProperty>
  relations: Record<string, ParsedRelation>
  actions: Record<string, ActionFn>
  events: Record<string, EventFn>
  blocked: Set<string>
}

export interface ParsedProperty {
  name: string
  type: string
  required: boolean
  indexed: boolean
  array: boolean
}

export interface ParsedRelation {
  name: string
  target: string
  type: 'forward' | 'backward' | 'fuzzy-forward' | 'fuzzy-backward'
  array: boolean
  field?: string // For backward relations: the field on target
}

export type ParsedNouns<TNouns extends NounDefinitions> = {
  [K in keyof TNouns]: ParsedNoun
}
