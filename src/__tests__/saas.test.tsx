/**
 * Core Framework Tests - SaaS component and configuration
 *
 * Tests for the primary `<SaaS>` component with children function API.
 *
 * API under test (from README):
 * ```tsx
 * <SaaS name="MyApp">
 *   {$ => {
 *     $.nouns({ Todo: { title: 'string', done: 'boolean' } })
 *     $.verbs({ Todo: { complete: $ => $.db.Todo.update($.id, { done: true }) } })
 *   }}
 * </SaaS>
 * ```
 */

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { SaaS } from '../index'

describe('SaaS Component - Children Function API', () => {
  describe('Basic Rendering', () => {
    it('renders with name prop and children function', () => {
      // This tests that <SaaS name="Test"> accepts a children function
      const childFn = vi.fn()

      render(
        <SaaS name="TestApp">
          {$ => {
            childFn($)
          }}
        </SaaS>
      )

      // The children function should be called with the $ context
      expect(childFn).toHaveBeenCalled()
    })

    it('passes the $ context to children function', () => {
      let capturedContext: unknown = null

      render(
        <SaaS name="ContextTest">
          {$ => {
            capturedContext = $
          }}
        </SaaS>
      )

      // $ context should be defined
      expect(capturedContext).toBeDefined()
      // $ should have nouns method
      expect(capturedContext).toHaveProperty('nouns')
      // $ should have verbs method
      expect(capturedContext).toHaveProperty('verbs')
    })

    it('exposes app name in the rendered output', () => {
      const { container } = render(
        <SaaS name="NamedApp">
          {$ => {}}
        </SaaS>
      )

      // Component should have data attribute or element with app name
      expect(container.querySelector('[data-saas-name="NamedApp"]')).toBeTruthy()
    })
  })

  describe('$.nouns() - Noun Registration', () => {
    it('registers noun definitions with proper types', () => {
      let capturedContext: any = null

      render(
        <SaaS name="NounTest">
          {$ => {
            capturedContext = $
            $.nouns({
              Todo: { title: 'string', done: 'boolean' },
              User: { name: 'string', email: 'string' },
            })
          }}
        </SaaS>
      )

      // After nouns() is called, context should have registered nouns
      expect(capturedContext.nouns).toBeDefined()

      // The nouns should be accessible
      expect(capturedContext._registeredNouns).toBeDefined()
      expect(capturedContext._registeredNouns.Todo).toBeDefined()
      expect(capturedContext._registeredNouns.User).toBeDefined()
    })

    it('parses field types correctly', () => {
      let registeredNouns: any = null

      render(
        <SaaS name="FieldTypeTest">
          {$ => {
            $.nouns({
              Product: {
                name: 'string',
                price: 'number',
                inStock: 'boolean',
                description: 'markdown?', // optional
              },
            })
            registeredNouns = $._registeredNouns
          }}
        </SaaS>
      )

      const product = registeredNouns?.Product
      expect(product).toBeDefined()
      expect(product.name).toEqual({ type: 'string', optional: false })
      expect(product.price).toEqual({ type: 'number', optional: false })
      expect(product.inStock).toEqual({ type: 'boolean', optional: false })
      expect(product.description).toEqual({ type: 'markdown', optional: true })
    })

    it('parses relationship operators in field types', () => {
      let registeredNouns: any = null

      render(
        <SaaS name="RelationshipTest">
          {$ => {
            $.nouns({
              Customer: {
                name: 'string',
                plan: '->Plan', // Customer owns link to Plan (forward reference)
                orders: ['<-Order'], // Orders link back to Customer (reverse reference)
              },
              Order: {
                total: 'number',
                customer: '->Customer', // Forward reference
                products: ['~>Product'], // Fuzzy/semantic match
              },
              Plan: {
                name: 'string',
                price: 'number',
              },
              Product: {
                name: 'string',
              },
            })
            registeredNouns = $._registeredNouns
          }}
        </SaaS>
      )

      // Forward reference (->) - this entity owns the link
      expect(registeredNouns?.Customer.plan).toEqual({
        type: 'relation',
        target: 'Plan',
        direction: 'forward',
        cardinality: 'one',
      })

      // Reverse reference array (<-) - linked entities point back
      expect(registeredNouns?.Customer.orders).toEqual({
        type: 'relation',
        target: 'Order',
        direction: 'reverse',
        cardinality: 'many',
      })

      // Semantic/fuzzy match (~>)
      expect(registeredNouns?.Order.products).toEqual({
        type: 'relation',
        target: 'Product',
        direction: 'semantic',
        cardinality: 'many',
      })
    })
  })

  describe('$.verbs() - Verb Registration', () => {
    it('registers verb handlers for nouns', () => {
      let registeredVerbs: any = null

      render(
        <SaaS name="VerbTest">
          {$ => {
            $.nouns({ Todo: { title: 'string', done: 'boolean' } })
            $.verbs({
              Todo: {
                create: ($: any) => $.db.Todo.create($.input),
                complete: ($: any) => $.db.Todo.update($.id, { done: true }),
              },
            })
            registeredVerbs = $._registeredVerbs
          }}
        </SaaS>
      )

      expect(registeredVerbs).toBeDefined()
      expect(registeredVerbs.Todo).toBeDefined()
      expect(typeof registeredVerbs.Todo.create).toBe('function')
      expect(typeof registeredVerbs.Todo.complete).toBe('function')
    })

    it('generates verb anatomy (action, activity, event, reverse, inverse)', () => {
      let verbAnatomy: any = null

      render(
        <SaaS name="VerbAnatomyTest">
          {$ => {
            $.nouns({ Order: { total: 'number' } })
            $.verbs({
              Order: {
                pay: ($: any) => $.db.Order.update($.id, { status: 'paid' }),
                ship: ($: any) => $.db.Order.update($.id, { status: 'shipped' }),
              },
            })
            verbAnatomy = $._verbAnatomy
          }}
        </SaaS>
      )

      // pay verb anatomy
      expect(verbAnatomy?.Order?.pay).toMatchObject({
        action: 'pay', // imperative: "pay"
        activity: 'paying', // present participle: "paying"
        event: 'paid', // past tense: "paid"
        reverse: 'unpay', // reverse action: "unpay"
        inverse: 'unpaid', // inverse state: "unpaid"
      })

      // ship verb anatomy
      expect(verbAnatomy?.Order?.ship).toMatchObject({
        action: 'ship', // imperative
        activity: 'shipping', // present participle
        event: 'shipped', // past tense
        reverse: 'unship', // reverse
        inverse: 'unshipped', // inverse state
      })
    })
  })

  describe('Relationship Operators', () => {
    it('parses -> (forward ownership) operator', () => {
      let relations: any = null

      render(
        <SaaS name="ForwardRelationTest">
          {$ => {
            $.nouns({
              Order: { customer: '->Customer' },
              Customer: { name: 'string' },
            })
            relations = $._parsedRelations
          }}
        </SaaS>
      )

      expect(relations).toContainEqual({
        from: 'Order',
        to: 'Customer',
        field: 'customer',
        type: 'forward',
        cardinality: 'one',
      })
    })

    it('parses ~> (semantic/fuzzy) operator', () => {
      let relations: any = null

      render(
        <SaaS name="SemanticRelationTest">
          {$ => {
            $.nouns({
              Candidate: { skills: ['~>Skill'] },
              Skill: { name: 'string' },
            })
            relations = $._parsedRelations
          }}
        </SaaS>
      )

      expect(relations).toContainEqual({
        from: 'Candidate',
        to: 'Skill',
        field: 'skills',
        type: 'semantic',
        cardinality: 'many',
      })
    })

    it('parses <- (reverse reference) operator', () => {
      let relations: any = null

      render(
        <SaaS name="ReverseRelationTest">
          {$ => {
            $.nouns({
              Customer: { orders: ['<-Order'] },
              Order: { customer: '->Customer' },
            })
            relations = $._parsedRelations
          }}
        </SaaS>
      )

      expect(relations).toContainEqual({
        from: 'Customer',
        to: 'Order',
        field: 'orders',
        type: 'reverse',
        cardinality: 'many',
      })
    })

    it('parses <~ (reverse semantic) operator', () => {
      let relations: any = null

      render(
        <SaaS name="ReverseSemanticTest">
          {$ => {
            $.nouns({
              Category: { products: ['<~Product'] },
              Product: { category: '~>Category' },
            })
            relations = $._parsedRelations
          }}
        </SaaS>
      )

      expect(relations).toContainEqual({
        from: 'Category',
        to: 'Product',
        field: 'products',
        type: 'reverse-semantic',
        cardinality: 'many',
      })
    })
  })

  describe('Dual Export (JSX and Function)', () => {
    it('works as JSX component', () => {
      const { container } = render(
        <SaaS name="JSXTest">
          {$ => {
            $.nouns({ Item: { name: 'string' } })
          }}
        </SaaS>
      )

      expect(container.querySelector('[data-saas-admin]')).toBeTruthy()
    })

    it('works as function call returning config', () => {
      // SaaS({ name, children }) should return a config object when called as function
      const config = SaaS({
        name: 'FunctionTest',
        children: $ => {
          $.nouns({ Widget: { label: 'string' } })
        },
      })

      // Should return config object, not React element
      expect(config).toBeDefined()
      expect(config.name).toBe('FunctionTest')
      expect(config.nouns).toBeDefined()
      expect(config.nouns.Widget).toBeDefined()
    })
  })

  describe('Events via $.on', () => {
    it('registers event handlers using $.on.Noun.verb pattern', () => {
      let registeredEvents: any = null

      render(
        <SaaS name="EventTest">
          {$ => {
            $.nouns({ Order: { total: 'number' } })
            $.verbs({
              Order: { pay: $ => {} },
            })

            $.on.Order.paid(async (order, $) => {
              // Handle order paid event
            })

            registeredEvents = $._registeredEvents
          }}
        </SaaS>
      )

      expect(registeredEvents).toBeDefined()
      expect(registeredEvents['Order.paid']).toBeDefined()
      expect(typeof registeredEvents['Order.paid']).toBe('function')
    })
  })

  describe('Schedules via $.every', () => {
    it('registers schedule handlers using $.every pattern', () => {
      let registeredSchedules: any = null

      render(
        <SaaS name="ScheduleTest">
          {$ => {
            $.every.day.at('9am')(async $ => {
              // Daily task
            })

            $.every.Monday.at('6am')(async $ => {
              // Weekly task
            })

            registeredSchedules = $._registeredSchedules
          }}
        </SaaS>
      )

      expect(registeredSchedules).toBeDefined()
      expect(registeredSchedules.length).toBeGreaterThanOrEqual(2)
    })
  })
})

describe('SaaS Function Export', () => {
  it('returns config object when called as function', () => {
    // Alternative functional API for server-side usage
    const config = SaaS({
      name: 'MyApp',
      children: $ => {
        $.nouns({
          Todo: { title: 'string', done: 'boolean' },
        })
        $.verbs({
          Todo: {
            complete: ($: any) => $.db.Todo.update($.id, { done: true }),
          },
        })
      },
    })

    expect(config).toMatchObject({
      name: 'MyApp',
      nouns: {
        Todo: expect.any(Object),
      },
      verbs: {
        Todo: {
          complete: expect.any(Function),
        },
      },
    })
  })
})
