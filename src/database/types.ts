/**
 * Database Layer Types
 *
 * Type definitions for the Database.do integration layer.
 * These types define the schema DSL and database accessor interfaces.
 */

/**
 * Relationship operators used in noun field definitions:
 * - `->` Forward exact (owner side, e.g., Order belongs to Customer)
 * - `~>` Forward fuzzy (semantic match or create)
 * - `<-` Backward exact (referenced side, e.g., Customer has many Orders)
 * - `<~` Backward fuzzy (semantic reverse relationship)
 */
export type RelationshipOperator = '->' | '~>' | '<-' | '<~'

/**
 * Primitive field types
 */
export type PrimitiveFieldType = 'string' | 'number' | 'boolean' | 'date' | 'datetime'

/**
 * A field definition can be:
 * - A primitive type: 'string', 'number', 'boolean', 'date', 'datetime'
 * - An optional primitive: 'string?', 'number?', etc.
 * - A union type: 'pending | paid | shipped'
 * - A relationship: '->Customer', '~>Category', '<-Order', '<~Product'
 * - An array relationship: ['->Product'], ['<-Order']
 */
export type FieldDefinition = string | [string]

/**
 * Schema definition for a single noun
 */
export type NounSchema = Record<string, FieldDefinition>

/**
 * Complete noun definitions passed to $.nouns()
 */
export type NounDefinitions = Record<string, NounSchema>

/**
 * Pagination options for list()
 */
export interface PaginationOptions {
  limit?: number
  offset?: number
}

/**
 * Base record with auto-generated fields
 */
export interface BaseRecord {
  id: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Search result with relevance score
 */
export interface SearchResult<T> extends BaseRecord {
  _score: number
}

/**
 * Database accessor for a single noun type
 */
export interface DatabaseAccessor<T extends BaseRecord = BaseRecord> {
  /**
   * Create a new record
   */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<T>

  /**
   * Get a record by ID
   */
  get(id: string): Promise<T | null>

  /**
   * Update a record by ID
   */
  update(id: string, data: Partial<Omit<T, 'id'>>): Promise<T>

  /**
   * Delete a record by ID
   */
  delete(id: string): Promise<void>

  /**
   * List all records with optional pagination
   */
  list(options?: PaginationOptions): Promise<T[]>

  /**
   * Find records matching filter criteria
   */
  find(filter: Partial<T>): Promise<T[]>

  /**
   * Full-text search across text fields
   */
  search(query: string): Promise<T[]>

  /**
   * AI-powered semantic search
   */
  semanticSearch(query: string): Promise<SearchResult<T>[]>
}

/**
 * Database object containing accessors for all nouns
 */
export type Database<T extends NounDefinitions = NounDefinitions> = {
  [K in keyof T]: DatabaseAccessor
}

/**
 * DBPromise for pipelining operations
 */
export interface DBPromise<T> extends Promise<T> {
  // Extends Promise for standard async/await compatibility
}

/**
 * SaaS context with database access
 */
export interface SaaSContext<T extends NounDefinitions = NounDefinitions> {
  /**
   * Define noun schemas with relationships
   */
  nouns(definitions: T): void

  /**
   * Database accessors for defined nouns
   */
  db: Database<T>
}
