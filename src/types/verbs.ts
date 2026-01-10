/**
 * Verb type - represents actions in camelCase
 *
 * Verbs are the actions that can be performed on nouns.
 * They should be named in camelCase (e.g., 'create', 'update', 'delete').
 *
 * @example
 * ```ts
 * const userVerbs: Verb[] = ['create', 'update', 'delete', 'invite']
 * ```
 */
export type Verb = string & { readonly __brand: 'Verb' }

/**
 * Type guard to check if a string is a valid camelCase verb
 */
export function isVerb(value: string): value is Verb {
  return /^[a-z][a-zA-Z0-9]*$/.test(value)
}

/**
 * Creates a branded Verb type from a string
 * @throws Error if the string is not camelCase
 */
export function verb(value: string): Verb {
  if (!isVerb(value as Verb)) {
    throw new Error(`Invalid verb "${value}": must be camelCase (e.g., 'create', 'update')`)
  }
  return value as Verb
}

/**
 * Common CRUD verbs available for all nouns
 */
export const CRUD_VERBS = ['create', 'read', 'update', 'delete'] as const
export type CrudVerb = (typeof CRUD_VERBS)[number]

/**
 * Verbs configuration - maps nouns to their allowed actions
 *
 * @example
 * ```ts
 * const verbs: VerbsConfig = {
 *   User: ['create', 'update', 'delete', 'invite', 'impersonate'],
 *   Order: ['create', 'fulfill', 'cancel', 'refund'],
 * }
 * ```
 */
export type VerbsConfig<N extends string = string> = {
  [K in N]?: readonly string[]
}

/**
 * Helper type to extract verb names for a specific noun
 */
export type VerbsFor<
  Config extends VerbsConfig,
  N extends keyof Config,
> = Config[N] extends readonly (infer V)[] ? V : never
