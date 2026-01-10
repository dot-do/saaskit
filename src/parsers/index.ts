/**
 * Parser modules for the SaaS DSL
 *
 * This module exports all parsing utilities for the SaaS domain model:
 * - Noun parsing (field definitions, types, validation)
 * - Verb parsing (anatomy generation, validation)
 * - Relationship parsing (operators, direction, cardinality)
 *
 * @module parsers
 */

// Noun parser
export {
  parseFieldDefinition,
  parseNounDefinitions,
  validateNounDefinitions,
} from './noun-parser'
export type {
  ParsedFieldType,
  FieldDefinition,
  NounSchema,
  RawNounDefinitions,
  ParsedNounDefinitions,
  NounValidationResult,
} from './noun-parser'

// Verb parser
export {
  generatePastTense,
  generateParticiple,
  generateVerbAnatomy,
  generateAllVerbAnatomy,
  validateVerbDefinitions,
  IRREGULAR_PAST,
} from './verb-parser'
export type { VerbAnatomy, VerbValidationResult } from './verb-parser'

// Relationship parser
export {
  parseRelationshipOperator,
  isRelationshipOperator,
  getRelationshipOperator,
  getRelationshipTarget,
  RELATIONSHIP_OPERATORS,
} from './relationship-parser'
export type {
  RelationDirection,
  Cardinality,
  ParsedRelation,
  RelationRecord,
} from './relationship-parser'
