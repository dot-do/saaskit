/**
 * Index Analysis Module
 *
 * Analyzes noun schemas to identify fields that would benefit from database
 * indexing. Generates index suggestions based on field types and relationships.
 *
 * @module database/indexes
 */

import type { NounDefinitions, NounSchema, FieldDefinition } from './types'

/**
 * Types of database indexes
 */
export type IndexType = 'primary' | 'unique' | 'foreign_key' | 'searchable' | 'sortable'

/**
 * Represents a suggested index on a field
 */
export interface IndexSuggestion {
  /**
   * The noun (table) name
   */
  noun: string

  /**
   * The field (column) name
   */
  field: string

  /**
   * The type of index suggested
   */
  type: IndexType

  /**
   * The target noun for foreign key indexes
   */
  targetNoun?: string

  /**
   * Human-readable reason for the suggestion
   */
  reason: string

  /**
   * Priority level (1 = highest)
   */
  priority: 1 | 2 | 3
}

/**
 * Index analysis result for a schema
 */
export interface IndexAnalysis {
  /**
   * List of suggested indexes
   */
  suggestions: IndexSuggestion[]

  /**
   * Summary statistics
   */
  summary: {
    totalNouns: number
    totalFields: number
    totalSuggestions: number
    byType: Record<IndexType, number>
  }
}

/**
 * Relationship operators
 */
const RELATIONSHIP_OPERATORS = ['->', '~>', '<-', '<~'] as const

/**
 * Parse a field definition to extract its characteristics
 *
 * @param field - The field definition string
 * @returns Parsed field information
 */
function parseField(field: FieldDefinition): {
  isRelationship: boolean
  operator?: string
  targetNoun?: string
  isArray: boolean
  isOptional: boolean
  baseType: string
  isUnion: boolean
} {
  // Handle array field definitions
  if (Array.isArray(field)) {
    const inner = parseField(field[0])
    return { ...inner, isArray: true }
  }

  // Check for relationship operators
  for (const op of RELATIONSHIP_OPERATORS) {
    if (field.startsWith(op)) {
      return {
        isRelationship: true,
        operator: op,
        targetNoun: field.slice(op.length),
        isArray: false,
        isOptional: false,
        baseType: 'relationship',
        isUnion: false,
      }
    }
  }

  // Check for optional marker
  const isOptional = field.endsWith('?')
  const cleanField = isOptional ? field.slice(0, -1) : field

  // Check for union type
  const isUnion = cleanField.includes('|')

  return {
    isRelationship: false,
    isArray: false,
    isOptional,
    baseType: cleanField,
    isUnion,
  }
}

/**
 * Analyze a single noun schema for index suggestions
 *
 * @param nounName - Name of the noun
 * @param schema - The noun's schema definition
 * @returns Array of index suggestions
 */
