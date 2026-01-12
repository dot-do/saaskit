/**
 * Dotdo Compiler - Noun to Thing Schema
 *
 * Compiles SaaSKit noun definitions to dotdo Thing schemas.
 */

interface FieldSchema {
  type: string
  required: boolean
  format?: string
  enum?: string[]
}

interface Relationship {
  predicate: string
  target: string
  cardinality: 'one' | 'many'
}

interface CompiledThing {
  type: string
  ns: string
  schema: Record<string, FieldSchema>
  relationships?: Relationship[]
}

/**
 * Compiles a SaaSKit noun definition to a dotdo Thing schema.
 *
 * @param noun - Noun definition object like `{ Customer: { name: 'string', email: 'email' } }`
 * @returns Compiled Thing schema with type, namespace, schema fields, and relationships
 *
 * @example
 * ```ts
 * const thing = compileNounToThing({
 *   Customer: {
 *     name: 'string',
 *     email: 'email',
 *     orders: '[->Order]'
 *   }
 * })
 * // Returns: { type: 'Customer', ns: 'default', schema: {...}, relationships: [...] }
 * ```
 */
export function compileNounToThing(
  noun: Record<string, Record<string, string>>
): CompiledThing {
  const [nounName, fields] = Object.entries(noun)[0]
  const schema: Record<string, FieldSchema> = {}
  const relationships: Relationship[] = []

  for (const [fieldName, fieldSpec] of Object.entries(fields)) {
    // Check for relationship (contains ->)
    if (fieldSpec.includes('->')) {
      const rel = parseRelationship(fieldSpec)
      relationships.push(rel)
    } else {
      schema[fieldName] = parseField(fieldSpec)
    }
  }

  const result: CompiledThing = {
    type: nounName,
    ns: 'default',
    schema,
  }

  // Only include relationships if there are any
  if (relationships.length > 0) {
    result.relationships = relationships
  }

  return result
}

/**
 * Parses a field specification string to a FieldSchema.
 *
 * Field type mapping:
 * - 'string' → { type: 'string', required: true }
 * - 'string?' → { type: 'string', required: false }
 * - 'email' → { type: 'string', format: 'email', required: true }
 * - 'slug' → { type: 'string', format: 'slug', required: true }
 * - 'date' → { type: 'date', required: true }
 * - 'number' → { type: 'number', required: true }
 * - 'boolean' → { type: 'boolean', required: true }
 * - 'text' → { type: 'text', required: true }
 * - 'a | b | c' → { type: 'string', enum: ['a', 'b', 'c'], required: true }
 */
function parseField(spec: string): FieldSchema {
  const isOptional = spec.endsWith('?')
  const baseSpec = isOptional ? spec.slice(0, -1) : spec

  // Check for enum (contains |)
  if (baseSpec.includes('|')) {
    const values = baseSpec.split('|').map((s) => s.trim())
    return { type: 'string', required: !isOptional, enum: values }
  }

  // Map format types (email, slug) to { type: 'string', format: X }
  const formatTypes = ['email', 'slug']
  if (formatTypes.includes(baseSpec)) {
    return { type: 'string', format: baseSpec, required: !isOptional }
  }

  // Direct type mapping (string, number, boolean, date, text)
  return { type: baseSpec, required: !isOptional }
}

/**
 * Parses a relationship specification string to a Relationship.
 *
 * Relationship mapping:
 * - '->Target' → { predicate: 'belongsTo', target: 'Target', cardinality: 'one' }
 * - '[->Target]' → { predicate: 'contains', target: 'Target', cardinality: 'many' }
 */
function parseRelationship(spec: string): Relationship {
  const isMany = spec.startsWith('[') && spec.endsWith(']')
  const inner = isMany ? spec.slice(1, -1) : spec
  const target = inner.replace('->', '')

  return {
    predicate: isMany ? 'contains' : 'belongsTo',
    target,
    cardinality: isMany ? 'many' : 'one',
  }
}
