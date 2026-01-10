/**
 * Helper to create a relationship with type inference
 */
export function relationship(from, to, verb, reverse) {
    return { from, to, verb, reverse };
}
/**
 * Common relationship patterns
 */
export const RelationshipPatterns = {
    /** One-to-many: child belongs to parent, parent has many children */
    belongsTo: (from, to) => ({
        from,
        to,
        verb: 'belongsTo',
        reverse: 'hasMany',
    }),
    /** Many-to-many through contains/appearsIn */
    contains: (from, to) => ({
        from,
        to,
        verb: 'contains',
        reverse: 'appearsIn',
    }),
    /** Membership: user is member of organization */
    memberOf: (from, to) => ({
        from,
        to,
        verb: 'memberOf',
        reverse: 'hasMembers',
    }),
    /** Ownership: resource owned by user */
    ownedBy: (from, to) => ({
        from,
        to,
        verb: 'ownedBy',
        reverse: 'owns',
    }),
};