function analyzeNounSchema(nounName: string, schema: NounSchema): IndexSuggestion[] {
  const suggestions: IndexSuggestion[] = []

  // Primary key index (always recommended)
  suggestions.push({
    noun: nounName,
    field: 'id',
    type: 'primary',
    reason: 'Primary key for record identification',
    priority: 1,
  })

  for (const [fieldName, fieldDef] of Object.entries(schema)) {
    const parsed = parseField(fieldDef)

    // Foreign key indexes for relationships
    if (parsed.isRelationship && parsed.operator === '->' && parsed.targetNoun) {
      suggestions.push({
        noun: nounName,
        field: fieldName,
        type: 'foreign_key',
        targetNoun: parsed.targetNoun,
        reason: `Foreign key relationship to ${parsed.targetNoun}`,
        priority: 1,
      })
    }

    // Backward relationships suggest index on the target
    if (parsed.isRelationship && parsed.operator === '<-' && parsed.targetNoun) {
      // Note: The actual index would be on the target noun's field pointing back
      suggestions.push({
        noun: nounName,
        field: fieldName,
        type: 'foreign_key',
        targetNoun: parsed.targetNoun,
        reason: `Reverse relationship from ${parsed.targetNoun} (index needed on target)`,
        priority: 2,
      })
    }

    // Union types (status fields) often benefit from indexing for filtering
    if (parsed.isUnion && !parsed.isRelationship) {
      suggestions.push({
        noun: nounName,
        field: fieldName,
        type: 'sortable',
        reason: 'Status/enum field commonly used in filters',
        priority: 2,
      })
    }

    // String fields that might be searched or filtered
    if (parsed.baseType === 'string' && !parsed.isRelationship) {
      // Common patterns that suggest searchable fields
      const searchablePatterns = ['name', 'title', 'email', 'slug', 'code', 'description']
      const lowerField = fieldName.toLowerCase()

      if (searchablePatterns.some((pattern) => lowerField.includes(pattern))) {
        suggestions.push({
          noun: nounName,
          field: fieldName,
          type: 'searchable',
          reason: `String field "${fieldName}" likely used in searches`,
          priority: 2,
        })
      }

      // Unique constraints for certain fields
      const uniquePatterns = ['email', 'slug', 'code', 'sku', 'username']
      if (uniquePatterns.some((pattern) => lowerField.includes(pattern))) {
        suggestions.push({
          noun: nounName,
          field: fieldName,
          type: 'unique',
          reason: `Field "${fieldName}" likely requires uniqueness`,
          priority: 1,
        })
      }
    }

    // Date fields often used for sorting
    if (['date', 'datetime'].includes(parsed.baseType)) {
      suggestions.push({
        noun: nounName,
        field: fieldName,
        type: 'sortable',
        reason: `Date field "${fieldName}" commonly used for sorting`,
        priority: 3,
      })
    }
  }

  // Always suggest index on createdAt for sorting
  suggestions.push({
    noun: nounName,
    field: 'createdAt',
    type: 'sortable',
    reason: 'Default timestamp for chronological sorting',
    priority: 3,
  })

  return suggestions
}

/**
 * Analyze noun definitions to generate index suggestions
 *
 * Examines the schema to identify fields that would benefit from database
 * indexing, including:
 * - Primary keys
 * - Foreign key relationships
 * - Unique constraints
 * - Searchable text fields
 * - Sortable date/status fields
 *
 * @param definitions - The noun definitions to analyze
 * @returns Complete index analysis with suggestions and summary
 *
 * @example
 * ```ts
 * const definitions = {
 *   Customer: {
 *     name: 'string',
 *     email: 'string',
 *     plan: '->Plan',
 *   },
 *   Plan: {
 *     name: 'string',
 *     price: 'number',
 *   },
 * }
 *
 * const analysis = analyzeIndexes(definitions)
 *
 * console.log(analysis.summary)
 * // { totalNouns: 2, totalFields: 5, totalSuggestions: 8, byType: {...} }
 *
 * for (const suggestion of analysis.suggestions) {
 *   console.log(`${suggestion.noun}.${suggestion.field}: ${suggestion.type}`)
 * }
 * ```
 */
export function analyzeIndexes(definitions: NounDefinitions): IndexAnalysis {
  const suggestions: IndexSuggestion[] = []
  let totalFields = 0

  for (const [nounName, schema] of Object.entries(definitions)) {
    totalFields += Object.keys(schema).length
    suggestions.push(...analyzeNounSchema(nounName, schema))
  }

  // Count by type
  const byType: Record<IndexType, number> = {
    primary: 0,
    unique: 0,
    foreign_key: 0,
    searchable: 0,
    sortable: 0,
  }

  for (const suggestion of suggestions) {
    byType[suggestion.type]++
  }

  return {
    suggestions: suggestions.sort((a, b) => a.priority - b.priority),
    summary: {
      totalNouns: Object.keys(definitions).length,
      totalFields,
      totalSuggestions: suggestions.length,
      byType,
    },
  }
}

/**
 * Get index suggestions for a specific noun
 *
 * @param definitions - All noun definitions (needed for relationship validation)
 * @param nounName - The specific noun to analyze
 * @returns Index suggestions for the specified noun
 *
 * @example
 * ```ts
 * const suggestions = getIndexesForNoun(definitions, 'Customer')
 * for (const s of suggestions) {
 *   console.log(`CREATE INDEX ON ${s.noun}(${s.field})`)
 * }
 * ```
 */
