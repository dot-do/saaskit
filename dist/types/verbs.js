/**
 * Type guard to check if a string is a valid camelCase verb
 */
export function isVerb(value) {
    return /^[a-z][a-zA-Z0-9]*$/.test(value);
}
/**
 * Creates a branded Verb type from a string
 * @throws Error if the string is not camelCase
 */
export function verb(value) {
    if (!isVerb(value)) {
        throw new Error(`Invalid verb "${value}": must be camelCase (e.g., 'create', 'update')`);
    }
    return value;
}
/**
 * Common CRUD verbs available for all nouns
 */
export const CRUD_VERBS = ['create', 'read', 'update', 'delete'];
