/**
 * Type guard to check if a string is a valid PascalCase noun
 */
export function isNoun(value) {
    return /^[A-Z][a-zA-Z0-9]*$/.test(value);
}
/**
 * Creates a branded Noun type from a string
 * @throws Error if the string is not PascalCase
 */
export function noun(value) {
    if (!isNoun(value)) {
        throw new Error(`Invalid noun "${value}": must be PascalCase (e.g., 'User', 'Product')`);
    }
    return value;
}
