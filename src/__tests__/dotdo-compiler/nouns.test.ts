/**
 * Dotdo Compiler Tests - Nouns to Things (RED Phase)
 *
 * Tests that SaaSKit noun definitions compile to dotdo Thing schemas.
 * This is the RED phase - tests should FAIL because compilers don't exist yet.
 */

import { describe, it, expect } from 'vitest'

import { compileNounToThing } from '../../compiler/nouns'

describe('noun → dotdo Thing compilation', () => {
  it('compiles simple noun to Thing schema', () => {
    const noun = {
      Customer: {
        name: 'string',
        email: 'email',
        createdAt: 'date',
      },
    }

    const result = compileNounToThing(noun)

    expect(result).toEqual({
      type: 'Customer',
      ns: 'default',
      schema: {
        name: { type: 'string', required: true },
        email: { type: 'string', format: 'email', required: true },
        createdAt: { type: 'date', required: true },
      },
    })
  })

  it('compiles optional fields correctly', () => {
    const noun = {
      Product: {
        name: 'string',
        description: 'string?', // Optional
      },
    }

    const result = compileNounToThing(noun)

    expect(result.schema.description.required).toBe(false)
  })

  it('compiles relationship operators to dotdo Relationships', () => {
    const noun = {
      Order: {
        customer: '->Customer', // Forward relation (one)
        items: '[->Product]', // Forward relation (many)
      },
    }

    const result = compileNounToThing(noun)

    expect(result.relationships).toEqual([
      { predicate: 'belongsTo', target: 'Customer', cardinality: 'one' },
      { predicate: 'contains', target: 'Product', cardinality: 'many' },
    ])
  })

  it('maps SaaSKit types to dotdo field types', () => {
    const noun = {
      Product: {
        name: 'string',
        price: 'number',
        active: 'boolean',
        slug: 'slug',
        description: 'text',
        status: 'draft | published | archived',
      },
    }

    const result = compileNounToThing(noun)

    expect(result.schema.name.type).toBe('string')
    expect(result.schema.price.type).toBe('number')
    expect(result.schema.active.type).toBe('boolean')
    expect(result.schema.slug.format).toBe('slug')
    expect(result.schema.description.type).toBe('text')
    expect(result.schema.status.enum).toEqual(['draft', 'published', 'archived'])
  })

  it('handles built-in User noun with auth fields', () => {
    const noun = {
      User: {
        email: 'email',
        role: 'admin | member | owner',
        passwordHash: 'string?',
        emailVerified: 'boolean',
      },
    }

    const result = compileNounToThing(noun)

    expect(result.type).toBe('User')
    expect(result.schema.role.enum).toContain('admin')
  })
})