export function getIndexesForNoun(
  definitions: NounDefinitions,
  nounName: string
): IndexSuggestion[] {
  const schema = definitions[nounName]
  if (!schema) {
    throw new Error(`Noun "${nounName}" not found in definitions`)
  }
  return analyzeNounSchema(nounName, schema)
}

/**
 * Generate SQL CREATE INDEX statements from suggestions
 *
 * Converts index suggestions into SQL statements compatible with
 * most relational databases.
 *
 * @param suggestions - Array of index suggestions
 * @returns Array of SQL CREATE INDEX statements
 *
 * @example
 * ```ts
 * const analysis = analyzeIndexes(definitions)
 * const sql = generateIndexSQL(analysis.suggestions)
 *
 * for (const statement of sql) {
 *   console.log(statement)
 * }
 * // CREATE UNIQUE INDEX idx_customer_id ON customer(id);
 * // CREATE INDEX idx_customer_email ON customer(email);
 * // ...
 * ```
 */
export function generateIndexSQL(suggestions: IndexSuggestion[]): string[] {
  const statements: string[] = []

  for (const suggestion of suggestions) {
    const tableName = suggestion.noun.toLowerCase()
    const columnName = suggestion.field.toLowerCase()
    const indexName = `idx_${tableName}_${columnName}`

    switch (suggestion.type) {
      case 'primary':
        // Primary key is typically handled in table definition
        statements.push(
          `-- Primary key: ALTER TABLE ${tableName} ADD PRIMARY KEY (${columnName});`
        )
        break

      case 'unique':
        statements.push(`CREATE UNIQUE INDEX ${indexName} ON ${tableName}(${columnName});`)
        break

      case 'foreign_key':
        statements.push(`CREATE INDEX ${indexName} ON ${tableName}(${columnName});`)
        if (suggestion.targetNoun) {
          statements.push(
            `-- Foreign key: ALTER TABLE ${tableName} ADD FOREIGN KEY (${columnName}) REFERENCES ${suggestion.targetNoun.toLowerCase()}(id);`
          )
        }
        break

      case 'searchable':
        // For text search, suggest both regular and full-text index
        statements.push(`CREATE INDEX ${indexName} ON ${tableName}(${columnName});`)
        statements.push(
          `-- Full-text search: CREATE INDEX ${indexName}_fts ON ${tableName} USING gin(to_tsvector('english', ${columnName}));`
        )
        break

      case 'sortable':
        statements.push(`CREATE INDEX ${indexName} ON ${tableName}(${columnName});`)
        break
    }
  }

  return statements
}

/**
 * Filter suggestions by priority level
 *
 * @param suggestions - Array of index suggestions
 * @param maxPriority - Maximum priority to include (1 = critical only, 3 = all)
 * @returns Filtered suggestions
 *
 * @example
 * ```ts
 * // Get only critical indexes (priority 1)
 * const critical = filterByPriority(analysis.suggestions, 1)
 *
 * // Get high and medium priority (1 and 2)
 * const important = filterByPriority(analysis.suggestions, 2)
 * ```
 */
export function filterByPriority(
  suggestions: IndexSuggestion[],
  maxPriority: 1 | 2 | 3
): IndexSuggestion[] {
  return suggestions.filter((s) => s.priority <= maxPriority)
}

/**
 * Filter suggestions by index type
 *
 * @param suggestions - Array of index suggestions
 * @param types - Index types to include
 * @returns Filtered suggestions
 *
 * @example
 * ```ts
 * // Get only foreign key indexes
 * const foreignKeys = filterByType(analysis.suggestions, ['foreign_key'])
 *
 * // Get searchable and sortable indexes
 * const queryIndexes = filterByType(analysis.suggestions, ['searchable', 'sortable'])
 * ```
 */
export function filterByType(
  suggestions: IndexSuggestion[],
  types: IndexType[]
): IndexSuggestion[] {
  return suggestions.filter((s) => types.includes(s.type))
}
