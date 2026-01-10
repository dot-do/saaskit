/**
 * Relationship verbs - describes how nouns relate to each other
 */
export type RelationshipVerb =
  | 'belongsTo'
  | 'hasMany'
  | 'hasOne'
  | 'contains'
  | 'appearsIn'
  | 'memberOf'
  | 'hasMembers'
  | 'ownedBy'
  | 'owns'
  | 'references'
  | 'referencedBy'
  | (string & {})

/**
 * Relationship definition between two nouns
 *
 * @example
 * ```ts
 * const relationship: Relationship = {
 *   from: 'Order',
 *   to: 'Customer',
 *   verb: 'belongsTo',
 *   reverse: 'hasMany'
 * }
 * ```
 */
export interface Relationship<N extends string = string> {
  /** The source noun (child in belongs-to relationships) */
  from: N
  /** The target noun (parent in belongs-to relationships) */
  to: N
  /** The relationship verb from the source's perspective */
  verb: RelationshipVerb
  /** The reverse relationship verb from the target's perspective */
  reverse: RelationshipVerb
}

/**
 * Array of relationship definitions
 */
export type Relationships<N extends string = string> = readonly Relationship<N>[]

/**
 * Helper to create a relationship with type inference
 */
export function relationship<N extends string>(
  from: N,
  to: N,
  verb: RelationshipVerb,
  reverse: RelationshipVerb
): Relationship<N> {
  return { from, to, verb, reverse }
}

/**
 * Common relationship patterns
 */
export const RelationshipPatterns = {
  /** One-to-many: child belongs to parent, parent has many children */
  belongsTo: (from: string, to: string): Relationship => ({
    from,
    to,
    verb: 'belongsTo',
    reverse: 'hasMany',
  }),

  /** Many-to-many through contains/appearsIn */
  contains: (from: string, to: string): Relationship => ({
    from,
    to,
    verb: 'contains',
    reverse: 'appearsIn',
  }),

  /** Membership: user is member of organization */
  memberOf: (from: string, to: string): Relationship => ({
    from,
    to,
    verb: 'memberOf',
    reverse: 'hasMembers',
  }),

  /** Ownership: resource owned by user */
  ownedBy: (from: string, to: string): Relationship => ({
    from,
    to,
    verb: 'ownedBy',
    reverse: 'owns',
  }),
} as const
