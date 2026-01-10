/**
 * Relationship Parser Module
 *
 * Parses relationship operators from the SaaS DSL syntax.
 * Handles the four relationship operators: ->, <-, ~>, <~
 *
 * @module parsers/relationship-parser
 */

/**
 * Relationship direction type.
 *
 * - `forward`: This entity owns the link (->)
 * - `reverse`: Linked entities point back (<-)
 * - `semantic`: Fuzzy/semantic matching (~>)
 * - `reverse-semantic`: Reverse semantic matching (<~)
 */
export type RelationDirection = 'forward' | 'reverse' | 'semantic' | 'reverse-semantic'

/**
 * Cardinality of the relationship.
 *
 * - `one`: Single relation (e.g., `customer: '->Customer'`)
 * - `many`: Multiple relations (e.g., `orders: ['<-Order']`)
 */
export type Cardinality = 'one' | 'many'

/**
 * Parsed relation type information.
 *
 * @example
 * ```ts
 * // '->Customer' parses to:
 * {
 *   type: 'relation',
 *   target: 'Customer',
 *   direction: 'forward',
 *   cardinality: 'one'
 * }
 * ```
 */
export interface ParsedRelation {
  /** Discriminator to identify this as a relation */
  type: 'relation'
  /** Target noun name */
  target: string
  /** Direction of the relationship */
  direction: RelationDirection
  /** One-to-one or one-to-many */
  cardinality: Cardinality
}

/**
 * Record of a parsed relation for tracking all relationships in the schema.
 * Used for generating inverse relations and schema introspection.
 */
export interface RelationRecord {
  /** Source noun name */
  from: string
  /** Target noun name */
  to: string
  /** Field name on the source noun */
  field: string
  /** Relationship direction */
  type: RelationDirection
  /** Cardinality of the relationship */
  cardinality: Cardinality
}

/**
 * Relationship operator symbols and their meanings.
 *
 * | Operator | Direction | Description |
 * |----------|-----------|-------------|
 * | `->` | forward | This entity owns the link to target |
 * | `<-` | reverse | Target entities have links back to this |
 * | `~>` | semantic | Fuzzy/semantic matching to target |
 * | `<~` | reverse-semantic | Reverse semantic matching |
 */
export const RELATIONSHIP_OPERATORS = {
  '->': 'forward',
  '<-': 'reverse',
  '~>': 'semantic',
  '<~': 'reverse-semantic',
} as const

/**
 * Parse a relationship operator string into structured relation info.
 *
 * @param fieldType - The field type string containing a relation operator
 * @param nounName - The noun this field belongs to
 * @param fieldName - The name of the field
 * @param cardinality - Whether this is a one or many relation
 * @param relations - Array to push the parsed relation record into
 * @returns Parsed relation definition
 * @throws Error if the operator is unknown
 *
 * @example
 * ```ts
 * const relations: RelationRecord[] = []
 *
 * // Forward relation (this entity owns the link)
 * parseRelationshipOperator('->Customer', 'Order', 'customer', 'one', relations)
 * // => { type: 'relation', target: 'Customer', direction: 'forward', cardinality: 'one' }
 *
 * // Reverse relation (many-to-one inverse)
 * parseRelationshipOperator('<-Order', 'Customer', 'orders', 'many', relations)
 * // => { type: 'relation', target: 'Order', direction: 'reverse', cardinality: 'many' }
 *
 * // Semantic relation (fuzzy matching)
 * parseRelationshipOperator('~>Skill', 'Candidate', 'skills', 'many', relations)
 * // => { type: 'relation', target: 'Skill', direction: 'semantic', cardinality: 'many' }
 *
 * // Reverse semantic relation
 * parseRelationshipOperator('<~Product', 'Category', 'products', 'many', relations)
 * // => { type: 'relation', target: 'Product', direction: 'reverse-semantic', cardinality: 'many' }
 * ```
 */
export function parseRelationshipOperator(
  fieldType: string,
  nounName: string,
  fieldName: string,
  cardinality: Cardinality,
  relations: RelationRecord[]
): ParsedRelation {
  let direction: RelationDirection
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

/**
 * Check if a field type string contains a relationship operator.
 *
 * @param fieldType - The field type string to check
 * @returns True if the string starts with a relationship operator
 *
 * @example
 * ```ts
 * isRelationshipOperator('->Customer') // true
 * isRelationshipOperator('<-Order')    // true
 * isRelationshipOperator('~>Product')  // true
 * isRelationshipOperator('<~Category') // true
 * isRelationshipOperator('string')     // false
 * isRelationshipOperator('number?')    // false
 * ```
 */
export function isRelationshipOperator(fieldType: string): boolean {
  return (
    fieldType.startsWith('->') ||
    fieldType.startsWith('<-') ||
    fieldType.startsWith('~>') ||
    fieldType.startsWith('<~')
  )
}

/**
 * Get the operator prefix from a relationship field type.
 *
 * @param fieldType - The field type string
 * @returns The operator prefix or null if not a relationship
 *
 * @example
 * ```ts
 * getRelationshipOperator('->Customer') // '->'
 * getRelationshipOperator('<-Order')    // '<-'
 * getRelationshipOperator('string')     // null
 * ```
 */
export function getRelationshipOperator(fieldType: string): keyof typeof RELATIONSHIP_OPERATORS | null {
  for (const op of Object.keys(RELATIONSHIP_OPERATORS) as Array<keyof typeof RELATIONSHIP_OPERATORS>) {
    if (fieldType.startsWith(op)) {
      return op
    }
  }
  return null
}

/**
 * Get the target noun from a relationship field type.
 *
 * @param fieldType - The field type string
 * @returns The target noun name or null if not a relationship
 *
 * @example
 * ```ts
 * getRelationshipTarget('->Customer') // 'Customer'
 * getRelationshipTarget('<-Order')    // 'Order'
 * getRelationshipTarget('string')     // null
 * ```
 */
export function getRelationshipTarget(fieldType: string): string | null {
  const op = getRelationshipOperator(fieldType)
  return op ? fieldType.slice(op.length) : null
}
