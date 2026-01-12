/**
 * Dotdo Compiler Tests - Verbs to Functions (RED Phase)
 *
 * Tests that SaaSKit verb definitions compile to dotdo Function definitions.
 * This is the RED phase - tests should FAIL because compilers don't exist yet.
 */

import { describe, it, expect } from 'vitest'
import { compileVerbToFunction } from '../../compiler/verbs'

describe('verb → dotdo Function compilation', () => {
  it('compiles code verb to Code Function', () => {
    const verb = {
      noun: 'Order',
      name: 'pay',
      handler: async (_$: unknown) => ({ status: 'paid' }),
    }

    const result = compileVerbToFunction(verb)

    expect(result).toMatchObject({
      name: 'Order.pay',
      verb: 'pay',
      category: 'code',
      runtime: 'workers',
    })
  })

  it('detects AI operations and compiles to Generative Function', () => {
    const verb = {
      noun: 'Customer',
      name: 'qualify',
      // Handler contains $.ai usage (detected by AST or markers)
      usesAI: true,
    }

    const result = compileVerbToFunction(verb)

    expect(result).toMatchObject({
      category: 'generative',
      generationType: 'text',
    })
  })

  it('detects human approval and compiles to Human Function', () => {
    const verb = {
      noun: 'Order',
      name: 'approveRefund',
      usesHumanApproval: true,
    }

    const result = compileVerbToFunction(verb)

    expect(result).toMatchObject({
      category: 'human',
      approvalRequired: true,
    })
  })

  it('generates input schema from verb parameters', () => {
    const verb = {
      noun: 'Order',
      name: 'pay',
      inputSchema: {
        amount: { type: 'number', required: true },
        method: { type: 'string', required: true },
      },
    }

    const result = compileVerbToFunction(verb)

    expect(result.inputSchema).toHaveProperty('amount')
    expect(result.inputSchema).toHaveProperty('method')
  })

  it('generates output schema from return type', () => {
    const verb = {
      noun: 'Order',
      name: 'pay',
      outputSchema: {
        transactionId: { type: 'string' },
        status: { type: 'string' },
      },
    }

    const result = compileVerbToFunction(verb)

    expect(result.outputSchema).toHaveProperty('transactionId')
    expect(result.outputSchema).toHaveProperty('status')
  })

  it('sets correct runtime for different verb categories', () => {
    const codeVerb = { noun: 'Order', name: 'calculate', category: 'code' }
    const aiVerb = { noun: 'Order', name: 'summarize', usesAI: true }

    const codeResult = compileVerbToFunction(codeVerb)
    const aiResult = compileVerbToFunction(aiVerb)

    expect(codeResult.runtime).toBe('workers')
    expect(aiResult.runtime).toBe('workers-ai')
  })
})
