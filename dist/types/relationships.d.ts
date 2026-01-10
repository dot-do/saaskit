/**
 * Relationship verbs - describes how nouns relate to each other
 */
export type RelationshipVerb = 'belongsTo' | 'hasMany' | 'hasOne' | 'contains' | 'appearsIn' | 'memberOf' | 'hasMembers' | 'ownedBy' | 'owns' | 'references' | 'referencedBy' | (string & {});
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
    from: N;
    /** The target noun (parent in belongs-to relationships) */
    to: N;
    /** The relationship verb from the source's perspective */
    verb: RelationshipVerb;
    /** The reverse relationship verb from the target's perspective */
    reverse: RelationshipVerb;
}
/**
 * Array of relationship definitions
 */
export type Relationships<N extends string = string> = readonly Relationship<N>[];
/**
 * Helper to create a relationship with type inference
 */
export declare function relationship<N extends string>(from: N, to: N, verb: RelationshipVerb, reverse: RelationshipVerb): Relationship<N>;
/**
 * Common relationship patterns
 */
export declare const RelationshipPatterns: {
    /** One-to-many: child belongs to parent, parent has many children */
    readonly belongsTo: (from: string, to: string) => Relationship;
    /** Many-to-many through contains/appearsIn */
    readonly contains: (from: string, to: string) => Relationship;
    /** Membership: user is member of organization */
    readonly memberOf: (from: string, to: string) => Relationship;
    /** Ownership: resource owned by user */
    readonly ownedBy: (from: string, to: string) => Relationship;
};
//# sourceMappingURL=relationships.d.ts.map