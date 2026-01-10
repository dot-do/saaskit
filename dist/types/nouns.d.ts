/**
 * Noun type - represents domain entities in PascalCase
 *
 * Nouns are the core entities in your domain model.
 * They should be named in PascalCase (e.g., 'User', 'Product', 'Order').
 *
 * @example
 * ```ts
 * const nouns: Noun[] = ['User', 'Product', 'Order', 'Customer']
 * ```
 */
export type Noun = string & {
    readonly __brand: 'Noun';
};
/**
 * Type guard to check if a string is a valid PascalCase noun
 */
export declare function isNoun(value: string): value is Noun;
/**
 * Creates a branded Noun type from a string
 * @throws Error if the string is not PascalCase
 */
export declare function noun(value: string): Noun;
/**
 * Array of nouns - the domain entities in your app
 */
export type Nouns = readonly Noun[];
/**
 * Helper type to extract noun names from a config
 */
export type NounNames<T extends readonly string[]> = T[number];
//# sourceMappingURL=nouns.d.ts.map